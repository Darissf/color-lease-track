import React from 'react';
import { StampElement, fontFamilies, fontWeights } from './types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ElementPropertiesProps {
  element: StampElement | null;
  onUpdate: (id: string, updates: Partial<StampElement>) => void;
  onDelete: (id: string) => void;
}

export const ElementProperties: React.FC<ElementPropertiesProps> = ({
  element,
  onUpdate,
  onDelete,
}) => {
  if (!element) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">Pilih elemen untuk mengedit propertinya</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-xs">Teks</Label>
        <Input
          value={element.content}
          onChange={(e) => onUpdate(element.id, { content: e.target.value })}
          placeholder="Masukkan teks..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Font</Label>
          <Select
            value={element.font_family}
            onValueChange={(value) => onUpdate(element.id, { font_family: value })}
          >
            <SelectTrigger className="h-9">
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
          <Label className="text-xs">Ketebalan</Label>
          <Select
            value={element.font_weight}
            onValueChange={(value) => onUpdate(element.id, { font_weight: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontWeights.map((weight) => (
                <SelectItem key={weight.value} value={weight.value}>
                  {weight.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Ukuran ({element.font_size}px)</Label>
          <Slider
            value={[element.font_size]}
            min={8}
            max={48}
            step={1}
            onValueChange={([value]) => onUpdate(element.id, { font_size: value })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Warna</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={element.color}
              onChange={(e) => onUpdate(element.id, { color: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              value={element.color}
              onChange={(e) => onUpdate(element.id, { color: e.target.value })}
              className="flex-1 h-9 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Rotasi ({element.rotation}°)</Label>
        <Slider
          value={[element.rotation]}
          min={-180}
          max={180}
          step={1}
          onValueChange={([value]) => onUpdate(element.id, { rotation: value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Posisi X ({Math.round(element.position_x)}%)</Label>
          <Slider
            value={[element.position_x]}
            min={0}
            max={300}
            step={1}
            onValueChange={([value]) => onUpdate(element.id, { position_x: value })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Posisi Y ({Math.round(element.position_y)}%)</Label>
          <Slider
            value={[element.position_y]}
            min={0}
            max={300}
            step={1}
            onValueChange={([value]) => onUpdate(element.id, { position_y: value })}
          />
        </div>
      </div>

      <Button
        variant="destructive"
        size="sm"
        className="w-full mt-4"
        onClick={() => onDelete(element.id)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Hapus Elemen
      </Button>
    </div>
  );
};
