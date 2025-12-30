import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TemplateSettings } from './types';

interface PaymentSectionProps {
  settings: TemplateSettings & {
    show_payment_section?: boolean;
    payment_instruction_text?: string;
    payment_qr_enabled?: boolean;
    payment_wa_number?: string;
    payment_wa_hyperlink_enabled?: boolean;
  };
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({ settings, updateSetting }) => {
  const handleUpdate = (key: string, value: any) => {
    updateSetting(key as any, value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="show_payment_section" className="text-sm">Tampilkan Seksi Pembayaran</Label>
        <Switch
          id="show_payment_section"
          checked={settings.show_payment_section ?? true}
          onCheckedChange={(checked) => handleUpdate('show_payment_section', checked)}
        />
      </div>

      {(settings.show_payment_section ?? true) && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Teks Instruksi Pembayaran</Label>
            <Textarea
              value={settings.payment_instruction_text ?? 'Silahkan scan barcode ini atau buka link untuk pengecekan pembayaran otomatis. Apabila transfer manual, silahkan transfer ke rekening berikut dan konfirmasi via WhatsApp.'}
              onChange={(e) => handleUpdate('payment_instruction_text', e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="payment_qr_enabled" className="text-sm">Tampilkan QR Code Pembayaran</Label>
            <Switch
              id="payment_qr_enabled"
              checked={settings.payment_qr_enabled ?? true}
              onCheckedChange={(checked) => handleUpdate('payment_qr_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="payment_wa_hyperlink_enabled" className="text-sm">Tampilkan Link WhatsApp</Label>
            <Switch
              id="payment_wa_hyperlink_enabled"
              checked={settings.payment_wa_hyperlink_enabled ?? true}
              onCheckedChange={(checked) => handleUpdate('payment_wa_hyperlink_enabled', checked)}
            />
          </div>

          {(settings.payment_wa_hyperlink_enabled ?? true) && (
            <div className="space-y-2">
              <Label className="text-xs">Nomor WhatsApp Konfirmasi</Label>
              <Input
                value={settings.payment_wa_number ?? '+6289666666632'}
                onChange={(e) => handleUpdate('payment_wa_number', e.target.value)}
                placeholder="+6289666666632"
              />
              <p className="text-xs text-muted-foreground">
                Format: +62xxx untuk Indonesia
              </p>
            </div>
          )}

          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs font-medium">Info Rekening Bank (dari Content & Info)</p>
            <div className="text-xs text-muted-foreground">
              <p>Bank: {settings.bank_name || 'Belum diatur'}</p>
              <p>No. Rek: {settings.bank_account_number || 'Belum diatur'}</p>
              <p>a.n: {settings.bank_account_name || 'Belum diatur'}</p>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Edit di bagian "Konten & Info" → "Informasi Bank"
            </p>
          </div>
        </>
      )}
    </div>
  );
};
