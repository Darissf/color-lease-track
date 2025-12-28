import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { TemplateSettings, fontFamilies, headerStyles } from './types';

interface TypographySectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
}

export const TypographySection: React.FC<TypographySectionProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <div className="space-y-6">
      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Font Utama</Label>
        <Select
          value={settings.font_family}
          onValueChange={(value) => updateSetting('font_family', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Heading Font */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Font Heading</Label>
        <Select
          value={settings.heading_font}
          onValueChange={(value) => updateSetting('heading_font', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">Sama dengan font utama</SelectItem>
            {fontFamilies.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Base Font Size */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Ukuran Font Dasar</Label>
          <span className="text-sm text-muted-foreground">{settings.base_font_size}px</span>
        </div>
        <Slider
          value={[settings.base_font_size]}
          onValueChange={([value]) => updateSetting('base_font_size', value)}
          min={10}
          max={16}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10px</span>
          <span>16px</span>
        </div>
      </div>

      {/* Header Style */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Gaya Header</Label>
        <div className="grid grid-cols-2 gap-2">
          {headerStyles.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => updateSetting('header_style', style.value)}
              className={`p-3 rounded-lg border-2 text-sm transition-all ${
                settings.header_style === style.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Preview */}
      <div className="p-4 rounded-lg border bg-card">
        <p className="text-xs text-muted-foreground mb-2">Preview</p>
        <h3 
          className="text-lg font-bold mb-1" 
          style={{ 
            fontFamily: settings.heading_font === 'inherit' ? settings.font_family : settings.heading_font 
          }}
        >
          Judul Dokumen
        </h3>
        <p 
          style={{ 
            fontFamily: settings.font_family, 
            fontSize: `${settings.base_font_size}px` 
          }}
        >
          Contoh teks body dokumen dengan font dan ukuran yang dipilih.
        </p>
      </div>
    </div>
  );
};
