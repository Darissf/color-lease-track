import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Save, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentItem {
  id: string;
  content_key: string;
  content_value: string;
  page: string;
  category: string;
  updated_at: string;
}

const EditPage = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [editedValue, setEditedValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    fetchContents();
  }, [searchQuery]);

  useEffect(() => {
    if (selectedContent) {
      setEditedValue(selectedContent.content_value);
    }
  }, [selectedContent]);

  const fetchContents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("editable_content")
        .select("id,content_key,content_value,page,category,updated_at");

      if (searchQuery.trim()) {
        const term = searchQuery.trim();
        query = query.or(
          `content_key.ilike.%${term}%,content_value.ilike.%${term}%,page.ilike.%${term}%,category.ilike.%${term}%`
        );
      }

      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error("Error fetching contents:", error);
      toast.error("Gagal memuat konten");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedContent) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("editable_content")
        .update({
          content_value: editedValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedContent.id);

      if (error) throw error;

      // Save to history
      await supabase.from("content_history").insert({
        content_key: selectedContent.content_key,
        content_value: editedValue,
        page: selectedContent.page,
        category: selectedContent.category,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      toast.success("Konten berhasil disimpan!");
      setSelectedContent({ ...selectedContent, content_value: editedValue });
      fetchContents();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Gagal menyimpan konten");
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  const hasChanges = selectedContent && editedValue !== selectedContent.content_value;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Content Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola dan edit konten aplikasi
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari konten... (contoh: optimasi budget)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {searchQuery && (
            <Button variant="ghost" onClick={() => setSearchQuery("")}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-5 gap-4 min-h-0">
        {/* Content List */}
        <Card className="col-span-2 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Content Items ({contents.length})</h2>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : contents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Tidak ada konten ditemukan</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {contents.map((content) => (
                  <button
                    key={content.id}
                    onClick={() => setSelectedContent(content)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all hover:bg-accent",
                      selectedContent?.id === content.id && "bg-accent border-2 border-primary"
                    )}
                  >
                    <p className="font-mono text-xs text-primary truncate mb-1">
                      {content.content_key}
                    </p>
                    <p className="text-sm line-clamp-2 mb-2">{content.content_value}</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {content.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {content.page}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Editor Panel */}
        <Card className="col-span-3 flex flex-col overflow-hidden">
          {!selectedContent ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Pilih konten untuk diedit</h3>
              <p className="text-muted-foreground">
                Pilih item dari daftar di sebelah kiri
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-mono text-sm text-primary truncate mb-1">
                      {selectedContent.content_key}
                    </h2>
                  </div>
                  <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{selectedContent.category}</Badge>
                  <Badge variant="outline">{selectedContent.page}</Badge>
                </div>
              </div>

              <div className="flex-1 p-4">
                <Textarea
                  value={editedValue}
                  onChange={(e) => setEditedValue(e.target.value)}
                  className="h-full resize-none font-mono"
                  placeholder="Edit konten di sini..."
                />
              </div>

              {hasChanges && (
                <div className="p-4 border-t bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Ada perubahan yang belum disimpan
                  </p>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EditPage;
