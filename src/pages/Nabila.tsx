import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

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
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Generate year options (current year ± 5 years)
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

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



      {/* Laporan Bulanan Finansial - Quarters */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Laporan Bulanan Finansial
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tahun:</span>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
                    {month.name} {selectedYear}
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

    </div>
  );
}
