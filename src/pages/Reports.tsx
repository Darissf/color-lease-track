import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flag, TrendingUp, TrendingDown, Download, FileText, BarChart3 } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

const yearlyIncome = [
  { month: "Jan", amount: 125000000 },
  { month: "Feb", amount: 145000000 },
  { month: "Mar", amount: 135000000 },
  { month: "Apr", amount: 170000000 },
  { month: "Mei", amount: 155000000 },
  { month: "Jun", amount: 185000000 },
  { month: "Jul", amount: 175000000 },
  { month: "Agu", amount: 165000000 },
  { month: "Sep", amount: 180000000 },
  { month: "Okt", amount: 190000000 },
  { month: "Nov", amount: 185000000 },
  { month: "Des", amount: 195000000 },
];

const yearlyExpenses = [
  { category: "Pemeliharaan", amount: 480000000 },
  { category: "Utilitas", amount: 240000000 },
  { category: "Pajak", amount: 180000000 },
  { category: "Asuransi", amount: 96000000 },
  { category: "Lainnya", amount: 54000000 },
];

const kakeiboReflections = [
  {
    quarter: "Kuartal 1",
    totalIncome: 405000000,
    totalExpenses: 252000000,
    savings: 153000000,
    savingsRate: 37.8,
    reflection: "Pengeluaran cukup terkontrol, namun perlu mengurangi biaya pemeliharaan yang tidak terduga.",
    improvements: ["Buat dana darurat khusus maintenance", "Lakukan inspeksi rutin untuk mencegah kerusakan besar"]
  },
  {
    quarter: "Kuartal 2",
    totalIncome: 510000000,
    totalExpenses: 248000000,
    savings: 262000000,
    savingsRate: 51.4,
    reflection: "Peningkatan signifikan dalam tingkat tabungan. Pengeluaran tetap terjaga dengan baik.",
    improvements: ["Pertahankan disiplin anggaran", "Mulai eksplorasi investasi properti tambahan"]
  },
];

