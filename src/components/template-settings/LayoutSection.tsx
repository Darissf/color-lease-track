import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { TemplateSettings } from './types';

interface LayoutSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
}

export const LayoutSection: React.FC<LayoutSectionProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <div className="space-y-6">
      {/* Logo Position */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Posisi Logo</Label>
        <Select
          value={settings.logo_position}
          onValueChange={(value) => updateSetting('logo_position', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Kiri</SelectItem>
            <SelectItem value="center">Tengah</SelectItem>
            <SelectItem value="right">Kanan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Header Stripe */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Stripe Header</Label>
          <Switch
            checked={settings.show_header_stripe}
            onCheckedChange={(checked) => updateSetting('show_header_stripe', checked)}
          />
        </div>
        
        {settings.show_header_stripe && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Tinggi Stripe</Label>
                <span className="text-sm">{settings.header_stripe_height}px</span>
              </div>
              <Slider
                value={[settings.header_stripe_height]}
                onValueChange={([value]) => updateSetting('header_stripe_height', value)}
                min={0}
                max={20}
                step={1}
              />
            </div>

            <Select
              value={settings.header_stripe_style}
              onValueChange={(value) => updateSetting('header_stripe_style', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Gaya stripe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="none">Tidak ada</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Table Styling */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Gaya Tabel</Label>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Background Header</Label>
            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded border cursor-pointer"
                style={{ backgroundColor: settings.table_header_bg }}
              />
              <Input
                type="color"
                value={settings.table_header_bg}
                onChange={(e) => updateSetting('table_header_bg', e.target.value)}
                className="flex-1 h-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Teks Header</Label>
            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded border cursor-pointer"
                style={{ backgroundColor: settings.table_header_text_color }}
              />
              <Input
                type="color"
                value={settings.table_header_text_color}
                onChange={(e) => updateSetting('table_header_text_color', e.target.value)}
                className="flex-1 h-8"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Gaya Border</Label>
          <Select
            value={settings.table_border_style}
            onValueChange={(value) => updateSetting('table_border_style', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="none">Tanpa border</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Baris Bergantian</Label>
            <p className="text-xs text-muted-foreground">Warna berbeda untuk baris genap</p>
          </div>
          <Switch
            checked={settings.table_alternating_rows}
            onCheckedChange={(checked) => updateSetting('table_alternating_rows', checked)}
          />
        </div>

        {settings.table_alternating_rows && (
          <div className="space-y-2">
            <Label className="text-xs">Warna Baris Genap</Label>
            <div className="flex gap-2">
              <div 
                className="w-8 h-8 rounded border cursor-pointer"
                style={{ backgroundColor: settings.table_alternating_color }}
              />
              <Input
                type="color"
                value={settings.table_alternating_color}
                onChange={(e) => updateSetting('table_alternating_color', e.target.value)}
                className="flex-1 h-8"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
