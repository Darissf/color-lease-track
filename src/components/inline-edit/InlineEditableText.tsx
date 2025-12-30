import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

interface InlineEditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
}

const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onSave,
  className,
  style,
  multiline = false,
  placeholder = "Click to edit...",
  as: Component = "span",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const commonProps = {
      ref: inputRef as any,
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        setEditValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      className: cn(
        "bg-background border-2 border-primary rounded px-2 py-1 outline-none",
        "min-w-[100px] w-full",
        className
      ),
      style: {
        ...style,
        fontFamily: style?.fontFamily || "inherit",
        fontSize: style?.fontSize || "inherit",
        fontWeight: style?.fontWeight || "inherit",
        color: style?.color || "inherit",
      },
      placeholder,
    };

    if (multiline) {
      return (
        <textarea
          {...commonProps}
          rows={3}
          className={cn(commonProps.className, "resize-y min-h-[60px]")}
        />
      );
    }

    return <input type="text" {...commonProps} />;
  }

  return (
    <Component
      className={cn(
        "cursor-pointer relative inline-block transition-all duration-200",
        "hover:bg-primary/10 hover:outline hover:outline-2 hover:outline-primary hover:outline-dashed rounded px-1 -mx-1",
        !value && "text-muted-foreground italic",
        className
      )}
      style={style}
      onClick={() => setIsEditing(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {value || placeholder}
      {isHovered && (
        <Pencil className="inline-block ml-1 h-3 w-3 text-primary opacity-70" />
      )}
    </Component>
  );
};

export default InlineEditableText;
