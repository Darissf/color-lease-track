import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Square, Circle } from 'lucide-react';

export interface CanvasSettingsData {
  shape: 'rectangle' | 'circle' | 'oval';
  width: number;
  height: number;
  borderWidth: number;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
  borderColor: string;
  rotation: number;
}

interface CanvasSettingsProps {
  settings: CanvasSettingsData;
  onChange: (settings: CanvasSettingsData) => void;
}

const sizePresets = {
  small: { width: 150, height: 80 },
  medium: { width: 220, height: 120 },
  large: { width: 300, height: 160 },
};

export const CanvasSettings: React.FC<CanvasSettingsProps> = ({ settings, onChange }) => {
  const updateSetting = <K extends keyof CanvasSettingsData>(key: K, value: CanvasSettingsData[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const applyPreset = (preset: 'small' | 'medium' | 'large') => {
    const size = sizePresets[preset];
    onChange({ 
      ...settings, 
      width: size.width, 
      height: settings.shape === 'circle' ? size.width : size.height 
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="font-semibold text-sm">Pengaturan Canvas</h3>

      {/* Shape Selection */}
      <div className="space-y-2">
        <Label className="text-xs">Bentuk Stempel</Label>
        <ToggleGroup
          type="single"
          value={settings.shape}
          onValueChange={(value) => {
            if (value) {
              const newShape = value as CanvasSettingsData['shape'];
              updateSetting('shape', newShape);
              // If circle, make height equal to width
              if (newShape === 'circle') {
                updateSetting('height', settings.width);
              }
            }
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="rectangle" aria-label="Persegi" className="gap-1">
            <Square className="h-4 w-4" />
            <span className="text-xs">Persegi</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="circle" aria-label="Lingkaran" className="gap-1">
            <Circle className="h-4 w-4" />
            <span className="text-xs">Lingkaran</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="oval" aria-label="Oval" className="gap-1">
            <Circle className="h-4 w-4" style={{ transform: 'scaleX(1.3)' }} />
            <span className="text-xs">Oval</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Size Presets */}
      <div className="space-y-2">
        <Label className="text-xs">Ukuran</Label>
        <ToggleGroup
          type="single"
          onValueChange={(value) => value && applyPreset(value as 'small' | 'medium' | 'large')}
          className="justify-start"
        >
          <ToggleGroupItem value="small" className="text-xs">S</ToggleGroupItem>
          <ToggleGroupItem value="medium" className="text-xs">M</ToggleGroupItem>
          <ToggleGroupItem value="large" className="text-xs">L</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Custom Size */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Lebar (px)</Label>
          <Input
            type="number"
            value={settings.width}
            onChange={(e) => {
              const width = parseInt(e.target.value) || 100;
              updateSetting('width', width);
              if (settings.shape === 'circle') {
                updateSetting('height', width);
              }
            }}
            min={80}
            max={400}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tinggi (px)</Label>
          <Input
            type="number"
            value={settings.height}
            onChange={(e) => updateSetting('height', parseInt(e.target.value) || 60)}
            min={60}
            max={400}
            disabled={settings.shape === 'circle'}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Border Settings */}
      <div className="space-y-2">
        <Label className="text-xs">Tebal Border: {settings.borderWidth}px</Label>
        <Slider
          value={[settings.borderWidth]}
          onValueChange={(v) => updateSetting('borderWidth', v[0])}
          min={1}
          max={8}
          step={1}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Style Border</Label>
          <Select
            value={settings.borderStyle}
            onValueChange={(v) => updateSetting('borderStyle', v as CanvasSettingsData['borderStyle'])}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
              <SelectItem value="double">Double</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Warna Border</Label>
          <Input
            type="color"
            value={settings.borderColor}
            onChange={(e) => updateSetting('borderColor', e.target.value)}
            className="h-8 w-full p-1 cursor-pointer"
          />
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <Label className="text-xs">Rotasi: {settings.rotation}°</Label>
        <Slider
          value={[settings.rotation]}
          onValueChange={(v) => updateSetting('rotation', v[0])}
          min={-45}
          max={45}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  );
};
