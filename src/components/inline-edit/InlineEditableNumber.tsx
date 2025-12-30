import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatRupiah, parseRupiah } from "@/lib/currency";
import { Pencil } from "lucide-react";

interface InlineEditableNumberProps {
  value: number;
  onSave: (newValue: number) => void;
  className?: string;
  style?: React.CSSProperties;
  showCurrency?: boolean;
}

const InlineEditableNumber: React.FC<InlineEditableNumberProps> = ({
  value,
  onSave,
  className,
  style,
  showCurrency = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value.toString());
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    const numValue = parseRupiah(editValue);
    if (numValue !== value) {
      onSave(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditValue(value.toString());
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const numericValue = e.target.value.replace(/[^0-9]/g, "");
    setEditValue(numericValue);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={handleChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "bg-background border-2 border-primary rounded px-2 py-1 outline-none",
          "min-w-[120px] text-right",
          className
        )}
        style={{
          ...style,
          fontFamily: style?.fontFamily || "inherit",
          fontSize: style?.fontSize || "inherit",
          fontWeight: style?.fontWeight || "inherit",
        }}
        placeholder="0"
      />
    );
  }

  return (
    <span
      className={cn(
        "cursor-pointer relative inline-block transition-all duration-200",
        "hover:bg-primary/10 hover:outline hover:outline-2 hover:outline-primary hover:outline-dashed rounded px-1 -mx-1",
        className
      )}
      style={style}
      onClick={() => setIsEditing(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showCurrency ? formatRupiah(value) : value.toLocaleString("id-ID")}
      {isHovered && (
        <Pencil className="inline-block ml-1 h-3 w-3 text-primary opacity-70" />
      )}
    </span>
  );
};

export default InlineEditableNumber;
