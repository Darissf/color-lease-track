import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { FileText, AlertCircle, CheckCircle, Clock, Eye } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface RentalContract {
  id: string;
  client_group_id: string;
  start_date: string;
  end_date: string;
  status: string;
  tagihan_belum_bayar: number;
  jumlah_lunas: number;
  invoice: string | null;
  tanggal_lunas: string | null;
  keterangan: string | null;
  client_groups?: {
    nama: string;
  };
}

export default function ClientDashboard() {
  const { activeTheme } = useAppTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [loading, setLoading] = useState(true);
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
    
    const { data, error } = await supabase
      .from("rental_contracts")
      .select(`
        *,
        client_groups (
          nama
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching contracts:", error);
      setLoading(false);
      return;
    }

    setContracts(data || []);

    // Calculate stats
    const totalContracts = data?.length || 0;
    const activeContracts = data?.filter(c => c.status === "masa sewa").length || 0;
    const totalPaid = data?.reduce((sum, c) => sum + (c.jumlah_lunas || 0), 0) || 0;
    const totalUnpaid = data?.reduce((sum, c) => sum + (c.tagihan_belum_bayar || 0), 0) || 0;

    setStats({
      totalContracts,
      activeContracts,
      totalPaid,
      totalUnpaid,
    });

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "masa sewa":
        return <Badge className="bg-green-500">Aktif</Badge>;
      case "habis sewa":
        return <Badge variant="secondary">Selesai</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (contract: RentalContract) => {
    if (contract.tanggal_lunas) {
      return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Lunas</Badge>;
    }
    if (contract.tagihan_belum_bayar > 0) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Belum Lunas</Badge>;
    }
    return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Menunggu</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            "text-3xl font-bold",
            activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          )}>Dashboard Saya</h1>
          <p className="text-muted-foreground mt-1">Ringkasan orderan dan status pembayaran Anda</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kontrak</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContracts}</div>
            <p className="text-xs text-muted-foreground">Kontrak keseluruhan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kontrak Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContracts}</div>
            <p className="text-xs text-muted-foreground">Sedang berjalan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dibayar</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatRupiah(stats.totalPaid)}</div>
            <p className="text-xs text-muted-foreground">Pembayaran lunas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tagihan</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatRupiah(stats.totalUnpaid)}</div>
            <p className="text-xs text-muted-foreground">Belum dibayar</p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Riwayat Kontrak & Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada kontrak</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Periode Sewa</TableHead>
                    <TableHead>Status Kontrak</TableHead>
                    <TableHead>Status Pembayaran</TableHead>
                    <TableHead className="text-right">Tagihan</TableHead>
                    <TableHead className="text-right">Dibayar</TableHead>
                    <TableHead>Tanggal Lunas</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {contract.invoice || "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {" "}
                        {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(contract)}</TableCell>
                      <TableCell className="text-right">
                        <span className={contract.tagihan_belum_bayar > 0 ? "text-red-600 font-semibold" : ""}>
                          {formatRupiah(contract.tagihan_belum_bayar || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 font-semibold">
                          {formatRupiah(contract.jumlah_lunas || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {contract.tanggal_lunas
                          ? format(new Date(contract.tanggal_lunas), "dd MMM yyyy", { locale: localeId })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/contract/${contract.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
