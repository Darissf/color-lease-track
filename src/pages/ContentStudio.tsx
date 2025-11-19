import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Keyboard, LayoutDashboard, FileEdit, History, Download, Settings } from "lucide-react";
import FilterPanel from "@/components/content-studio/FilterPanel";
import { SearchPanel } from "@/components/content-studio/SearchPanel";
import { ContentList } from "@/components/content-studio/ContentList";
import { EditorPanel } from "@/components/content-studio/EditorPanel";
import PreviewPanel from "@/components/content-studio/PreviewPanel";
import BulkActionsBar from "@/components/content-studio/BulkActionsBar";
import ContentDashboard from "@/components/content-studio/ContentDashboard";
import { ContentHistory } from "@/components/content-studio/ContentHistory";
import ImportExport from "@/components/content-studio/ImportExport";
import KeyboardShortcuts from "@/components/content-studio/KeyboardShortcuts";
import { useContentStore } from "@/stores/contentStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ContentStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { selectedIds, showPreview, selectedContent } = useContentStore();

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Access Denied",
          description: "You need super admin privileges to access Content Studio",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsSuperAdmin(true);
    };

    checkRole();
  }, [user, navigate, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Show shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Content Studio</h1>
            <p className="text-sm text-muted-foreground">
              Advanced content management system
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShortcuts(true)}
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Shortcuts
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="editor" className="h-full flex flex-col">
          <TabsList className="mx-6 mt-4">
            <TabsTrigger value="editor">
              <FileEdit className="h-4 w-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="import-export">
              <Download className="h-4 w-4 mr-2" />
              Import/Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 overflow-hidden mt-4">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Sidebar - Filters & Search */}
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <div className="h-full flex flex-col px-4 space-y-4 overflow-y-auto">
                  <SearchPanel />
                  <FilterPanel />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Middle - Content List */}
              <ResizablePanel defaultSize={30} minSize={20}>
                <div className="h-full flex flex-col">
                  <ContentList />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Right - Editor & Preview */}
              <ResizablePanel defaultSize={50} minSize={30}>
                {showPreview ? (
                  <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={50}>
                      <EditorPanel />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={50}>
                      <PreviewPanel />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                ) : (
                  <EditorPanel />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && <BulkActionsBar />}
          </TabsContent>

          <TabsContent value="dashboard" className="flex-1 overflow-y-auto px-6">
            <ContentDashboard />
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Content History</h2>
                <p className="text-muted-foreground">
                  View all content changes and restore previous versions
                </p>
              </div>
              {selectedContent ? (
                <ContentHistory
                  contentKey={selectedContent.content_key}
                  onRestore={() => {}}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Select a content item from the editor to view its history
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="import-export" className="flex-1 overflow-y-auto px-6">
            <ImportExport />
          </TabsContent>
        </Tabs>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcuts
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </div>
  );
}
