import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Download, Filter, Calendar, PieChart as PieChartIcon } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { formatRupiah } from "@/lib/currency";
import { useState } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { ColoredProgressBar } from "@/components/ColoredProgressBar";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

const monthlyData = [
  { month: "Jan", income: 125000000, expenses: 85000000, profit: 40000000 },
  { month: "Feb", income: 145000000, expenses: 75000000, profit: 70000000 },
  { month: "Mar", income: 135000000, expenses: 92000000, profit: 43000000 },
  { month: "Apr", income: 170000000, expenses: 82000000, profit: 88000000 },
  { month: "May", income: 155000000, expenses: 78000000, profit: 77000000 },
  { month: "Jun", income: 185000000, expenses: 88000000, profit: 97000000 },
];

const categoryData = [
  { name: "Sewa Properti", value: 185000000, color: "hsl(var(--primary))" },
  { name: "Utilitas", value: 35000000, color: "hsl(var(--secondary))" },
  { name: "Deposit", value: 25000000, color: "hsl(var(--accent))" },
  { name: "Lainnya", value: 15000000, color: "hsl(var(--warning))" },
];

const expenseCategoryData = [
  { name: "Pemeliharaan", value: 40000000, color: "hsl(var(--destructive))" },
  { name: "Utilitas", value: 20000000, color: "hsl(var(--secondary))" },
  { name: "Pajak", value: 15000000, color: "hsl(var(--warning))" },
  { name: "Asuransi", value: 8000000, color: "hsl(var(--info))" },
  { name: "Lainnya", value: 5000000, color: "hsl(var(--muted))" },
];

const transactions = [
  { id: 1, type: "Income", description: "Pembayaran Sewa - Sunset Villa #12", amount: 7500000, date: "1 Jun 2025", category: "Sewa", status: "Completed" },
  { id: 2, type: "Expense", description: "Perbaikan AC - Harbor View #7", amount: 1500000, date: "2 Jun 2025", category: "Pemeliharaan", status: "Completed" },
  { id: 3, type: "Income", description: "Pembayaran Sewa - Garden Court #23", amount: 6500000, date: "1 Jun 2025", category: "Sewa", status: "Completed" },
  { id: 4, type: "Expense", description: "Pembayaran Asuransi Properti", amount: 3500000, date: "3 Jun 2025", category: "Asuransi", status: "Completed" },
  { id: 5, type: "Income", description: "Pembayaran Sewa - Parkside #15", amount: 5800000, date: "2 Jun 2025", category: "Sewa", status: "Completed" },
  { id: 6, type: "Expense", description: "Pajak Bumi dan Bangunan", amount: 9500000, date: "5 Jun 2025", category: "Pajak", status: "Pending" },
  { id: 7, type: "Income", description: "Pembayaran Deposit - Downtown Loft #5", amount: 8000000, date: "3 Jun 2025", category: "Deposit", status: "Completed" },
  { id: 8, type: "Expense", description: "Listrik & Air - Semua Properti", amount: 4200000, date: "4 Jun 2025", category: "Utilitas", status: "Completed" },
];

const budgetCategories = [
  { category: "Pemeliharaan", budget: 50000000, spent: 40000000, percentage: 80 },
  { category: "Utilitas", budget: 25000000, spent: 20000000, percentage: 80 },
  { category: "Pajak", budget: 18000000, spent: 15000000, percentage: 83 },
  { category: "Asuransi", budget: 10000000, spent: 8000000, percentage: 80 },
  { category: "Darurat", budget: 20000000, spent: 5000000, percentage: 25 },
];

