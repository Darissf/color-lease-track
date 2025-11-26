import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Database, AlertCircle, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface BackupRecord {
  id: string;
  created_at: string;
  status: string;
  file_path: string | null;
  commit_url: string | null;
  error_message: string | null;
  backup_size_kb: number | null;
  tables_backed_up: string[] | null;
}

export default function DatabaseBackup() {
  const { activeTheme } = useAppTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Check if user is admin
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      return data;
    },
    enabled: !!user,
  });

  const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'super_admin');

  // Fetch backup history
  const { data: backups, isLoading } = useQuery({
    queryKey: ['database-backups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('database_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as BackupRecord[];
    },
    enabled: isAdmin,
  });

  // Trigger backup mutation
  const backupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('database-backup', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Backup Berhasil",
        description: `Database berhasil di-backup ke GitHub. File: ${data.filePath}`,
      });
      queryClient.invalidateQueries({ queryKey: ['database-backups'] });
    },
    onError: (error: any) => {
      toast({
        title: "Backup Gagal",
        description: error.message || "Terjadi kesalahan saat melakukan backup",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsBackingUp(false);
    },
  });

  const handleBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    backupMutation.mutate();
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Akses Ditolak</CardTitle>
            <CardDescription>Anda tidak memiliki izin untuk mengakses halaman ini.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Berhasil</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Gagal</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Proses</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            "text-3xl font-bold",
            activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          )}>Database Backup</h1>
          <p className="text-muted-foreground">Kelola backup database otomatis ke GitHub</p>
        </div>
        <Button
          onClick={handleBackup}
          disabled={isBackingUp}
          size="lg"
        >
          <Download className="w-4 h-4 mr-2" />
          {isBackingUp ? 'Membuat Backup...' : 'Backup Sekarang'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Riwayat Backup
          </CardTitle>
          <CardDescription>
            Daftar backup database yang telah dibuat dan disimpan di GitHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat riwayat backup...
            </div>
          ) : backups && backups.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ukuran</TableHead>
                    <TableHead>Tabel</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">
                        {format(new Date(backup.created_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell>
                        {backup.backup_size_kb ? `${backup.backup_size_kb} KB` : '-'}
                      </TableCell>
                      <TableCell>
                        {backup.tables_backed_up ? (
                          <span className="text-sm">{backup.tables_backed_up.length} tabel</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {backup.file_path || '-'}
                      </TableCell>
                      <TableCell>
                        {backup.commit_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={backup.commit_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada backup yang dibuat
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Penting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • Backup akan disimpan otomatis ke repository GitHub Anda
          </p>
          <p className="text-sm text-muted-foreground">
            • Pastikan GitHub token sudah dikonfigurasi dengan benar di Settings
          </p>
          <p className="text-sm text-muted-foreground">
            • File backup berformat JSON dan berisi snapshot dari semua tabel utama
          </p>
          <p className="text-sm text-muted-foreground">
            • Update owner dan repo di edge function sesuai dengan repository GitHub Anda
          </p>
        </CardContent>
      </Card>
    </div>
  );
}