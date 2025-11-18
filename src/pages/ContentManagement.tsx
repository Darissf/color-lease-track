import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Search, FileText, History, Undo2, Redo2, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ContentItem {
  id: string;
  content_key: string;
  content_value: string;
  page: string;
  category: string;
  updated_at: string;
}

interface ContentHistory {
  id: string;
  content_key: string;
  content_value: string;
  page: string;
  category: string;
  user_id: string;
  created_at: string;
  version_number: number;
}

export default function ContentManagement() {
  const { isSuperAdmin } = useAuth();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [history, setHistory] = useState<ContentHistory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('editable_content')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setContents(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat konten");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus konten ini?")) return;

    try {
      const { error } = await supabase
        .from('editable_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Konten berhasil dihapus");
      fetchContents();
    } catch (error: any) {
      toast.error("Gagal menghapus konten");
      console.error(error);
    }
  };

  const loadHistory = async (key: string) => {
    try {
      const { data, error } = await supabase
        .from('content_history')
        .select('*')
        .eq('content_key', key)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
      setSelectedKey(key);
    } catch (error) {
      toast.error("Gagal memuat riwayat");
      console.error(error);
    }
  };

  const handleRestore = async (historyId: string) => {
    try {
      const historyItem = history.find(h => h.id === historyId);
      if (!historyItem) return;

      const { error } = await supabase
        .from('editable_content')
        .update({ 
          content_value: historyItem.content_value,
          updated_at: new Date().toISOString()
        })
        .eq('content_key', historyItem.content_key);

      if (error) throw error;

      toast.success("Versi berhasil dipulihkan");
      setIsDialogOpen(false);
      fetchContents();
      if (selectedKey) {
        await loadHistory(selectedKey);
      }
    } catch (error) {
      toast.error("Gagal memulihkan versi");
      console.error(error);
    }
  };

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredContents = contents.filter(content => 
    content.content_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.content_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.page.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl">Content Management</CardTitle>
                <CardDescription>
                  Kelola semua konten yang dapat diedit di aplikasi
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-2" />
              Daftar Content
            </TabsTrigger>
          </TabsList>

              <TabsContent value="content" className="space-y-6 mt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari konten berdasarkan key, value, atau page..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary" className="text-sm">
                {filteredContents.length} konten
              </Badge>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  {searchQuery ? "Tidak ada konten yang cocok dengan pencarian" : "Belum ada konten yang diedit"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Aktifkan mode edit dan double-click pada text untuk membuat konten editable
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content Key</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContents.map((content) => (
                      <TableRow key={content.id}>
                        <TableCell className="font-mono text-sm">
                          {content.content_key}
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {content.content_value}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{content.page}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{content.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(content.updated_at).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(content.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
  );
}
