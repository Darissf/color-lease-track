import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TemplateSettings, colorPresets } from './types';
import { Check } from 'lucide-react';

interface ColorsSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
}

export const ColorsSection: React.FC<ColorsSectionProps> = ({
  settings,
  updateSetting,
}) => {
  const applyPreset = (presetKey: string) => {
    const preset = colorPresets[presetKey as keyof typeof colorPresets];
    if (preset) {
      updateSetting('color_preset', presetKey);
      updateSetting('header_color_primary', preset.primary);
      updateSetting('header_color_secondary', preset.secondary);
      updateSetting('border_color', preset.border);
      updateSetting('accent_color', preset.accent);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Tema Cepat</Label>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(colorPresets).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                settings.color_preset === key 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-1 mb-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: preset.primary }}
                />
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: preset.secondary }}
                />
                <div 
                  className="w-4 h-4 rounded-full border" 
                  style={{ backgroundColor: preset.border }}
                />
              </div>
              <span className="text-xs font-medium">{preset.name}</span>
              {settings.color_preset === key && (
                <div className="absolute top-1 right-1">
                  <Check className="h-3 w-3 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="space-y-4 pt-4 border-t">
        <Label className="text-sm font-medium text-muted-foreground">Kustomisasi Warna</Label>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Warna Utama</Label>
            <div className="flex gap-2">
              <div 
                className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ backgroundColor: settings.header_color_primary }}
                onClick={() => document.getElementById('primary-color')?.click()}
              />
              <Input
                id="primary-color"
                type="color"
                value={settings.header_color_primary}
                onChange={(e) => {
                  updateSetting('header_color_primary', e.target.value);
                  updateSetting('color_preset', 'custom');
                }}
                className="w-full h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Warna Sekunder</Label>
            <div className="flex gap-2">
              <div 
                className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ backgroundColor: settings.header_color_secondary }}
                onClick={() => document.getElementById('secondary-color')?.click()}
              />
              <Input
                id="secondary-color"
                type="color"
                value={settings.header_color_secondary}
                onChange={(e) => {
                  updateSetting('header_color_secondary', e.target.value);
                  updateSetting('color_preset', 'custom');
                }}
                className="w-full h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Warna Border</Label>
            <div className="flex gap-2">
              <div 
                className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ backgroundColor: settings.border_color }}
                onClick={() => document.getElementById('border-color')?.click()}
              />
              <Input
                id="border-color"
                type="color"
                value={settings.border_color}
                onChange={(e) => {
                  updateSetting('border_color', e.target.value);
                  updateSetting('color_preset', 'custom');
                }}
                className="w-full h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Warna Aksen</Label>
            <div className="flex gap-2">
              <div 
                className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ backgroundColor: settings.accent_color }}
                onClick={() => document.getElementById('accent-color')?.click()}
              />
              <Input
                id="accent-color"
                type="color"
                value={settings.accent_color}
                onChange={(e) => {
                  updateSetting('accent_color', e.target.value);
                  updateSetting('color_preset', 'custom');
                }}
                className="w-full h-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gradient Preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Preview Header Gradient</Label>
        <div 
          className="h-12 rounded-lg"
          style={{ 
            background: `linear-gradient(135deg, ${settings.header_color_primary}, ${settings.header_color_secondary})` 
          }}
        />
      </div>
    </div>
  );
};