const Reports = () => {
  const { activeTheme } = useAppTheme();
  
  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-2 py-2 md:px-8 md:py-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Laporan & Evaluasi Tahunan
          </h1>
          <p className="text-muted-foreground">Analisis mendalam kinerja keuangan Anda sepanjang tahun</p>
        </div>
        <Button className={cn(
          "text-white border-0 shadow-lg hover:shadow-xl transition-all",
          activeTheme === 'japanese' ? "gradient-primary" : "bg-primary hover:bg-primary/90"
        )}>
          <Download className="mr-2 h-4 w-4" />
          Export Laporan
        </Button>
      </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-8 pb-4">
      <Tabs defaultValue="income" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="income">Laporan Pemasukan</TabsTrigger>
          <TabsTrigger value="expenses">Laporan Pengeluaran</TabsTrigger>
          <TabsTrigger value="kakeibo">Evaluasi Kakeibo</TabsTrigger>
        </TabsList>

        {/* Income Report */}
        <TabsContent value="income" className="space-y-6">
          <Card className={cn(
            "p-6 border-0 shadow-md",
            activeTheme === 'japanese' ? "gradient-card" : "bg-card border border-border"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                activeTheme === 'japanese' ? "gradient-success" : "bg-emerald-600"
              )}>
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Laporan Pemasukan Tahunan 2025</h2>
                <p className="text-sm text-muted-foreground">Analisis pendapatan dari sewa properti</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Total Pemasukan</p>
                <p className="text-3xl font-bold text-accent">{formatRupiah(2005000000)}</p>
                <p className="text-sm text-muted-foreground mt-1">12 bulan</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Rata-rata Bulanan</p>
                <p className="text-3xl font-bold text-foreground">{formatRupiah(167083333)}</p>
                <Badge className="mt-2 bg-accent/10 text-accent border-accent/20 border">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.5% YoY
                </Badge>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Bulan Terbaik</p>
                <p className="text-3xl font-bold text-primary">{formatRupiah(195000000)}</p>
                <p className="text-sm text-muted-foreground mt-1">Desember 2025</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearlyIncome}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatRupiah(value)}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  name="Pemasukan"
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className={cn(
            "p-6 border-0 shadow-md",
            activeTheme === 'japanese' ? "gradient-card" : "bg-card border border-border"
          )}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Sumber Pemasukan</h3>
            <div className="space-y-3">
              {[
                { source: "Sewa Properti Residensial", amount: 1650000000, percentage: 82.3 },
                { source: "Sewa Properti Komersial", amount: 300000000, percentage: 15.0 },
                { source: "Deposit & Lainnya", amount: 55000000, percentage: 2.7 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-foreground">{item.source}</span>
                      <span className="text-sm font-semibold text-accent">{item.percentage}%</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full gradient-success rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-6 text-right">
                    <p className="text-xl font-bold text-foreground">{formatRupiah(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Expenses Report */}
        <TabsContent value="expenses" className="space-y-6">
          <Card className={cn(
            "p-6 border-0 shadow-md",
            activeTheme === 'japanese' ? "gradient-card" : "bg-card border border-border"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                activeTheme === 'japanese' ? "gradient-secondary" : "bg-rose-600"
              )}>
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Laporan Pengeluaran Tetap 2025</h2>
                <p className="text-sm text-muted-foreground">Breakdown pengeluaran operasional properti</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Total Pengeluaran</p>
                <p className="text-3xl font-bold text-secondary">{formatRupiah(1050000000)}</p>
                <p className="text-sm text-muted-foreground mt-1">12 bulan</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Rata-rata Bulanan</p>
                <p className="text-3xl font-bold text-foreground">{formatRupiah(87500000)}</p>
                <Badge className="mt-2 bg-accent/10 text-accent border-accent/20 border">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -3.2% YoY
                </Badge>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Efisiensi</p>
                <p className="text-3xl font-bold text-accent">52.4%</p>
                <p className="text-sm text-muted-foreground mt-1">Expense Ratio</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatRupiah(value)}
                />
                <Bar dataKey="amount" name="Pengeluaran" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* Kakeibo Evaluation */}
        <TabsContent value="kakeibo" className="space-y-6">
          <Card className={cn(
            "p-6 border-0 shadow-md",
            activeTheme === 'japanese' ? "gradient-card" : "bg-card border border-border"
          )}>
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                activeTheme === 'japanese' ? "gradient-primary" : "bg-primary"
              )}>
                <Flag className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Evaluasi Kakeibo</h2>
                <p className="text-sm text-muted-foreground">Refleksi dan pembelajaran dari kebiasaan finansial</p>
              </div>
            </div>

            <div className="space-y-6">
              {kakeiboReflections.map((quarter, index) => (
                <Card key={index} className="p-6 bg-muted/30 border border-border/50">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-foreground">{quarter.quarter}</h3>
                    <Badge className="bg-accent/10 text-accent border-accent/20 border">
                      Tingkat Tabungan {quarter.savingsRate}%
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Pemasukan</p>
                      <p className="text-2xl font-bold text-accent">{formatRupiah(quarter.totalIncome)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Pengeluaran</p>
                      <p className="text-2xl font-bold text-secondary">{formatRupiah(quarter.totalExpenses)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tabungan</p>
                      <p className="text-2xl font-bold text-primary">{formatRupiah(quarter.savings)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Refleksi:</p>
                      <p className="text-sm text-muted-foreground">{quarter.reflection}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Area Perbaikan:</p>
                      <ul className="space-y-1">
                        {quarter.improvements.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-accent">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="mt-6 p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-0">
              <h3 className="text-lg font-semibold text-foreground mb-4">Pertanyaan Refleksi Kakeibo</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-card/80">
                  <p className="font-medium text-foreground mb-1">1. Berapa banyak uang yang saya miliki?</p>
                  <p className="text-sm text-muted-foreground">Total aset: {formatRupiah(2950000000)} (Properti + Tabungan)</p>
                </div>
                <div className="p-3 rounded-lg bg-card/80">
                  <p className="font-medium text-foreground mb-1">2. Berapa banyak yang ingin saya tabung?</p>
                  <p className="text-sm text-muted-foreground">Target tahun ini: {formatRupiah(1000000000)} (Tercapai 95%)</p>
                </div>
                <div className="p-3 rounded-lg bg-card/80">
                  <p className="font-medium text-foreground mb-1">3. Berapa banyak yang saya belanjakan?</p>
                  <p className="text-sm text-muted-foreground">Pengeluaran tahunan: {formatRupiah(1050000000)}</p>
                </div>
                <div className="p-3 rounded-lg bg-card/80">
                  <p className="font-medium text-foreground mb-1">4. Bagaimana saya bisa memperbaiki?</p>
                  <p className="text-sm text-muted-foreground">Fokus pada preventive maintenance dan diversifikasi sumber pemasukan</p>
                </div>
              </div>
            </Card>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default Reports;
