import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { FileText, AlertCircle, CheckCircle, Clock, Eye, Truck, Package, CreditCard, Bell, UserX, Box } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import { renderIcon } from "@/lib/renderIcon";

interface ClientGroup {
  id: string;
  nama: string;
  icon: string | null;
  phone_numbers: any[];
}

interface RentalContract {
  id: string;
  client_group_id: string;
  start_date: string;
  end_date: string;
  status: string;
  tagihan_belum_bayar: number;
  tagihan: number;
  tanggal_bayar_terakhir?: string | null;
  invoice: string | null;
  keterangan: string | null;
  status_pengiriman: string | null;
  status_pengambilan: string | null;
  jenis_scaffolding: string | null;
  jumlah_unit: number | null;
}

interface ContractPayment {
  id: string;
  contract_id: string;
  payment_date: string;
  amount: number;
  payment_number: number;
}

export default function ClientDashboard() {
  const { activeTheme } = useAppTheme();
  const { user, isUser, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [clientGroup, setClientGroup] = useState<ClientGroup | null>(null);
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [recentPayments, setRecentPayments] = useState<ContractPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [noClientGroup, setNoClientGroup] = useState(false);
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  });

  useEffect(() => {
    if (user) {
      fetchClientData();
    }
  }, [user]);

  const fetchClientData = async () => {
    if (!user) return;

    setLoading(true);
    
    // For regular users, fetch via linked_user_id
    // For admins, this page shows their own data (if any)
    const isRegularUser = isUser && !isAdmin && !isSuperAdmin;
    
    // First, get the client group linked to this user
    const { data: clientGroupData, error: clientError } = await supabase
      .from("client_groups")
      .select("id, nama, icon, phone_numbers")
      .eq("linked_user_id", user.id)
      .maybeSingle();

    if (clientError) {
      console.error("Error fetching client group:", clientError);
    }

    if (!clientGroupData && isRegularUser) {
      setNoClientGroup(true);
      setLoading(false);
      return;
    }

    if (clientGroupData) {
      setClientGroup({
        ...clientGroupData,
        phone_numbers: Array.isArray(clientGroupData.phone_numbers) ? clientGroupData.phone_numbers : []
      });
    }

    // Fetch contracts for this client group
    let contractsQuery = supabase
      .from("rental_contracts")
      .select("*")
      .order("created_at", { ascending: false });

    if (clientGroupData) {
      contractsQuery = contractsQuery.eq("client_group_id", clientGroupData.id);
    }

    const { data: contractsData, error: contractsError } = await contractsQuery;

    if (contractsError) {
      console.error("Error fetching contracts:", contractsError);
      setLoading(false);
      return;
    }

    setContracts((contractsData || []) as RentalContract[]);

    // Fetch recent payments
    if (contractsData && contractsData.length > 0) {
      const contractIds = contractsData.map(c => c.id);
      const { data: paymentsData } = await supabase
        .from("contract_payments")
        .select("*")
        .in("contract_id", contractIds)
        .order("payment_date", { ascending: false })
        .limit(5);

      setRecentPayments((paymentsData || []) as ContractPayment[]);
    }

    // Calculate stats
    const totalContracts = contractsData?.length || 0;
    const activeContracts = contractsData?.filter(c => c.status === "masa sewa").length || 0;
    const totalPaid = contractsData?.reduce((sum, c) => sum + ((c.tagihan || 0) - (c.tagihan_belum_bayar || 0)), 0) || 0;
    const totalUnpaid = contractsData?.reduce((sum, c) => sum + (c.tagihan_belum_bayar || 0), 0) || 0;

    setStats({
      totalContracts,
      activeContracts,
      totalPaid,
      totalUnpaid,
    });

    setLoading(false);
  };

  const getStatusBadge = (status: string, tagihanBelumBayar?: number) => {
    // Jika selesai dan sudah lunas → Closed (merah)
    if (status === "selesai" && tagihanBelumBayar !== undefined && tagihanBelumBayar <= 0) {
      return <Badge className="bg-red-600 text-white">Closed</Badge>;
    }
    
    switch (status) {
      case "masa sewa":
        return <Badge className="bg-green-500">Aktif</Badge>;
      case "habis sewa":
        return <Badge variant="secondary">Selesai</Badge>;
      case "selesai":
        return <Badge className="bg-green-500">Selesai</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (contract: RentalContract) => {
    if (contract.tagihan_belum_bayar <= 0) {
      return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Lunas</Badge>;
    }
    return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Belum Lunas</Badge>;
  };

  const getDeliveryStatusBadge = (status: string | null) => {
    switch (status) {
      case "sudah_kirim":
        return <Badge className="bg-blue-500 flex items-center gap-1"><Truck className="h-3 w-3" /> Sudah Dikirim</Badge>;
      case "belum_kirim":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Belum Dikirim</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (noClientGroup) {
    return (
      <div className="h-[calc(100vh-104px)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <UserX className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Akun Belum Terhubung</h2>
            <p className="text-muted-foreground mb-4">
              Akun Anda belum terhubung dengan data client. Silakan hubungi admin untuk menghubungkan akun Anda.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto px-2 py-2 md:px-8 md:py-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={cn(
              "text-3xl font-bold",
              activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            )}>
              Selamat Datang, {clientGroup?.nama || "Client"}!
            </h1>
            <p className="text-muted-foreground mt-1">Ringkasan kontrak dan pembayaran Anda</p>
          </div>
          {renderIcon({ icon: clientGroup?.icon, alt: clientGroup?.nama, size: 'xl' })}
        </div>

        {/* Urgent Alert for Unpaid */}
        {stats.totalUnpaid > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Anda memiliki tagihan belum dibayar sebesar <strong>{formatRupiah(stats.totalUnpaid)}</strong>. 
              Silakan segera lakukan pembayaran.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Kontrak</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContracts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kontrak Aktif</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeContracts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sisa Tagihan</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatRupiah(stats.totalUnpaid)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Contracts */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Kontrak Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contracts.filter(c => c.status === "masa sewa").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Tidak ada kontrak aktif</p>
                </div>
              ) : (
                contracts.filter(c => c.status === "masa sewa").slice(0, 3).map((contract) => (
                  <div 
                    key={contract.id} 
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/vip/my-contracts/${contract.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{contract.invoice || "Kontrak"}</span>
                      {getStatusBadge(contract.status, contract.tagihan_belum_bayar)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {contract.jumlah_unit || 0} unit {contract.jenis_scaffolding || "scaffolding"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      {getDeliveryStatusBadge(contract.status_pengiriman)}
                      <span className={cn(
                        "font-semibold",
                        contract.tagihan_belum_bayar > 0 ? "text-red-600" : "text-green-600"
                      )}>
                        Sisa: {formatRupiah(contract.tagihan_belum_bayar || 0)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {contracts.filter(c => c.status === "masa sewa").length > 3 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/vip/my-contracts")}
                >
                  Lihat Semua Kontrak
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pembayaran Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Belum ada pembayaran</p>
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Pembayaran {payment.payment_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), "dd MMM yyyy", { locale: localeId })}
                      </p>
                    </div>
                    <span className="font-semibold text-green-600">{formatRupiah(payment.amount)}</span>
                  </div>
                ))
              )}
              {recentPayments.length > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/vip/my-payments")}
                >
                  Lihat Semua Pembayaran
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/vip/my-contracts")}
              >
                <FileText className="h-6 w-6" />
                <span>Kontrak Saya</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/vip/my-invoices")}
              >
                <CreditCard className="h-6 w-6" />
                <span>Tagihan Saya</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/vip/my-payments")}
              >
                <CheckCircle className="h-6 w-6" />
                <span>Riwayat Bayar</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate("/vip/profile")}
              >
                <Bell className="h-6 w-6" />
                <span>Profile</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2 border-primary/50 hover:bg-primary/10"
                onClick={() => navigate("/vip/scaffolding-configurator")}
              >
                <Box className="h-6 w-6 text-primary" />
                <span>Kalkulator Scaffolding</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
