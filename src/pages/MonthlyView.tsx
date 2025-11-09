import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function MonthlyView() {
  const { month } = useParams<{ month: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonthlyReport();
  }, [month]);

  const fetchMonthlyReport = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("monthly_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", new Date().getFullYear())
      .single();

    if (error && error.code !== "PGRST116") {
      console.error(error);
    } else if (data) {
      setReport(data);
    } else {
      // Create initial report
      const { data: newData, error: insertError } = await supabase
        .from("monthly_reports")
        .insert({
          user_id: user.id,
          month: month,
          year: new Date().getFullYear(),
          pemasukan: 0,
          pengeluaran: 0,
          pengeluaran_tetap: 0,
          target_belanja: 0,
          target_keuangan: 0,
          sisa_tabungan: 0,
        })
        .select()
        .single();

      if (!insertError && newData) {
        setReport(newData);
      }
    }
    setLoading(false);
  };

  const updateReport = async (field: string, value: number) => {
    if (!user || !report) return;

    const { error } = await supabase
      .from("monthly_reports")
      .update({ [field]: value })
      .eq("id", report.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Updated successfully" });
      fetchMonthlyReport();
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold capitalize">{month}</h1>
        <p className="text-muted-foreground">Laporan Keuangan Bulanan</p>
      </div>

      {/* Main Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6">
          <Label className="text-sm font-medium text-muted-foreground">Pemasukan</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              value={report?.pemasukan || 0}
              onChange={(e) => updateReport("pemasukan", parseFloat(e.target.value) || 0)}
              className="text-lg font-bold"
            />
          </div>
        </Card>

        <Card className="p-6">
          <Label className="text-sm font-medium text-muted-foreground">Pengeluaran</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              value={report?.pengeluaran || 0}
              onChange={(e) => updateReport("pengeluaran", parseFloat(e.target.value) || 0)}
              className="text-lg font-bold"
            />
          </div>
        </Card>

        <Card className="p-6">
          <Label className="text-sm font-medium text-muted-foreground">Pengeluaran Tetap</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              value={report?.pengeluaran_tetap || 0}
              onChange={(e) => updateReport("pengeluaran_tetap", parseFloat(e.target.value) || 0)}
              className="text-lg font-bold"
            />
          </div>
        </Card>

        <Card className="p-6">
          <Label className="text-sm font-medium text-muted-foreground">Target Belanja</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              value={report?.target_belanja || 0}
              onChange={(e) => updateReport("target_belanja", parseFloat(e.target.value) || 0)}
              className="text-lg font-bold"
            />
          </div>
        </Card>

        <Card className="p-6">
          <Label className="text-sm font-medium text-muted-foreground">Target Keuangan</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              value={report?.target_keuangan || 0}
              onChange={(e) => updateReport("target_keuangan", parseFloat(e.target.value) || 0)}
              className="text-lg font-bold"
            />
          </div>
        </Card>

        <Card className="p-6">
          <Label className="text-sm font-medium text-muted-foreground">Sisa Tabungan</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              value={report?.sisa_tabungan || 0}
              onChange={(e) => updateReport("sisa_tabungan", parseFloat(e.target.value) || 0)}
              className="text-lg font-bold"
            />
          </div>
        </Card>
      </div>

      {/* Rencana Anggaran & Tabungan Bulanan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Rencana Anggaran & Tabungan Bulanan</h2>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tambah
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Belum ada data anggaran untuk bulan ini
        </div>
      </Card>

      {/* Rekedi Jelai (Akar Asal) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Rekedi Jelai</h2>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Sumber
          </Button>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Akar Asal (Sumber Pemasukan)</div>
          <div className="text-center py-8 text-muted-foreground">
            Belum ada sumber pemasukan
          </div>
        </div>
      </Card>

      {/* Pembukuan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Pembukuan</h2>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Pengeluaran
          </Button>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Buku & Tutorial</div>
          <div className="text-center py-8 text-muted-foreground">
            Belum ada catatan pengeluaran
          </div>
        </div>
      </Card>

      {/* Modal di Unit Pengeluaran */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Modal di Unit Pengeluaran</h2>
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            Pengeluaran Diri/ Resenting
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Pengeluaran Pengeluaran Berseri
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Pengeluaran Pengeluaran Tetap
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Pengeluaran Tabungan
          </Button>
        </div>
      </Card>

      {/* Fiksi Florita */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Fiksi Florita</h2>
        <Button variant="outline" className="w-full justify-start">
          Daftar Keingiman
        </Button>
      </Card>

      {/* Rekedi Dakket Langganan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Rekedi Dakket Langganan</h2>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tambah
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Belum ada langganan terdaftar
        </div>
      </Card>

      {/* Rekedi Hutang */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Rekedi Hutang</h2>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tambah
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Belum ada hutang tercatat
        </div>
      </Card>

      {/* Rekedi Cicilan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Rekedi Cicilan</h2>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tambah
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Belum ada cicilan tercatat
        </div>
      </Card>
    </div>
  );
}
