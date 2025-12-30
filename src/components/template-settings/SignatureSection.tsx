import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { TemplateSettings, LayoutSettings } from './types';

interface SignatureSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
  onFileSelect: (file: File, target: string) => void;
  onRemoveImage: (field: string) => void;
  uploading: boolean;
  layoutSettings?: LayoutSettings;
  updateLayoutSetting?: (key: string, value: any) => void;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({
  settings,
  updateSetting,
  onFileSelect,
  onRemoveImage,
  uploading,
  layoutSettings,
  updateLayoutSetting,
}) => {
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, 'signature_url');
    }
    e.target.value = '';
  };

  // Get current values from layoutSettings or use defaults
  const posX = layoutSettings?.signature_position_x ?? 80;
  const posY = layoutSettings?.signature_position_y ?? 85;
  const scale = layoutSettings?.signature_scale ?? 1;
  const opacity = layoutSettings?.signature_opacity ?? 100;

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
          {/* Signature Upload */}
          <div className="space-y-2">
            <Label className="text-xs">Gambar Tanda Tangan (Landscape)</Label>
            <div className="border-2 border-dashed rounded-lg p-3">
              {settings.signature_url ? (
                <div className="flex items-center gap-3">
                  <div className="w-32 h-16 rounded bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZGRkIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNkZGQiLz48L3N2Zz4=')]">
                    <img src={settings.signature_url} alt="Signature" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-2">
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
                  <span className="text-xs text-muted-foreground">Upload gambar tanda tangan (PNG dengan transparansi)</span>
                </div>
              )}
            </div>
            <input ref={signatureInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Position X Slider */}
          {updateLayoutSetting && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Posisi Horizontal (X)</Label>
                  <span className="text-xs text-muted-foreground">{posX}%</span>
                </div>
                <Slider
                  value={[posX]}
                  onValueChange={([value]) => updateLayoutSetting('signature_position_x', value)}
                  min={5}
                  max={95}
                  step={1}
                />
              </div>

              {/* Position Y Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Posisi Vertikal (Y)</Label>
                  <span className="text-xs text-muted-foreground">{posY}%</span>
                </div>
                <Slider
                  value={[posY]}
                  onValueChange={([value]) => updateLayoutSetting('signature_position_y', value)}
                  min={20}
                  max={120}
                  step={1}
                />
              </div>

              {/* Scale Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Ukuran</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
                </div>
                <Slider
                  value={[scale * 100]}
                  onValueChange={([value]) => updateLayoutSetting('signature_scale', value / 100)}
                  min={30}
                  max={200}
                  step={5}
                />
              </div>

              {/* Opacity Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Opacity</Label>
                  <span className="text-xs text-muted-foreground">{opacity}%</span>
                </div>
                <Slider
                  value={[opacity]}
                  onValueChange={([value]) => updateLayoutSetting('signature_opacity', value)}
                  min={20}
                  max={100}
                  step={5}
                />
              </div>
            </>
          )}

          {/* Label Text */}
          <div className="space-y-2">
            <Label className="text-xs">Label Tanda Tangan</Label>
            <Input
              value={settings.signature_label || 'Hormat Kami,'}
              onChange={(e) => updateSetting('signature_label', e.target.value)}
              placeholder="Hormat Kami,"
            />
          </div>

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
          <div className="space-y-2 p-4 rounded-lg border bg-white relative overflow-hidden" style={{ minHeight: '150px' }}>
            <Label className="text-xs font-medium text-muted-foreground">Preview:</Label>
            <div 
              className="absolute text-center"
              style={{ 
                left: `${posX}%`, 
                top: `${posY}%`, 
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity: opacity / 100,
                transformOrigin: 'center center'
              }}
            >
              <p className="text-sm text-gray-600 mb-1">{settings.signature_label || 'Hormat Kami,'}</p>
              {settings.signature_url ? (
                <img 
                  src={settings.signature_url} 
                  alt="Signature" 
                  className="max-h-12 max-w-24 mx-auto object-contain"
                />
              ) : (
                <div className="h-8 w-20 border-b border-gray-400 mx-auto" />
              )}
              <p className="font-semibold text-sm mt-1">{settings.signer_name || 'Nama Penanda'}</p>
              {settings.signer_title && (
                <p className="text-xs text-gray-500">{settings.signer_title}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
