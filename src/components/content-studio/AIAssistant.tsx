import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, Loader2, Languages, Wand2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIAssistantProps {
  content: string;
  onApply: (newContent: string) => void;
}

export function AIAssistant({ content, onApply }: AIAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    type: string;
    suggested: string;
    confidence: number;
  }>>([]);

  const runAIAssistant = async (action: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-assistant", {
        body: { content, action }
      });

      if (error) throw error;
      
      setSuggestions([{
        type: action,
        suggested: data.suggested,
        confidence: data.confidence
      }]);
    } catch (error: any) {
      console.error("AI Assistant error:", error);
      toast.error(error.message || "Failed to get AI suggestions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold">AI Writing Assistant</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => runAIAssistant("grammar")}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Fix Grammar
          </Button>
          <Button
            onClick={() => runAIAssistant("formal")}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Make Formal
          </Button>
          <Button
            onClick={() => runAIAssistant("casual")}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Make Casual
          </Button>
          <Button
            onClick={() => runAIAssistant("translate")}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <Languages className="h-4 w-4 mr-2" />
            Translate
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && suggestions.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select an AI action to get suggestions</p>
          </div>
        )}

        {!loading && suggestions.map((suggestion, idx) => (
          <Card key={idx} className="p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary" className="capitalize">
                {suggestion.type}
              </Badge>
              <Badge variant="outline">
                {Math.round(suggestion.confidence * 100)}% confidence
              </Badge>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Original:</p>
              <p className="text-sm bg-muted p-3 rounded">{content}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Suggested:</p>
              <p className="text-sm bg-primary/10 p-3 rounded">{suggestion.suggested}</p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  onApply(suggestion.suggested);
                  toast.success("Applied AI suggestion");
                }}
                size="sm"
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Apply
              </Button>
              <Button 
                onClick={() => setSuggestions([])}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </ScrollArea>
    </div>
  );
}
