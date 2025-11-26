import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit, TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard, Calendar, ArrowUpRight, ArrowDownRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CategoryBadge } from "@/components/CategoryBadge";
import { EnhancedTooltip } from "@/components/EnhancedTooltip";
import { getCategoryStyle } from "@/lib/categoryColors";
import { MonthlyViewLoadingSkeleton } from "@/components/MonthlyViewSkeleton";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

interface MonthStats {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  monthlyBudget: number;
  remainingBudget: number;
  savingsRate: number;
}

export default function MonthlyView() {
  const { month, year } = useParams<{ month: string; year: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeTheme } = useAppTheme();
  const navigate = useNavigate();
  const selectedYear = year ? parseInt(year) : new Date().getFullYear();
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
  const [rentalContracts, setRentalContracts] = useState<any[]>([]);

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
      .eq("year", selectedYear)
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
          year: selectedYear,
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
      const startDate = new Date(selectedYear, monthIndex, 1);
      const endDate = new Date(selectedYear, monthIndex + 1, 0);

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

      // Fetch income from rental contracts with tanggal_lunas in this month
      const { data: contractIncomeData } = await supabase
        .from("income_sources")
        .select(`
          *
        `)
        .eq("user_id", user.id)
        .not("contract_id", "is", null)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0])
        .order("date", { ascending: false });

      setRentalContracts(contractIncomeData || []);

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
    return <MonthlyViewLoadingSkeleton />;
  }

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-2 py-2 md:px-8 md:py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold capitalize">{month} {selectedYear}</h1>
              <p className="text-sm text-muted-foreground">Dashboard Keuangan Bulanan</p>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-8 pb-4 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className={cn(
          "relative overflow-hidden group transition-all duration-300",
          activeTheme === 'japanese'
            ? "border-0 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50"
            : "bg-card border border-border"
        )}>
          {activeTheme === 'japanese' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500" />
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
            </>
          )}
          <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className={cn(
              "text-sm font-medium",
              activeTheme === 'japanese' ? "text-white" : "text-foreground"
            )}>Total Pemasukan</CardTitle>
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300",
              activeTheme === 'japanese' 
                ? "bg-white/20 text-white group-hover:rotate-12" 
                : "bg-emerald-100 text-emerald-600"
            )}>
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className={cn(
              "text-3xl font-bold",
              activeTheme === 'japanese' ? "text-white" : "text-foreground"
            )}>{formatCurrency(stats.totalIncome)}</div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUpRight className={cn(
                "h-4 w-4",
                activeTheme === 'japanese' ? "text-emerald-100" : "text-emerald-600"
              )} />
              <p className={cn(
                "text-xs",
                activeTheme === 'japanese' ? "text-emerald-100" : "text-muted-foreground"
              )}>Bulan {month}</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className={cn(
          "relative overflow-hidden group transition-all duration-300",
          activeTheme === 'japanese'
            ? "border-0 hover:scale-105 hover:shadow-2xl hover:shadow-rose-500/50"
            : "bg-card border border-border"
        )}>
          {activeTheme === 'japanese' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-red-500 to-orange-500" />
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
            </>
          )}
          <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className={cn(
              "text-sm font-medium",
              activeTheme === 'japanese' ? "text-white" : "text-foreground"
            )}>Total Pengeluaran</CardTitle>
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300",
              activeTheme === 'japanese' 
                ? "bg-white/20 text-white group-hover:rotate-12" 
                : "bg-rose-100 text-rose-600"
            )}>
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className={cn(
              "text-3xl font-bold",
              activeTheme === 'japanese' ? "text-white" : "text-foreground"
            )}>{formatCurrency(stats.totalExpenses)}</div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowDownRight className={cn(
                "h-4 w-4",
                activeTheme === 'japanese' ? "text-rose-100" : "text-rose-600"
              )} />
              <p className={cn(
                "text-xs",
                activeTheme === 'japanese' ? "text-rose-100" : "text-muted-foreground"
              )}>Bulan {month}</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Savings */}
        <Card className={cn(
          "relative overflow-hidden group transition-all duration-300",
          activeTheme === 'japanese'
            ? "border-0 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50"
            : "bg-card border border-border"
        )}>
          {activeTheme === 'japanese' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-500" />
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
            </>
          )}
          <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className={cn(
              "text-sm font-medium",
              activeTheme === 'japanese' ? "text-white" : "text-foreground"
            )}>Total Tabungan</CardTitle>
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300",
              activeTheme === 'japanese' 
                ? "bg-white/20 text-white group-hover:rotate-12" 
                : "bg-blue-100 text-blue-600"
            )}>
              <PiggyBank className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className={cn(
              "text-3xl font-bold",
              activeTheme === 'japanese' ? "text-white" : "text-foreground"
            )}>{formatCurrency(stats.totalSavings)}</div>
            <div className="flex items-center gap-1 mt-2">
              <Wallet className={cn(
                "h-4 w-4",
                activeTheme === 'japanese' ? "text-blue-100" : "text-blue-600"
              )} />
              <p className={cn(
                "text-xs",
                activeTheme === 'japanese' ? "text-blue-100" : "text-muted-foreground"
              )}>Akumulasi</p>
            </div>
          </CardContent>
        </Card>

        {/* Savings Rate */}
        <Card className={cn(
          "relative overflow-hidden group transition-all duration-300",
          activeTheme === 'japanese'
            ? "border-0 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
            : "bg-card border border-border"
        )}>
          {activeTheme === 'japanese' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500" />
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
            </>
          )}
          <CardHeader className="relative flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className={cn(
              "text-sm font-medium",
              activeTheme === 'japanese' ? "text-white" : "text-foreground"
            )}>Savings Rate</CardTitle>
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300",
              activeTheme === 'japanese' 
                ? "bg-white/20 text-white group-hover:rotate-12" 
                : "bg-purple-100 text-purple-600"
            )}>
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className={cn(
              "text-3xl font-bold",
              activeTheme === 'japanese' ? "text-white" : "text-foreground"
            )}>{stats.savingsRate.toFixed(1)}%</div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUpRight className={cn(
                "h-4 w-4",
                activeTheme === 'japanese' ? "text-purple-100" : "text-purple-600"
              )} />
              <p className={cn(
                "text-xs",
                activeTheme === 'japanese' ? "text-purple-100" : "text-muted-foreground"
              )}>Dari pendapatan</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Sources */}
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gradient-purple">Sumber Pemasukan</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <defs>
                    <linearGradient id="incomeGradient1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="incomeGradient2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="incomeGradient3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <Pie
                    data={incomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {incomeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<EnhancedTooltip type="pie" />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data pemasukan
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gradient-purple">Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {expensesByCategory.map((entry, index) => {
                      const categoryStyle = getCategoryStyle(entry.name);
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<EnhancedTooltip type="pie" />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
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
            <CardTitle className="text-xl font-bold text-gradient-purple flex items-center gap-2">
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
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gradient-purple flex items-center gap-2">
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
      </div>

      {/* Income from Rental Contracts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gradient-purple flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Pemasukan Bulan {month}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rentalContracts.length > 0 ? (
            <div className="space-y-2">
              {rentalContracts.map((income) => (
                <div key={income.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {income.source_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>Tanggal Lunas: {new Date(income.date).toLocaleDateString('id-ID')}</span>
                      {income.bank_name && (
                        <span>Bank: {income.bank_name}</span>
                      )}
                    </div>
                  </div>
                  <span className="font-semibold text-green-600 text-sm">
                    {formatCurrency(income.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Belum ada pemasukan dari kontrak sewa bulan ini
            </div>
          )}
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
    </div>
  );
}
