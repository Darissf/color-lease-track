import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { TemplateSettings } from './types';

interface ContentSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
  onFileSelect: (file: File, target: string) => void;
  onRemoveImage: (field: string) => void;
  uploading: boolean;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  settings,
  updateSetting,
  onFileSelect,
  onRemoveImage,
  uploading,
}) => {
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, target);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Company Name */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Nama Perusahaan</Label>
          <Switch
            checked={settings.show_company_name !== false}
            onCheckedChange={(checked) => updateSetting('show_company_name', checked)}
          />
        </div>
        {settings.show_company_name !== false && (
          <div className="space-y-3">
            <Input
              value={settings.company_name}
              onChange={(e) => updateSetting('company_name', e.target.value)}
              placeholder="Nama Perusahaan Anda"
            />
            <div className="flex gap-2 items-center">
              <Label className="text-xs w-16">Warna:</Label>
              <Input
                type="color"
                value={settings.company_name_color || '#1f2937'}
                onChange={(e) => updateSetting('company_name_color', e.target.value)}
                className="w-12 h-8 p-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Company Tagline */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Tagline Perusahaan</Label>
          <Switch
            checked={settings.show_company_tagline}
            onCheckedChange={(checked) => updateSetting('show_company_tagline', checked)}
          />
        </div>
        {settings.show_company_tagline && (
          <div className="space-y-3">
            <Input
              value={settings.company_tagline}
              onChange={(e) => updateSetting('company_tagline', e.target.value)}
              placeholder="Your trusted scaffolding partner"
            />
            <div className="flex gap-2 items-center">
              <Label className="text-xs w-16">Warna:</Label>
              <Input
                type="color"
                value={settings.tagline_color || '#6b7280'}
                onChange={(e) => updateSetting('tagline_color', e.target.value)}
                className="w-12 h-8 p-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Company Info */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <Label className="text-sm font-medium">Informasi Kontak</Label>
        <div className="flex gap-2 items-center mb-2">
          <Label className="text-xs w-24">Warna Info:</Label>
          <Input
            type="color"
            value={settings.company_info_color || '#4b5563'}
            onChange={(e) => updateSetting('company_info_color', e.target.value)}
            className="w-12 h-8 p-1"
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.show_company_address !== false}
              onCheckedChange={(checked) => updateSetting('show_company_address', checked)}
            />
            <Input
              value={settings.company_address}
              onChange={(e) => updateSetting('company_address', e.target.value)}
              placeholder="Alamat Perusahaan"
              className="flex-1"
              disabled={settings.show_company_address === false}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.show_company_phone !== false}
              onCheckedChange={(checked) => updateSetting('show_company_phone', checked)}
            />
            <Input
              value={settings.company_phone}
              onChange={(e) => updateSetting('company_phone', e.target.value)}
              placeholder="No. Telepon"
              className="flex-1"
              disabled={settings.show_company_phone === false}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.show_company_email !== false}
              onCheckedChange={(checked) => updateSetting('show_company_email', checked)}
            />
            <Input
              value={settings.company_email}
              onChange={(e) => updateSetting('company_email', e.target.value)}
              placeholder="Email"
              className="flex-1"
              disabled={settings.show_company_email === false}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.show_company_website !== false}
              onCheckedChange={(checked) => updateSetting('show_company_website', checked)}
            />
            <Input
              value={settings.company_website}
              onChange={(e) => updateSetting('company_website', e.target.value)}
              placeholder="Website"
              className="flex-1"
              disabled={settings.show_company_website === false}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.show_npwp}
              onCheckedChange={(checked) => updateSetting('show_npwp', checked)}
            />
            <Input
              value={settings.company_npwp}
              onChange={(e) => updateSetting('company_npwp', e.target.value)}
              placeholder="NPWP"
              className="flex-1"
              disabled={!settings.show_npwp}
            />
          </div>
        </div>
      </div>

      {/* Document Labels */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <Label className="text-sm font-medium">Label Dokumen</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Judul Invoice</Label>
            <Input
              value={settings.document_title}
              onChange={(e) => updateSetting('document_title', e.target.value)}
              placeholder="INVOICE"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Judul Kwitansi</Label>
            <Input
              value={settings.receipt_title}
              onChange={(e) => updateSetting('receipt_title', e.target.value)}
              placeholder="KWITANSI"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Label Klien</Label>
            <Input
              value={settings.label_client}
              onChange={(e) => updateSetting('label_client', e.target.value)}
              placeholder="Kepada Yth:"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Label Keterangan</Label>
            <Input
              value={settings.label_description}
              onChange={(e) => updateSetting('label_description', e.target.value)}
              placeholder="Keterangan"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Label Jumlah</Label>
            <Input
              value={settings.label_amount}
              onChange={(e) => updateSetting('label_amount', e.target.value)}
              placeholder="Jumlah"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Label Total</Label>
            <Input
              value={settings.label_total}
              onChange={(e) => updateSetting('label_total', e.target.value)}
              placeholder="Total"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Label Terbilang</Label>
            <Input
              value={settings.label_terbilang}
              onChange={(e) => updateSetting('label_terbilang', e.target.value)}
              placeholder="Terbilang:"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Label Transfer</Label>
            <Input
              value={settings.label_bank_transfer}
              onChange={(e) => updateSetting('label_bank_transfer', e.target.value)}
              placeholder="Transfer ke:"
            />
          </div>
        </div>
        <div className="flex gap-2 items-center mt-2">
          <Label className="text-xs w-24">Warna Label:</Label>
          <Input
            type="color"
            value={settings.label_color || '#6b7280'}
            onChange={(e) => updateSetting('label_color', e.target.value)}
            className="w-12 h-8 p-1"
          />
          <Label className="text-xs w-24 ml-4">Warna Value:</Label>
          <Input
            type="color"
            value={settings.value_color || '#1f2937'}
            onChange={(e) => updateSetting('value_color', e.target.value)}
            className="w-12 h-8 p-1"
          />
        </div>
      </div>

      {/* Payment Method Toggle */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Gunakan Payment Link</Label>
            <p className="text-xs text-muted-foreground">Ganti info bank dengan tombol pembayaran</p>
          </div>
          <Switch
            checked={settings.use_payment_link}
            onCheckedChange={(checked) => updateSetting('use_payment_link', checked)}
          />
        </div>
        {settings.use_payment_link && (
          <Input
            value={settings.payment_link_text}
            onChange={(e) => updateSetting('payment_link_text', e.target.value)}
            placeholder="Generate Pembayaran"
          />
        )}
      </div>

      {/* Bank Info */}
      {!settings.use_payment_link && (
        <div className="space-y-4 p-4 rounded-lg border bg-card/50">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Informasi Bank</Label>
            <Switch
              checked={settings.show_bank_info}
              onCheckedChange={(checked) => updateSetting('show_bank_info', checked)}
            />
          </div>

          {settings.show_bank_info && (
            <div className="space-y-3">
              <Input
                value={settings.bank_name}
                onChange={(e) => updateSetting('bank_name', e.target.value)}
                placeholder="Nama Bank (contoh: BCA)"
              />
              <Input
                value={settings.bank_account_number}
                onChange={(e) => updateSetting('bank_account_number', e.target.value)}
                placeholder="Nomor Rekening"
              />
              <Input
                value={settings.bank_account_name}
                onChange={(e) => updateSetting('bank_account_name', e.target.value)}
                placeholder="Nama Pemilik Rekening"
              />
            </div>
          )}
        </div>
      )}

      {/* Signature */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Tanda Tangan</Label>
          <Switch
            checked={settings.show_signature !== false}
            onCheckedChange={(checked) => updateSetting('show_signature', checked)}
          />
        </div>
        
        {settings.show_signature !== false && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={settings.signer_name}
                onChange={(e) => updateSetting('signer_name', e.target.value)}
                placeholder="Nama Penandatangan"
              />
              <Input
                value={settings.signer_title}
                onChange={(e) => updateSetting('signer_title', e.target.value)}
                placeholder="Jabatan"
              />
            </div>

            <div className="border-2 border-dashed rounded-lg p-4 transition-colors">
              {settings.signature_url ? (
                <div className="flex items-center gap-4">
                  <div className="w-24 h-12 rounded bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZGRkIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNkZGQiLz48L3N2Zz4=')]">
                    <img 
                      src={settings.signature_url} 
                      alt="Signature" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => signatureInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Ganti
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveImage('signature_url')}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex flex-col items-center justify-center py-3 cursor-pointer"
                  onClick={() => signatureInputRef.current?.click()}
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Upload tanda tangan</span>
                  <span className="text-xs text-muted-foreground/70">PNG transparan</span>
                </div>
              )}
            </div>
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'signature_url')}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Terms, Footer, Custom Note */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Syarat & Ketentuan</Label>
          <Switch
            checked={settings.show_terms !== false}
            onCheckedChange={(checked) => updateSetting('show_terms', checked)}
          />
        </div>
        {settings.show_terms !== false && (
          <Textarea
            value={settings.terms_conditions}
            onChange={(e) => updateSetting('terms_conditions', e.target.value)}
            placeholder="Ketentuan pembayaran, dll"
            rows={3}
          />
        )}
      </div>

      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Teks Footer</Label>
          <Switch
            checked={settings.show_footer !== false}
            onCheckedChange={(checked) => updateSetting('show_footer', checked)}
          />
        </div>
        {settings.show_footer !== false && (
          <Textarea
            value={settings.footer_text}
            onChange={(e) => updateSetting('footer_text', e.target.value)}
            placeholder="Terima kasih atas kepercayaan Anda"
            rows={2}
          />
        )}
      </div>

      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Catatan Tambahan</Label>
          <Switch
            checked={settings.show_custom_note}
            onCheckedChange={(checked) => updateSetting('show_custom_note', checked)}
          />
        </div>
        {settings.show_custom_note && (
          <Textarea
            value={settings.custom_note}
            onChange={(e) => updateSetting('custom_note', e.target.value)}
            placeholder="Catatan khusus untuk dokumen"
            rows={2}
          />
        )}
      </div>
    </div>
  );
};
