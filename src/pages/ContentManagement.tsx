import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Search, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ContentHistoryPanel } from "@/components/ContentHistoryPanel";

interface ContentItem {
  id: string;
  content_key: string;
  content_value: string;
  page: string;
  category: string;
  updated_at: string;
}

export default function ContentManagement() {
  const { isSuperAdmin } = useAuth();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

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

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredContents = contents.filter(content => 
    content.content_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.content_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.page.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        <ContentHistoryPanel />
        
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
          <CardContent className="space-y-6">
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
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
