import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, RefreshCw, Search, Filter, ArrowUpRight, CreditCard, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths
} from "date-fns";
import { DashboardLoadingSkeleton } from "@/components/SkeletonLoader";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BankLogo from "@/components/BankLogo";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DashboardStats {
  totalBalance: number;
  totalSavings: number;
  monthlyBudget: number;
  remainingBudget: number;
  totalIncome: number;
  totalExpenses: number;
  balanceChange: number;
  savingsChange: number;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  balance: number;
  is_active: boolean;
}

interface Activity {
  id: string;
  type: 'income' | 'expense';
  name: string;
  date: string;
  time: string;
  amount: number;
  status: 'completed' | 'pending' | 'cancelled';
  category?: string;
}

const CHART_COLORS = ['#10B981', '#EF4444'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [cashFlowPeriod, setCashFlowPeriod] = useState<"monthly" | "yearly">("monthly");
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    totalSavings: 0,
    monthlyBudget: 0,
    remainingBudget: 0,
    totalIncome: 0,
    totalExpenses: 0,
    balanceChange: 0,
    savingsChange: 0,
  });
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, [user, period]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    const now = new Date();
    
    let startDate: Date;
    let endDate: Date;
    
    if (period === "month") {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Fetch bank accounts
    const { data: accountsData } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("bank_name");

    setBankAccounts(accountsData || []);
    const totalBalance = accountsData?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

    // Fetch income from rental contracts
    const { data: incomeData } = await supabase
      .from("rental_contracts")
      .select("jumlah_lunas, tanggal_lunas")
      .eq("user_id", user.id)
      .not("tanggal_lunas", "is", null)
      .gte("tanggal_lunas", startDateStr)
      .lte("tanggal_lunas", endDateStr);

    const totalIncome = incomeData?.reduce((sum, contract) => sum + (contract.jumlah_lunas || 0), 0) || 0;

    // Fetch expenses
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: false });

    const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

    // Fetch savings
    const { data: savingsData } = await supabase
      .from("savings_plans")
      .select("current_amount, target_amount")
      .eq("user_id", user.id);

    const totalSavings = savingsData?.reduce((sum, plan) => sum + (plan.current_amount || 0), 0) || 0;

    // Fetch budget
    const currentMonth = format(now, 'MMMM');
    const currentYear = now.getFullYear();
    
    const { data: budgetData } = await supabase
      .from("monthly_budgets")
      .select("target_belanja")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .single();

    const monthlyBudget = budgetData?.target_belanja || 0;
    const remainingBudget = monthlyBudget - totalExpenses;

    // Calculate changes (mock data for now - could be calculated from previous period)
    const balanceChange = 12.5;
    const savingsChange = 8.3;

    setStats({
      totalBalance,
      totalSavings,
      monthlyBudget,
      remainingBudget,
      totalIncome,
      totalExpenses,
      balanceChange,
      savingsChange,
    });

    // Fetch cash flow data (last 6 months)
    const cashFlow = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

      const { data: monthIncome } = await supabase
        .from("rental_contracts")
        .select("jumlah_lunas")
        .eq("user_id", user.id)
        .not("tanggal_lunas", "is", null)
        .gte("tanggal_lunas", monthStart)
        .lte("tanggal_lunas", monthEnd);

      const { data: monthExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const income = monthIncome?.reduce((sum, c) => sum + (c.jumlah_lunas || 0), 0) || 0;
      const expenses = monthExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

      cashFlow.push({
        month: format(monthDate, 'MMM'),
        income,
        expenses,
      });
    }
    setCashFlowData(cashFlow);

    // Fetch recent activities (combined income and expenses)
    const activities: Activity[] = [];
    
    // Add expenses
    expensesData?.slice(0, 10).forEach(expense => {
      activities.push({
        id: expense.id,
        type: 'expense',
        name: expense.transaction_name || expense.category,
        date: format(new Date(expense.date), 'dd MMM yyyy'),
        time: format(new Date(expense.created_at), 'HH:mm'),
        amount: expense.amount,
        status: 'completed',
        category: expense.category,
      });
    });

    // Add income from contracts
    incomeData?.slice(0, 10).forEach((contract: any) => {
      activities.push({
        id: contract.id || Math.random().toString(),
        type: 'income',
        name: 'Pembayaran Kontrak',
        date: format(new Date(contract.tanggal_lunas), 'dd MMM yyyy'),
        time: '00:00',
        amount: contract.jumlah_lunas,
        status: 'completed',
      });
    });

    // Sort by date
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecentActivities(activities.slice(0, 10));

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}M`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
    return value.toString();
  };

  const handleReset = () => {
    fetchDashboardData();
  };

  const filteredActivities = recentActivities.filter(activity =>
    activity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  const totalCashFlow = stats.totalIncome - stats.totalExpenses;

  return (
    <div className="relative h-[calc(100vh-104px)] overflow-hidden flex flex-col bg-slate-50/50">
      {/* Header Section */}
      <div className="shrink-0 px-4 py-4 md:px-8 md:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Overview
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here is the summary of overall data
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={handleReset}
              className="bg-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Data
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* My Balance - Featured Card */}
          <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-white/90">Saldo Saya</span>
                  </div>
                  <p className="text-xs text-white/70 mb-3">Overview Keuangan & Pengeluaran</p>
                  <h2 className="text-3xl md:text-4xl font-bold mb-2">
                    {formatCurrency(stats.totalBalance)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{stats.balanceChange}%
                    </span>
                    <span className="text-xs text-white/70">vs bulan lalu</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => navigate("/vip/finances")}
                className="mt-4 text-sm text-white/90 hover:text-white flex items-center gap-1 transition-colors"
              >
                Lihat detail <ArrowUpRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>

          {/* Savings Account */}
          <Card className="bg-white border shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <PiggyBank className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Tabungan</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Pertumbuhan Stabil</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {formatCurrency(stats.totalSavings)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{stats.savingsChange}%
                    </span>
                    <span className="text-xs text-muted-foreground">pertumbuhan</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => navigate("/vip/settings/savings")}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Lihat ringkasan <ArrowUpRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>

          {/* Remaining Budget */}
          <Card className="bg-white border shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Sisa Budget</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Track Budget Bulanan</p>
                  <h2 className={cn(
                    "text-2xl md:text-3xl font-bold mb-2",
                    stats.remainingBudget >= 0 ? "text-foreground" : "text-red-500"
                  )}>
                    {formatCurrency(stats.remainingBudget)}
                  </h2>
                  <div className="flex items-center gap-2">
                    {stats.monthlyBudget > 0 ? (
                      <>
                        <span className={cn(
                          "text-sm px-2 py-0.5 rounded-full flex items-center gap-1",
                          stats.remainingBudget >= 0 
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {((stats.totalExpenses / stats.monthlyBudget) * 100).toFixed(0)}% terpakai
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Budget belum diatur</span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => navigate("/vip/budget-tracker")}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Lihat performa <ArrowUpRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - Bank Accounts & Cash Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bank Accounts */}
          <Card className="bg-white border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold">Akun Bank Saya</CardTitle>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate("/vip/settings/accounts")}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Baru
              </Button>
            </CardHeader>
            <CardContent>
              {bankAccounts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bankAccounts.slice(0, 4).map((account) => (
                    <div 
                      key={account.id}
                      className="p-4 rounded-xl border bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <BankLogo bankName={account.bank_name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{account.bank_name}</p>
                          <p className="text-xs text-muted-foreground">
                            ****{account.account_number.slice(-4)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                          Active
                        </Badge>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(account.balance || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Belum ada akun bank</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => navigate("/vip/settings/accounts")}
                  >
                    Tambah akun bank pertama
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cash Flow Chart */}
          <Card className="bg-white border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">Cash Flow</CardTitle>
                <p className="text-2xl md:text-3xl font-bold mt-2">
                  <span className={totalCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {totalCashFlow >= 0 ? '+' : ''}{formatCurrency(totalCashFlow)}
                  </span>
                </p>
              </div>
              <ToggleGroup 
                type="single" 
                value={cashFlowPeriod} 
                onValueChange={(v) => v && setCashFlowPeriod(v as any)}
                className="bg-slate-100 rounded-lg p-1"
              >
                <ToggleGroupItem value="monthly" className="text-xs px-3 h-7 data-[state=on]:bg-white">
                  Monthly
                </ToggleGroupItem>
                <ToggleGroupItem value="yearly" className="text-xs px-3 h-7 data-[state=on]:bg-white">
                  Yearly
                </ToggleGroupItem>
              </ToggleGroup>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cashFlowData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={formatShortCurrency}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [formatCurrency(value), name === 'income' ? 'Pemasukan' : 'Pengeluaran']}
                    contentStyle={{ 
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="income" name="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-muted-foreground">Pemasukan</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">Pengeluaran</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities Table */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold">Recent Activities</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 w-[200px] h-9 bg-slate-50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground">Activity</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Order ID</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Time</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground text-right">Price</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length > 0 ? (
                    filteredActivities.map((activity) => (
                      <TableRow key={activity.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              activity.type === 'income' ? "bg-emerald-100" : "bg-red-100"
                            )}>
                              {activity.type === 'income' ? (
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{activity.name}</p>
                              {activity.category && (
                                <p className="text-xs text-muted-foreground">{activity.category}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          #{activity.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {activity.date}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {activity.time}
                        </TableCell>
                        <TableCell className={cn(
                          "text-sm font-semibold text-right",
                          activity.type === 'income' ? "text-emerald-600" : "text-red-600"
                        )}>
                          {activity.type === 'income' ? '+' : '-'}{formatCurrency(activity.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              activity.status === 'completed' && "bg-green-100 text-green-700",
                              activity.status === 'pending' && "bg-yellow-100 text-yellow-700",
                              activity.status === 'cancelled' && "bg-red-100 text-red-700"
                            )}
                          >
                            {activity.status === 'completed' ? 'Completed' : 
                             activity.status === 'pending' ? 'Pending' : 'Cancelled'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
