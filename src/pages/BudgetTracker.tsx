import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, PiggyBank, Wallet, Calendar } from "lucide-react";
import { formatRupiah } from "@/lib/currency";

const monthlyBudgets = [
  {
    month: "April",
    budget: 100000000,
    spent: 82000000,
    remaining: 18000000,
    percentage: 82,
    categories: [
      { name: "Pemeliharaan Properti", budget: 50000000, spent: 40000000 },
      { name: "Utilitas", budget: 25000000, spent: 20000000 },
      { name: "Pajak", budget: 18000000, spent: 15000000 },
      { name: "Lainnya", budget: 7000000, spent: 7000000 },
    ]
  },
  {
    month: "Mei",
    budget: 100000000,
    spent: 78000000,
    remaining: 22000000,
    percentage: 78,
    categories: [
      { name: "Pemeliharaan Properti", budget: 50000000, spent: 38000000 },
      { name: "Utilitas", budget: 25000000, spent: 18000000 },
      { name: "Pajak", budget: 18000000, spent: 15000000 },
      { name: "Lainnya", budget: 7000000, spent: 7000000 },
    ]
  },
  {
    month: "Juni",
    budget: 100000000,
    spent: 88000000,
    remaining: 12000000,
    percentage: 88,
    categories: [
      { name: "Pemeliharaan Properti", budget: 50000000, spent: 45000000 },
      { name: "Utilitas", budget: 25000000, spent: 22000000 },
      { name: "Pajak", budget: 18000000, spent: 16000000 },
      { name: "Lainnya", budget: 7000000, spent: 5000000 },
    ]
  },
];

const savingsGoals = [
  {
    id: 1,
    name: "Dana Darurat",
    target: 500000000,
    current: 350000000,
    percentage: 70,
    color: "accent"
  },
  {
    id: 2,
    name: "Investasi Properti Baru",
    target: 2000000000,
    current: 950000000,
    percentage: 47.5,
    color: "primary"
  },
  {
    id: 3,
    name: "Renovasi Properti",
    target: 300000000,
    current: 180000000,
    percentage: 60,
    color: "secondary"
  },
];

const BudgetTracker = () => {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Pelacak Anggaran & Tabungan
          </h1>
          <p className="text-muted-foreground">Monitor anggaran bulanan dan progress tabungan Anda</p>
        </div>
        <Button className="gradient-primary text-white border-0 shadow-lg hover:shadow-xl transition-all">
          <Target className="mr-2 h-4 w-4" />
          Atur Target Baru
        </Button>
      </div>

      {/* Monthly Budgets */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Anggaran Bulanan</h2>
            <p className="text-sm text-muted-foreground">Kuartal 2 - 2025</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {monthlyBudgets.map((data, index) => (
            <Card key={index} className="p-6 gradient-card border-0 shadow-md card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">{data.month}</h3>
                </div>
                <Badge className={`${
                  data.percentage > 90 
                    ? "bg-destructive/10 text-destructive border-destructive/20" 
                    : data.percentage > 75 
                    ? "bg-warning/10 text-warning border-warning/20"
                    : "bg-accent/10 text-accent border-accent/20"
                } border`}>
                  {data.percentage}%
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Anggaran Total</span>
                    <span className="font-semibold text-foreground">{formatRupiah(data.budget)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Terpakai</span>
                    <span className="font-semibold text-secondary">{formatRupiah(data.spent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tersisa</span>
                    <span className="font-semibold text-accent">{formatRupiah(data.remaining)}</span>
                  </div>
                </div>

                <Progress value={data.percentage} className="h-3" />

                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Breakdown Kategori</p>
                  <div className="space-y-2">
                    {data.categories.map((cat, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{cat.name}</span>
                        <span className="font-medium text-foreground">
                          {formatRupiah(cat.spent)} / {formatRupiah(cat.budget)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Savings Goals */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-lg gradient-success flex items-center justify-center">
            <PiggyBank className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Target Tabungan</h2>
            <p className="text-sm text-muted-foreground">Progress menuju tujuan finansial</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {savingsGoals.map((goal) => (
            <Card key={goal.id} className="p-6 gradient-card border-0 shadow-md card-hover">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{goal.name}</h3>
                    <p className="text-sm text-muted-foreground">Target: {formatRupiah(goal.target)}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br from-${goal.color} to-accent flex items-center justify-center shadow-md`}>
                    <Target className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <Badge className="bg-accent/10 text-accent border-accent/20 border">
                      {goal.percentage}%
                    </Badge>
                  </div>
                  <Progress value={goal.percentage} className="h-3" />
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Terkumpul</p>
                      <p className="text-xl font-bold text-foreground">{formatRupiah(goal.current)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Kurang</p>
                      <p className="text-lg font-semibold text-secondary">
                        {formatRupiah(goal.target - goal.current)}
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full border-primary/20 text-primary hover:bg-primary/10"
                  size="sm"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Tambah Tabungan
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Summary Card */}
      <Card className="mt-8 p-6 gradient-card border-0 shadow-md">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Tips Mengatur Anggaran</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Alokasikan 50% untuk kebutuhan, 30% untuk keinginan, 20% untuk tabungan</li>
              <li>• Review anggaran setiap akhir bulan dan sesuaikan jika perlu</li>
              <li>• Sisihkan dana darurat minimal 6x pengeluaran bulanan</li>
              <li>• Prioritaskan melunasi hutang berbunga tinggi terlebih dahulu</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Capaian Bulan Ini</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Anggaran dipatuhi</span>
                <Badge className="bg-accent/10 text-accent border-accent/20 border">
                  ✓ Baik
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Target tabungan</span>
                <Badge className="bg-accent/10 text-accent border-accent/20 border">
                  ✓ Tercapai
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BudgetTracker;
