import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { TemplateSettings } from './types';

interface AdvancedSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
  onFileSelect: (file: File, target: string) => void;
  onRemoveImage: (field: string) => void;
  uploading: boolean;
}

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  settings,
  updateSetting,
  onFileSelect,
  onRemoveImage,
  uploading,
}) => {
  const stampInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, target);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Watermark */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Watermark</Label>
          <Switch
            checked={settings.show_watermark}
            onCheckedChange={(checked) => updateSetting('show_watermark', checked)}
          />
        </div>

        {settings.show_watermark && (
          <div className="space-y-3">
            <Select
              value={settings.watermark_type}
              onValueChange={(value) => updateSetting('watermark_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="logo">Gunakan Logo</SelectItem>
                <SelectItem value="text">Teks Custom</SelectItem>
              </SelectContent>
            </Select>

            {settings.watermark_type === 'text' && (
              <Input
                value={settings.watermark_text}
                onChange={(e) => updateSetting('watermark_text', e.target.value)}
                placeholder="Teks watermark"
              />
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Opacity</Label>
                <span className="text-sm">{settings.watermark_opacity}%</span>
              </div>
              <Slider
                value={[settings.watermark_opacity]}
                onValueChange={([value]) => updateSetting('watermark_opacity', value)}
                min={1}
                max={15}
                step={1}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stamp */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Stempel</Label>
          <Switch
            checked={settings.show_stamp}
            onCheckedChange={(checked) => updateSetting('show_stamp', checked)}
          />
        </div>

        {settings.show_stamp && (
          <div className="space-y-4">
            {/* Stamp Text */}
            <div className="space-y-2">
              <Label className="text-xs">Teks Stempel</Label>
              <Input
                value={settings.stamp_text}
                onChange={(e) => updateSetting('stamp_text', e.target.value)}
                placeholder="LUNAS"
              />
            </div>

            {/* Stamp Color */}
            <div className="space-y-2">
              <Label className="text-xs">Warna Stempel</Label>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded border" style={{ backgroundColor: settings.stamp_color }} />
                <Input
                  type="color"
                  value={settings.stamp_color}
                  onChange={(e) => updateSetting('stamp_color', e.target.value)}
                  className="flex-1 h-8"
                />
              </div>
            </div>

            {/* Custom Stamp Upload */}
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
                  <span className="text-xs text-muted-foreground">Upload stempel custom (opsional)</span>
                </div>
              )}
            </div>
            <input ref={stampInputRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'custom_stamp_url')} className="hidden" />

            {/* Dynamic Stamp Colors */}
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
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Kode QR</Label>
          <Switch
            checked={settings.show_qr_code}
            onCheckedChange={(checked) => updateSetting('show_qr_code', checked)}
          />
        </div>

        {settings.show_qr_code && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Ukuran QR</Label>
                <span className="text-sm">{settings.qr_size}px</span>
              </div>
              <Slider
                value={[settings.qr_size]}
                onValueChange={([value]) => updateSetting('qr_size', value)}
                min={60}
                max={120}
                step={10}
              />
            </div>

            <Select
              value={settings.qr_position}
              onValueChange={(value) => updateSetting('qr_position', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Posisi QR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-section">Bagian Bawah</SelectItem>
                <SelectItem value="bottom-left">Kiri Bawah</SelectItem>
                <SelectItem value="bottom-right">Kanan Bawah</SelectItem>
                <SelectItem value="top-right">Kanan Atas</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Sertakan nominal di QR</Label>
              <Switch
                checked={settings.qr_include_amount}
                onCheckedChange={(checked) => updateSetting('qr_include_amount', checked)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Document Numbering */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <Label className="text-sm font-medium">Penomoran Dokumen</Label>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Prefix Invoice</Label>
            <Input
              value={settings.invoice_prefix}
              onChange={(e) => updateSetting('invoice_prefix', e.target.value)}
              placeholder="INV"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Prefix Kwitansi</Label>
            <Input
              value={settings.receipt_prefix}
              onChange={(e) => updateSetting('receipt_prefix', e.target.value)}
              placeholder="KWT"
            />
          </div>
        </div>

        <Select
          value={settings.number_format}
          onValueChange={(value) => updateSetting('number_format', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Format nomor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PREFIX-YYYY-NNNN">PREFIX-2024-0001</SelectItem>
            <SelectItem value="PREFIX/YYYY/NNNN">PREFIX/2024/0001</SelectItem>
            <SelectItem value="NNNN/PREFIX/YYYY">0001/PREFIX/2024</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visibility Toggles */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <Label className="text-sm font-medium">Visibilitas Elemen</Label>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Nomor Dokumen</Label>
            <Switch
              checked={settings.show_document_number !== false}
              onCheckedChange={(checked) => updateSetting('show_document_number', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Tanggal Dokumen</Label>
            <Switch
              checked={settings.show_document_date !== false}
              onCheckedChange={(checked) => updateSetting('show_document_date', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Info Klien</Label>
            <Switch
              checked={settings.show_client_info !== false}
              onCheckedChange={(checked) => updateSetting('show_client_info', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Header Tabel</Label>
            <Switch
              checked={settings.show_table_header !== false}
              onCheckedChange={(checked) => updateSetting('show_table_header', checked)}
            />
          </div>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <Label className="text-sm font-medium">Pengaturan Lainnya</Label>
        
        <div className="flex items-center justify-between">
          <Label className="text-sm">Tampilkan Terbilang</Label>
          <Switch
            checked={settings.show_terbilang}
            onCheckedChange={(checked) => updateSetting('show_terbilang', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Tampilkan Jatuh Tempo</Label>
          <Switch
            checked={settings.show_due_date}
            onCheckedChange={(checked) => updateSetting('show_due_date', checked)}
          />
        </div>

        {settings.show_due_date && (
          <div className="space-y-2">
            <Label className="text-xs">Default Hari Jatuh Tempo</Label>
            <Input
              type="number"
              value={settings.default_due_days}
              onChange={(e) => updateSetting('default_due_days', parseInt(e.target.value) || 7)}
              min={1}
              max={90}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Teks Denda Keterlambatan</Label>
          <Input
            value={settings.late_fee_text}
            onChange={(e) => updateSetting('late_fee_text', e.target.value)}
            placeholder="Denda 2% per bulan keterlambatan"
          />
        </div>
      </div>
    </div>
  );
};
