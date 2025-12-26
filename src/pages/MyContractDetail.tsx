import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { FileText, AlertCircle, CheckCircle, ArrowLeft, Truck, Package, MapPin, Calendar, CreditCard, Clock, Building2, Copy, Send } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PaymentVerificationModal } from "@/components/payment/PaymentVerificationModal";
import { PaymentVerificationStatus } from "@/components/payment/PaymentVerificationStatus";

interface ContractDetail {
  id: string;
  invoice: string | null;
  keterangan: string | null;
  start_date: string;
  end_date: string;
  status: string;
  tagihan: number;
  tagihan_belum_bayar: number;
  jenis_scaffolding: string | null;
  jumlah_unit: number | null;
  lokasi_detail: string | null;
  google_maps_link: string | null;
  status_pengiriman: string | null;
  status_pengambilan: string | null;
  tanggal_kirim: string | null;
  tanggal_ambil: string | null;
  biaya_kirim: number | null;
  notes: string | null;
  user_id: string;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_number: number;
  notes: string | null;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string | null;
}

export default function MyContractDetail() {
  const { activeTheme } = useAppTheme();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [activeVerificationId, setActiveVerificationId] = useState<string | null>(null);
  const [verificationAmount, setVerificationAmount] = useState(0);

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
      .select("*")
      .eq("id", id)
      .single();

    if (contractError) {
      console.error("Error fetching contract:", contractError);
      toast.error("Gagal memuat detail kontrak");
      setLoading(false);
      return;
    }

    setContract(contractData as ContractDetail);

    // Fetch payments for this contract
    const { data: paymentsData } = await supabase
      .from("contract_payments")
      .select("*")
      .eq("contract_id", id)
      .order("payment_number", { ascending: true });

    setPayments((paymentsData || []) as Payment[]);

    // Fetch bank accounts
    const { data: bankData } = await supabase
      .from("bank_accounts")
      .select("id, bank_name, account_number, account_holder_name")
      .eq("user_id", contractData.user_id)
      .eq("is_active", true);

    setBankAccounts((bankData || []) as BankAccount[]);

    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Berhasil disalin!");
  };

  const handleVerificationSuccess = (requestId: string) => {
    setActiveVerificationId(requestId);
    setVerificationAmount(contract?.tagihan_belum_bayar || 0);
  };

  const handleVerificationComplete = () => {
    fetchContractDetail();
    setActiveVerificationId(null);
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
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Kontrak Tidak Ditemukan</h2>
            <Button onClick={() => navigate("/vip/my-contracts")}>Kembali</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paid = contract.tagihan - contract.tagihan_belum_bayar;
  const paymentPercentage = contract.tagihan > 0 ? (paid / contract.tagihan) * 100 : 0;

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto px-2 py-2 md:px-8 md:py-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/my-contracts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className={cn(
              "text-2xl md:text-3xl font-bold",
              activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            )}>
              {contract.invoice || "Detail Kontrak"}
            </h1>
            <p className="text-muted-foreground mt-1">{contract.keterangan || "-"}</p>
          </div>
          <Badge variant={contract.status === "masa sewa" ? "default" : "secondary"}>
            {contract.status === "masa sewa" ? "Aktif" : "Selesai"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contract Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detail Kontrak
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Periode Sewa</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jenis & Jumlah</p>
                    <p className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {contract.jumlah_unit || 0} unit {contract.jenis_scaffolding || "scaffolding"}
                    </p>
                  </div>
                </div>

                {contract.lokasi_detail && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lokasi</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <p className="font-medium">{contract.lokasi_detail}</p>
                      {contract.google_maps_link && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(contract.google_maps_link!, '_blank')}
                        >
                          Buka Maps
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Delivery Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Status Pengiriman</span>
                    </div>
                    <Badge variant={contract.status_pengiriman === "sudah_kirim" ? "default" : "outline"}>
                      {contract.status_pengiriman === "sudah_kirim" ? "Sudah Dikirim" : "Belum Dikirim"}
                    </Badge>
                    {contract.tanggal_kirim && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Tanggal: {format(new Date(contract.tanggal_kirim), "dd MMM yyyy", { locale: localeId })}
                      </p>
                    )}
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">Status Pengambilan</span>
                    </div>
                    <Badge variant={contract.status_pengambilan === "sudah_diambil" ? "default" : "outline"}>
                      {contract.status_pengambilan === "sudah_diambil" ? "Sudah Diambil" : "Belum Diambil"}
                    </Badge>
                    {contract.tanggal_ambil && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Tanggal: {format(new Date(contract.tanggal_ambil), "dd MMM yyyy", { locale: localeId })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Riwayat Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Belum ada pembayaran</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">Pembayaran #{payment.payment_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.payment_date), "dd MMMM yyyy", { locale: localeId })}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-green-600">{formatRupiah(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Payment Info */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Tagihan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Tagihan</p>
                  <p className="text-3xl font-bold">{formatRupiah(contract.tagihan)}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sudah Dibayar</span>
                    <span className="text-green-600 font-medium">{formatRupiah(paid)}</span>
                  </div>
                  <Progress 
                    value={paymentPercentage} 
                    className={cn(
                      "h-3",
                      paymentPercentage >= 100 ? "[&>div]:bg-green-500" : 
                      paymentPercentage >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
                    )}
                  />
                  <div className="flex justify-between text-sm">
                    <span>Sisa Tagihan</span>
                    <span className={cn(
                      "font-medium",
                      contract.tagihan_belum_bayar > 0 ? "text-red-600" : "text-green-600"
                    )}>
                      {formatRupiah(contract.tagihan_belum_bayar)}
                    </span>
                  </div>
                </div>

                {paymentPercentage >= 100 ? (
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-semibold text-green-700">Tagihan Lunas!</p>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-lg text-center">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold text-amber-700">Belum Lunas</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Instructions */}
            {contract.tagihan_belum_bayar > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Transfer Ke
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bankAccounts.map((bank) => (
                    <div key={bank.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{bank.bank_name}</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(bank.account_number)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-mono text-lg">{bank.account_number}</p>
                      {bank.account_holder_name && (
                        <p className="text-xs text-muted-foreground">a.n. {bank.account_holder_name}</p>
                      )}
                    </div>
                  ))}
                  
                  {/* Verification Status or Button */}
                  {activeVerificationId ? (
                    <PaymentVerificationStatus
                      requestId={activeVerificationId}
                      amountExpected={verificationAmount}
                      onClose={() => setActiveVerificationId(null)}
                      onVerified={handleVerificationComplete}
                    />
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => setShowVerificationModal(true)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Sudah Transfer
                    </Button>
                  )}
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Klik tombol di atas setelah transfer untuk verifikasi otomatis
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Payment Verification Modal */}
      {contract && (
        <PaymentVerificationModal
          open={showVerificationModal}
          onOpenChange={setShowVerificationModal}
          contractId={contract.id}
          customerName={contract.keterangan || "Customer"}
          remainingAmount={contract.tagihan_belum_bayar}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
  );
}
