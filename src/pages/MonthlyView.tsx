import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit, TrendingUp, TrendingDown, DollarSign, PiggyBank, CreditCard, Calendar, ArrowUpRight, ArrowDownRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

interface MonthStats {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  monthlyBudget: number;
  remainingBudget: number;
  savingsRate: number;
}

export default function MonthlyView() {
  const { month } = useParams<{ month: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MonthStats>({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    monthlyBudget: 0,
    remainingBudget: 0,
    savingsRate: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const [incomeData, setIncomeData] = useState<any[]>([]);

  useEffect(() => {
    fetchMonthlyReport();
    fetchDashboardData();
  }, [month, user]);

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

  const fetchDashboardData = async () => {
    if (!user || !month) return;

    const currentYear = new Date().getFullYear();

    // Fetch total savings
    const { data: savingsData } = await supabase
      .from("savings_plans")
      .select("current_amount")
      .eq("user_id", user.id);

    const totalSavings = savingsData?.reduce((sum, plan) => sum + (plan.current_amount || 0), 0) || 0;

    // Fetch expenses for this month
    const monthNames = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    const monthIndex = monthNames.indexOf(month?.toLowerCase() || '');
    
    if (monthIndex !== -1) {
      const startDate = new Date(currentYear, monthIndex, 1);
      const endDate = new Date(currentYear, monthIndex + 1, 0);

      // Fetch expenses for this specific month
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0])
        .order("date", { ascending: false })
        .limit(5);

      // Group expenses by category
      const { data: allExpenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0]);

      const categoryMap = new Map();
      allExpenses?.forEach(exp => {
        const current = categoryMap.get(exp.category) || 0;
        categoryMap.set(exp.category, current + exp.amount);
      });

      const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      // Fetch income sources for this month
      const { data: incomeSourcesData } = await supabase
        .from("income_sources")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0]);

      const incomeChartData = incomeSourcesData?.map(income => ({
        name: income.source_name,
        value: income.amount || 0,
      })) || [];

      const income = report?.pemasukan || 0;
      const expenses = report?.pengeluaran || 0;
      const budget = report?.target_belanja || 0;
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
      setIncomeData(incomeChartData);
    }
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
      fetchDashboardData();
    }
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/nabila")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold capitalize">{month}</h1>
              <p className="text-sm text-muted-foreground">Dashboard Keuangan Bulanan</p>
            </div>
          </div>
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
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bulan {month}</p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pengeluaran
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">Bulan {month}</p>
          </CardContent>
        </Card>

        {/* Total Savings */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tabungan
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
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
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.savingsRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Dari pendapatan</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Sumber Pemasukan</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data pemasukan
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>

      {/* Budget Overview & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Budget Overview
            </CardTitle>
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
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stats.totalExpenses > stats.monthlyBudget ? 'bg-red-600' : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min((stats.totalExpenses / (stats.monthlyBudget || 1)) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {((stats.totalExpenses / (stats.monthlyBudget || 1)) * 100).toFixed(1)}% digunakan
              </p>
            </div>
          </CardContent>
        </Card>

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
                  <div key={expense.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
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
      </div>

      {/* Monthly Report Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Input Data Bulanan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Pemasukan</Label>
              <Input
                type="number"
                value={report?.pemasukan || 0}
                onChange={(e) => updateReport("pemasukan", parseFloat(e.target.value) || 0)}
                className="text-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Pengeluaran</Label>
              <Input
                type="number"
                value={report?.pengeluaran || 0}
                onChange={(e) => updateReport("pengeluaran", parseFloat(e.target.value) || 0)}
                className="text-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Pengeluaran Tetap</Label>
              <Input
                type="number"
                value={report?.pengeluaran_tetap || 0}
                onChange={(e) => updateReport("pengeluaran_tetap", parseFloat(e.target.value) || 0)}
                className="text-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Target Belanja</Label>
              <Input
                type="number"
                value={report?.target_belanja || 0}
                onChange={(e) => updateReport("target_belanja", parseFloat(e.target.value) || 0)}
                className="text-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Target Keuangan</Label>
              <Input
                type="number"
                value={report?.target_keuangan || 0}
                onChange={(e) => updateReport("target_keuangan", parseFloat(e.target.value) || 0)}
                className="text-lg font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Sisa Tabungan</Label>
              <Input
                type="number"
                value={report?.sisa_tabungan || 0}
                onChange={(e) => updateReport("sisa_tabungan", parseFloat(e.target.value) || 0)}
                className="text-lg font-bold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="h-24 flex flex-col items-center justify-center gap-2"
          onClick={() => navigate("/income")}
        >
          <TrendingUp className="h-5 w-5" />
          <span className="text-sm font-medium">Tambah Pemasukan</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col items-center justify-center gap-2"
          onClick={() => navigate("/expenses")}
        >
          <TrendingDown className="h-5 w-5" />
          <span className="text-sm font-medium">Catat Pengeluaran</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col items-center justify-center gap-2"
          onClick={() => navigate("/savings")}
        >
          <PiggyBank className="h-5 w-5" />
          <span className="text-sm font-medium">Update Tabungan</span>
        </Button>
      </div>

    </div>
  );
}
