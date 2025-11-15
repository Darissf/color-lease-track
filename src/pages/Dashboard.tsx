import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, CreditCard, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  monthlyBudget: number;
  remainingBudget: number;
  savingsRate: number;
}

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' }).toLowerCase();
    const currentYear = new Date().getFullYear();

    // Fetch monthly report
    const { data: reportData } = await supabase
      .from("monthly_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .maybeSingle();

    // Fetch total savings
    const { data: savingsData } = await supabase
      .from("savings_plans")
      .select("current_amount")
      .eq("user_id", user.id);

    const totalSavings = savingsData?.reduce((sum, plan) => sum + (plan.current_amount || 0), 0) || 0;

    // Fetch recent expenses
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5);

    // Group expenses by category
    const { data: allExpenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id);

    const categoryMap = new Map();
    allExpenses?.forEach(exp => {
      const current = categoryMap.get(exp.category) || 0;
      categoryMap.set(exp.category, current + exp.amount);
    });

    const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // Fetch last 6 months reports
    const { data: reportsData } = await supabase
      .from("monthly_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("year", currentYear)
      .order("month", { ascending: true })
      .limit(6);

    const trendData = reportsData?.map(r => ({
      month: r.month.substring(0, 3).toUpperCase(),
      pemasukan: r.pemasukan || 0,
      pengeluaran: r.pengeluaran || 0,
    })) || [];

    // Fetch income by client
    const { data: incomeData } = await supabase
      .from("rental_contracts")
      .select(`
        jumlah_lunas,
        client_groups (
          nama
        )
      `)
      .eq("user_id", user.id)
      .not("tanggal_lunas", "is", null);

    const clientIncomeMap = new Map();
    incomeData?.forEach(contract => {
      const clientName = contract.client_groups?.nama || 'Unknown';
      const current = clientIncomeMap.get(clientName) || 0;
      clientIncomeMap.set(clientName, current + (contract.jumlah_lunas || 0));
    });

    const clientIncomeData = Array.from(clientIncomeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 clients

    // Budget calculations
    // Formula: Remaining Budget = Monthly Budget - Total Expenses
    // Savings Rate = ((Income - Expenses) / Income) × 100%
    const income = reportData?.pemasukan || 0;
    const expenses = reportData?.pengeluaran || 0;
    const budget = reportData?.target_belanja || 0;
    const remaining = budget - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    setStats({
      totalIncome: income,
      totalExpenses: expenses,
      totalSavings,
      monthlyBudget: budget,
      remainingBudget: remaining,
      savingsRate,
    });

    setRecentExpenses(expensesData || []);
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
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Memuat dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ringkasan keuangan Anda bulan ini</p>
        </div>
        <Button onClick={() => navigate("/nabila")} size="sm">
          Lihat Detail →
        </Button>
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
            <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
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
            <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
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
              <DollarSign className="h-4 w-4 text-purple-600" />
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
        {/* Monthly Trend - Income vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Trend 6 Bulan Terakhir</CardTitle>
            <p className="text-xs text-muted-foreground">Perbandingan Pemasukan vs Pengeluaran</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line type="monotone" dataKey="pemasukan" stroke="#10b981" strokeWidth={2} name="Pemasukan" />
                <Line type="monotone" dataKey="pengeluaran" stroke="#ef4444" strokeWidth={2} name="Pengeluaran" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Income by Client */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pemasukan per Client</CardTitle>
            <p className="text-xs text-muted-foreground">Top 10 client dengan pemasukan tertinggi</p>
          </CardHeader>
          <CardContent>
            {incomeByClient.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={incomeByClient} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="hsl(var(--muted-foreground))" 
                    style={{ fontSize: '11px' }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" fill="#a855f7" name="Pemasukan" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
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
        <Card>
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
                  <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{expense.description || expense.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString('id-ID')} • {expense.category}
                      </p>
                    </div>
                    <span className="font-semibold text-red-600 text-sm">
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
    </div>
  );
}
