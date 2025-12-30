import React from 'react';
import { StampElement } from './types';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Type } from 'lucide-react';

interface ElementListProps {
  elements: StampElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ElementList: React.FC<ElementListProps> = ({
  elements,
  selectedId,
  onSelect,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onDelete,
}) => {
  const sortedElements = [...elements].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-1">
      {sortedElements.map((element, index) => (
        <div
          key={element.id}
          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
            selectedId === element.id
              ? 'bg-primary/10 border border-primary/30'
              : 'hover:bg-muted'
          }`}
          onClick={() => onSelect(element.id)}
        >
          <Type className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          
          <span 
            className="flex-1 text-sm truncate"
            style={{ 
              color: element.is_visible ? element.color : 'var(--muted-foreground)',
              opacity: element.is_visible ? 1 : 0.5 
            }}
          >
            {element.content || '(kosong)'}
          </span>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(element.id);
              }}
            >
              {element.is_visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(element.id);
              }}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={index === sortedElements.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(element.id);
              }}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(element.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      {elements.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada elemen. Klik "+ Tambah Teks" untuk menambah.
        </p>
      )}
    </div>
  );
};
