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
          <Input
            value={settings.company_tagline}
            onChange={(e) => updateSetting('company_tagline', e.target.value)}
            placeholder="Your trusted scaffolding partner"
          />
        )}
      </div>

      {/* Bank Info */}
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

      {/* Signature */}
      <div className="space-y-4 p-4 rounded-lg border bg-card/50">
        <Label className="text-sm font-medium">Tanda Tangan</Label>
        
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
      </div>

      {/* Terms & Footer */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Syarat & Ketentuan</Label>
        <Textarea
          value={settings.terms_conditions}
          onChange={(e) => updateSetting('terms_conditions', e.target.value)}
          placeholder="Ketentuan pembayaran, dll"
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Teks Footer</Label>
        <Textarea
          value={settings.footer_text}
          onChange={(e) => updateSetting('footer_text', e.target.value)}
          placeholder="Terima kasih atas kepercayaan Anda"
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Catatan Tambahan</Label>
        <Textarea
          value={settings.custom_note}
          onChange={(e) => updateSetting('custom_note', e.target.value)}
          placeholder="Catatan khusus untuk dokumen"
          rows={2}
        />
      </div>
    </div>
  );
};
