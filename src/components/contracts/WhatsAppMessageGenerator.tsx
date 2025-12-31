import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatRupiah } from '@/lib/currency';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { addDays } from 'date-fns';
import { 
  MessageSquare, 
  Copy, 
  Send, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  Truck, 
  Package,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { SITE_URL } from '@/lib/seo';

type MessageType = 'confirmation' | 'invoice' | 'payment' | 'delivery' | 'pickup';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_number: number;
  notes?: string;
}

interface BankAccount {
  bank_name: string;
  account_number: string;
  account_holder_name?: string;
}

interface Contract {
  id: string;
  invoice_number: string;
  keterangan?: string;
  start_date: string;
  end_date: string;
  lokasi_proyek?: string;
  jenis_scaffolding?: string;
  jumlah_unit?: number;
  jumlah_tagihan: number;
  tagihan_belum_bayar: number;
  tanggal_kirim?: string;
  tanggal_ambil?: string;
  status_pengiriman?: string;
  status_pengambilan?: string;
  client_groups?: {
    nama: string;
    nomor_telepon: string;
  };
}

interface WhatsAppMessageGeneratorProps {
  contract: Contract;
  payments: Payment[];
  bankAccount: BankAccount | null;
  userId: string;
  onPublicLinkCreated?: () => void;
}

const formatPhoneForWhatsApp = (phone: string): string => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  // Remove leading 0 and add 62 (Indonesia)
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch {
    return dateString;
  }
};

