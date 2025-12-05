import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Plus, RefreshCw, Search, ArrowUpRight, BarChart3, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths } from "date-fns";
import { DashboardLoadingSkeleton } from "@/components/SkeletonLoader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BankLogo from "@/components/BankLogo";

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
    balanceChange: 12.5,
    savingsChange: 8.3,
  });
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [investmentData] = useState([
    { value: 30 }, { value: 45 }, { value: 35 }, { value: 50 }, 
    { value: 40 }, { value: 60 }, { value: 55 }, { value: 70 }
  ]);

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

    const { data: accountsData } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("bank_name");

    setBankAccounts(accountsData || []);
    const totalBalance = accountsData?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

    const { data: incomeData } = await supabase
      .from("rental_contracts")
      .select("jumlah_lunas, tanggal_lunas")
      .eq("user_id", user.id)
      .not("tanggal_lunas", "is", null)
      .gte("tanggal_lunas", startDateStr)
      .lte("tanggal_lunas", endDateStr);

    const totalIncome = incomeData?.reduce((sum, contract) => sum + (contract.jumlah_lunas || 0), 0) || 0;

    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: false });

    const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

    const { data: savingsData } = await supabase
      .from("savings_plans")
      .select("current_amount, target_amount")
      .eq("user_id", user.id);

    const totalSavings = savingsData?.reduce((sum, plan) => sum + (plan.current_amount || 0), 0) || 0;

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

    setStats({
      totalBalance,
      totalSavings,
      monthlyBudget,
      remainingBudget,
      totalIncome,
      totalExpenses,
      balanceChange: 12.5,
      savingsChange: 8.3,
    });

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

    const activities: Activity[] = [];
    
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
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}K`;
    return formatCurrency(value);
  };

  const handleReset = () => fetchDashboardData();

  const filteredActivities = recentActivities.filter(activity =>
    activity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <DashboardLoadingSkeleton />;

  const totalCashFlow = stats.totalIncome - stats.totalExpenses;

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Overview</h1>
          <p className="text-slate-500 text-sm">Here is the summary of overall data</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[140px] bg-white border-slate-200 text-sm rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleReset} className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Data
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: My Balance - Featured Green */}
          <Card className="bg-gradient-to-br from-emerald-500 to-green-600 border-0 text-white rounded-2xl shadow-lg shadow-emerald-200/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-full bg-white/20 border-2 border-white/30">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-transparent border border-white/40 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{stats.balanceChange}%
                </Badge>
              </div>
              <p className="text-white/80 text-sm mb-0.5">My Balance</p>
              <p className="text-xs text-white/60 mb-4">Overview of Financial & Expenses</p>
              <p className="text-3xl font-bold mb-5">{formatCurrency(stats.totalBalance)}</p>
              <button onClick={() => navigate("/vip/finances")} className="text-sm text-white/90 hover:text-white underline underline-offset-4 decoration-white/40">
                View detail
              </button>
            </CardContent>
          </Card>

          {/* Card 2: Savings Account */}
          <Card className="bg-white border-0 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-full bg-amber-50">
                  <PiggyBank className="h-6 w-6 text-amber-500" />
                </div>
                <Badge className="bg-transparent border border-emerald-200 text-emerald-600 text-xs font-medium px-2.5 py-1 rounded-full">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{stats.savingsChange}%
                </Badge>
              </div>
              <p className="text-slate-800 text-sm font-medium mb-0.5">Savings Account</p>
              <p className="text-xs text-slate-400 mb-4">Stable growth</p>
              <p className="text-2xl font-bold text-slate-800 mb-5">{formatCurrency(stats.totalSavings)}</p>
              <button onClick={() => navigate("/vip/settings/savings")} className="text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-4 decoration-emerald-200">
                View summary
              </button>
            </CardContent>
          </Card>

          {/* Card 3: Investment Portfolio with Sparkline */}
          <Card className="bg-white border-0 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-full bg-violet-50">
                      <BarChart3 className="h-6 w-6 text-violet-500" />
                    </div>
                  </div>
                  <p className="text-slate-800 text-sm font-medium mb-0.5">Investment Portfolio</p>
                  <p className="text-xs text-slate-400 mb-4">Track monthly budget</p>
                  <p className="text-2xl font-bold text-slate-800 mb-5">{formatCurrency(stats.remainingBudget)}</p>
                  <button onClick={() => navigate("/vip/budget-tracker")} className="text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-4 decoration-emerald-200">
                    View performance
                  </button>
                </div>
                {/* Sparkline Chart */}
                <div className="w-24 h-14 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={investmentData}>
                      <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* My Wallet */}
          <Card className="bg-white border-0 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-semibold text-slate-800">My Wallet</CardTitle>
              <Button size="sm" onClick={() => navigate("/vip/settings/accounts")} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs h-8 px-3">
                <Plus className="h-4 w-4 mr-1" />
                Add New
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bankAccounts.slice(0, 4).map((account) => (
                  <div key={account.id} className="relative p-4 bg-slate-50 rounded-xl">
                    <Badge className={`absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full border-0 ${account.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white rounded-full shadow-sm">
                        <BankLogo bankName={account.bank_name} size="sm" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{account.bank_name}</p>
                        <p className="text-xs text-slate-400">****{account.account_number.slice(-4)}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-slate-800">{formatShortCurrency(account.balance || 0)}</p>
                    <p className="text-xs text-slate-400 mt-1">Daily Limit: Rp 5,000,000</p>
                  </div>
                ))}
                {bankAccounts.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-slate-400">
                    <Wallet className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm mb-2">No bank accounts yet</p>
                    <Button variant="link" onClick={() => navigate("/vip/settings/accounts")} className="text-emerald-600 text-sm p-0 h-auto">
                      Add your first account
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow */}
          <Card className="bg-white border-0 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-slate-800">Cash Flow</CardTitle>
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button 
                  onClick={() => setCashFlowPeriod("monthly")}
                  className={`text-xs px-3 py-1.5 rounded-md transition-all ${cashFlowPeriod === "monthly" ? "bg-white shadow-sm text-slate-800 font-medium" : "text-slate-500"}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setCashFlowPeriod("yearly")}
                  className={`text-xs px-3 py-1.5 rounded-md transition-all ${cashFlowPeriod === "yearly" ? "bg-white shadow-sm text-slate-800 font-medium" : "text-slate-500"}`}
                >
                  Yearly
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-800 mb-1">{formatCurrency(totalCashFlow)}</p>
              <p className="text-xs text-slate-400 mb-5">Total cash flow this period</p>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData} barGap={4}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : `${(value / 1000).toFixed(0)}K`} width={45} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="income" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="expenses" fill="#86EFAC" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-8 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-500">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-300" />
                  <span className="text-xs text-slate-500">Expense</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card className="bg-white border-0 rounded-2xl shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">Recent Activities</CardTitle>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-9 bg-slate-50 border-slate-200 text-sm w-full sm:w-[200px] rounded-lg h-9" 
                />
              </div>
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-500 rounded-lg h-9">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Activity</TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Order ID</TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Time</TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Price</TableHead>
                    <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id} className="border-slate-100">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-full ${activity.type === "income" ? "bg-emerald-50" : "bg-red-50"}`}>
                            {activity.type === "income" ? (
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{activity.name}</p>
                            <p className="text-xs text-slate-400">{activity.category || activity.type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm font-mono">
                        #{activity.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{activity.date}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{activity.time}</TableCell>
                      <TableCell className={`font-semibold text-sm ${activity.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                        {activity.type === "income" ? "+" : "-"}{formatCurrency(activity.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.status === "completed" ? "bg-emerald-500" : 
                            activity.status === "pending" ? "bg-amber-500" : "bg-red-500"
                          }`} />
                          <span className="text-sm text-slate-600 capitalize">{activity.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredActivities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                        No recent activities found
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
