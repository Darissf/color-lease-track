import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

interface RecurringIncomeInfo {
  id: string;
  invoice: string;
  client_name: string;
  nominal: number;
  period_start_month: string;
  period_end_month: string;
  rental_date_start: string;
  rental_date_end: string;
  is_paid: boolean;
  paid_date: string | null;
  keterangan: string | null;
  catatan: string | null;
  bank_name: string | null;
  jenis_scaffolding: string | null;
  jumlah_unit: number | null;
  lokasi_proyek: string | null;
  tanggal_pengiriman: string | null;
  tanggal_pengambilan: string | null;
  status_pengiriman: string | null;
  status_pengambilan: string | null;
  ongkos_transport: number | null;
  penanggung_jawab: string | null;
}

export default function RecurringIncomeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState<RecurringIncomeInfo | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("fixed_monthly_income")
        .select(`
          *,
          client_groups (nama),
          bank_accounts (bank_name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      const incomeData: RecurringIncomeInfo = {
        id: data.id,
        invoice: data.invoice,
        client_name: (data.client_groups as any)?.nama || "",
        nominal: data.nominal,
        period_start_month: data.period_start_month,
        period_end_month: data.period_end_month,
        rental_date_start: data.rental_date_start,
        rental_date_end: data.rental_date_end,
        is_paid: data.is_paid,
        paid_date: data.paid_date,
        keterangan: data.keterangan,
        catatan: data.catatan,
        bank_name: (data.bank_accounts as any)?.bank_name || "",
        jenis_scaffolding: data.jenis_scaffolding,
        jumlah_unit: data.jumlah_unit,
        lokasi_proyek: data.lokasi_proyek,
        tanggal_pengiriman: data.tanggal_pengiriman,
        tanggal_pengambilan: data.tanggal_pengambilan,
        status_pengiriman: data.status_pengiriman,
        status_pengambilan: data.status_pengambilan,
        ongkos_transport: data.ongkos_transport,
        penanggung_jawab: data.penanggung_jawab,
      };
      setIncome(incomeData);
      
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data pemasukan");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!income) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Data pemasukan tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/vip/recurring-income")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke List
          </Button>
          <Button
            onClick={() => navigate(`/vip/recurring-income/${id}/scaffolding`)}
          >
            <Package className="w-4 h-4 mr-2" />
            Input Data Scaffolding
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Detail Pemasukan Tetap</h1>
            <p className="text-sm text-muted-foreground">{income.invoice}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Info Umum */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Umum</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Invoice</p>
                <p className="font-semibold">{income.invoice}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kelompok/Penyewa</p>
                <p className="font-semibold">{income.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nominal</p>
                <p className="font-semibold text-lg text-primary">
                  {formatCurrency(income.nominal)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status Pembayaran</p>
                <p className="font-semibold">
                  {income.is_paid ? (
                    <span className="text-green-600">✅ Sudah Lunas</span>
                  ) : (
                    <span className="text-red-600">⏳ Belum Lunas</span>
                  )}
                </p>
              </div>
              {income.paid_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Lunas</p>
                  <p className="font-semibold">
                    {new Date(income.paid_date).toLocaleDateString("id-ID")}
                  </p>
                </div>
              )}
              {income.bank_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Bank</p>
                  <p className="font-semibold">{income.bank_name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Periode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Periode & Tanggal Sewa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Periode Tagihan</p>
                <p className="font-semibold">
                  {new Date(income.period_start_month).toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(income.period_end_month).toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Sewa</p>
                <p className="font-semibold">
                  {new Date(income.rental_date_start).toLocaleDateString("id-ID")} -{" "}
                  {new Date(income.rental_date_end).toLocaleDateString("id-ID")}
                </p>
              </div>
              {income.keterangan && (
                <div>
                  <p className="text-sm text-muted-foreground">Keterangan</p>
                  <p className="font-semibold">{income.keterangan}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Scaffolding (if exists) */}
          {income.jenis_scaffolding && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Data Scaffolding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Jenis Scaffolding</p>
                    <p className="font-semibold">{income.jenis_scaffolding}</p>
                  </div>
                  {income.jumlah_unit && (
                    <div>
                      <p className="text-sm text-muted-foreground">Jumlah Unit</p>
                      <p className="font-semibold">{income.jumlah_unit} unit</p>
                    </div>
                  )}
                  {income.lokasi_proyek && (
                    <div>
                      <p className="text-sm text-muted-foreground">Lokasi Proyek</p>
                      <p className="font-semibold">{income.lokasi_proyek}</p>
                    </div>
                  )}
                  {income.penanggung_jawab && (
                    <div>
                      <p className="text-sm text-muted-foreground">Penanggung Jawab</p>
                      <p className="font-semibold">{income.penanggung_jawab}</p>
                    </div>
                  )}
                  {income.ongkos_transport && (
                    <div>
                      <p className="text-sm text-muted-foreground">Ongkos Transport</p>
                      <p className="font-semibold">
                        {formatCurrency(income.ongkos_transport)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Catatan */}
          {income.catatan && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Catatan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{income.catatan}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
