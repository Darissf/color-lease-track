import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-whatsapp-webhook`;

export const MetaCloudSetupGuide = () => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Disalin ke clipboard');
  };

  const steps = [
    {
      title: 'Buat Akun Meta Business',
      description: 'Daftar atau login ke Meta Business Suite untuk mengelola akun bisnis Anda.',
      link: 'https://business.facebook.com/',
      linkText: 'Buka Meta Business Suite',
    },
    {
      title: 'Buat Aplikasi di Meta Developers',
      description: 'Buat aplikasi baru dan pilih tipe "Business".',
      link: 'https://developers.facebook.com/apps/create/',
      linkText: 'Buat Aplikasi',
    },
    {
      title: 'Tambahkan Produk WhatsApp',
      description: 'Di dashboard aplikasi, tambahkan produk "WhatsApp" dan ikuti setup wizard.',
      details: [
        'Pilih "Set up" di bagian WhatsApp',
        'Pilih atau buat Business Account',
        'Verifikasi nomor telepon bisnis Anda'
      ]
    },
    {
      title: 'Dapatkan Credentials',
      description: 'Catat credentials yang diperlukan dari dashboard:',
      details: [
        'Phone Number ID (di bagian API Setup)',
        'WhatsApp Business Account ID',
        'Permanent Access Token (System User Token)'
      ]
    },
    {
      title: 'Konfigurasi Webhook',
      description: 'Setup webhook untuk menerima pesan masuk:',
      details: [
        'Buka Configuration > Webhooks',
        'Masukkan Callback URL di bawah',
        'Masukkan Verify Token yang sama',
        'Subscribe ke field: messages'
      ],
      copyable: true
    },
    {
      title: 'Masukkan Credentials',
      description: 'Masukkan credentials yang didapat ke halaman "Nomor WhatsApp" dengan memilih provider "Meta Cloud API".',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Panduan Setup Meta Cloud API</h3>
          <p className="text-sm text-muted-foreground">
            Ikuti langkah-langkah berikut untuk menghubungkan WhatsApp Business Cloud API
          </p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700">
          Official API
        </Badge>
      </div>

      {/* Webhook URL Card */}
      <Card className="border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            Webhook URL (Simpan ini!)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="flex-1 text-sm break-all">{WEBHOOK_URL}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(WEBHOOK_URL)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{index + 1}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  
                  {step.details && (
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                      {step.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                  )}
                  
                  {step.link && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={step.link} target="_blank" rel="noopener noreferrer">
                        {step.linkText}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips & Info Penting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p className="text-sm">
              <strong>Verified Badge:</strong> Meta Cloud API memberikan centang hijau resmi pada akun bisnis Anda.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p className="text-sm">
              <strong>Template Messages:</strong> Untuk mengirim pesan ke user yang belum chat dalam 24 jam, 
              Anda harus menggunakan template message yang sudah di-approve Meta.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            <p className="text-sm">
              <strong>Pricing:</strong> Meta Cloud API memiliki biaya per conversation. 
              Cek pricing terbaru di{' '}
              <a 
                href="https://developers.facebook.com/docs/whatsapp/pricing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                dokumentasi Meta
              </a>.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
            <p className="text-sm">
              <strong>Rate Limits:</strong> Perhatikan rate limit API untuk menghindari throttling.
              Standar: 80 messages/second untuk new conversations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
