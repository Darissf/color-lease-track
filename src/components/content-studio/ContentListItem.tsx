import { Badge } from "@/components/ui/badge";
import { FileText, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentListItemProps {
  content: {
    id: string;
    content_key: string;
    content_value: string;
    page: string;
    category: string;
    updated_at: string;
  };
  isSelected: boolean;
  onClick: () => void;
}

export function ContentListItem({ content, isSelected, onClick }: ContentListItemProps) {
  // Smart file location mapping
  const getFileLocation = (key: string, page: string) => {
    // Pattern: page.section.element -> src/pages/Page.tsx
    const parts = key.split(".");
    if (parts[0] && page) {
      const pageName = page === "/" ? "Index" : page.split("/").pop() || "";
      const fileName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
      return `src/pages/${fileName}.tsx`;
    }
    return "Unknown";
  };

  const fileLocation = getFileLocation(content.content_key, content.page);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg transition-all hover:bg-accent",
        isSelected && "bg-accent border-2 border-primary"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-primary truncate">
            {content.content_key}
          </p>
        </div>
      </div>
      
      <p className="text-sm line-clamp-2 mb-2">
        {content.content_value}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          {content.category}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate max-w-[200px]">{fileLocation}</span>
        </div>
      </div>
    </button>
  );
}
