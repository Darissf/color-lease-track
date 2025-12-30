import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw, Save, Loader2 } from 'lucide-react';

interface DesignerToolbarProps {
  onAddText: () => void;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
  hasChanges: boolean;
}

export const DesignerToolbar: React.FC<DesignerToolbarProps> = ({
  onAddText,
  onReset,
  onSave,
  saving,
  hasChanges,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30">
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
