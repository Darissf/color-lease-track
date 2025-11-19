import { useContentStore } from "@/stores/contentStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Columns2, Code } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function PreviewPanel() {
  const { selectedContent, previewMode, setPreviewMode, togglePreview, showPreview } = useContentStore();

  if (!selectedContent || !showPreview) {
    return null;
  }

  const renderDiffView = () => {
    const original = selectedContent.content_value || "";
    const edited = selectedContent.content_value || ""; // In real implementation, this would be the edited value
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Changes Preview</h4>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              - Removed
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              + Added
            </Badge>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Original:</div>
          <div className="p-3 rounded-md bg-muted/50 font-mono text-sm">
            {original}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Edited:</div>
          <div className="p-3 rounded-md bg-muted/50 font-mono text-sm">
            {edited}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{original.length} characters</span>
          <span>{original.split(/\s+/).length} words</span>
        </div>
      </div>
    );
  };

  const renderLivePreview = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Live Preview</h4>
          <Badge variant="secondary">
            <Eye className="h-3 w-3 mr-1" />
            Simulated
          </Badge>
        </div>
        
        <Separator />
        
        <div className="p-6 rounded-md border bg-card">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              This is how the content will appear on the page:
            </div>
            
            {/* Mock UI Preview */}
            <div className="p-4 rounded-md bg-background border-2 border-primary/20">
              <div className="space-y-2">
                <div className="h-2 w-20 bg-muted rounded animate-pulse" />
                <div className="text-base font-medium">
                  {selectedContent.content_value}
                </div>
                <div className="h-2 w-40 bg-muted rounded animate-pulse" />
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <strong>Location:</strong> {selectedContent.page}
              {" • "}
              <strong>Category:</strong> {selectedContent.category}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSideBySide = () => {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Original</Badge>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-3 rounded-md bg-muted/50 font-mono text-sm whitespace-pre-wrap">
              {selectedContent.content_value}
            </div>
          </ScrollArea>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10">Edited</Badge>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-3 rounded-md bg-primary/5 font-mono text-sm whitespace-pre-wrap border-2 border-primary/20">
              {selectedContent.content_value}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Preview</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePreview}
        >
          <EyeOff className="h-4 w-4 mr-2" />
          Hide Preview
        </Button>
      </div>

      <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)} className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diff">
            <Code className="h-4 w-4 mr-2" />
            Diff
          </TabsTrigger>
          <TabsTrigger value="live">
            <Eye className="h-4 w-4 mr-2" />
            Live
          </TabsTrigger>
          <TabsTrigger value="side-by-side">
            <Columns2 className="h-4 w-4 mr-2" />
            Side by Side
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 mt-4">
          <TabsContent value="diff" className="mt-0">
            {renderDiffView()}
          </TabsContent>

          <TabsContent value="live" className="mt-0">
            {renderLivePreview()}
          </TabsContent>

          <TabsContent value="side-by-side" className="mt-0">
            {renderSideBySide()}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
