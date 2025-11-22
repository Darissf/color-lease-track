import { useState, useRef, useEffect } from "react";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { Pencil, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EditableTextProps {
  contentKey: string;
  defaultValue: string;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  className?: string;
  page?: string;
  category?: string;
}

export const EditableText = ({
  contentKey,
  defaultValue,
  tag: Tag = "p",
  className = "",
  page = "landing",
  category = "general",
}: EditableTextProps) => {
  const { getContent, updateContent, isSuperAdmin } = useEditableContent();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const content = getContent(contentKey, defaultValue);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (!isSuperAdmin) return;
    setEditValue(content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editValue.trim() !== content) {
      await updateContent(contentKey, editValue.trim(), page, category);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue("");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isSuperAdmin) {
    return <Tag className={className}>{content}</Tag>;
  }

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {!isEditing ? (
        <>
          <Tag
            className={`${className} ${
              isHovering ? "ring-2 ring-blue-400 ring-offset-2 rounded" : ""
            } transition-all cursor-pointer`}
            onClick={handleEdit}
          >
            {content}
          </Tag>

          <AnimatePresence>
            {isHovering && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleEdit}
                className="absolute -top-2 -right-2 p-1.5 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 z-50"
              >
                <Pencil className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="relative">
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${className} w-full p-2 border-2 border-blue-500 rounded resize-none`}
            rows={Math.min(editValue.split("\n").length + 1, 10)}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ctrl+Enter to save, Esc to cancel
          </p>
        </div>
      )}
    </div>
  );
};
