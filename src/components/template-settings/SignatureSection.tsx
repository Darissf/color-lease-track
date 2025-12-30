import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { TemplateSettings } from './types';

interface SignatureSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
  onFileSelect: (file: File, target: string) => void;
  onRemoveImage: (field: string) => void;
  uploading: boolean;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({
  settings,
  updateSetting,
  onFileSelect,
  onRemoveImage,
  uploading,
}) => {
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, 'signature_url');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tampilkan Tanda Tangan</Label>
        <Switch
          checked={settings.show_signature !== false}
          onCheckedChange={(checked) => updateSetting('show_signature', checked)}
        />
      </div>

      {settings.show_signature !== false && (
        <>
          {/* Position */}
          <div className="space-y-2">
            <Label className="text-xs">Posisi Tanda Tangan</Label>
            <Select
              value={settings.signature_position || 'right'}
              onValueChange={(value) => updateSetting('signature_position', value)}
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

          {/* Label Text */}
          <div className="space-y-2">
            <Label className="text-xs">Label Tanda Tangan</Label>
            <Input
              value={settings.signature_label || 'Hormat Kami,'}
              onChange={(e) => updateSetting('signature_label', e.target.value)}
              placeholder="Hormat Kami,"
            />
          </div>

          {/* Signature Upload */}
          <div className="space-y-2">
            <Label className="text-xs">Gambar Tanda Tangan</Label>
            <div className="border-2 border-dashed rounded-lg p-3">
              {settings.signature_url ? (
                <div className="space-y-3">
                  <div className="rounded bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZGRkIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNkZGQiLz48L3N2Zz4=')] p-2">
                    <img src={settings.signature_url} alt="Signature" className="max-w-full object-contain mx-auto" />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button type="button" variant="outline" size="sm" onClick={() => signatureInputRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3 w-3 mr-1" />
                      Ganti
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onRemoveImage('signature_url')} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2 cursor-pointer" onClick={() => signatureInputRef.current?.click()}>
                  <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Upload gambar tanda tangan (PNG dengan transparansi, maks. 10MB)</span>
                </div>
              )}
            </div>
            <input ref={signatureInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Signature Scale Slider */}
          {settings.signature_url && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Ukuran Tanda Tangan</Label>
                <span className="text-xs text-muted-foreground">{settings.signature_scale ?? 100}%</span>
              </div>
              <Slider
                value={[settings.signature_scale ?? 100]}
                onValueChange={([v]) => updateSetting('signature_scale', v)}
                min={30}
                max={200}
                step={5}
              />
            </div>
          )}

          {/* Signer Details */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Nama Penanda Tangan</Label>
              <Input
                value={settings.signer_name}
                onChange={(e) => updateSetting('signer_name', e.target.value)}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Jabatan</Label>
              <Input
                value={settings.signer_title}
                onChange={(e) => updateSetting('signer_title', e.target.value)}
                placeholder="Direktur"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2 p-4 rounded-lg border bg-white">
            <Label className="text-xs font-medium text-muted-foreground">Preview:</Label>
            <div className="text-center py-2">
              <p className="text-sm text-gray-600 mb-2">{settings.signature_label || 'Hormat Kami,'}</p>
              {settings.signature_url ? (
                <img 
                  src={settings.signature_url} 
                  alt="Signature" 
                  className="w-auto mx-auto object-contain"
                  style={{ maxHeight: `${(settings.signature_scale ?? 100) * 2}px` }}
                />
              ) : (
                <div className="h-16 w-32 border-b border-gray-400 mx-auto" />
              )}
              <p className="font-semibold mt-2">{settings.signer_name || 'Nama Penanda'}</p>
              {settings.signer_title && (
                <p className="text-sm text-gray-500">{settings.signer_title}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
