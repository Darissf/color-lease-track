import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  DollarSign, 
  User, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Download,
  ExternalLink,
  Clock,
  Receipt,
  TrendingUp,
  Wallet
} from "lucide-react";
import { toast } from "sonner";

interface Contract {
  id: string;
  client_group_id: string;
  start_date: string;
  end_date: string;
  tanggal: string | null;
  tanggal_lunas: string | null;
  status: string;
  tagihan_belum_bayar: number;
  jumlah_lunas: number;
  invoice: string | null;
  keterangan: string | null;
  bukti_pembayaran_files: Array<{ name: string; url: string }>;
  bank_account_id: string | null;
  google_maps_link: string | null;
  notes: string | null;
  client_groups?: {
    nama: string;
    nomor_telepon: string;
  };
  bank_accounts?: {
    bank_name: string;
    account_number: string;
  };
}

interface PaymentHistory {
  id: string;
  amount: number;
  date: string;
  source_name: string;
  bank_name: string | null;
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      fetchContractDetail();
    }
  }, [user, id]);

  const fetchContractDetail = async () => {
    if (!user || !id) return;

    setLoading(true);

    // Fetch contract details
    const { data: contractData, error: contractError } = await supabase
      .from("rental_contracts")
      .select(`
        *,
        client_groups (
          nama,
          nomor_telepon
        ),
        bank_accounts (
          bank_name,
          account_number
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError) {
      console.error("Error fetching contract:", contractError);
      toast.error("Gagal memuat detail kontrak");
      navigate(-1);
      return;
    }

    // Ensure bukti_pembayaran_files is array and has correct type
    const buktiPembayaran = Array.isArray(contractData.bukti_pembayaran_files) 
      ? (contractData.bukti_pembayaran_files as Array<{ name: string; url: string }>)
      : [];

    const processedContract: Contract = {
      ...contractData,
      bukti_pembayaran_files: buktiPembayaran
    };

    setContract(processedContract);

    // Fetch payment history
    const { data: paymentData, error: paymentError } = await supabase
      .from("income_sources")
      .select("*")
      .eq("contract_id", id)
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (!paymentError && paymentData) {
      setPaymentHistory(paymentData);
    }

    setLoading(false);
  };

  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case "masa sewa":
        return <Badge className="bg-green-500 text-white">Masa Sewa</Badge>;
      case "habis sewa":
        return <Badge variant="secondary">Selesai</Badge>;
      case "perpanjangan":
        return <Badge variant="outline">Perpanjangan</Badge>;
      case "selesai":
        return <Badge variant="secondary">Selesai</Badge>;
      default:
        return <Badge variant="outline">{capitalizeWords(status)}</Badge>;
    }
  };

  const getPaymentStatusIcon = () => {
    if (!contract) return null;
    
    if (contract.tanggal_lunas) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (contract.tagihan_belum_bayar > 0) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Kontrak tidak ditemukan</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalPayment = paymentHistory.reduce((sum, payment) => sum + Number(payment.amount), 0);
  
  // Calculate months between start and end date
  const startDate = new Date(contract.start_date);
  const endDate = new Date(contract.end_date);
  const monthsDifference = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const averagePaymentPerMonth = totalPayment / monthsDifference;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detail Kontrak</h1>
            <p className="text-muted-foreground mt-1">
              {contract.invoice || "No Invoice"}
            </p>
          </div>
        </div>
        {getStatusBadge(contract.status)}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatRupiah(totalPayment)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rata-Rata Per Bulan</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatRupiah(averagePaymentPerMonth)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sisa Tagihan</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatRupiah(contract.tagihan_belum_bayar)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informasi Kontrak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice</p>
                  <p className="font-semibold">{contract.invoice || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(contract.status)}</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Tanggal Mulai
                  </p>
                  <p className="font-semibold">
                    {format(new Date(contract.start_date), "dd MMMM yyyy", { locale: localeId })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Tanggal Selesai
                  </p>
                  <p className="font-semibold">
                    {format(new Date(contract.end_date), "dd MMMM yyyy", { locale: localeId })}
                  </p>
                </div>
              </div>

              {contract.keterangan && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Keterangan</p>
                    <p className="mt-1">{contract.keterangan}</p>
                  </div>
                </>
              )}

              {contract.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Catatan</p>
                    <p className="mt-1">{contract.notes}</p>
                  </div>
                </>
              )}

              {contract.google_maps_link && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Lokasi</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(contract.google_maps_link!, "_blank")}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Lihat di Google Maps
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Riwayat Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Belum ada riwayat pembayaran</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{payment.source_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.date
                              ? format(new Date(payment.date), "dd MMMM yyyy", { locale: localeId })
                              : "-"}
                            {payment.bank_name && ` • ${payment.bank_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatRupiah(payment.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Proofs */}
          {contract.bukti_pembayaran_files && contract.bukti_pembayaran_files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Bukti Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contract.bukti_pembayaran_files.map((file, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start"
                      onClick={() => window.open(file.url, "_blank")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="truncate">{file.name}</span>
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nama</p>
                <p className="font-semibold">{contract.client_groups?.nama || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nomor Telepon</p>
                <p className="font-semibold">{contract.client_groups?.nomor_telepon || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Ringkasan Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Sudah Dibayar</span>
                </div>
                <span className="font-bold text-green-600">
                  {formatRupiah(contract.jumlah_lunas || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Belum Dibayar</span>
                </div>
                <span className="font-bold text-red-600">
                  {formatRupiah(contract.tagihan_belum_bayar || 0)}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg">
                  {formatRupiah((contract.jumlah_lunas || 0) + (contract.tagihan_belum_bayar || 0))}
                </span>
              </div>

              {contract.tanggal_lunas && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tanggal Lunas</p>
                    <div className="flex items-center gap-2">
                      {getPaymentStatusIcon()}
                      <span className="font-semibold text-green-600">
                        {format(new Date(contract.tanggal_lunas), "dd MMMM yyyy", { locale: localeId })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Bank Account */}
          {contract.bank_accounts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rekening Bank</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Bank</p>
                  <p className="font-semibold">{contract.bank_accounts.bank_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nomor Rekening</p>
                  <p className="font-mono font-semibold">{contract.bank_accounts.account_number}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
