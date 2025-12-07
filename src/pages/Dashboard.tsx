import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, TrendingUp, TrendingDown, PiggyBank, Target,
  RefreshCw, Search, ArrowUpRight, ArrowDownRight, Plus, Eye,
  MoreHorizontal, ChevronRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import BankLogo from "@/components/BankLogo";
import { formatCurrency as formatCurrencyLib } from "@/lib/currency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  remainingBudget: number;
  balanceChange: number;
  incomeChange: number;
  expenseChange: number;
  savingsChange: number;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  balance: number | null;
  is_active: boolean;
}

interface Activity {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  time: string;
  status: string;
  category?: string;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const CHART_COLORS = ['#487FFF', '#45B7CD', '#9B59B6', '#F39C12', '#E74C3C', '#1ABC9C', '#34495E', '#E91E63'];

const DashboardLoadingSkeleton = () => (
  <div className="space-y-6 p-1">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-[120px] rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Skeleton className="h-[320px] rounded-2xl lg:col-span-2" />
      <Skeleton className="h-[320px] rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      <Skeleton className="h-[400px] rounded-2xl lg:col-span-3" />
      <Skeleton className="h-[400px] rounded-2xl" />
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [searchTerm, setSearchTerm] = useState("");
  const [activityTab, setActivityTab] = useState<"income" | "expense">("income");
  
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0, totalIncome: 0, totalExpenses: 0, totalSavings: 0, remainingBudget: 0,
    balanceChange: 8.5, incomeChange: 12.5, expenseChange: -5.2, savingsChange: 15.3
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryData[]>([]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, period]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const startDate = period === "month" 
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), 0, 1);

      const [bankRes, incomeRes, expenseRes, savingsRes, budgetRes] = await Promise.all([
        supabase.from("bank_accounts").select("*").eq("user_id", user.id).eq("is_active", true),
        supabase.from("income_sources").select("*").eq("user_id", user.id).gte("date", startDate.toISOString()),
        supabase.from("expenses").select("*").eq("user_id", user.id).gte("date", startDate.toISOString()),
        supabase.from("savings_plans").select("*").eq("user_id", user.id),
        supabase.from("monthly_budgets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1)
      ]);

      const totalBalance = bankRes.data?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
      const totalIncome = incomeRes.data?.reduce((sum, inc) => sum + (inc.amount || 0), 0) || 0;
      const totalExpenses = expenseRes.data?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      const totalSavings = savingsRes.data?.reduce((sum, sav) => sum + (sav.current_amount || 0), 0) || 0;
      const remainingBudget = (budgetRes.data?.[0]?.target_belanja || 0) - totalExpenses;

      // Calculate expense categories for donut chart
      const categoryMap: Record<string, number> = {};
      expenseRes.data?.forEach(exp => {
        const cat = exp.category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + exp.amount;
      });
      const categories = Object.entries(categoryMap)
        .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
      setExpenseCategories(categories);

      setStats({ totalBalance, totalIncome, totalExpenses, totalSavings, remainingBudget, balanceChange: 8.5, incomeChange: 12.5, expenseChange: -5.2, savingsChange: 15.3 });
      setBankAccounts(bankRes.data || []);

      // Generate cash flow data from actual database data
      const months = period === "month" ? 7 : 12;
      const flowData = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const monthName = date.toLocaleDateString("id", { month: "short" });
        
        // Calculate income and expense per month from fetched data
        const monthIncome = incomeRes.data?.filter(inc => {
          const incDate = new Date(inc.date);
          return incDate >= monthStart && incDate <= monthEnd;
        }).reduce((sum, inc) => sum + (inc.amount || 0), 0) || 0;
        
        const monthExpense = expenseRes.data?.filter(exp => {
          const expDate = new Date(exp.date);
          return expDate >= monthStart && expDate <= monthEnd;
        }).reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
        
        flowData.push({ month: monthName, income: monthIncome, expenses: monthExpense });
      }
      setCashFlowData(flowData);

      // Combine activities
      const activities: Activity[] = [
        ...(incomeRes.data?.map(inc => ({ id: inc.id, name: inc.source_name || "Income", amount: inc.amount, type: "income" as const, date: new Date(inc.date).toLocaleDateString("id-ID"), time: new Date(inc.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }), status: "completed", category: "Income" })) || []),
        ...(expenseRes.data?.map(exp => ({ id: exp.id, name: exp.description || exp.category, amount: exp.amount, type: "expense" as const, date: new Date(exp.date).toLocaleDateString("id-ID"), time: new Date(exp.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }), status: "completed", category: exp.category })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
      setRecentActivities(activities);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => formatCurrencyLib(amount);
  const formatShort = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const filteredActivities = useMemo(() => 
    recentActivities.filter(a => 
      a.type === activityTab && a.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), 
    [recentActivities, activityTab, searchTerm]
  );

  const topCategories = useMemo(() => expenseCategories.slice(0, 5), [expenseCategories]);

  // Memoize PieChart data to prevent re-creation on every render
  const pieChartData = useMemo(() => 
    expenseCategories.length > 0 
      ? expenseCategories 
      : [{ name: "No Data", value: 1, color: "#E2E8F0" }], 
    [expenseCategories]
  );

  if (loading) return <DashboardLoadingSkeleton />;

  // Stat cards configuration
  const statCards = [
    { title: "Total Saldo", value: stats.totalBalance, change: stats.balanceChange, icon: Wallet, iconBg: "bg-blue-100", iconColor: "text-[#487FFF]", positive: true },
    { title: "Total Pemasukan", value: stats.totalIncome, change: stats.incomeChange, icon: TrendingUp, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", positive: true },
    { title: "Total Pengeluaran", value: stats.totalExpenses, change: stats.expenseChange, icon: TrendingDown, iconBg: "bg-red-100", iconColor: "text-red-500", positive: false },
    { title: "Total Tabungan", value: stats.totalSavings, change: stats.savingsChange, icon: PiggyBank, iconBg: "bg-amber-100", iconColor: "text-amber-600", positive: true },
    { title: "Sisa Anggaran", value: stats.remainingBudget, change: 3.2, icon: Target, iconBg: "bg-violet-100", iconColor: "text-violet-600", positive: true },
  ];

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <p className="text-slate-400 text-xs mb-1">Dashboard &gt; Ringkasan</p>
          <h1 className="text-2xl font-bold text-slate-800">Ringkasan</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[130px] bg-white border-slate-200 text-sm rounded-xl h-10 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchDashboardData} className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl h-10 px-4 shadow-sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6">
        {/* Top 5 Stat Cards - WowDash Style */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((card, index) => (
            <Card key={index} className="bg-white border-0 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                    <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
                <p className="text-slate-500 text-xs font-medium mb-1">{card.title}</p>
                <p className="text-xl font-bold text-slate-800 mb-2">{formatShort(card.value)}</p>
                <div className="flex items-center gap-1">
                  {card.positive ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${card.positive ? "text-emerald-500" : "text-red-500"}`}>
                    {card.positive ? "+" : ""}{card.change}%
                  </span>
                  <span className="text-xs text-slate-400 ml-1">vs sebelumnya</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Middle Row: Cash Flow Chart + Expense Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Cash Flow - Area Chart (2 columns) */}
          <Card className="bg-white border-0 rounded-2xl shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Arus Kas</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Tren Pemasukan vs Pengeluaran</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#487FFF]" />
                  <span className="text-xs text-slate-500">Pemasukan</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#45B7CD]" />
                  <span className="text-xs text-slate-500">Pengeluaran</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#487FFF" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#487FFF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#45B7CD" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#45B7CD" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)} JT` : `${(v / 1000).toFixed(0)} RB`} width={45} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="income" stroke="#487FFF" strokeWidth={2.5} fill="url(#incomeGradient)" />
                    <Area type="monotone" dataKey="expenses" stroke="#45B7CD" strokeWidth={2.5} fill="url(#expenseGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Expense Overview - Donut Chart */}
          <Card className="bg-white border-0 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Ringkasan Pengeluaran</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Berdasarkan kategori</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {expenseCategories.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-slate-600 truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Activities Table + Top Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Activities Table with Tabs */}
          <Card className="bg-white border-0 rounded-2xl shadow-sm lg:col-span-3">
            <CardHeader className="pb-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Tabs value={activityTab} onValueChange={(v) => setActivityTab(v as any)} className="w-full sm:w-auto">
                  <TabsList className="bg-slate-100 p-1 rounded-xl h-10">
                    <TabsTrigger value="income" className="rounded-lg text-sm px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      Pemasukan Terbaru
                      <Badge className="ml-2 bg-emerald-100 text-emerald-600 text-[10px] px-1.5 h-5 border-0">
                        {recentActivities.filter(a => a.type === "income").length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="expense" className="rounded-lg text-sm px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      Pengeluaran Terbaru
                      <Badge className="ml-2 bg-red-100 text-red-500 text-[10px] px-1.5 h-5 border-0">
                        {recentActivities.filter(a => a.type === "expense").length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Cari..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10 bg-slate-50 border-slate-200 text-sm w-full sm:w-[200px] rounded-xl h-10" 
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-semibold text-xs uppercase">Aktivitas</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs uppercase">Tanggal</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs uppercase">Jumlah</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.slice(0, 5).map((activity) => (
                    <TableRow key={activity.id} className="border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.type === "income" ? "bg-emerald-100" : "bg-red-100"}`}>
                            {activity.type === "income" ? (
                              <TrendingUp className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{activity.name}</p>
                            <p className="text-xs text-slate-400">{activity.category}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{activity.date}</TableCell>
                      <TableCell className={`font-bold text-sm ${activity.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                        {activity.type === "income" ? "+" : "-"}{formatShort(activity.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 ${activity.status === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                          {activity.status === "completed" ? "Selesai" : "Tertunda"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredActivities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-400">
                        <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">Tidak ada aktivitas</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Button variant="link" onClick={() => navigate("/vip/transaction-history")} className="w-full mt-4 text-[#487FFF] hover:text-blue-700 text-sm font-medium">
                Lihat Semua Transaksi
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Top Categories Side Panel */}
          <Card className="bg-white border-0 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-bold text-slate-800">Kategori Teratas</CardTitle>
              <Button variant="link" className="text-[#487FFF] text-xs p-0 h-auto font-medium">
                Lihat Semua
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {topCategories.map((cat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: cat.color }}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{cat.name}</p>
                    <p className="text-xs text-slate-400">{formatShort(cat.value)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              ))}
              {topCategories.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Target className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Belum ada kategori</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Wallet Section */}
        <Card className="bg-white border-0 rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-bold text-slate-800">Dompet Saya</CardTitle>
            <Button size="sm" onClick={() => navigate("/vip/settings/accounts")} className="bg-[#487FFF] hover:bg-blue-600 text-white rounded-xl text-xs h-9 px-4 shadow-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah Akun
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {bankAccounts.slice(0, 4).map((account) => (
                <div key={account.id} className="relative p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                  <Badge className={`absolute top-3 right-3 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border-0 ${account.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {account.is_active ? "Aktif" : "Tidak Aktif"}
                  </Badge>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                      <BankLogo bankName={account.bank_name} size="sm" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{account.bank_name}</p>
                      <p className="text-xs text-slate-400">****{account.account_number.slice(-4)}</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{formatShort(account.balance || 0)}</p>
                </div>
              ))}
              {bankAccounts.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-400">
                  <Wallet className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium mb-2">Belum ada akun bank</p>
                  <Button variant="link" onClick={() => navigate("/vip/settings/accounts")} className="text-[#487FFF] text-sm">
                    Tambah akun pertama Anda
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
