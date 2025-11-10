import { Edit, Save } from "lucide-react";
import { Button } from "./ui/button";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useLocation } from "react-router-dom";

export function EditModeToggle() {
  const { isEditMode, isSuperAdmin, toggleEditMode, getEditedCountForPage } = useEditableContent();
  const location = useLocation();
  const editedCount = getEditedCountForPage(location.pathname);

  if (!isSuperAdmin) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleEditMode}
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            data-edit-mode-control="true"
            className={cn(
              "fixed bottom-4 right-4 z-50 shadow-lg gap-2",
              isEditMode && "bg-yellow-500 hover:bg-yellow-600 text-white"
            )}
          >
            {isEditMode ? (
              <>
                <Save className="h-4 w-4" />
                Mode Edit: ON
                {editedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-white text-yellow-600">
                    {editedCount}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                Mode Edit: OFF
                {editedCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {editedCount}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{editedCount} teks telah diedit di halaman ini</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
