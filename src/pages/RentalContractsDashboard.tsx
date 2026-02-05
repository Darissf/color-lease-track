import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  XCircle,
  ArrowRight,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ContractStats {
  total: number;
  masaSewa: number;
  closed: number;
  perpanjangan: number;
  pending: number;
  selesai: number;
}

const RentalContractsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ContractStats>({
    total: 0,
    masaSewa: 0,
    closed: 0,
    perpanjangan: 0,
    pending: 0,
    selesai: 0,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rental_contracts")
        .select("status, tagihan_belum_bayar")
        .eq("user_id", user?.id);

      if (error) throw error;

      const contracts = data || [];
      
      setStats({
        total: contracts.length,
        masaSewa: contracts.filter(c => c.status === "masa sewa").length,
        closed: contracts.filter(c => c.status === "selesai" && (c.tagihan_belum_bayar ?? 0) <= 0).length,
        perpanjangan: contracts.filter(c => c.status === "perpanjangan").length,
        pending: contracts.filter(c => c.status === "pending").length,
        selesai: contracts.filter(c => c.status === "selesai" && (c.tagihan_belum_bayar ?? 0) > 0).length,
      });
    } catch (error: any) {
      toast.error("Gagal memuat statistik: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Invoice",
      value: stats.total,
      icon: FileText,
      color: "bg-slate-600",
      textColor: "text-white",
    },
    {
      title: "Masa Sewa",
      value: stats.masaSewa,
      icon: Clock,
      color: "bg-blue-600",
      textColor: "text-white",
    },
    {
      title: "Closed",
      value: stats.closed,
      icon: XCircle,
      color: "bg-red-600",
      textColor: "text-white",
      description: "Selesai & Lunas",
    },
    {
      title: "Perpanjangan",
      value: stats.perpanjangan,
      icon: RefreshCw,
      color: "bg-purple-600",
      textColor: "text-white",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: AlertCircle,
      color: "bg-amber-500",
      textColor: "text-white",
    },
    {
      title: "Selesai",
      value: stats.selesai,
      icon: CheckCircle2,
      color: "bg-emerald-600",
      textColor: "text-white",
      description: "Belum Lunas",
    },
  ];

  const navigationCards = [
    {
      title: "Semua Kontrak",
      description: "Lihat semua kontrak tanpa filter",
      count: stats.total,
      path: "/vip/rental-contracts/all",
      color: "border-slate-300 hover:border-slate-500 hover:bg-slate-50",
      iconColor: "text-slate-600",
    },
    {
      title: "Masa Sewa",
      description: "Kontrak yang sedang aktif",
      count: stats.masaSewa,
      path: "/vip/rental-contracts/masa-sewa",
      color: "border-blue-300 hover:border-blue-500 hover:bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Closed",
      description: "Selesai dan sudah lunas",
      count: stats.closed,
      path: "/vip/rental-contracts/closed",
      color: "border-red-300 hover:border-red-500 hover:bg-red-50",
      iconColor: "text-red-600",
    },
    {
      title: "Perpanjangan",
      description: "Kontrak yang diperpanjang",
      count: stats.perpanjangan,
      path: "/vip/rental-contracts/perpanjangan",
      color: "border-purple-300 hover:border-purple-500 hover:bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Pending",
      description: "Menunggu konfirmasi",
      count: stats.pending,
      path: "/vip/rental-contracts/pending",
      color: "border-amber-300 hover:border-amber-500 hover:bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Selesai",
      description: "Selesai tapi belum lunas",
      count: stats.selesai,
      path: "/vip/rental-contracts/selesai",
      color: "border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50",
      iconColor: "text-emerald-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Kontrak Sewa</h1>
          <p className="text-muted-foreground mt-1">Ringkasan dan navigasi kontrak</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate("/vip/")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className={`${stat.color} ${stat.textColor} border-0 shadow-lg`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm opacity-90 font-medium">{stat.title}</div>
              {stat.description && (
                <div className="text-xs opacity-75 mt-1">{stat.description}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Pilih Kategori</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {navigationCards.map((nav) => (
            <Card 
              key={nav.path}
              className={`cursor-pointer transition-all duration-200 border-2 ${nav.color}`}
              onClick={() => navigate(nav.path)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{nav.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{nav.description}</p>
                    <div className="mt-3">
                      <span className={`text-2xl font-bold ${nav.iconColor}`}>{nav.count}</span>
                      <span className="text-sm text-muted-foreground ml-2">kontrak</span>
                    </div>
                  </div>
                  <ArrowRight className={`h-5 w-5 ${nav.iconColor}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RentalContractsDashboard;
