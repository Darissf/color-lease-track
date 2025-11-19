import { useState, useEffect } from "react";
import { useContentStore } from "@/stores/contentStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIAssistant } from "./AIAssistant";
import { ContentHistory } from "./ContentHistory";
import { ContentAnalysis } from "./ContentAnalysis";
import ProtectionManager from "./ProtectionManager";
import { Save, Sparkles, History, BarChart3, FileText, MapPin, Eye, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function EditorPanel() {
  const { selectedContent, setSelectedContent, togglePreview, showPreview } = useContentStore();
  const [editedValue, setEditedValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    if (selectedContent) {
      setEditedValue(selectedContent.content_value);
      loadMetadata();
    }
  }, [selectedContent]);

  const loadMetadata = async () => {
    if (!selectedContent) return;
    
    try {
      const { data } = await supabase
        .from("content_history")
        .select("id")
        .eq("content_key", selectedContent.content_key)
        .order("created_at", { ascending: false });

      setMetadata({
        version_count: data?.length || 0,
        character_count: selectedContent.content_value?.length || 0,
        word_count: selectedContent.content_value?.split(/\s+/).length || 0,
      });
    } catch (error) {
      console.error("Failed to load metadata:", error);
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
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedContent.id);

      if (error) throw error;

      // Save to history
      await supabase.from("content_history").insert({
        content_key: selectedContent.content_key,
        content_value: editedValue,
        page: selectedContent.page,
        category: selectedContent.category,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

      toast.success("Content saved successfully!");
      setSelectedContent({ ...selectedContent, content_value: editedValue });
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const getFileLocation = (key: string, page: string) => {
    const parts = key.split(".");
    if (parts[0] && page) {
      const pageName = page === "/" ? "Index" : page.split("/").pop() || "";
      const fileName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
      return `src/pages/${fileName}.tsx`;
    }
    return "Unknown";
  };

  if (!selectedContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No content selected</h3>
        <p className="text-muted-foreground">
          Select a content item from the list to start editing
        </p>
      </div>
    );
  }

  const fileLocation = getFileLocation(selectedContent.content_key, selectedContent.page);
  const hasChanges = editedValue !== selectedContent.content_value;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-mono text-sm text-primary truncate mb-1">
              {selectedContent.content_key}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{fileLocation}</span>
            </div>
            {selectedContent.updated_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                Updated {formatDistanceToNow(new Date(selectedContent.updated_at))} ago
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={togglePreview}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Hide" : "Show"} Preview
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{selectedContent.category}</Badge>
          <Badge variant="outline">{selectedContent.page}</Badge>
          <ProtectionManager
            contentId={selectedContent.id}
            contentKey={selectedContent.content_key}
            isProtected={selectedContent.is_protected || false}
            protectionReason={selectedContent.protection_reason || undefined}
            onUpdate={() => {
              // Refresh content
              if (selectedContent) {
                supabase
                  .from("editable_content")
                  .select("*")
                  .eq("id", selectedContent.id)
                  .single()
                  .then(({ data }) => {
                    if (data) setSelectedContent(data as any);
                  });
              }
            }}
          />
        </div>
        {metadata && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{metadata.character_count} characters</span>
            <span>{metadata.word_count} words</span>
            <span>{metadata.version_count} versions</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="editor" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="editor" className="gap-2">
            <FileText className="h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="flex-1 p-4 m-0 overflow-auto">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Content</label>
              <Textarea
                value={editedValue}
                onChange={(e) => setEditedValue(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Enter content..."
              />
            </div>
            {hasChanges && (
              <div className="text-sm text-muted-foreground">
                <span className="text-amber-500">●</span> Unsaved changes
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
          <AIAssistant 
            content={editedValue} 
            onApply={(newContent) => setEditedValue(newContent)}
          />
        </TabsContent>

        <TabsContent value="analysis" className="flex-1 m-0 overflow-auto">
          <ContentAnalysis contentKey={selectedContent.content_key} content={editedValue} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
          <ContentHistory 
            contentKey={selectedContent.content_key}
            onRestore={(value) => setEditedValue(value)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
