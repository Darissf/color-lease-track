import React, { useState } from 'react';
import { StampElement, fontFamilies } from './types';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw, Palette, Type, Move } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MultiSelectPropertiesProps {
  elements: StampElement[];
  onUpdate: (updates: Partial<StampElement>) => void;
}

export const MultiSelectProperties: React.FC<MultiSelectPropertiesProps> = ({
  elements,
  onUpdate,
}) => {
  const [rotationDelta, setRotationDelta] = useState(0);
  const [scaleDelta, setScaleDelta] = useState(100);

  // Get common values if all elements share the same value
  const commonColor = elements.every(el => el.color === elements[0]?.color) 
    ? elements[0]?.color 
    : undefined;

  const handleRotateAll = (delta: number) => {
    elements.forEach(el => {
      const newRotation = el.rotation + delta;
      // We need individual updates, so we'll use the parent's updateElement
    });
    // For simplicity, we'll set all to the same delta from their current
    setRotationDelta(delta);
  };

  const handleApplyRotation = () => {
    onUpdate({ rotation: rotationDelta });
  };

  const handleApplyScale = () => {
    // Scale applies as percentage of current font size
    const scaleFactor = scaleDelta / 100;
    // This will multiply current font sizes - handled in parent
  };

  return (
    <div className="space-y-4 p-4">
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <p className="text-sm font-medium">{elements.length} elemen dipilih</p>
        <p className="text-xs text-muted-foreground mt-1">
          Ctrl+A untuk pilih semua, Shift+Click untuk tambah ke seleksi
        </p>
      </div>

      {/* Rotate All */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <RotateCcw className="h-3 w-3" />
          Rotasi Semua ({rotationDelta}°)
        </Label>
        <Slider
          value={[rotationDelta]}
          min={-180}
          max={180}
          step={5}
          onValueChange={([value]) => setRotationDelta(value)}
        />
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onUpdate({ rotation: rotationDelta })}
        >
          Terapkan Rotasi ke Semua
        </Button>
      </div>

      {/* Scale All */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <Type className="h-3 w-3" />
          Skala Ukuran Font ({scaleDelta}%)
        </Label>
        <Slider
          value={[scaleDelta]}
          min={50}
          max={200}
          step={10}
          onValueChange={([value]) => setScaleDelta(value)}
        />
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => {
            const avgFontSize = elements.reduce((acc, el) => acc + el.font_size, 0) / elements.length;
            const newSize = Math.round(avgFontSize * (scaleDelta / 100));
            onUpdate({ font_size: Math.max(8, Math.min(48, newSize)) });
          }}
        >
          Terapkan Skala ke Semua
        </Button>
      </div>

      {/* Change Color All */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <Palette className="h-3 w-3" />
          Warna Semua
        </Label>
        <div className="flex gap-2">
          <Input
            type="color"
            defaultValue={commonColor || '#047857'}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-12 h-9 p-1 cursor-pointer"
          />
          <Input
            defaultValue={commonColor || '#047857'}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="flex-1 h-9 text-xs"
            placeholder="Warna hex..."
          />
        </div>
      </div>

      {/* Font Family All */}
      <div className="space-y-2">
        <Label className="text-xs">Font Semua</Label>
        <Select
          onValueChange={(value) => onUpdate({ font_family: value })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Pilih font..." />
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

      {/* Position Alignment */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <Move className="h-3 w-3" />
          Rata Posisi
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onUpdate({ position_x: 25 })}
          >
            Kiri
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onUpdate({ position_x: 50 })}
          >
            Tengah
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onUpdate({ position_x: 75 })}
          >
            Kanan
          </Button>
        </div>
      </div>

      {/* Reset */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full text-muted-foreground"
        onClick={() => {
          setRotationDelta(0);
          setScaleDelta(100);
        }}
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Reset Pengaturan Grup
      </Button>
    </div>
  );
};