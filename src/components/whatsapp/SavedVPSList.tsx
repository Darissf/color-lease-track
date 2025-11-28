import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Server, Edit2, Trash2, Star, Zap } from 'lucide-react';
import { useVPSCredentials, VPSCredentials } from '@/hooks/useVPSCredentials';
import { OneClickInstaller } from './OneClickInstaller';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SavedVPSListProps {
  onSelect: (credentials: VPSCredentials) => void;
}

export const SavedVPSList = ({ onSelect }: SavedVPSListProps) => {
  const { credentials, loading, deleteCredentials, setAsDefault } = useVPSCredentials();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [installingVpsId, setInstallingVpsId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCredentials(deleteId);
      setDeleteId(null);
    }
  };

  if (loading && credentials.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Memuat...</p>
        </CardContent>
      </Card>
    );
  }

  if (credentials.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Belum ada VPS tersimpan</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            VPS Tersimpan
          </CardTitle>
          <CardDescription>
            Pilih VPS yang sudah tersimpan atau tambah yang baru
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {credentials.map((cred) => (
            <Card key={cred.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm truncate">{cred.name}</h4>
                      {cred.is_default && (
                        <Badge variant="default" className="shrink-0">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Host: {cred.host}</p>
                      <p>Port: {cred.port} | User: {cred.username}</p>
                      <p>WAHA Port: {cred.waha_port} | Session: {cred.waha_session_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelect(cred)}
                    >
                      Gunakan
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setInstallingVpsId(cred.id!)}
                      className="gap-2"
                    >
                      <Zap className="h-3 w-3" />
                      Install WAHA
                    </Button>
                    {!cred.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAsDefault(cred.id!)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(cred.id!)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus VPS Credentials?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. VPS credentials akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* One-Click Installer Modal */}
      {installingVpsId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Install WAHA - {credentials.find(c => c.id === installingVpsId)?.name}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setInstallingVpsId(null)}
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <OneClickInstaller 
                credentials={credentials.find(c => c.id === installingVpsId)!}
                onSuccess={() => {
                  toast({
                    title: 'Success!',
                    description: 'WAHA berhasil terinstall dan konfigurasi tersimpan.',
                  });
                  setInstallingVpsId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};