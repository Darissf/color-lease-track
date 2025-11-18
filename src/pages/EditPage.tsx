import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Save, FileText, Loader2, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentItem {
  id: string;
  content_key: string;
  content_value: string;
  page: string;
  category: string;
  updated_at: string;
  created_at?: string;
}

const EditPage = () => {
  const { isSuperAdmin, user } = useAuth();
  const { updateContent } = useEditableContent();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [editedValue, setEditedValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newContentCount, setNewContentCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [unmappedKeys, setUnmappedKeys] = useState<Set<string>>(new Set());
  const [staleKeys, setStaleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    fetchContents();
  }, [searchQuery]);

  // Auto-select content from query param
  useEffect(() => {
    const keyParam = searchParams.get("key");
    if (keyParam && contents.length > 0) {
      const found = contents.find((c) => c.content_key === keyParam);
      if (found) {
        setSelectedContent(found);
        // Scroll to item
        setTimeout(() => {
          const element = document.getElementById(`content-${found.id}`);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [searchParams, contents]);

  useEffect(() => {
    if (selectedContent) {
      setEditedValue(selectedContent.content_value);
    }
  }, [selectedContent]);

  const fetchContents = async (showToast = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from("editable_content")
        .select("id,content_key,content_value,page,category,updated_at,created_at");

      if (searchQuery.trim()) {
        query = query.or(
          `content_key.ilike.%${searchQuery}%,content_value.ilike.%${searchQuery}%,page.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;
      
      // Detect new content (created in last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const newCount = (data || []).filter(item => item.created_at && item.created_at > oneDayAgo).length;
      setNewContentCount(newCount);
      
      setContents(data || []);
      
      if (showToast) {
        if (newCount > 0) {
          toast.success(`Sinkronisasi selesai! Ditemukan ${newCount} konten baru`);
        } else {
          toast.success("Sinkronisasi selesai! Tidak ada konten baru");
        }
      }
    } catch (error) {
      console.error("Error fetching contents:", error);
      toast.error("Gagal memuat konten");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetchContents(true);
    setSyncing(false);
  };

  const handleVerifyUnapplied = async () => {
    setChecking(true);
    try {
      const { data: allContents, error: cErr } = await supabase
        .from('editable_content')
        .select('content_key,content_value,updated_at');
      if (cErr) throw cErr;

      const { data: stats, error: sErr } = await supabase
        .from('content_render_stats' as any)
        .select('content_key,rendered_value,last_seen_at');
      if (sErr) throw sErr;

      // Build latest render per key
      const latestByKey = new Map<string, { rendered_value: string; last_seen_at: string }>();
      (stats || []).forEach((row: any) => {
        const prev = latestByKey.get(row.content_key);
        if (!prev || (prev.last_seen_at || '') < (row.last_seen_at || '')) {
          latestByKey.set(row.content_key, { rendered_value: row.rendered_value, last_seen_at: row.last_seen_at });
        }
      });

      const notSeen = new Set<string>();
      const stale = new Set<string>();

      (allContents || []).forEach((c: any) => {
        const stat = latestByKey.get(c.content_key);
        if (!stat) {
          notSeen.add(c.content_key);
          return;
        }
        if ((stat.last_seen_at && c.updated_at && stat.last_seen_at < c.updated_at) || (stat.rendered_value ?? '') !== (c.content_value ?? '')) {
          stale.add(c.content_key);
        }
      });

      setUnmappedKeys(notSeen);
      setStaleKeys(stale);
      toast.success(`Audit selesai: ${notSeen.size} belum ditampilkan, ${stale.size} belum tersinkron`);
    } catch (error) {
      console.error('Verify unapplied error:', error);
      toast.error('Gagal melakukan audit otomatis');
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (!selectedContent || !user) return;

    setSaving(true);
    try {
      // Use updateContent from context for consistency
      await updateContent(
        selectedContent.content_key,
        editedValue,
        selectedContent.page,
        selectedContent.category
      );

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
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} disabled={syncing} variant="outline">
            <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
            Sinkron Ulang
          </Button>
          <Button onClick={handleVerifyUnapplied} disabled={checking} variant="outline">
            <AlertTriangle className={cn("h-4 w-4 mr-2", checking && "animate-pulse")} />
            Cek Belum Terganti
          </Button>
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Content Items ({contents.length})</h2>
              {newContentCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {newContentCount} Baru
                </Badge>
              )}
            </div>
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
                {contents.map((content) => {
                  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                  const isNew = (content as any).created_at && (content as any).created_at > oneDayAgo;
                  const isUnmapped = unmappedKeys?.has && unmappedKeys.has(content.content_key);
                  const isStale = staleKeys?.has && staleKeys.has(content.content_key);
                  
                  return (
                    <button
                      key={content.id}
                      onClick={() => setSelectedContent(content)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all hover:bg-accent",
                        selectedContent?.id === content.id && "bg-accent border-2 border-primary"
                      )}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <p className="font-mono text-xs text-primary truncate flex-1">
                          {content.content_key}
                        </p>
                        {isNew && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            NEW
                          </Badge>
                        )}
                        {isUnmapped && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            NOT LINKED
                          </Badge>
                        )}
                        {isStale && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            POTENSIAL BELUM TERGANTI
                          </Badge>
                        )}
                      </div>
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
                  );
                })}
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
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        const url = `${selectedContent.page}?autoApply=true`;
                        window.open(url, '_blank');
                        toast.success('Halaman dibuka! Auto-apply akan berjalan otomatis');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Terapkan di Halaman Ini
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </div>
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
