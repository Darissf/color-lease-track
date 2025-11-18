import { Button } from "@/components/ui/button";
import { Edit3, Eye } from "lucide-react";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { cn } from "@/lib/utils";

export const EditModeToggle = () => {
  const { isEditMode, toggleEditMode, isSuperAdmin } = useEditableContent();

  if (!isSuperAdmin) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={toggleEditMode}
        size="lg"
        className={cn(
          "rounded-full shadow-lg transition-all",
          isEditMode
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {isEditMode ? (
          <>
            <Edit3 className="h-5 w-5 mr-2" />
            Edit Mode ON
          </>
        ) : (
          <>
            <Eye className="h-5 w-5 mr-2" />
            Edit Mode OFF
          </>
        )}
      </Button>
    </div>
  );
};
