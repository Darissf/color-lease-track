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
import { useEditableContent } from "@/contexts/EditableContentContext";
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
  const { undo, redo, canUndo, canRedo, getHistory, restoreVersion } = useEditableContent();
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
    const data = await getHistory(key);
    setHistory(data);
    setSelectedKey(key);
  };

  const handleRestore = async (historyId: string) => {
    await restoreVersion(historyId);
    setIsDialogOpen(false);
    if (selectedKey) {
      await loadHistory(selectedKey);
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">
                  <FileText className="h-4 w-4 mr-2" />
                  Daftar Content
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  Riwayat & Undo/Redo
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

              <TabsContent value="history" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Undo & Redo</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Kelola perubahan konten dengan undo/redo
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={undo}
                        disabled={!canUndo}
                        className="flex items-center gap-2"
                      >
                        <Undo2 className="h-4 w-4" />
                        Undo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={redo}
                        disabled={!canRedo}
                        className="flex items-center gap-2"
                      >
                        <Redo2 className="h-4 w-4" />
                        Redo
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-2">Riwayat Detail</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Lihat dan restore versi sebelumnya dari konten yang telah diedit
                    </p>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full">
                          <History className="h-4 w-4 mr-2" />
                          Lihat Riwayat Detail
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Riwayat Perubahan Konten</DialogTitle>
                          <DialogDescription>
                            Lihat dan restore versi sebelumnya dari konten yang telah diedit
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Content Key:</label>
                            <Input
                              type="text"
                              placeholder="Masukkan content key"
                              value={selectedKey}
                              onChange={(e) => setSelectedKey(e.target.value)}
                              className="mt-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => selectedKey && loadHistory(selectedKey)}
                              className="mt-2"
                              disabled={!selectedKey}
                            >
                              Muat Riwayat
                            </Button>
                          </div>

                          {history.length > 0 && (
                            <ScrollArea className="h-[400px] border rounded-md p-4">
                              <div className="space-y-3">
                                {history.map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-3 border rounded-lg hover:bg-accent transition-colors"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <p className="text-sm font-medium">
                                          Versi {item.version_number}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {formatDistanceToNow(new Date(item.created_at), {
                                            addSuffix: true,
                                            locale: id,
                                          })}
                                        </p>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRestore(item.id)}
                                      >
                                        <RotateCcw className="h-3 w-3 mr-1" />
                                        Restore
                                      </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {item.content_value}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        {item.page}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        {item.category}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}

                          {history.length === 0 && selectedKey && (
                            <p className="text-center text-muted-foreground py-8">
                              Tidak ada riwayat untuk content key ini
                            </p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Tips:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Gunakan Undo/Redo untuk membatalkan perubahan terakhir</li>
                        <li>Content key dapat ditemukan di tab "Daftar Content"</li>
                        <li>Restore akan mengembalikan konten ke versi yang dipilih</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
  );
}
