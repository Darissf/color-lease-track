import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { History, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface HistoryItem {
  id: string;
  content_value: string;
  created_at: string;
  version_number: number;
}

interface ContentHistoryProps {
  contentKey: string;
  onRestore: (value: string) => void;
}

export function ContentHistory({ contentKey, onRestore }: ContentHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [contentKey]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("content_history")
        .select("*")
        .eq("content_key", contentKey)
        .order("version_number", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <History className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No history yet</h3>
        <p className="text-sm text-muted-foreground">
          Version history will appear here after you save changes
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {history.map((item, idx) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge variant="outline">Version {item.version_number}</Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
              </div>
              {idx > 0 && (
                <Button
                  onClick={() => {
                    onRestore(item.content_value);
                    toast.success("Content restored from history");
                  }}
                  size="sm"
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </Button>
              )}
              {idx === 0 && (
                <Badge variant="secondary">Current</Badge>
              )}
            </div>
            <p className="text-sm bg-muted p-3 rounded line-clamp-3">
              {item.content_value}
            </p>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
