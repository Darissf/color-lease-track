import React, { useState, useRef, useEffect } from 'react';
import { CustomTextElement } from './types';
import { GripVertical, RotateCw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DraggableTextBoxProps {
  element: CustomTextElement;
  isSelected: boolean;
  isEditing?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CustomTextElement>) => void;
  onDelete: () => void;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const DraggableTextBox: React.FC<DraggableTextBoxProps> = ({
  element,
  isSelected,
  isEditing,
  onSelect,
  onUpdate,
  onDelete,
  containerRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState(element.content);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditText(element.content);
  }, [element.content]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing || isEditingText) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    onSelect();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newX = ((e.clientX - rect.left) / rect.width) * 100;
    const newY = ((e.clientY - rect.top) / rect.height) * 100;
    
    onUpdate({
      position_x: Math.max(0, Math.min(100, newX)),
      position_y: Math.max(0, Math.min(100, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    setIsEditingText(true);
  };

  const handleTextBlur = () => {
    setIsEditingText(false);
    if (editText !== element.content) {
      onUpdate({ content: editText });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextBlur();
    }
    if (e.key === 'Escape') {
      setEditText(element.content);
      setIsEditingText(false);
    }
  };

  if (!element.is_visible && !isEditing) return null;

  return (
    <div
      ref={boxRef}
      className={`absolute select-none ${isEditing ? 'cursor-move' : ''} ${isSelected && isEditing ? 'ring-2 ring-primary ring-offset-1' : ''}`}
      style={{
        left: `${element.position_x}%`,
        top: `${element.position_y}%`,
        transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
        fontSize: `${element.font_size}px`,
        fontFamily: element.font_family,
        fontWeight: element.font_weight,
        color: element.font_color,
        textAlign: element.text_align as any,
        zIndex: isSelected ? 100 : 50,
        opacity: element.is_visible ? 1 : 0.5,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        if (isEditing) {
          e.stopPropagation();
          onSelect();
        }
      }}
    >
      {isEditingText ? (
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="min-w-[100px] text-center"
          style={{ fontSize: `${element.font_size}px`, fontFamily: element.font_family }}
        />
      ) : (
        <div className="whitespace-nowrap px-2 py-1 rounded">
          {element.content}
        </div>
      )}

      {isSelected && isEditing && !isEditingText && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1 bg-background border rounded-md shadow-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
};