export function WhatsAppMessageGenerator({
  contract,
  payments,
  bankAccount,
  userId,
  onPublicLinkCreated
}: WhatsAppMessageGeneratorProps) {
  const [selectedType, setSelectedType] = useState<MessageType>('confirmation');
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [publicLinkUrl, setPublicLinkUrl] = useState<string | null>(null);

  const clientName = contract.client_groups?.nama || 'Bapak/Ibu';
  const clientPhone = contract.client_groups?.nomor_telepon || '';
  const latestPayment = payments.length > 0 ? payments[0] : null;

  const messageTypes: { type: MessageType; label: string; icon: React.ReactNode; available: boolean }[] = [
    { type: 'confirmation', label: 'Konfirmasi', icon: <FileText className="h-4 w-4" />, available: true },
    { type: 'invoice', label: 'Tagihan', icon: <CreditCard className="h-4 w-4" />, available: true },
    { type: 'payment', label: 'Pembayaran', icon: <CheckCircle className="h-4 w-4" />, available: payments.length > 0 },
    { type: 'delivery', label: 'Pengiriman', icon: <Truck className="h-4 w-4" />, available: !!contract.tanggal_kirim },
    { type: 'pickup', label: 'Pengambilan', icon: <Package className="h-4 w-4" />, available: !!contract.tanggal_ambil },
  ];

  const generateConfirmationMessage = (): string => {
    return `Halo Bapak/Ibu ${clientName},

Berikut detail sewa scaffolding untuk proyek ${contract.keterangan || 'Anda'}:

📋 No. Invoice: ${contract.invoice_number}
📅 Periode: ${formatDate(contract.start_date)} - ${formatDate(contract.end_date)}
📍 Lokasi: ${contract.lokasi_proyek || '-'}
📦 Jenis: ${contract.jenis_scaffolding || 'Scaffolding'} × ${contract.jumlah_unit || 0} unit

💰 Total Tagihan: ${formatRupiah(contract.jumlah_tagihan)}
💵 Sisa Tagihan: ${formatRupiah(contract.tagihan_belum_bayar)}

Jika ada pertanyaan, silakan hubungi kami.

Terima kasih 🙏
Sewa Scaffolding Bali`;
  };

  const generateInvoiceMessage = (linkUrl: string): string => {
    return `Halo Bapak/Ibu ${clientName},

Berikut tagihan sewa scaffolding Anda:

📋 Invoice: ${contract.invoice_number}
📦 Proyek: ${contract.keterangan || '-'}
💰 Sisa Tagihan: ${formatRupiah(contract.tagihan_belum_bayar)}

Silakan klik link berikut untuk melihat rincian tagihan dan melakukan pembayaran:
👇
${linkUrl}

✅ Pembayaran akan terkonfirmasi otomatis setelah Anda transfer sesuai nominal yang tertera.

Jika ada pertanyaan, silakan hubungi kami.

Terima kasih 🙏
Sewa Scaffolding Bali`;
  };

  const generatePaymentMessage = (): string => {
    if (!latestPayment) return '';
    
    const isFullyPaid = contract.tagihan_belum_bayar <= 0;
    const statusText = isFullyPaid 
      ? '🎉 Tagihan Anda telah LUNAS.'
      : `💵 Sisa tagihan: ${formatRupiah(contract.tagihan_belum_bayar)}`;

    return `Halo Bapak/Ibu ${clientName},

Pembayaran telah kami terima ✅

📋 Invoice: ${contract.invoice_number}
💰 Jumlah Bayar: ${formatRupiah(latestPayment.amount)}
📅 Tanggal: ${formatDate(latestPayment.payment_date)}

${statusText}

Terima kasih 🙏
Sewa Scaffolding Bali`;
  };

  const generateDeliveryMessage = (): string => {
    return `Halo Bapak/Ibu ${clientName},

Scaffolding sedang dalam perjalanan 🚚

📋 Invoice: ${contract.invoice_number}
📍 Lokasi: ${contract.lokasi_proyek || '-'}
📅 Tanggal Kirim: ${contract.tanggal_kirim ? formatDate(contract.tanggal_kirim) : '-'}
📦 Jumlah: ${contract.jumlah_unit || 0} unit

Terima kasih 🙏
Sewa Scaffolding Bali`;
  };

  const generatePickupMessage = (): string => {
    return `Halo Bapak/Ibu ${clientName},

Scaffolding akan kami ambil 📦

📋 Invoice: ${contract.invoice_number}
📍 Lokasi: ${contract.lokasi_proyek || '-'}
📅 Tanggal Ambil: ${contract.tanggal_ambil ? formatDate(contract.tanggal_ambil) : '-'}

Tim kami akan menuju lokasi.

Terima kasih 🙏
Sewa Scaffolding Bali`;
  };

  const fetchOrCreatePublicLink = async (): Promise<string> => {
    // Check for existing active link
    const { data: existingLinks } = await supabase
      .from('contract_public_links')
      .select('access_code, expires_at')
      .eq('contract_id', contract.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1);

    if (existingLinks && existingLinks.length > 0) {
      return `${SITE_URL}/contract/${existingLinks[0].access_code}`;
    }

    // Generate new link with 7-day expiration
    const { data: accessCode } = await supabase.rpc('generate_contract_access_code');
    const expiresAt = addDays(new Date(), 7);

    const { error } = await supabase.from('contract_public_links').insert({
      user_id: userId,
      contract_id: contract.id,
      access_code: accessCode,
      expires_at: expiresAt.toISOString(),
      created_by: userId,
    });

    if (error) {
      throw new Error('Gagal membuat public link');
    }

    onPublicLinkCreated?.();
    return `${SITE_URL}/contract/${accessCode}`;
  };

  const generateMessage = async (type: MessageType) => {
    setSelectedType(type);

    if (type === 'invoice') {
      setIsGenerating(true);
      try {
        const linkUrl = await fetchOrCreatePublicLink();
        setPublicLinkUrl(linkUrl);
        setMessage(generateInvoiceMessage(linkUrl));
      } catch (error) {
        toast.error('Gagal generate link pembayaran');
        console.error(error);
      } finally {
        setIsGenerating(false);
      }
    } else {
      switch (type) {
        case 'confirmation':
          setMessage(generateConfirmationMessage());
          break;
        case 'payment':
          setMessage(generatePaymentMessage());
          break;
        case 'delivery':
          setMessage(generateDeliveryMessage());
          break;
        case 'pickup':
          setMessage(generatePickupMessage());
          break;
      }
    }
  };

  // Generate initial message
  useEffect(() => {
    generateMessage('confirmation');
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    toast.success('Pesan berhasil disalin');
  };

  const handleSendWhatsApp = () => {
    if (!clientPhone) {
      toast.error('Nomor telepon client tidak tersedia');
      return;
    }

    const formattedPhone = formatPhoneForWhatsApp(clientPhone);
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Generate Pesan WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Type Selector */}
        <div className="flex flex-wrap gap-2">
          {messageTypes.map(({ type, label, icon, available }) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => available && generateMessage(type)}
              disabled={!available || isGenerating}
              className="gap-2"
            >
              {icon}
              {label}
              {!available && <Badge variant="secondary" className="ml-1 text-xs">-</Badge>}
            </Button>
          ))}
        </div>

        {/* Info for Invoice */}
        {selectedType === 'invoice' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
            <ExternalLink className="h-4 w-4" />
            <span>Link public akan otomatis dibuat (expired 7 hari)</span>
          </div>
        )}

        {/* Message Preview */}
        <div className="relative">
          {isGenerating && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md z-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
            className="font-mono text-sm"
            placeholder="Pilih jenis pesan untuk generate..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!message || isGenerating}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Salin Pesan
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            disabled={!message || !clientPhone || isGenerating}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Kirim via WhatsApp
          </Button>
        </div>

        {!clientPhone && (
          <p className="text-sm text-destructive">
            ⚠️ Nomor telepon client tidak tersedia
          </p>
        )}
      </CardContent>
    </Card>
  );
}
