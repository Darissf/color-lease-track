import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { TemplateSettings, fontFamilies } from './types';
import { DynamicStamp } from '@/components/documents/DynamicStamp';
import { format } from 'date-fns';

interface StampSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
  onFileSelect: (file: File, target: string) => void;
  onRemoveImage: (field: string) => void;
  uploading: boolean;
}

export const StampSection: React.FC<StampSectionProps> = ({
  settings,
  updateSetting,
  onFileSelect,
  onRemoveImage,
  uploading,
}) => {
  const stampInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, 'custom_stamp_url');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Aktifkan Stempel</Label>
        <Switch
          checked={settings.show_stamp}
          onCheckedChange={(checked) => updateSetting('show_stamp', checked)}
        />
      </div>

      {settings.show_stamp && (
        <>
          {/* Visibility per Document Type */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <Label className="text-xs font-medium text-muted-foreground">Tampilkan Pada:</Label>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Invoice</Label>
              <Switch
                checked={settings.show_stamp_on_invoice}
                onCheckedChange={(checked) => updateSetting('show_stamp_on_invoice', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Kwitansi</Label>
              <Switch
                checked={settings.show_stamp_on_receipt}
                onCheckedChange={(checked) => updateSetting('show_stamp_on_receipt', checked)}
              />
            </div>
          </div>

          {/* Stamp Type */}
          <div className="space-y-2">
            <Label className="text-xs">Tipe Stempel</Label>
            <Select
              value={settings.stamp_type || 'rectangle'}
              onValueChange={(value) => updateSetting('stamp_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">Persegi Panjang</SelectItem>
                <SelectItem value="circle">Lingkaran</SelectItem>
                <SelectItem value="oval">Oval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label className="text-xs">Posisi Stempel</Label>
            <Select
              value={settings.stamp_position || 'left'}
              onValueChange={(value) => updateSetting('stamp_position', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Kiri</SelectItem>
                <SelectItem value="right">Kanan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <Label className="text-xs">Ukuran Stempel</Label>
            <Select
              value={settings.stamp_size || 'md'}
              onValueChange={(value) => updateSetting('stamp_size', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Kecil</SelectItem>
                <SelectItem value="md">Sedang</SelectItem>
                <SelectItem value="lg">Besar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-xs">Font Stempel</Label>
            <Select
              value={settings.stamp_font_family || 'Courier New'}
              onValueChange={(value) => updateSetting('stamp_font_family', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Arial Black">Arial Black</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                {fontFamilies.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Ukuran Teks</Label>
              <span className="text-sm">{settings.stamp_font_size || 24}px</span>
            </div>
            <Slider
              value={[settings.stamp_font_size || 24]}
              onValueChange={([value]) => updateSetting('stamp_font_size', value)}
              min={12}
              max={36}
              step={1}
            />
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Rotasi</Label>
              <span className="text-sm">{settings.stamp_rotation || -8}°</span>
            </div>
            <Slider
              value={[settings.stamp_rotation || -8]}
              onValueChange={([value]) => updateSetting('stamp_rotation', value)}
              min={-45}
              max={45}
              step={1}
            />
          </div>

          {/* Border Width */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Ketebalan Border</Label>
              <span className="text-sm">{settings.stamp_border_width || 4}px</span>
            </div>
            <Slider
              value={[settings.stamp_border_width || 4]}
              onValueChange={([value]) => updateSetting('stamp_border_width', value)}
              min={2}
              max={8}
              step={1}
            />
          </div>

          {/* Border Style */}
          <div className="space-y-2">
            <Label className="text-xs">Gaya Border</Label>
            <Select
              value={settings.stamp_border_style || 'solid'}
              onValueChange={(value) => updateSetting('stamp_border_style', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="double">Double</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Visibility */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <Label className="text-xs font-medium text-muted-foreground">Isi Stempel:</Label>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tampilkan Tanggal</Label>
              <Switch
                checked={settings.stamp_show_date !== false}
                onCheckedChange={(checked) => updateSetting('stamp_show_date', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tampilkan No. Dokumen</Label>
              <Switch
                checked={settings.stamp_show_document_number !== false}
                onCheckedChange={(checked) => updateSetting('stamp_show_document_number', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tampilkan Nama Perusahaan</Label>
              <Switch
                checked={settings.stamp_show_company_name !== false}
                onCheckedChange={(checked) => updateSetting('stamp_show_company_name', checked)}
              />
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Warna LUNAS</Label>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: settings.stamp_color_lunas }} />
                <Input
                  type="color"
                  value={settings.stamp_color_lunas}
                  onChange={(e) => updateSetting('stamp_color_lunas', e.target.value)}
                  className="flex-1 h-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Warna BELUM LUNAS</Label>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: settings.stamp_color_belum_lunas }} />
                <Input
                  type="color"
                  value={settings.stamp_color_belum_lunas}
                  onChange={(e) => updateSetting('stamp_color_belum_lunas', e.target.value)}
                  className="flex-1 h-8"
                />
              </div>
            </div>
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Opacity Stempel</Label>
              <span className="text-sm">{settings.stamp_opacity}%</span>
            </div>
            <Slider
              value={[settings.stamp_opacity]}
              onValueChange={([value]) => updateSetting('stamp_opacity', value)}
              min={50}
              max={100}
              step={5}
            />
          </div>

          {/* Custom Stamp Upload */}
          <div className="space-y-2">
            <Label className="text-xs">Stempel Custom (Opsional)</Label>
            <div className="border-2 border-dashed rounded-lg p-3">
              {settings.custom_stamp_url ? (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZGRkIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNkZGQiLz48L3N2Zz4=')]">
                    <img src={settings.custom_stamp_url} alt="Stamp" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => stampInputRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3 w-3 mr-1" />
                      Ganti
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onRemoveImage('custom_stamp_url')} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2 cursor-pointer" onClick={() => stampInputRef.current?.click()}>
                  <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Upload gambar stempel (PNG dengan transparansi)</span>
                </div>
              )}
            </div>
            <input ref={stampInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Live Preview */}
          <div className="space-y-2 p-4 rounded-lg border bg-white">
            <Label className="text-xs font-medium text-muted-foreground">Preview Stempel:</Label>
            <div className="flex justify-center py-4">
              <DynamicStamp
                status="LUNAS"
                documentNumber="INV-2025-0001"
                companyName={settings.company_name || 'Perusahaan'}
                date={format(new Date(), 'dd/MM/yyyy')}
                settings={settings}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
