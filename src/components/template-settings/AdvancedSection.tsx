import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { TemplateSettings, LayoutSettings } from './types';
import { Badge } from '@/components/ui/badge';

interface AdvancedSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
  onFileSelect: (file: File, target: string) => void;
  onRemoveImage: (field: string) => void;
  uploading: boolean;
  activeTab: 'invoice' | 'receipt';
  layoutSettings: LayoutSettings;
  updateLayoutSetting: (key: string, value: any) => void;
}

export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  settings,
  updateSetting,
  activeTab,
  layoutSettings,
  updateLayoutSetting,
}) => {
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
          <div className="space-y-4">
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

            {/* Badge to show which document type is being edited */}
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span className="text-xs text-muted-foreground">Pengaturan posisi untuk:</span>
              <Badge variant={activeTab === 'invoice' ? 'default' : 'secondary'}>
                {activeTab === 'invoice' ? 'Invoice' : 'Kwitansi'}
              </Badge>
            </div>

            {/* Ukuran Watermark */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Ukuran</Label>
                <span className="text-sm">{layoutSettings.watermark_size ?? 300}px</span>
              </div>
              <Slider
                value={[layoutSettings.watermark_size ?? 300]}
                onValueChange={([value]) => updateLayoutSetting('watermark_size', value)}
                min={50}
                max={500}
                step={10}
              />
            </div>

            {/* Rotasi Watermark */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rotasi</Label>
                <span className="text-sm">{layoutSettings.watermark_rotation ?? -45}°</span>
              </div>
              <Slider
                value={[layoutSettings.watermark_rotation ?? -45]}
                onValueChange={([value]) => updateLayoutSetting('watermark_rotation', value)}
                min={-180}
                max={180}
                step={5}
              />
            </div>

            {/* Posisi X Watermark */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Posisi Horizontal</Label>
                <span className="text-sm">{layoutSettings.watermark_position_x ?? 50}%</span>
              </div>
              <Slider
                value={[layoutSettings.watermark_position_x ?? 50]}
                onValueChange={([value]) => updateLayoutSetting('watermark_position_x', value)}
                min={0}
                max={300}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Kiri</span>
                <span>Kanan</span>
              </div>
            </div>

            {/* Posisi Y Watermark */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Posisi Vertikal</Label>
                <span className="text-sm">{layoutSettings.watermark_position_y ?? 50}%</span>
              </div>
              <Slider
                value={[layoutSettings.watermark_position_y ?? 50]}
                onValueChange={([value]) => updateLayoutSetting('watermark_position_y', value)}
                min={0}
                max={300}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Atas</span>
                <span>Bawah</span>
              </div>
            </div>

            {/* Opacity Watermark */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Opacity</Label>
                <span className="text-sm">{layoutSettings.watermark_opacity ?? 10}%</span>
              </div>
              <Slider
                value={[layoutSettings.watermark_opacity ?? 10]}
                onValueChange={([value]) => updateLayoutSetting('watermark_opacity', value)}
                min={1}
                max={30}
                step={1}
              />
            </div>
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Kode QR Verifikasi</Label>
          <Switch
            checked={settings.show_qr_code}
            onCheckedChange={(checked) => updateSetting('show_qr_code', checked)}
          />
        </div>

        {settings.show_qr_code && (
          <div className="space-y-4">
            {/* Badge to show which document type is being edited */}
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span className="text-xs text-muted-foreground">Pengaturan untuk:</span>
              <Badge variant={activeTab === 'invoice' ? 'default' : 'secondary'}>
                {activeTab === 'invoice' ? 'Invoice' : 'Kwitansi'}
              </Badge>
            </div>

            {/* Custom Text Inputs */}
            <div className="space-y-2">
              <Label className="text-xs">Judul QR Verifikasi</Label>
              <Input
                value={settings.qr_verification_title || 'Scan untuk verifikasi dokumen'}
                onChange={(e) => updateSetting('qr_verification_title', e.target.value)}
                placeholder="Scan untuk verifikasi dokumen"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Label Kode</Label>
              <Input
                value={settings.qr_verification_label || 'Kode:'}
                onChange={(e) => updateSetting('qr_verification_label', e.target.value)}
                placeholder="Kode:"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tampilkan URL</Label>
              <Switch
                checked={settings.show_qr_verification_url !== false}
                onCheckedChange={(checked) => updateSetting('show_qr_verification_url', checked)}
              />
            </div>

            {/* Ukuran QR */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Ukuran QR</Label>
                <span className="text-sm">{layoutSettings.qr_size ?? 80}px</span>
              </div>
              <Slider
                value={[layoutSettings.qr_size ?? 80]}
                onValueChange={([value]) => updateLayoutSetting('qr_size', value)}
                min={60}
                max={120}
                step={10}
              />
            </div>

            {/* Posisi X */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Posisi Horizontal</Label>
                <span className="text-sm">{layoutSettings.qr_verification_position_x ?? 85}%</span>
              </div>
              <Slider
                value={[layoutSettings.qr_verification_position_x ?? 85]}
                onValueChange={([value]) => updateLayoutSetting('qr_verification_position_x', value)}
                min={0}
                max={300}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Kiri</span>
                <span>Kanan</span>
              </div>
            </div>
            
            {/* Posisi Y */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Posisi Vertikal</Label>
                <span className="text-sm">{layoutSettings.qr_verification_position_y ?? 92}%</span>
              </div>
              <Slider
                value={[layoutSettings.qr_verification_position_y ?? 92]}
                onValueChange={([value]) => updateLayoutSetting('qr_verification_position_y', value)}
                min={0}
                max={300}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Atas</span>
                <span>Bawah</span>
              </div>
            </div>
            
            {/* Scale */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Skala</Label>
                <span className="text-sm">{Math.round((layoutSettings.qr_verification_scale ?? 1) * 100)}%</span>
              </div>
              <Slider
                value={[(layoutSettings.qr_verification_scale ?? 1) * 100]}
                onValueChange={([value]) => updateLayoutSetting('qr_verification_scale', value / 100)}
                min={50}
                max={150}
                step={5}
              />
            </div>

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