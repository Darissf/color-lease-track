import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { formatRupiah } from "@/lib/currency";

const quarters = [
  {
    id: 1,
    name: "Kuartal 1",
    months: [
      { name: "Januari", income: 125000000, expenses: 85000000, savings: 40000000 },
      { name: "Februari", income: 145000000, expenses: 75000000, savings: 70000000 },
      { name: "Maret", income: 135000000, expenses: 92000000, savings: 43000000 },
    ]
  },
  {
    id: 2,
    name: "Kuartal 2",
    months: [
      { name: "April", income: 170000000, expenses: 82000000, savings: 88000000 },
      { name: "Mei", income: 155000000, expenses: 78000000, savings: 77000000 },
      { name: "Juni", income: 185000000, expenses: 88000000, savings: 97000000 },
    ]
  },
  {
    id: 3,
    name: "Kuartal 3",
    months: [
      { name: "Juli", income: 175000000, expenses: 90000000, savings: 85000000 },
      { name: "Agustus", income: 165000000, expenses: 87000000, savings: 78000000 },
      { name: "September", income: 180000000, expenses: 85000000, savings: 95000000 },
    ]
  },
  {
    id: 4,
    name: "Kuartal 4",
    months: [
      { name: "Oktober", income: 190000000, expenses: 92000000, savings: 98000000 },
      { name: "November", income: 185000000, expenses: 89000000, savings: 96000000 },
      { name: "Desember", income: 195000000, expenses: 95000000, savings: 100000000 },
    ]
  },
];

const MonthlyDashboard = () => {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Dasbor Bulanan Transaksi
        </h1>
        <p className="text-muted-foreground">Lihat ringkasan keuangan per bulan dan kuartal</p>
      </div>

      {/* Quarters */}
      <div className="space-y-8">
        {quarters.map((quarter) => (
          <div key={quarter.id}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{quarter.name}</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {quarter.months.map((month, index) => {
                const savingsRate = ((month.savings / month.income) * 100).toFixed(1);
                return (
                  <Card 
                    key={index} 
                    className="p-6 gradient-card border-0 shadow-md card-hover cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-bold text-foreground">{month.name}</h3>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 border">
                        2025
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {/* Income */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Pemasukan</span>
                          <TrendingUp className="h-4 w-4 text-accent" />
                        </div>
                        <p className="text-2xl font-bold text-accent">{formatRupiah(month.income)}</p>
                      </div>

                      {/* Expenses */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Pengeluaran</span>
                          <TrendingDown className="h-4 w-4 text-secondary" />
                        </div>
                        <p className="text-2xl font-bold text-secondary">{formatRupiah(month.expenses)}</p>
                      </div>

                      {/* Savings */}
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Tabungan</span>
                          <Badge className="bg-accent/10 text-accent border-accent/20 border">
                            {savingsRate}%
                          </Badge>
                        </div>
                        <p className="text-xl font-bold text-foreground">{formatRupiah(month.savings)}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-2">
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full gradient-success rounded-full transition-all"
                          style={{ width: `${savingsRate}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Tingkat tabungan {savingsRate}%
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="mt-8 p-6 gradient-card border-0 shadow-md">
        <h3 className="text-lg font-semibold text-foreground mb-4">Ringkasan Tahunan 2025</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Pemasukan</p>
            <p className="text-3xl font-bold text-accent">{formatRupiah(2000000000)}</p>
            <p className="text-sm text-muted-foreground">12 bulan</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
            <p className="text-3xl font-bold text-secondary">{formatRupiah(1050000000)}</p>
            <p className="text-sm text-muted-foreground">Rata-rata {formatRupiah(87500000)}/bulan</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Tabungan</p>
            <p className="text-3xl font-bold text-primary">{formatRupiah(950000000)}</p>
            <Badge className="bg-accent/10 text-accent border-accent/20 border">
              Tingkat tabungan 47.5%
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MonthlyDashboard;