const Finances = () => {
  const { activeTheme } = useAppTheme();
  const [timeFilter, setTimeFilter] = useState("month");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const totalIncome = 185000000;
  const totalExpenses = 88000000;
  const netProfit = 97000000;

  return (
    <AnimatedBackground theme="neutral">
      <div className="min-h-screen p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">
              Analisis Keuangan
            </h1>
            <p className="text-muted-foreground">Lacak pendapatan, pengeluaran, dan profitabilitas secara real-time</p>
          </div>
        <div className="flex gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="quarter">Kuartal Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button className={cn(
            activeTheme === 'japanese' ? 'gradient-primary text-white border-0' : '',
            "shadow-lg hover:shadow-xl transition-all"
          )}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className={cn(
          "p-6 shadow-md card-hover",
          activeTheme === 'japanese' ? 'gradient-card border-0' : ''
        )}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Pendapatan</p>
              <p className="text-3xl font-bold text-foreground mt-2">{formatRupiah(totalIncome)}</p>
            </div>
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
              activeTheme === 'japanese' ? 'gradient-success' : 'bg-green-500'
            )}>
              <ArrowUpRight className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-accent">+15.3%</span>
            <span className="text-xs text-muted-foreground">vs bulan lalu</span>
          </div>
        </Card>

        <Card className={cn(
          "p-6 shadow-md card-hover",
          activeTheme === 'japanese' ? 'gradient-card border-0' : ''
        )}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Pengeluaran</p>
              <p className="text-3xl font-bold text-foreground mt-2">{formatRupiah(totalExpenses)}</p>
            </div>
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
              activeTheme === 'japanese' ? 'gradient-secondary' : 'bg-orange-500'
            )}>
              <ArrowDownRight className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold text-secondary">+6.2%</span>
            <span className="text-xs text-muted-foreground">vs bulan lalu</span>
          </div>
        </Card>

        <Card className={cn(
          "p-6 shadow-md card-hover",
          activeTheme === 'japanese' ? 'gradient-card border-0' : ''
        )}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Laba Bersih</p>
              <p className="text-3xl font-bold text-foreground mt-2">{formatRupiah(netProfit)}</p>
            </div>
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shadow-lg",
              activeTheme === 'japanese' ? 'gradient-primary' : 'bg-primary'
            )}>
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-accent">+30.8%</span>
            <span className="text-xs text-muted-foreground">vs bulan lalu</span>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className={cn(
              "p-6 shadow-md",
              activeTheme === 'japanese' ? 'gradient-card border-0' : ''
            )}>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Tren Pendapatan vs Pengeluaran</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
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
                  <Legend />
                  <Area type="monotone" dataKey="income" name="Pendapatan" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#incomeGradient)" />
                  <Area type="monotone" dataKey="expenses" name="Pengeluaran" stroke="hsl(var(--secondary))" fillOpacity={1} fill="url(#expensesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card className={cn(
              "p-6 shadow-md",
              activeTheme === 'japanese' ? 'gradient-card border-0' : ''
            )}>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Tren Profit</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
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
                    dataKey="profit" 
                    name="Laba Bersih"
                    stroke="hsl(var(--accent))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Category Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className={cn(
              "p-6 shadow-md",
              activeTheme === 'japanese' ? 'gradient-card border-0' : ''
            )}>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Kategori Pendapatan</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => formatRupiah(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className={cn(
              "p-6 shadow-md",
              activeTheme === 'japanese' ? 'gradient-card border-0' : ''
            )}>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Kategori Pengeluaran</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => formatRupiah(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <Card className={cn(
            "p-6 shadow-md",
            activeTheme === 'japanese' ? 'gradient-card border-0' : ''
          )}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Tracking Budget per Kategori</h3>
              <Button className={cn(
                activeTheme === 'japanese' ? 'gradient-primary text-white border-0' : '',
                "shadow-md"
              )}>
                Atur Budget
              </Button>
            </div>
            <div className="space-y-6">
              {budgetCategories.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{item.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatRupiah(item.spent)} dari {formatRupiah(item.budget)}
                      </p>
                    </div>
                    <Badge className={`${
                      item.percentage > 90 
                        ? "bg-destructive/10 text-destructive border-destructive/20" 
                        : item.percentage > 75 
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-accent/10 text-accent border-accent/20"
                    } border`}>
                      {item.percentage}%
                    </Badge>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                        item.percentage > 90 
                          ? "bg-destructive" 
                          : item.percentage > 75 
                          ? "bg-warning"
                          : "bg-accent"
                      }`}
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Sisa: {formatRupiah(item.budget - item.spent)}</span>
                    <span>{item.percentage > 90 ? "Mendekati batas!" : item.percentage > 75 ? "Perhatian" : "Aman"}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className={cn(
            "p-6 shadow-md",
            activeTheme === 'japanese' ? 'gradient-card border-0' : ''
          )}>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Perbandingan Budget vs Realisasi</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetCategories}>
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
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                <Bar dataKey="spent" name="Terpakai" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card className="p-6 gradient-card border-0 shadow-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Riwayat Transaksi</h3>
                <p className="text-sm text-muted-foreground mt-1">Total {transactions.length} transaksi bulan ini</p>
              </div>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    <SelectItem value="rent">Sewa</SelectItem>
                    <SelectItem value="maintenance">Pemeliharaan</SelectItem>
                    <SelectItem value="utilities">Utilitas</SelectItem>
                    <SelectItem value="tax">Pajak</SelectItem>
                    <SelectItem value="insurance">Asuransi</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="gradient-primary text-white border-0 shadow-md">
                  Tambah Transaksi
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`h-12 w-12 rounded-full ${
                      transaction.type === "Income" ? "gradient-success" : "gradient-secondary"
                    } flex items-center justify-center shadow-md`}>
                      {transaction.type === "Income" ? (
                        <ArrowUpRight className="h-6 w-6 text-white" />
                      ) : (
                        <ArrowDownRight className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{transaction.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {transaction.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{transaction.date}</span>
                        <Badge className={`text-xs ${
                          transaction.status === "Completed"
                            ? "bg-accent/10 text-accent border-accent/20"
                            : "bg-warning/10 text-warning border-warning/20"
                        } border`}>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      transaction.type === "Income" ? "text-accent" : "text-secondary"
                    }`}>
                      {transaction.type === "Income" ? "+" : "-"}{formatRupiah(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AnimatedBackground>
  );
};

export default Finances;
