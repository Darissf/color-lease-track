import { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  Edit2,
  RotateCcw
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
  let cleaned = phone.replace(/\D/g, '');
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
  const [originalMessage, setOriginalMessage] = useState('');
  const [isEdited, setIsEdited] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [publicLinkUrl, setPublicLinkUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Available variables for insertion
  const availableVariables = [
    { key: 'nama', value: clientName, label: 'Nama Client' },
    { key: 'invoice', value: contract.invoice_number, label: 'No. Invoice' },
    { key: 'proyek', value: contract.keterangan || '-', label: 'Proyek' },
    { key: 'total_tagihan', value: formatRupiah(contract.jumlah_tagihan), label: 'Total Tagihan' },
    { key: 'sisa_tagihan', value: formatRupiah(contract.tagihan_belum_bayar), label: 'Sisa Tagihan' },
    { key: 'periode', value: `${formatDate(contract.start_date)} - ${formatDate(contract.end_date)}`, label: 'Periode' },
    { key: 'lokasi', value: contract.lokasi_proyek || '-', label: 'Lokasi' },
    { key: 'jenis', value: contract.jenis_scaffolding || 'Scaffolding', label: 'Jenis' },
    { key: 'jumlah_unit', value: String(contract.jumlah_unit || 0), label: 'Jumlah Unit' },
  ];

  const insertVariable = (value: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback: append to end
      setMessage(prev => prev + value);
      setIsEdited(true);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.slice(0, start) + value + message.slice(end);

    setMessage(newMessage);
    setIsEdited(newMessage !== originalMessage);

    // Set cursor after inserted text
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + value.length;
      textarea.focus();
    }, 0);
  };

  const handleReset = () => {
    setMessage(originalMessage);
    setIsEdited(false);
    toast.info('Template dikembalikan ke default');
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    setIsEdited(newValue !== originalMessage);
  };

  const generateConfirmationMessage = (): string => {
    return `Halo *${clientName}*,

Berikut detail sewa scaffolding untuk proyek *${contract.keterangan || 'Anda'}*:

📋 *No. Invoice:* ${contract.invoice_number}
📅 *Periode:* ${formatDate(contract.start_date)} - ${formatDate(contract.end_date)}
📍 *Lokasi:* ${contract.lokasi_proyek || '-'}
📦 *Jenis:* ${contract.jenis_scaffolding || 'Scaffolding'} × ${contract.jumlah_unit || 0} unit

💰 *Total Tagihan:* ${formatRupiah(contract.jumlah_tagihan)}
💵 *Sisa Tagihan:* ${formatRupiah(contract.tagihan_belum_bayar)}

Jika ada pertanyaan, silakan hubungi kami.

Terima kasih 🙏
_Sewa Scaffolding Bali_`;
  };

  const generateInvoiceMessage = (linkUrl: string): string => {
    return `Halo *${clientName}*,

Berikut tagihan sewa scaffolding Anda:

📋 *Invoice:* ${contract.invoice_number}
📦 *Proyek:* ${contract.keterangan || '-'}
💰 *Sisa Tagihan:* ${formatRupiah(contract.tagihan_belum_bayar)}

Silakan klik link berikut untuk melihat rincian tagihan dan melakukan pembayaran:
👇
${linkUrl}

✅ Pembayaran akan terkonfirmasi otomatis setelah Anda transfer sesuai nominal yang tertera.

Jika ada pertanyaan, silakan hubungi kami.

Terima kasih 🙏
_Sewa Scaffolding Bali_`;
  };

  const generatePaymentMessage = (): string => {
    if (!latestPayment) return '';
    
    const isFullyPaid = contract.tagihan_belum_bayar <= 0;
    const statusText = isFullyPaid 
      ? '🎉 *Tagihan Anda telah LUNAS!*'
      : `💵 *Sisa tagihan:* ${formatRupiah(contract.tagihan_belum_bayar)}`;

    return `Halo *${clientName}*,

*Pembayaran telah kami terima* ✅

📋 *Invoice:* ${contract.invoice_number}
💰 *Jumlah Bayar:* ${formatRupiah(latestPayment.amount)}
📅 *Tanggal:* ${formatDate(latestPayment.payment_date)}

${statusText}

Terima kasih 🙏
_Sewa Scaffolding Bali_`;
  };

  const generateDeliveryMessage = (): string => {
    return `Halo *${clientName}*,

*Scaffolding sedang dalam perjalanan* 🚚

📋 *Invoice:* ${contract.invoice_number}
📍 *Lokasi:* ${contract.lokasi_proyek || '-'}
📅 *Tanggal Kirim:* ${contract.tanggal_kirim ? formatDate(contract.tanggal_kirim) : '-'}
📦 *Jumlah:* ${contract.jumlah_unit || 0} unit

Terima kasih 🙏
_Sewa Scaffolding Bali_`;
  };

  const generatePickupMessage = (): string => {
    return `Halo *${clientName}*,

*Scaffolding akan kami ambil* 📦

📋 *Invoice:* ${contract.invoice_number}
📍 *Lokasi:* ${contract.lokasi_proyek || '-'}
📅 *Tanggal Ambil:* ${contract.tanggal_ambil ? formatDate(contract.tanggal_ambil) : '-'}

Tim kami akan menuju lokasi sesuai jadwal.

Terima kasih 🙏
_Sewa Scaffolding Bali_`;
  };

  const fetchOrCreatePublicLink = async (): Promise<string> => {
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
    let generatedMessage = '';

    if (type === 'invoice') {
      setIsGenerating(true);
      try {
        const linkUrl = await fetchOrCreatePublicLink();
        setPublicLinkUrl(linkUrl);
        generatedMessage = generateInvoiceMessage(linkUrl);
      } catch (error) {
        toast.error('Gagal generate link pembayaran');
        console.error(error);
        return;
      } finally {
        setIsGenerating(false);
      }
    } else {
      switch (type) {
        case 'confirmation':
          generatedMessage = generateConfirmationMessage();
          break;
        case 'payment':
          generatedMessage = generatePaymentMessage();
          break;
        case 'delivery':
          generatedMessage = generateDeliveryMessage();
          break;
        case 'pickup':
          generatedMessage = generatePickupMessage();
          break;
      }
    }

    setMessage(generatedMessage);
    setOriginalMessage(generatedMessage);
    setIsEdited(false);
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

        {/* Variable Helper */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Klik untuk menyisipkan nilai ke pesan:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableVariables.map((v) => (
              <Badge
                key={v.key}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                onClick={() => insertVariable(v.value)}
              >
                {v.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Message Preview */}
        <div className="relative">
          {isGenerating && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md z-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            rows={12}
            className="font-mono text-sm"
            placeholder="Pilih jenis pesan untuk generate..."
          />
        </div>

        {/* Edit Indicator & Reset */}
        {isEdited && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
              <Edit2 className="h-4 w-4" />
              <span>Pesan telah dimodifikasi</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Template
            </Button>
          </div>
        )}

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
