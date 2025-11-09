import { Edit, Save } from "lucide-react";
import { Button } from "./ui/button";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { cn } from "@/lib/utils";

export function EditModeToggle() {
  const { isEditMode, isSuperAdmin, toggleEditMode } = useEditableContent();

  if (!isSuperAdmin) return null;

  return (
    <Button
      onClick={toggleEditMode}
      variant={isEditMode ? "default" : "outline"}
      size="sm"
      className={cn(
        "fixed bottom-4 right-4 z-50 shadow-lg",
        isEditMode && "bg-yellow-500 hover:bg-yellow-600 text-white"
      )}
    >
      {isEditMode ? (
        <>
          <Save className="h-4 w-4 mr-2" />
          Mode Edit: ON
        </>
      ) : (
        <>
          <Edit className="h-4 w-4 mr-2" />
          Mode Edit: OFF
        </>
      )}
    </Button>
  );
}
