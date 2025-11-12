import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MONTHS = [
  { name: "Januari", quarter: 1, path: "/month/januari" },
  { name: "Februari", quarter: 1, path: "/month/februari" },
  { name: "Maret", quarter: 1, path: "/month/maret" },
  { name: "April", quarter: 2, path: "/month/april" },
  { name: "Mei", quarter: 2, path: "/month/mei" },
  { name: "Juni", quarter: 2, path: "/month/juni" },
  { name: "Juli", quarter: 3, path: "/month/juli" },
  { name: "Agustus", quarter: 3, path: "/month/agustus" },
  { name: "September", quarter: 3, path: "/month/september" },
  { name: "Oktober", quarter: 4, path: "/month/oktober" },
  { name: "November", quarter: 4, path: "/month/november" },
  { name: "Desember", quarter: 4, path: "/month/desember" },
];

export default function Nabila() {
  const navigate = useNavigate();

  const quarters = [
    { number: 1, months: MONTHS.filter(m => m.quarter === 1) },
    { number: 2, months: MONTHS.filter(m => m.quarter === 2) },
    { number: 3, months: MONTHS.filter(m => m.quarter === 3) },
    { number: 4, months: MONTHS.filter(m => m.quarter === 4) },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-5xl md:text-6xl font-serif italic text-foreground">
          Financial Planner.
        </h1>
        <p className="text-2xl md:text-3xl font-serif italic text-muted-foreground">
          KAKEIBO PAGE
        </p>
      </div>

      {/* Subtitle */}
      <Card className="p-6 bg-card">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Nabila</h2>
          <p className="text-sm text-muted-foreground">
            Versi 24.0.0 DKI Bank II Sumitro + Minimalis
          </p>
        </div>
      </Card>


      {/* Aku Cepat Tamaluki Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Aku Cepat Tamaluki</h3>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start text-sm">
            Tombol Pengurusan Variabel
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Tombol Transfer Umbi
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Tombol Permukaan
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Tombol Pengeluaran Tetap
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Tombol Tabungan
          </Button>
        </div>
      </Card>

      {/* Laporan Bulanan Finansial - Quarters */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Laporan Bulanan Finansial
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {quarters.map((quarter) => (
            <div key={quarter.number} className="space-y-3">
              <h4 className="font-semibold text-foreground">Kuartal {quarter.number}</h4>
              <div className="space-y-2">
                {quarter.months.map((month) => (
                  <Button
                    key={month.name}
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => navigate(month.path)}
                  >
                    <Calendar className="h-3 w-3 mr-2" />
                    {month.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Rencana Anggaran & Tabungan Bulanan */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
          <Target className="h-5 w-5" />
          Rencana Anggaran & Tabungan Bulanan
        </h3>
        <Button onClick={() => navigate("/monthly-budget")} className="w-full">
          Lihat Anggaran Bulanan
        </Button>
      </Card>

      {/* Rekedi Jelai Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Rekedi Jelai</h3>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start text-sm">
            Akar Asal
          </Button>
          <div className="ml-4 space-y-2">
            <p className="text-sm text-muted-foreground">Mandiri → BCA</p>
          </div>
        </div>
      </Card>

      {/* Pembukuan */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Pembukuan</h3>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => navigate("/expenses")}>
            Buku A Tutorial
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Mulai di Unit Pengeluaran
          </Button>
        </div>
      </Card>

      {/* Modal di Unit Pengeluaran */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Modal di Unit Pengeluaran</h3>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start text-sm">
            Pengeluaran dari/ Resenting
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Pengeluaran Pengeluaran Berseri
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Pengeluaran Pengeluaran Tetap
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Pengeluaran Tabungan
          </Button>
        </div>
      </Card>

      {/* Fiksi Florita */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Fiksi Florita</h3>
        <Button variant="ghost" className="w-full justify-start text-sm">
          Daftar Keingiman
        </Button>
      </Card>

      {/* Laporan dan Evaluasi Tahunan */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Laporan dan Evaluasi Tahunan</h3>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start text-sm">
            Laporan Pemasukan
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Laporan Pengeluaran Tetap
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sm">
            Evaluasi Keuangan
          </Button>
        </div>
      </Card>

      {/* Evaluasi */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Evaluasi</h3>
        <Button variant="ghost" className="w-full justify-start text-sm">
          Thuailama
        </Button>
      </Card>
    </div>
  );
}
