import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw, Save, Loader2, Square, Circle } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface DesignerToolbarProps {
  onAddText: () => void;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
  hasChanges: boolean;
  canvasShape: 'rectangle' | 'circle' | 'oval';
  onShapeChange: (shape: 'rectangle' | 'circle' | 'oval') => void;
}

export const DesignerToolbar: React.FC<DesignerToolbarProps> = ({
  onAddText,
  onReset,
  onSave,
  saving,
  hasChanges,
  canvasShape,
  onShapeChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30 flex-wrap">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAddText}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah Teks
        </Button>
        
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Bentuk:</span>
        <ToggleGroup
          type="single"
          value={canvasShape}
          onValueChange={(value) => value && onShapeChange(value as 'rectangle' | 'circle' | 'oval')}
          size="sm"
        >
          <ToggleGroupItem value="rectangle" aria-label="Persegi" className="h-7 w-7 p-0">
            <Square className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="circle" aria-label="Lingkaran" className="h-7 w-7 p-0">
            <Circle className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="oval" aria-label="Oval" className="h-7 w-7 p-0">
            <Circle className="h-3.5 w-4.5" style={{ transform: 'scaleX(1.3)' }} />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Button 
        size="sm" 
        onClick={onSave} 
        disabled={saving || !hasChanges}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-1" />
        )}
        Simpan
      </Button>
    </div>
  );
};
