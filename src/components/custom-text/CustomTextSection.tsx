import React from 'react';
import { CustomTextElement, defaultCustomTextElement } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CustomTextSectionProps {
  elements: CustomTextElement[];
  selectedElementId: string | null;
  documentType: 'invoice' | 'receipt';
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<CustomTextElement>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string | null) => void;
}

const fontFamilies = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Segoe UI', label: 'Segoe UI' },
];

export const CustomTextSection: React.FC<CustomTextSectionProps> = ({
  elements,
  selectedElementId,
  documentType,
  onAdd,
  onUpdate,
  onDelete,
  onSelect,
}) => {
  const filteredElements = elements.filter(el => el.document_type === documentType);
  const selectedElement = filteredElements.find(el => el.id === selectedElementId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Custom Text Boxes</Label>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </div>

      {filteredElements.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Belum ada custom text. Klik "Tambah" untuk menambahkan.
        </p>
      ) : (
        <div className="space-y-2">
          {filteredElements.map((element) => (
            <Card
              key={element.id}
              className={`p-3 cursor-pointer transition-colors ${selectedElementId === element.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
              onClick={() => onSelect(element.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(element.id, { is_visible: !element.is_visible });
                    }}
                  >
                    {element.is_visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                  <span className="text-sm truncate">{element.content}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(element.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedElement && (
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label className="text-xs">Teks</Label>
            <Input
              value={selectedElement.content}
              onChange={(e) => onUpdate(selectedElement.id, { content: e.target.value })}
              placeholder="Masukkan teks..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Font</Label>
              <Select
                value={selectedElement.font_family}
                onValueChange={(value) => onUpdate(selectedElement.id, { font_family: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Ukuran: {selectedElement.font_size}px</Label>
              <Slider
                value={[selectedElement.font_size]}
                onValueChange={([value]) => onUpdate(selectedElement.id, { font_size: value })}
                min={8}
                max={72}
                step={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Warna</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={selectedElement.font_color}
                  onChange={(e) => onUpdate(selectedElement.id, { font_color: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={selectedElement.font_color}
                  onChange={(e) => onUpdate(selectedElement.id, { font_color: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tebal</Label>
              <Select
                value={selectedElement.font_weight}
                onValueChange={(value) => onUpdate(selectedElement.id, { font_weight: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="lighter">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Rotasi: {selectedElement.rotation}°</Label>
            <Slider
              value={[selectedElement.rotation]}
              onValueChange={([value]) => onUpdate(selectedElement.id, { rotation: value })}
              min={-180}
              max={180}
              step={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Posisi X: {selectedElement.position_x.toFixed(0)}%</Label>
              <Slider
                value={[selectedElement.position_x]}
                onValueChange={([value]) => onUpdate(selectedElement.id, { position_x: value })}
                min={0}
                max={300}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Posisi Y: {selectedElement.position_y.toFixed(0)}%</Label>
              <Slider
                value={[selectedElement.position_y]}
                onValueChange={([value]) => onUpdate(selectedElement.id, { position_y: value })}
                min={0}
                max={300}
                step={1}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
