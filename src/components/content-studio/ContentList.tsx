import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContentListItem } from "./ContentListItem";
import { useContentStore } from "@/stores/contentStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText } from "lucide-react";

interface ContentItem {
  id: string;
  content_key: string;
  content_value: string;
  page: string;
  category: string;
  updated_at: string;
}

export function ContentList() {
  const { searchQuery, filters, selectedContent, setSelectedContent, aiMode, aiResults } = useContentStore();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContents();
  }, [searchQuery, filters, aiMode, aiResults]);

  const fetchContents = async () => {
    setLoading(true);
    try {
      let query = supabase.from("editable_content").select("id,content_key,content_value,page,category,updated_at");

      // If AI mode is on and we have ids, restrict to them
      if (aiMode && aiResults.length > 0) {
        query = query.in("id", aiResults);
      } else {
        if (searchQuery) {
          const term = searchQuery.trim();
          // Search across key, value, page and category
          query = query.or(
            `content_key.ilike.%${term}%,content_value.ilike.%${term}%,page.ilike.%${term}%,category.ilike.%${term}%`
          );
        }

        if (filters.page && filters.page !== "all") {
          query = query.eq("page", filters.page);
        }

        if (filters.category && filters.category !== "all") {
          query = query.eq("category", filters.category);
        }
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;

      // If AI mode, preserve AI order
      let finalData = data || [];
      if (aiMode && aiResults.length > 0) {
        const map = new Map(finalData.map((c) => [c.id, c] as const));
        finalData = aiResults.map((id) => map.get(id)).filter(Boolean) as ContentItem[];
      }

      setContents(finalData);
    } catch (error) {
      console.error("Error fetching contents:", error);
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

  if (contents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No content found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold">
          Content Items ({contents.length})
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {contents.map((content) => (
            <ContentListItem
              key={content.id}
              content={content}
              isSelected={selectedContent?.id === content.id}
              onClick={() => setSelectedContent(content)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
