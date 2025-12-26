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
  Building2,
  Eye,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import { SITE_NAME } from '@/lib/seo';
import { renderIcon } from '@/lib/renderIcon';

export default function PublicContractPage() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const { data, loading, error, errorCode, expiredAt } = usePublicContract(accessCode || '');
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

  const { contract, link } = data;
  const paidAmount = contract.tagihan - contract.tagihan_belum_bayar;
  const paymentProgress = contract.tagihan > 0 ? (paidAmount / contract.tagihan) * 100 : 0;
  const isFullyPaid = contract.tagihan_belum_bayar <= 0;

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
      {/* Header with Professional Brand */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Brand */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/20">
              <Building2 className="w-6 h-6 text-slate-900" />
            </div>
            <div className="text-center">
              <div className="text-xl font-bold tracking-wider uppercase">
                {SITE_NAME}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                sewascaffoldingbali.com
              </div>
            </div>
          </div>
          
          {/* Invoice Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm text-slate-300">Invoice</div>
                  <div className="text-2xl font-bold">#{contract.invoice || '-'}</div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  {link.view_count}x dilihat
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 border-t border-white/10 pt-3">
              <Clock className="w-3 h-3" />
              <span>Berlaku hingga {format(new Date(link.expires_at), 'dd MMM yyyy HH:mm', { locale: id })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-8">
        {/* Status & Client Info */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={getStatusColor(contract.status)}>
                {contract.status}
              </Badge>
              {contract.keterangan && (
                <span className="text-sm text-muted-foreground">{contract.keterangan}</span>
              )}
            </div>
            
            {contract.client && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {renderIcon({ icon: contract.client.icon, alt: contract.client.nama, size: 'lg' })}
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {contract.client.nama}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {contract.client.nomor_telepon}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Status Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(paymentProgress)}%</span>
              </div>
              <Progress value={paymentProgress} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <div className="text-muted-foreground mb-1">Sudah Dibayar</div>
                <div className="font-semibold text-green-600">{formatCurrency(paidAmount)}</div>
              </div>
              <div className={`p-3 rounded-lg ${isFullyPaid ? 'bg-muted' : 'bg-amber-500/10'}`}>
                <div className="text-muted-foreground mb-1">Sisa Tagihan</div>
                <div className={`font-semibold ${isFullyPaid ? 'text-muted-foreground' : 'text-amber-600'}`}>
                  {formatCurrency(contract.tagihan_belum_bayar)}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Tagihan</span>
                <span className="text-lg font-bold">{formatCurrency(contract.tagihan)}</span>
              </div>
            </div>

            {/* Bank Info for Payment */}
            {!isFullyPaid && contract.bank && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Transfer ke Rekening:
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Bank</span>
                    <span className="font-medium">{contract.bank.bank_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">No. Rekening</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{contract.bank.account_number}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(contract.bank!.account_number, 'account')}
                      >
                        {copiedField === 'account' ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {contract.bank.account_holder_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Atas Nama</span>
                      <span className="font-medium">{contract.bank.account_holder_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Detail Sewa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {contract.jenis_scaffolding && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jenis Scaffolding</span>
                <span className="font-medium">{contract.jenis_scaffolding}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah Unit</span>
              <span className="font-medium">{contract.jumlah_unit} unit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Periode Sewa</span>
              <span className="font-medium">
                {format(new Date(contract.start_date), 'dd MMM yyyy', { locale: id })} - {format(new Date(contract.end_date), 'dd MMM yyyy', { locale: id })}
              </span>
            </div>
            {contract.penanggung_jawab && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Penanggung Jawab</span>
                <span className="font-medium">{contract.penanggung_jawab}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        {(contract.lokasi_detail || contract.google_maps_link) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Lokasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contract.lokasi_detail && (
                <p className="text-sm text-muted-foreground mb-3">{contract.lokasi_detail}</p>
              )}
              {contract.google_maps_link && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Status Pengiriman & Pengambilan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Pengiriman</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={contract.status_pengiriman === 'sudah_kirim' ? 'default' : 'secondary'}>
                  {contract.status_pengiriman === 'sudah_kirim' ? 'Sudah Dikirim' : 'Belum Dikirim'}
                </Badge>
                {contract.tanggal_kirim && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(contract.tanggal_kirim), 'dd MMM', { locale: id })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Pengambilan</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={contract.status_pengambilan === 'sudah_diambil' ? 'default' : 'secondary'}>
                  {contract.status_pengambilan === 'sudah_diambil' ? 'Sudah Diambil' : 'Belum Diambil'}
                </Badge>
                {contract.tanggal_ambil && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(contract.tanggal_ambil), 'dd MMM', { locale: id })}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        {contract.payments && contract.payments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Riwayat Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contract.payments.map((payment, index) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Pembayaran #{payment.payment_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), 'dd MMMM yyyy', { locale: id })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{formatCurrency(payment.amount)}</div>
                      {payment.notes && (
                        <div className="text-xs text-muted-foreground">{payment.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Section */}
        <div className="mt-8 space-y-4">
          {/* Expiration Warning Card */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-3">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Link ini akan kadaluarsa</span> dan tidak dapat dibuka lagi pada{' '}
                  <span className="font-bold">
                    {format(new Date(link.expires_at), 'dd MMMM yyyy', { locale: id })} pukul{' '}
                    {format(new Date(link.expires_at), 'HH:mm', { locale: id })}
                  </span>
                </p>
                <p className="text-sm text-amber-700">
                  Ingin akses permanen ke invoice/kontrak ini? Minta akun ke admin kami:
                </p>
                <a 
                  href={`https://wa.me/6289666666632?text=${encodeURIComponent(`Halo, saya ingin akses permanen untuk invoice #${contract.invoice || '-'}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Hubungi Admin via WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Brand Footer */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 rounded-lg">
                  <Building2 className="w-4 h-4 text-slate-900" />
                </div>
                <span className="font-bold tracking-wide">{SITE_NAME}</span>
              </div>
              <a 
                href="https://sewascaffoldingbali.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                sewascaffoldingbali.com
              </a>
              <div className="w-16 h-px bg-slate-700" />
              <div className="text-xs text-slate-500">
                © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
