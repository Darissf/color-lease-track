import { useParams } from 'react-router-dom';
import { usePublicContract } from '@/hooks/usePublicContract';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  MapPin, 
  Calendar, 
  Clock, 
  Truck, 
  Package, 
  CreditCard,
  User,
  Phone,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  Eye,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import { SITE_NAME } from '@/lib/seo';
import { renderIcon } from '@/lib/renderIcon';
import { PublicPaymentRequest } from '@/components/payment/PublicPaymentRequest';

export default function PublicContractPage() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const { data, loading, error, errorCode, expiredAt, expiredInvoice, refetch } = usePublicContract(accessCode || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Berhasil disalin');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Gagal menyalin');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {errorCode === 'EXPIRED' ? (
              <>
                <div className="w-16 h-16 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Link Sudah Expired</h2>
                <p className="text-muted-foreground text-sm">
                  Link ini sudah tidak berlaku sejak {expiredAt && format(new Date(expiredAt), 'dd MMMM yyyy HH:mm', { locale: id })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Silakan hubungi admin untuk mendapatkan link baru.
                </p>
                <a
                  href={`https://wa.me/6289666666632?text=${encodeURIComponent(
                    expiredInvoice 
                      ? `Halo Admin, saya ingin meminta link kontrak ${expiredInvoice} yang baru, karena link sebelumnya sudah expired.`
                      : `Halo Admin, saya ingin meminta link kontrak baru karena link sebelumnya sudah expired.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors mt-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Hubungi Admin via WhatsApp
                </a>
              </>
            ) : errorCode === 'NOT_FOUND' ? (
              <>
                <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Link Tidak Ditemukan</h2>
                <p className="text-muted-foreground text-sm">
                  Link yang Anda akses tidak valid atau sudah dihapus.
                </p>
                <p className="text-xs text-muted-foreground">
                  Jika Anda merasa ini adalah kesalahan, silakan hubungi admin.
                </p>
                <a
                  href="https://wa.me/6289666666632?text=Halo%20Admin,%20saya%20mengakses%20link%20kontrak%20tapi%20muncul%20pesan%20'Link%20Tidak%20Ditemukan'.%20Mohon%20bantuannya."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors mt-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Hubungi Admin via WhatsApp
                </a>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Terjadi Kesalahan</h2>
                <p className="text-muted-foreground text-sm">{error}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { contract, link, pending_request } = data;
  const paidAmount = contract.tagihan - contract.tagihan_belum_bayar;
  const paymentProgress = contract.tagihan > 0 ? (paidAmount / contract.tagihan) * 100 : 0;
  const isFullyPaid = contract.tagihan_belum_bayar <= 0;

const capitalizeWords = (text: string) => {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getStatusColor = (status: string) => {
    switch (status) {
      case 'masa sewa': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'selesai': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'dibatalkan': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header Brand Bar - Sky/Cyan Theme - Mobile Optimized - Consistent with Footer */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        <div className="bg-gradient-to-r from-sky-600 via-cyan-600 to-sky-600 text-white rounded-xl py-3 sm:py-4 px-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            {/* Brand */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex-shrink-0 p-1.5 sm:p-2 bg-white/50 backdrop-blur-sm rounded-lg">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-bold tracking-wide truncate">{SITE_NAME}</div>
              </div>
            </div>
            
            {/* Invoice Badge */}
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] sm:text-xs text-sky-100">Invoice</div>
              <div className="text-sm sm:text-lg font-bold">{contract.invoice || '-'}</div>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/20 text-[10px] sm:text-xs text-sky-100">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{link.view_count}x dilihat</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {/* Short date on mobile, full date on desktop */}
              <span className="hidden sm:inline">Berlaku hingga {format(new Date(link.expires_at), 'dd MMM yyyy HH:mm', { locale: id })}</span>
              <span className="sm:hidden">s/d {format(new Date(link.expires_at), 'dd/MM/yy HH:mm')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-3 sm:space-y-4 pb-8">
        {/* Status & Client Info */}
        <Card>
          <CardContent className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className={getStatusColor(contract.status)}>
                {capitalizeWords(contract.status)}
              </Badge>
              {contract.keterangan && (
                <div className="flex-1 min-w-0 p-3 bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg border border-gray-200/50">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-muted-foreground mb-0.5">Proyek</div>
                      <p className="text-base text-foreground truncate">{contract.keterangan}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {contract.client && (
              <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                {renderIcon({ icon: contract.client.icon, alt: contract.client.nama, size: 'lg' })}
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2 text-sm sm:text-base">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{contract.client.nama}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span>{contract.client.nomor_telepon}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Progress */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Status Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(paymentProgress)}%</span>
              </div>
              <Progress value={paymentProgress} className="h-2.5 sm:h-3" />
            </div>

            {/* Payment Grid - Stack on small mobile */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5 sm:gap-4 text-xs sm:text-sm">
              <div className="p-2.5 sm:p-3 bg-green-500/10 rounded-lg">
                <div className="text-muted-foreground mb-1">Sudah Dibayar</div>
                <div className="font-semibold text-green-600 break-all">{formatCurrency(paidAmount)}</div>
              </div>
              <div className={`p-2.5 sm:p-3 rounded-lg ${isFullyPaid ? 'bg-muted' : 'bg-amber-500/10'}`}>
                <div className="text-muted-foreground mb-1">Sisa Tagihan</div>
                <div className={`font-semibold break-all ${isFullyPaid ? 'text-muted-foreground' : 'text-amber-600'}`}>
                  {formatCurrency(contract.tagihan_belum_bayar)}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <span className="text-muted-foreground text-xs sm:text-sm">Total Tagihan</span>
                <span className="text-base sm:text-lg font-bold break-all">{formatCurrency(contract.tagihan)}</span>
              </div>
            </div>

            {/* Bank Info for Payment */}
            {!isFullyPaid && contract.bank && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2.5 sm:space-y-3">
                <div className="text-xs sm:text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4 flex-shrink-0" />
                  Transfer ke Rekening:
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                    <span className="text-muted-foreground text-xs sm:text-sm">Bank</span>
                    <span className="font-medium text-sm">{contract.bank.bank_name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                    <span className="text-muted-foreground text-xs sm:text-sm">No. Rekening</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-sm break-all">{contract.bank.account_number}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 sm:h-7 sm:w-7 flex-shrink-0"
                        onClick={() => copyToClipboard(contract.bank!.account_number, 'account')}
                      >
                        {copiedField === 'account' ? (
                          <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {contract.bank.account_holder_name && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                      <span className="text-muted-foreground text-xs sm:text-sm">Atas Nama</span>
                      <span className="font-medium text-sm">{contract.bank.account_holder_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Public Payment Request - Muncul hanya jika masih ada sisa tagihan */}
        {!isFullyPaid && accessCode && (
          <PublicPaymentRequest
            accessCode={accessCode}
            remainingAmount={contract.tagihan_belum_bayar}
            pendingRequest={pending_request}
            onPaymentVerified={() => refetch()}
          />
        )}

        {/* Contract Details */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Detail Sewa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm px-3 sm:px-6">
            {contract.jenis_scaffolding && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                <span className="text-muted-foreground">Jenis Scaffolding</span>
                <span className="font-medium">{contract.jenis_scaffolding}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
              <span className="text-muted-foreground">Jumlah Unit</span>
              <span className="font-medium">{contract.jumlah_unit} unit</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
              <span className="text-muted-foreground">Periode Sewa</span>
              <span className="font-medium">
                {/* Short date on mobile */}
                <span className="hidden sm:inline">
                  {format(new Date(contract.start_date), 'dd MMM yyyy', { locale: id })} - {format(new Date(contract.end_date), 'dd MMM yyyy', { locale: id })}
                </span>
                <span className="sm:hidden">
                  {format(new Date(contract.start_date), 'dd/MM/yy', { locale: id })} - {format(new Date(contract.end_date), 'dd/MM/yy', { locale: id })}
                </span>
              </span>
            </div>
            {contract.penanggung_jawab && (
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                <span className="text-muted-foreground">Penanggung Jawab</span>
                <span className="font-medium">{contract.penanggung_jawab}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        {(contract.lokasi_detail || contract.google_maps_link) && (
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Lokasi
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {contract.lokasi_detail && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-3">{contract.lokasi_detail}</p>
              )}
              {contract.google_maps_link && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full min-h-[44px]"
                  onClick={() => window.open(contract.google_maps_link!, '_blank')}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Buka di Google Maps
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delivery Status */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Status Pengiriman & Pengambilan</span>
              <span className="sm:hidden">Status Kirim/Ambil</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 sm:space-y-3 px-3 sm:px-6">
            {/* Delivery - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 sm:p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs sm:text-sm">Pengiriman</span>
              </div>
              <span className="font-medium text-xs sm:text-sm ml-6 sm:ml-0">
                {format(new Date(contract.tanggal_kirim || contract.start_date), 'EEEE, dd MMMM yyyy', { locale: id })}
              </span>
            </div>
            {/* Pickup - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 sm:p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs sm:text-sm">Pengambilan</span>
              </div>
              {contract.tanggal_ambil ? (
                <span className="font-medium text-xs sm:text-sm ml-6 sm:ml-0">
                  {format(new Date(contract.tanggal_ambil), 'EEEE, dd MMMM yyyy', { locale: id })}
                </span>
              ) : (
                <Badge variant="secondary" className="text-[10px] sm:text-xs ml-6 sm:ml-0">
                  Belum Dijadwalkan
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        {contract.payments && contract.payments.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Riwayat Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="space-y-2.5 sm:space-y-3">
                {contract.payments.map((payment, index) => (
                  <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium">Pembayaran {payment.payment_number}</span>
                        <Badge 
                          variant={payment.payment_source === 'auto' ? 'default' : 'secondary'} 
                          className="text-[9px] px-1.5 py-0"
                        >
                          {payment.payment_source === 'auto' ? 'Otomatis' : 'Manual'}
                        </Badge>
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: id })}
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <div className="font-semibold text-green-600 text-sm sm:text-base break-all">{formatCurrency(payment.amount)}</div>
                      {payment.notes && (
                        <div className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{payment.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Section */}
        <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
          {/* Expiration Warning Card */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2.5 sm:space-y-3">
                <p className="text-xs sm:text-sm text-amber-800">
                  <span className="font-medium">Link ini akan kadaluarsa</span> pada{' '}
                  <span className="font-bold">
                    {format(new Date(link.expires_at), 'dd MMM yyyy', { locale: id })} pukul{' '}
                    {format(new Date(link.expires_at), 'HH:mm', { locale: id })}
                  </span>
                </p>
                <p className="text-xs sm:text-sm text-amber-700">
                  Ingin akses permanen? Hubungi admin:
                </p>
                <a 
                  href={`https://wa.me/6289666666632?text=${encodeURIComponent(`Halo, saya ingin akses permanen untuk invoice ${contract.invoice || '-'}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Hubungi via WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Simplified Footer */}
          <div className="bg-gradient-to-r from-sky-600 via-cyan-600 to-sky-600 text-white rounded-xl py-3 sm:py-4 px-3 sm:px-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <p className="text-sm sm:text-base font-medium">
                Terima kasih atas kepercayaan Anda 🙏
              </p>
              <p className="text-[10px] sm:text-xs text-sky-100">
                Dokumen ini digenerate secara otomatis pada {format(new Date(), 'dd MMMM yyyy', { locale: id })}
              </p>
              <div className="text-[10px] sm:text-xs text-sky-100 pt-1 border-t border-white/20 w-full">
                © {new Date().getFullYear()} All Rights Reserved
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
