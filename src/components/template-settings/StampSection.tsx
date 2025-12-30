import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { TemplateSettings, LayoutSettings, fontFamilies } from './types';
import { DynamicStamp } from '@/components/documents/DynamicStamp';
import { CustomStampRenderer } from '@/components/documents/CustomStampRenderer';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface StampSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
  onFileSelect: (file: File, target: string) => void;
  onRemoveImage: (field: string) => void;
  uploading: boolean;
  activeTab: 'invoice' | 'receipt';
  layoutSettings: LayoutSettings;
  updateLayoutSetting: (key: string, value: any) => void;
}

export const StampSection: React.FC<StampSectionProps> = ({
  settings,
  updateSetting,
  onFileSelect,
  onRemoveImage,
  uploading,
  activeTab,
  layoutSettings,
  updateLayoutSetting,
}) => {
  const stampInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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

          {/* Stamp Source Toggle */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <Label className="text-xs font-medium text-muted-foreground">Sumber Stempel:</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={settings.stamp_source !== 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('stamp_source', 'built-in')}
                className="w-full"
              >
                Stempel Bawaan
              </Button>
              <Button
                type="button"
                variant={settings.stamp_source === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('stamp_source', 'custom')}
                className="w-full"
              >
                Custom Stempel
              </Button>
            </div>
            
            {settings.stamp_source === 'custom' && (
              <div className="mt-3 p-3 bg-background rounded border">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">Custom Stempel Designer</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate('/vip/settings/custom-stamp')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Edit Stempel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Stempel yang Anda desain di Custom Stamp Designer akan ditampilkan di dokumen.
                </p>
                {/* Preview of custom stamp */}
                <div className="flex justify-center py-3 bg-white rounded border">
                  <CustomStampRenderer
                    documentNumber="INV-2025-0001"
                    companyName={settings.company_name || 'Perusahaan'}
                    scale={layoutSettings.stamp_scale || 1}
                    rotation={0}
                    opacity={settings.stamp_opacity}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stamp Type - Only show for built-in */}
          {settings.stamp_source !== 'custom' && (
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
          )}

          {/* Custom Text Toggle */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Gunakan Teks Kustom</Label>
              <Switch
                checked={settings.stamp_use_custom_text || false}
                onCheckedChange={(checked) => updateSetting('stamp_use_custom_text', checked)}
              />
            </div>
            {settings.stamp_use_custom_text && (
              <div className="space-y-2">
                <Label className="text-xs">Teks Stempel</Label>
                <Input
                  value={settings.stamp_custom_text || 'LUNAS'}
                  onChange={(e) => updateSetting('stamp_custom_text', e.target.value.toUpperCase())}
                  placeholder="Masukkan teks stempel"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">Contoh: LUNAS, DIBAYAR, APPROVED, VERIFIED</p>
              </div>
            )}
          </div>

          {/* Free Positioning (X/Y) - Per Document Type */}
          <div className="space-y-4 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Posisi Bebas di Dokumen:</Label>
              <Badge variant={activeTab === 'invoice' ? 'default' : 'secondary'}>
                {activeTab === 'invoice' ? 'Invoice' : 'Kwitansi'}
              </Badge>
            </div>
            
            {/* Horizontal Position */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Posisi Horizontal (X)</Label>
                <span className="text-sm">{layoutSettings.stamp_position_x ?? 10}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Kiri</span>
                <Slider
                  value={[layoutSettings.stamp_position_x ?? 10]}
                  onValueChange={([value]) => updateLayoutSetting('stamp_position_x', value)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">Kanan</span>
              </div>
            </div>

            {/* Vertical Position */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Posisi Vertikal (Y)</Label>
                <span className="text-sm">{layoutSettings.stamp_position_y ?? 70}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Atas</span>
                <Slider
                  value={[layoutSettings.stamp_position_y ?? 70]}
                  onValueChange={([value]) => updateLayoutSetting('stamp_position_y', value)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">Bawah</span>
              </div>
            </div>
          </div>

          {/* Scale Slider - Per Document Type */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Skala Stempel</Label>
              <span className="text-sm">{(layoutSettings.stamp_scale || 1).toFixed(1)}x</span>
            </div>
            <Slider
              value={[(layoutSettings.stamp_scale || 1) * 100]}
              onValueChange={([value]) => updateLayoutSetting('stamp_scale', value / 100)}
              min={50}
              max={200}
              step={10}
            />
            <p className="text-xs text-muted-foreground">0.5x (kecil) - 2.0x (besar)</p>
          </div>

          {/* Rotation - Per Document Type */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Rotasi</Label>
              <span className="text-sm">{layoutSettings.stamp_rotation || -8}°</span>
            </div>
            <Slider
              value={[layoutSettings.stamp_rotation || -8]}
              onValueChange={([value]) => updateLayoutSetting('stamp_rotation', value)}
              min={-45}
              max={45}
              step={1}
            />
          </div>

          {/* Size - Only for built-in */}
          {settings.stamp_source !== 'custom' && (
            <div className="space-y-2">
              <Label className="text-xs">Ukuran Preset</Label>
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
          )}

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
                    <Button type="button" variant="outline" size="sm" onClick={() => onRemoveImage('custom_stamp_url')}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center py-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => stampInputRef.current?.click()}
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">Upload stempel custom</span>
                </div>
              )}
              <input
                ref={stampInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">Format: PNG dengan background transparan</p>
          </div>

          {/* Preview Stamp */}
          <div className="space-y-2 p-4 rounded-lg border bg-white">
            <Label className="text-xs font-medium text-muted-foreground">Preview Stempel:</Label>
            <div className="flex justify-center py-4">
              {settings.stamp_source === 'custom' ? (
                <CustomStampRenderer
                  documentNumber="INV-2025-0001"
                  companyName={settings.company_name || 'Perusahaan'}
                  scale={layoutSettings.stamp_scale || 1}
                  rotation={layoutSettings.stamp_rotation || -8}
                  opacity={settings.stamp_opacity}
                />
              ) : (
                <DynamicStamp
                  status="LUNAS"
                  date={format(new Date(), 'dd/MM/yyyy')}
                  documentNumber="INV-2025-0001"
                  companyName={settings.company_name || 'Perusahaan'}
                  settings={{
                    ...settings,
                    stamp_rotation: layoutSettings.stamp_rotation,
                    stamp_scale: layoutSettings.stamp_scale,
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};