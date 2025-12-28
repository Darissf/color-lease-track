import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { TemplateSettings } from './types';

interface BrandingSectionProps {
  settings: TemplateSettings;
  onFileSelect: (file: File, target: string) => void;
  onRemoveImage: (field: string) => void;
  uploading: boolean;
}

export const BrandingSection: React.FC<BrandingSectionProps> = ({
  settings,
  onFileSelect,
  onRemoveImage,
  uploading,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const mapsIconInputRef = useRef<HTMLInputElement>(null);
  const waIconInputRef = useRef<HTMLInputElement>(null);
  const emailIconInputRef = useRef<HTMLInputElement>(null);
  const webIconInputRef = useRef<HTMLInputElement>(null);
  const bankLogoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: string) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, target);
    }
    e.target.value = '';
  };

  const ImageUploadCard = ({ 
    label, 
    field, 
    inputRef, 
    value, 
    size = 'normal',
    description 
  }: { 
    label: string; 
    field: string; 
    inputRef: React.RefObject<HTMLInputElement>; 
    value: string | null;
    size?: 'normal' | 'small';
    description?: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${value ? 'border-primary/30 bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}`}>
        {value ? (
          <div className="flex items-center gap-4">
            <div className={`${size === 'small' ? 'w-12 h-12' : 'w-20 h-20'} rounded-lg overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZGRkIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNkZGQiLz48L3N2Zz4=')]`}>
              <img src={value} alt={label} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Ganti
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveImage(field)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Hapus
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="flex flex-col items-center justify-center py-4 cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <div className={`${size === 'small' ? 'w-10 h-10' : 'w-14 h-14'} rounded-lg bg-muted flex items-center justify-center mb-2`}>
              <ImageIcon className={`${size === 'small' ? 'h-5 w-5' : 'h-7 w-7'} text-muted-foreground`} />
            </div>
            <span className="text-sm text-muted-foreground">Klik untuk upload</span>
            {description && <span className="text-xs text-muted-foreground/70 mt-1">{description}</span>}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, field)}
        className="hidden"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <ImageUploadCard
        label="Logo Perusahaan"
        field="invoice_logo_url"
        inputRef={logoInputRef}
        value={settings.invoice_logo_url}
        description="Rekomendasi: 200x200px, PNG transparan"
      />

      <div className="grid grid-cols-2 gap-4">
        <ImageUploadCard
          label="Icon Lokasi"
          field="icon_maps_url"
          inputRef={mapsIconInputRef}
          value={settings.icon_maps_url}
          size="small"
          description="64x64px"
        />
        <ImageUploadCard
          label="Icon WhatsApp"
          field="icon_whatsapp_url"
          inputRef={waIconInputRef}
          value={settings.icon_whatsapp_url}
          size="small"
          description="64x64px"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ImageUploadCard
          label="Icon Email"
          field="icon_email_url"
          inputRef={emailIconInputRef}
          value={settings.icon_email_url}
          size="small"
          description="64x64px"
        />
        <ImageUploadCard
          label="Icon Website"
          field="icon_website_url"
          inputRef={webIconInputRef}
          value={settings.icon_website_url}
          size="small"
          description="64x64px"
        />
      </div>

      <ImageUploadCard
        label="Logo Bank"
        field="bank_logo_url"
        inputRef={bankLogoInputRef}
        value={settings.bank_logo_url}
        size="small"
        description="Untuk info pembayaran"
      />
    </div>
  );
};
