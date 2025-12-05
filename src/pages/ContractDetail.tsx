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
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, 
  FileText, 
  Calendar, 
  Wallet, 
  User,
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Download,
  ExternalLink,
  Clock,
  Receipt,
  TrendingUp,
  Package
} from "lucide-react";
import { toast } from "sonner";

interface Contract {
  id: string;
  client_group_id: string;
  start_date: string;
  end_date: string;
  tanggal: string | null;
  status: string;
  tagihan_belum_bayar: number;
  tagihan: number;
  invoice: string | null;
  keterangan: string | null;
  bukti_pembayaran_files: Array<{ name: string; url: string }>;
  bank_account_id: string | null;
  google_maps_link: string | null;
  notes: string | null;
  inventory_item_id: string | null;
  jumlah_unit: number | null;
  jenis_scaffolding: string | null;
  tanggal_bayar_terakhir?: string | null;
  client_groups?: {
    nama: string;
    nomor_telepon: string;
  };
  bank_accounts?: {
    bank_name: string;
    account_number: string;
  };
  inventory_items?: {
    id: string;
    item_code: string;
    item_name: string;
    category: string;
    unit_price: number;
    unit_type: string;
    description: string | null;
  };
}

interface PaymentHistory {
  id: string;
  payment_date: string;
  amount: number;
  payment_number: number;
  notes: string | null;
}

export default function ContractDetail() {
  const { activeTheme } = useAppTheme();
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
        ),
        inventory_items!rental_contracts_inventory_item_id_fkey (
          id,
          item_code,
          item_name,
          category,
          unit_price,
          unit_type,
          description
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    // Debug logging
    console.log('Contract Data:', contractData);
    console.log('Contract Error:', contractError);
    console.log('Inventory Items:', contractData?.inventory_items);
    console.log('Inventory Item ID:', contractData?.inventory_item_id);

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

    setContract(processedContract as unknown as Contract);

    // Fetch payment history from income_sources (contract_payments table not yet in types)
    const { data: paymentData, error: paymentError } = await supabase
      .from("income_sources")
      .select("*")
      .eq("contract_id", id)
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (!paymentError && paymentData) {
      // Convert to PaymentHistory format
      setPaymentHistory(paymentData.map((p, idx) => ({
        id: p.id,
        payment_date: p.date || '',
        amount: Number(p.amount) || 0,
        payment_number: idx + 1,
        notes: p.source_name || null
      })));
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
    
    if (contract.tagihan_belum_bayar <= 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-500" />;
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

          {/* Payment History Timeline */}
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
                  <p>Belum Ada Riwayat Pembayaran</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border animate-fade-in" />
                  
                <div className="space-y-6">
                    {paymentHistory.map((payment, index) => (
                      <div 
                        key={payment.id} 
                        className="relative pl-16 animate-fade-in opacity-0"
                        style={{ 
                          animationDelay: `${index * 100}ms`,
                          animationFillMode: 'forwards'
                        }}
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-3 top-1 h-6 w-6 rounded-full bg-background border-2 border-green-500 flex items-center justify-center animate-scale-in"
                          style={{ 
                            animationDelay: `${index * 100 + 150}ms`,
                            animationFillMode: 'forwards'
                          }}
                        >
                          <span className="text-xs font-bold text-green-600">#{payment.payment_number}</span>
                        </div>
                        
                        <div className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-200 border border-border hover:shadow-md">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="font-semibold text-foreground">
                                  Pembayaran #{payment.payment_number}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {payment.payment_date
                                    ? format(new Date(payment.payment_date), "dd MMMM yyyy", { locale: localeId })
                                    : "-"}
                                </span>
                              </div>
                              
                              {payment.notes && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {payment.notes}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
                                #{payment.payment_number}
                              </Badge>
                              <p className="font-bold text-lg text-green-600 mt-1">
                                {formatRupiah(payment.amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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

          {/* Rincian Stok Barang */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Rincian Stok Barang
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contract.inventory_items ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Kode Barang</p>
                      <p className="font-semibold">{contract.inventory_items.item_code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nama Barang</p>
                      <p className="font-semibold">{contract.inventory_items.item_name}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Kategori</p>
                      <p className="font-semibold">{contract.inventory_items.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Satuan</p>
                      <p className="font-semibold">{contract.inventory_items.unit_type}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground">Jumlah Unit Disewa</p>
                    <p className="font-bold text-xl text-primary">
                      {contract.jumlah_unit} {contract.inventory_items.unit_type}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground">Harga Satuan</p>
                    <p className="font-semibold">
                      {formatRupiah(contract.inventory_items.unit_price)} / {contract.inventory_items.unit_type}
                    </p>
                  </div>

                  {contract.inventory_items.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Deskripsi</p>
                        <p className="mt-1">{contract.inventory_items.description}</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-yellow-500 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    Kontrak ini belum terhubung dengan item inventory
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/vip/contracts/${id}/scaffolding`)}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Hubungkan ke Inventory
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
                <Wallet className="h-5 w-5" />
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
                  {formatRupiah(totalPayment)}
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
                <span className="font-medium">Total Tagihan</span>
                <span className="font-bold text-lg">
                  {formatRupiah(totalPayment + (contract.tagihan_belum_bayar || 0))}
                </span>
              </div>

              {contract.tanggal_bayar_terakhir && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pembayaran Terakhir</p>
                    <div className="flex items-center gap-2">
                      {getPaymentStatusIcon()}
                      <span className="font-semibold text-green-600">
                        {format(new Date(contract.tanggal_bayar_terakhir), "dd MMMM yyyy", { locale: localeId })}
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
