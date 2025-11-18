import { useState, useRef, useEffect } from "react";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface EditableTextProps {
  keyId: string;
  defaultValue: string;
  page: string;
  category?: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children?: React.ReactNode;
}

export const EditableText = ({
  keyId,
  defaultValue,
  page,
  category = "auto",
  as: Tag = "span",
  className,
  children,
}: EditableTextProps) => {
  const { getContent, updateContent, isEditMode, isSuperAdmin } = useEditableContent();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const content = getContent(keyId, defaultValue);

  useEffect(() => {
    if (isEditing) {
      setEditValue(content);
    }
  }, [isEditing, content]);

  const handleDoubleClick = () => {
    if (isEditMode && isSuperAdmin) {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    await updateContent(keyId, editValue, page, category);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(content);
  };

  const handleOpenInManager = () => {
    navigate(`/edit-page?key=${encodeURIComponent(keyId)}`);
  };

  if (isEditing) {
    return (
      <div className="relative inline-block w-full">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full min-h-[60px] p-2 border border-primary rounded bg-background text-foreground"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCancel();
            if (e.key === "Enter" && e.ctrlKey) handleSave();
          }}
        />
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" variant="ghost" onClick={handleOpenInManager}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in Manager
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={textRef}
      className={cn("relative inline-block", className)}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Tag
        className={cn(
          isEditMode && isSuperAdmin && "cursor-pointer hover:bg-primary/10 rounded px-1 transition-colors",
          isEditMode && isSuperAdmin && isHovered && "outline outline-2 outline-primary/50"
        )}
      >
        {children || content}
      </Tag>
      {isEditMode && isSuperAdmin && isHovered && (
        <div className="absolute -top-6 left-0 flex gap-1 bg-primary text-primary-foreground px-2 py-1 rounded text-xs whitespace-nowrap z-50">
          <Pencil className="h-3 w-3" />
          <span>Double-click to edit</span>
        </div>
      )}
    </div>
  );
};
