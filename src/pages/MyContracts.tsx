import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { FileText, AlertCircle, CheckCircle, Clock, Eye, Truck, Package, Search, ArrowLeft, MapPin, Download } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  google_maps_link: string | null;
}

export default function MyContracts() {
  const { activeTheme } = useAppTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;

    setLoading(true);
    
    // Get client group linked to this user
    const { data: clientGroup, error: clientError } = await supabase
      .from("client_groups")
      .select("id")
      .eq("linked_user_id", user.id)
      .maybeSingle();

    if (clientError || !clientGroup) {
      console.error("Error fetching client group:", clientError);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("rental_contracts")
      .select("*")
      .eq("client_group_id", clientGroup.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Gagal memuat kontrak");
    } else {
      setContracts((data || []) as RentalContract[]);
    }

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

  const getPaymentProgress = (contract: RentalContract) => {
    const total = contract.tagihan || 0;
    const paid = total - (contract.tagihan_belum_bayar || 0);
    const percentage = total > 0 ? (paid / total) * 100 : 0;
    return { paid, total, percentage };
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      (contract.invoice?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (contract.keterangan?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto px-2 py-2 md:px-8 md:py-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/client-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={cn(
              "text-3xl font-bold",
              activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            )}>
              Kontrak Saya
            </h1>
            <p className="text-muted-foreground mt-1">Daftar semua kontrak sewa Anda</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari invoice, keterangan, lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="masa sewa">Aktif</SelectItem>
              <SelectItem value="habis sewa">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contracts List */}
        {filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Tidak ada kontrak ditemukan</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((contract) => {
              const { paid, total, percentage } = getPaymentProgress(contract);
              return (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left Side - Contract Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold">{contract.invoice || "Kontrak"}</span>
                          {getStatusBadge(contract.status, contract.tagihan_belum_bayar)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span>{contract.jumlah_unit || 0} unit {contract.jenis_scaffolding || "scaffolding"}</span>
                          </div>
                        </div>

                        {/* Delivery Status */}
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant={contract.status_pengiriman === "sudah_kirim" ? "default" : "outline"} className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {contract.status_pengiriman === "sudah_kirim" ? "Sudah Dikirim" : "Belum Dikirim"}
                          </Badge>
                          <Badge variant={contract.status_pengambilan === "sudah_diambil" ? "default" : "outline"} className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {contract.status_pengambilan === "sudah_diambil" ? "Sudah Diambil" : "Belum Diambil"}
                          </Badge>
                        </div>
                      </div>

                      {/* Right Side - Payment Info */}
                      <div className="w-full md:w-64 space-y-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Tagihan</p>
                          <p className="text-xl font-bold">{formatRupiah(total)}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sudah Dibayar</span>
                            <span className="text-green-600 font-medium">{formatRupiah(paid)}</span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className={cn(
                              "h-2",
                              percentage >= 100 ? "[&>div]:bg-green-500" : 
                              percentage >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
                            )}
                          />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sisa</span>
                            <span className={cn(
                              "font-medium",
                              contract.tagihan_belum_bayar > 0 ? "text-red-600" : "text-green-600"
                            )}>
                              {formatRupiah(contract.tagihan_belum_bayar || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/vip/my-contracts/${contract.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Button>
                          {contract.google_maps_link && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(contract.google_maps_link!, '_blank')}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
