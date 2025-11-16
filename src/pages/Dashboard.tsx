import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, eachDayOfInterval, eachMonthOfInterval, subDays, subMonths } from "date-fns";
import { AIBudgetAdvisor } from "@/components/AIBudgetAdvisor";
import { CategoryBadge } from "@/components/CategoryBadge";
import { EnhancedTooltip } from "@/components/EnhancedTooltip";
import { getCategoryStyle } from "@/lib/categoryColors";
import { DashboardLoadingSkeleton } from "@/components/SkeletonLoader";

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  monthlyBudget: number;
  remainingBudget: number;
  savingsRate: number;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    monthlyBudget: 0,
    remainingBudget: 0,
    savingsRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [incomeByClient, setIncomeByClient] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user, period]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    const now = new Date();
    
    // Calculate date range based on period
    let startDate: Date;
    let endDate: Date;
    
    if (period === "week") {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else if (period === "month") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Fetch income for the period from rental_contracts
    const { data: incomeData } = await supabase
      .from("rental_contracts")
      .select("jumlah_lunas, tanggal_lunas")
      .eq("user_id", user.id)
      .not("tanggal_lunas", "is", null)
      .gte("tanggal_lunas", startDateStr)
      .lte("tanggal_lunas", endDateStr);

    const totalIncome = incomeData?.reduce((sum, contract) => sum + (contract.jumlah_lunas || 0), 0) || 0;

    // Fetch expenses for the period
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: false });

    const totalExpenses = expensesData?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
    const recentExpensesData = expensesData?.slice(0, 5) || [];

    // Fetch total savings
    const { data: savingsData } = await supabase
      .from("savings_plans")
      .select("current_amount")
      .eq("user_id", user.id);

    const totalSavings = savingsData?.reduce((sum, plan) => sum + (plan.current_amount || 0), 0) || 0;

    // Group expenses by category
    const categoryMap = new Map();
    expensesData?.forEach(exp => {
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + exp.amount);
    });

    const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // Generate trend data based on period
    let trendData: any[] = [];
    
    if (period === "week") {
      // Daily trend for the week
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      trendData = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayIncome = incomeData?.filter(i => i.tanggal_lunas === dayStr)
          .reduce((sum, i) => sum + (i.jumlah_lunas || 0), 0) || 0;
        const dayExpenses = expensesData?.filter(e => e.date === dayStr)
          .reduce((sum, e) => sum + e.amount, 0) || 0;
        
        return {
          month: format(day, 'EEE'),
          pemasukan: dayIncome,
          pengeluaran: dayExpenses,
        };
      });
    } else if (period === "month") {
      // Weekly trend for the month
      const weeks = Math.ceil((endDate.getDate() - startDate.getDate() + 1) / 7);
      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd > endDate ? endDate : weekEnd, 'yyyy-MM-dd');
        
        const weekIncome = incomeData?.filter(i => i.tanggal_lunas && i.tanggal_lunas >= weekStartStr && i.tanggal_lunas <= weekEndStr)
          .reduce((sum, i) => sum + (i.jumlah_lunas || 0), 0) || 0;
        const weekExpenses = expensesData?.filter(e => e.date >= weekStartStr && e.date <= weekEndStr)
          .reduce((sum, e) => sum + e.amount, 0) || 0;
        
        trendData.push({
          month: `W${i + 1}`,
          pemasukan: weekIncome,
          pengeluaran: weekExpenses,
        });
      }
    } else {
      // Monthly trend for the year
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      trendData = months.map(month => {
        const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');
        
        const monthIncome = incomeData?.filter(i => i.tanggal_lunas && i.tanggal_lunas >= monthStart && i.tanggal_lunas <= monthEnd)
          .reduce((sum, i) => sum + (i.jumlah_lunas || 0), 0) || 0;
        const monthExpenses = expensesData?.filter(e => e.date >= monthStart && e.date <= monthEnd)
          .reduce((sum, e) => sum + e.amount, 0) || 0;
        
        return {
          month: format(month, 'MMM').toUpperCase(),
          pemasukan: monthIncome,
          pengeluaran: monthExpenses,
        };
      });
    }

    // Fetch income by client for the period
    const { data: clientIncomeRaw } = await supabase
      .from("rental_contracts")
      .select(`
        jumlah_lunas,
        tanggal_lunas,
        client_groups (
          nama
        )
      `)
      .eq("user_id", user.id)
      .not("tanggal_lunas", "is", null)
      .gte("tanggal_lunas", startDateStr)
      .lte("tanggal_lunas", endDateStr);

    const clientIncomeMap = new Map();
    clientIncomeRaw?.forEach(contract => {
      const clientName = contract.client_groups?.nama || 'Unknown';
      const current = clientIncomeMap.get(clientName) || 0;
      clientIncomeMap.set(clientName, current + (contract.jumlah_lunas || 0));
    });

    const clientIncomeData = Array.from(clientIncomeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 clients

    // Fetch budget for the period
    const { data: budgetData } = await supabase
      .from("monthly_budgets")
      .select("target_belanja")
      .eq("user_id", user.id)
      .eq("month", format(startDate, 'MMMM').toLowerCase())
      .eq("year", startDate.getFullYear())
      .maybeSingle();

    const budget = budgetData?.target_belanja || 0;
    const remaining = budget - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    setStats({
      totalIncome,
      totalExpenses,
      totalSavings,
      monthlyBudget: budget,
      remainingBudget: remaining,
      savingsRate,
    });

    setRecentExpenses(recentExpensesData);
    setExpensesByCategory(categoryData);
    setMonthlyTrend(trendData);
    setIncomeByClient(clientIncomeData);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan keuangan Anda {period === "week" ? "minggu ini" : period === "month" ? "bulan ini" : "tahun ini"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value: "week" | "month" | "year") => setPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/nabila")} size="sm">
            Lihat Detail →
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pemasukan
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {period === "week" ? "Minggu ini" : period === "month" ? "Bulan ini" : "Tahun ini"}
            </p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pengeluaran
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {period === "week" ? "Minggu ini" : period === "month" ? "Bulan ini" : "Tahun ini"}
            </p>
          </CardContent>
        </Card>

        {/* Total Savings */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tabungan
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <PiggyBank className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalSavings)}</div>
            <p className="text-xs text-muted-foreground mt-1">Akumulasi</p>
          </CardContent>
        </Card>

        {/* Savings Rate */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Savings Rate
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.savingsRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Dari pendapatan</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Monthly Trend & Income by Client */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend - Income vs Expenses */}
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Trend {period === "week" ? "Harian" : period === "month" ? "Mingguan" : "Bulanan"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Perbandingan Pemasukan vs Pengeluaran</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))" 
                  style={{ fontSize: '12px' }} 
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  style={{ fontSize: '12px' }} 
                />
                <Tooltip content={<EnhancedTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="pemasukan" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  name="Pemasukan"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                  animationDuration={1000}
                />
                <Line 
                  type="monotone" 
                  dataKey="pengeluaran" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  name="Pengeluaran"
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                  animationDuration={1000}
                  animationBegin={200}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Income by Client */}
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pemasukan per Client</CardTitle>
            <p className="text-xs text-muted-foreground">Top 10 client dengan pemasukan tertinggi</p>
          </CardHeader>
          <CardContent>
            {incomeByClient.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeByClient} layout="vertical">
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    type="number" 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '12px' }} 
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '11px' }}
                    width={100}
                  />
                  <Tooltip content={<EnhancedTooltip type="bar" />} />
                  <Bar 
                    dataKey="value" 
                    fill="url(#colorBar)" 
                    name="Pemasukan"
                    radius={[0, 8, 8, 0]}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data pemasukan dari client
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Expenses Category & Budget Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data pengeluaran
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Overview with Formula */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Budget Overview
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Rumus: Sisa Budget = Target Belanja - Total Pengeluaran
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Monthly Budget</span>
              <span className="font-semibold">{formatCurrency(stats.monthlyBudget)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Spent</span>
              <span className="font-semibold text-red-600">{formatCurrency(stats.totalExpenses)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className={`font-semibold ${stats.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.remainingBudget)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 mt-2">
              <div
                className={`h-2.5 rounded-full ${
                  (stats.totalExpenses / stats.monthlyBudget) * 100 > 100
                    ? 'bg-red-600'
                    : (stats.totalExpenses / stats.monthlyBudget) * 100 > 80
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
                }`}
                style={{
                  width: `${Math.min((stats.totalExpenses / stats.monthlyBudget) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {stats.monthlyBudget > 0 
                ? `${((stats.totalExpenses / stats.monthlyBudget) * 100).toFixed(1)}% terpakai`
                : 'Belum ada target budget'}
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md mt-2">
              <strong>Savings Rate:</strong> {stats.savingsRate.toFixed(1)}%
              <br />
              <span className="text-[10px]">Formula: ((Pemasukan - Pengeluaran) / Pemasukan) × 100%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Pengeluaran Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between py-3 px-3 rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CategoryBadge category={expense.category} size="sm" />
                      </div>
                      <p className="font-medium text-sm">{expense.description || expense.category}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(expense.date).toLocaleDateString('id-ID', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <span className="font-bold text-red-600 text-base ml-4">
                      -{formatCurrency(expense.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Belum ada pengeluaran tercatat
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="h-16 justify-start gap-3"
                onClick={() => navigate("/nabila")}
              >
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Tambah Pemasukan</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 justify-start gap-3"
                onClick={() => navigate("/nabila")}
              >
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium">Catat Pengeluaran</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 justify-start gap-3"
                onClick={() => navigate("/nabila")}
              >
                <PiggyBank className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Update Tabungan</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Budget Advisor */}
      <AIBudgetAdvisor />
    </div>
  );
}
