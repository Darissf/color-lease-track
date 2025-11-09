import { useState, useEffect, useRef } from "react";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

interface EditableTextProps {
  contentKey: string;
  defaultValue: string;
  category?: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export function EditableText({ 
  contentKey, 
  defaultValue, 
  category = "general",
  className,
  as: Component = "span",
  children
}: EditableTextProps) {
  const { isEditMode, isSuperAdmin, getContent, updateContent } = useEditableContent();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const currentPage = location.pathname;

  const displayValue = getContent(contentKey, defaultValue);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (isEditMode && isSuperAdmin) {
      setEditValue(displayValue);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (editValue.trim() && editValue !== displayValue) {
      await updateContent(contentKey, editValue.trim(), currentPage, category);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "bg-yellow-50 border-2 border-yellow-400 rounded px-2 py-1 outline-none",
          className
        )}
      />
    );
  }

  return (
    <Component
      onDoubleClick={handleDoubleClick}
      className={cn(
        isEditMode && isSuperAdmin && "cursor-pointer hover:bg-yellow-50 hover:outline hover:outline-2 hover:outline-yellow-400 transition-all rounded px-1",
        className
      )}
      title={isEditMode && isSuperAdmin ? "Double click untuk edit" : undefined}
    >
      {children || displayValue}
    </Component>
  );
}
