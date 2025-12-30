import React from 'react';
import { StampElement } from './types';
import { GripVertical } from 'lucide-react';

export interface DraggableElementProps {
  element: StampElement;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onDrag?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.MouseEvent) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const DraggableElement: React.FC<DraggableElementProps> = ({
  element,
  isSelected,
  onSelect,
  onDrag,
  onDragStart,
}) => {
  if (!element.is_visible) return null;

  return (
    <div
      className={`absolute cursor-move select-none transition-all ${
        isSelected 
          ? 'ring-2 ring-primary ring-offset-1 z-10' 
          : 'hover:ring-1 hover:ring-primary/50'
      }`}
      style={{
        left: `${element.position_x}%`,
        top: `${element.position_y}%`,
        transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
        fontFamily: element.font_family,
        fontSize: `${element.font_size}px`,
        fontWeight: element.font_weight,
        color: element.color,
        whiteSpace: 'nowrap',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(e);
        onDragStart?.(e);
      }}
      onMouseMove={(e) => {
        if (e.buttons === 1) {
          onDrag?.(e);
        }
      }}
    >
      {isSelected && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
          <GripVertical className="h-3 w-3 inline mr-1" />
          Drag
        </div>
      )}
      {element.content}
    </div>
  );
};
