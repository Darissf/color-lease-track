import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { AIBudgetAdvisor } from "@/components/AIBudgetAdvisor";
import { CategoryBadge } from "@/components/CategoryBadge";
import { getCategoryStyle } from "@/lib/categoryColors";
import { DashboardLoadingSkeleton } from "@/components/SkeletonLoader";
import { GradientButton } from "@/components/GradientButton";
import { ColoredProgressBar } from "@/components/ColoredProgressBar";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

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
  const { getContent } = useEditableContent();
  const navigate = useNavigate();
  const { activeTheme } = useAppTheme();
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

    // Fetch income
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
      .select("current_amount")
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
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    setStats({
      totalIncome,
      totalExpenses,
      totalSavings,
      monthlyBudget,
      remainingBudget,
      savingsRate,
    });

    // Process expenses by category
    const categoryMap = new Map();
    expensesData?.forEach((expense) => {
      const current = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, current + expense.amount);
    });

    const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    setExpensesByCategory(categoryData);

    // Recent expenses
    setRecentExpenses(expensesData?.slice(0, 5) || []);

    // Monthly trend (last 6 months)
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

      const { data: monthExpenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const { data: monthIncome } = await supabase
        .from("rental_contracts")
        .select("jumlah_lunas")
        .eq("user_id", user.id)
        .not("tanggal_lunas", "is", null)
        .gte("tanggal_lunas", monthStart)
        .lte("tanggal_lunas", monthEnd);

      trendData.push({
        month: format(monthDate, 'MMM'),
        income: monthIncome?.reduce((sum, i) => sum + (i.jumlah_lunas || 0), 0) || 0,
        expenses: monthExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0,
      });
    }
    setMonthlyTrend(trendData);

    // Income by client
    const { data: clientData } = await supabase
      .from("rental_contracts")
      .select(`
        jumlah_lunas,
        client_groups (nama)
      `)
      .eq("user_id", user.id)
      .not("tanggal_lunas", "is", null)
      .gte("tanggal_lunas", startDateStr)
      .lte("tanggal_lunas", endDateStr);

    const clientMap = new Map();
    clientData?.forEach((contract: any) => {
      const clientName = contract.client_groups?.nama || "Unknown";
      const current = clientMap.get(clientName) || 0;
      clientMap.set(clientName, current + (contract.jumlah_lunas || 0));
    });

    const clientChartData = Array.from(clientMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    setIncomeByClient(clientChartData);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className={cn(
      "relative min-h-screen overflow-hidden",
      activeTheme === 'japanese' 
        ? "bg-gradient-to-b from-[#0D1829] via-[#1A2642] to-[#2A2857]" 
        : "bg-gradient-to-b from-background via-background to-muted/20"
    )}>
      {/* Professional Clean Background */}
      {activeTheme === 'professional' && (
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10 z-0" />
      )}

      {/* ===== ANIMATED BACKGROUND - LAYER 0 (Japanese Night) ===== */}
      {activeTheme === 'japanese' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        
        {/* Layer 1: Sky & Celestial */}
        {/* Stars - Reduced for cleaner look */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute w-1 h-1 rounded-full bg-white animate-[star-twinkle_3s_ease-in-out_infinite]"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.15 + Math.random() * 0.35,
            }}
          />
        ))}

        {/* Moon */}
        <div 
          className="absolute top-20 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-[hsl(var(--moon-gold))] to-yellow-200 opacity-80 blur-sm animate-[moon-pulse_6s_ease-in-out_infinite]"
        />

        {/* Rainbow Bridge */}
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full border-t-4 border-r-4 border-gradient-to-r from-red-400 via-yellow-400 to-purple-400 opacity-20 animate-[rainbow-shimmer_8s_ease-in-out_infinite]"
          style={{
            borderImage: 'linear-gradient(90deg, rgba(248,113,113,0.5), rgba(251,191,36,0.5), rgba(134,239,172,0.5), rgba(147,197,253,0.5), rgba(196,181,253,0.5)) 1',
          }}
        />

        {/* Meteor Shower - Removed for cleaner look */}

        {/* Layer 2: Atmospheric */}
        {/* Night Fog */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`fog-${i}`}
            className="absolute w-96 h-96 rounded-full bg-[hsl(var(--fog-mist))] opacity-10 blur-3xl animate-[fog-drift_20s_ease-in-out_infinite]"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 4}s`,
            }}
          />
        ))}

        {/* Tea Steam */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={`steam-${i}`}
            className="absolute w-8 h-8 rounded-full bg-white opacity-20 blur-md animate-[steam-rise_8s_ease-in-out_infinite]"
            style={{
              bottom: `${10 + Math.random() * 20}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 1.5}s`,
            }}
          />
        ))}

        {/* Layer 3: Architectural */}
        {/* Torii Gate SVG */}
        <svg
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 text-[hsl(var(--torii-red))] opacity-20 animate-[torii-glow_4s_ease-in-out_infinite]"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <rect x="40" y="40" width="15" height="140" />
          <rect x="145" y="40" width="15" height="140" />
          <rect x="20" y="40" width="160" height="20" rx="10" />
          <rect x="30" y="80" width="140" height="15" rx="7" />
        </svg>

        {/* Temple Bell + Sound Rings */}
        <div className="absolute top-32 left-1/2 -translate-x-1/2">
          <div className="relative w-16 h-16 bg-gradient-to-b from-[hsl(var(--gold-kin))] to-yellow-700 rounded-b-full opacity-30 animate-[bell-ring_4s_ease-in-out_infinite]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`ring-${i}`}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-[hsl(var(--gold-kin))] rounded-full animate-[sound-wave-expand_2s_ease-out_infinite]"
              style={{
                width: `${64 + i * 20}px`,
                height: `${64 + i * 20}px`,
                animationDelay: `${i * 0.6}s`,
              }}
            />
          ))}
        </div>

        {/* Mountain Silhouette */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end opacity-15">
          <div className="w-0 h-0 border-l-[200px] border-l-transparent border-r-[200px] border-r-transparent border-b-[300px] border-b-[hsl(var(--midnight-blue))] animate-[mountain-parallax_30s_ease-in-out_infinite]" />
          <div className="w-0 h-0 border-l-[250px] border-l-transparent border-r-[250px] border-r-transparent border-b-[350px] border-b-[hsl(var(--midnight-blue))] animate-[mountain-parallax_25s_ease-in-out_infinite] opacity-80" style={{ animationDelay: '5s' }} />
          <div className="w-0 h-0 border-l-[180px] border-l-transparent border-r-[180px] border-r-transparent border-b-[250px] border-b-[hsl(var(--midnight-blue))] animate-[mountain-parallax_35s_ease-in-out_infinite]" style={{ animationDelay: '10s' }} />
        </div>

        {/* Layer 4: Flora */}
        {/* Sakura Petals - Further reduced */}
        {Array.from({ length: 8 }).map((_, i) => (
          <svg
            key={`sakura-${i}`}
            className="absolute opacity-30 animate-[sakura-fall_15s_linear_infinite]"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            style={{
              top: '-50px',
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.7}s`,
            }}
          >
            <circle cx="10" cy="10" r="2" fill="hsl(var(--sakura-pink))" />
            <ellipse cx="10" cy="5" rx="3" ry="5" fill="hsl(var(--cherry-glow-pink))" />
            <ellipse cx="15" cy="10" rx="5" ry="3" fill="hsl(var(--cherry-glow-pink))" />
            <ellipse cx="10" cy="15" rx="3" ry="5" fill="hsl(var(--cherry-glow-pink))" />
            <ellipse cx="5" cy="10" rx="5" ry="3" fill="hsl(var(--cherry-glow-pink))" />
          </svg>
        ))}

        {/* Cherry Branch */}
        <svg
          className="absolute top-0 right-0 w-64 h-64 text-[hsl(var(--bamboo-night-green))] opacity-25 animate-[branch-sway_6s_ease-in-out_infinite]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M 200 0 Q 150 50 100 80 Q 50 100 20 140" strokeLinecap="round" />
          <circle cx="120" cy="60" r="8" fill="hsl(var(--sakura-pink))" />
          <circle cx="80" cy="90" r="8" fill="hsl(var(--sakura-pink))" />
          <circle cx="50" cy="120" r="8" fill="hsl(var(--sakura-pink))" />
        </svg>

        {/* Wisteria - Removed */}

          {/* Maple Leaves - Removed */}

        {/* Bamboo Leaves - Removed */}

        {/* Lotus Flowers - Removed */}

        {/* Layer 5: Fauna */}
        {/* Koi Fish - Removed */}

        {/* Dragonfly - Removed */}

        {/* Fireflies - Reduced */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`firefly-${i}`}
            className="absolute w-2 h-2 rounded-full bg-[hsl(var(--firefly-glow-green))]"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `firefly-glow 2s ease-in-out infinite ${Math.random() * 2}s, firefly-drift 8s ease-in-out infinite ${Math.random() * 2}s`,
              boxShadow: '0 0 6px hsl(var(--firefly-glow-green))',
              opacity: 0.6,
            }}
          />
        ))}

        {/* Layer 6: Decorative */}
        {/* Floating Lanterns - Further reduced */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`lantern-${i}`}
            className="absolute w-16 h-20 rounded-lg bg-gradient-to-b from-[hsl(var(--lantern-glow-orange))] to-red-600 opacity-20 animate-[lantern-float_20s_ease-in-out_infinite]"
            style={{
              top: `${Math.random() * 70}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 2.5}s`,
              boxShadow: '0 0 15px hsl(var(--lantern-glow-orange))',
            }}
          />
        ))}

        {/* Paper Cranes - Removed */}

          {/* Origami Triangles - Removed */}

        {/* Koinobori Streamers - Removed */}

        {/* Haiku Scrolls - Removed */}

        {/* Layer 7: Ambience */}
        {/* Zen Sand Ripples */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`ripple-${i}`}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 border border-muted rounded-full animate-[ripple-expand_6s_ease-out_infinite]"
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              animationDelay: `${i * 1.2}s`,
            }}
          />
        ))}
        </div>
      )}

      {/* ===== CONTENT - LAYER 10 ===== */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className={cn(
              "text-4xl font-bold",
              activeTheme === 'japanese' 
                ? 'text-white' 
                : 'text-foreground'
            )}>
              {activeTheme === 'japanese' && '🏮 '}{getContent('dashboard.title', 'Dashboard Keuangan Nabila')}{activeTheme === 'japanese' && ' 🏮'}
            </h1>
            <p className={cn(
              "mt-2",
              activeTheme === 'japanese' ? 'text-slate-300' : 'text-muted-foreground'
            )}>
              {activeTheme === 'japanese' 
                ? getContent('dashboard.subtitle', 'Kelola finansial Anda dengan ketenangan malam Jepang')
                : getContent('dashboard.subtitle.professional', 'Ringkasan keuangan profesional Anda')
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>

            <GradientButton 
              variant="income" 
              onClick={() => navigate("/")}
              className="hidden md:flex"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Lihat Detail
            </GradientButton>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className={cn(
            "hover:shadow-lg transition-all duration-300 hover:scale-[1.02]",
            activeTheme === 'japanese' 
              ? "bg-slate-900/90 border-slate-700" 
              : "bg-gradient-to-br from-card to-card/50 border-[hsl(var(--gold-kin))]/20"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={cn(
                "text-sm font-medium",
                activeTheme === 'japanese' ? 'text-slate-100' : ''
              )}>
                Total Pemasukan
              </CardTitle>
              <TrendingUp className={cn(
                "h-4 w-4",
                activeTheme === 'japanese' ? "text-emerald-400" : "text-emerald-600"
              )} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                activeTheme === 'japanese' ? "text-emerald-400" : "text-emerald-600"
              )}>
                {formatCurrency(stats.totalIncome)}
              </div>
              <p className={cn(
                "text-xs mt-1",
                activeTheme === 'japanese' ? 'text-slate-300' : 'text-muted-foreground'
              )}>
                Periode: {period === 'week' ? 'Minggu' : period === 'month' ? 'Bulan' : 'Tahun'} ini
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "hover:shadow-lg transition-all duration-300 hover:scale-[1.02]",
            activeTheme === 'japanese' 
              ? "bg-slate-900/90 border-slate-700" 
              : "bg-gradient-to-br from-card to-card/50 border-[hsl(var(--sakura-pink))]/20"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={cn(
                "text-sm font-medium",
                activeTheme === 'japanese' ? 'text-slate-100' : ''
              )}>
                Total Pengeluaran
              </CardTitle>
              <TrendingDown className={cn(
                "h-4 w-4",
                activeTheme === 'japanese' ? "text-red-400" : "text-red-600"
              )} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                activeTheme === 'japanese' ? "text-red-400" : "text-red-600"
              )}>
                {formatCurrency(stats.totalExpenses)}
              </div>
              <p className={cn(
                "text-xs mt-1",
                activeTheme === 'japanese' ? 'text-slate-300' : 'text-muted-foreground'
              )}>
                {stats.monthlyBudget > 0 
                  ? `${((stats.totalExpenses / stats.monthlyBudget) * 100).toFixed(1)}% dari budget`
                  : 'Budget belum diatur'
                }
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "hover:shadow-lg transition-all duration-300 hover:scale-[1.02]",
            activeTheme === 'japanese' 
              ? "bg-slate-900/90 border-slate-700" 
              : "bg-gradient-to-br from-card to-card/50 border-[hsl(var(--matcha-green))]/20"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={cn(
                "text-sm font-medium",
                activeTheme === 'japanese' ? 'text-slate-100' : ''
              )}>
                Total Tabungan
              </CardTitle>
              <PiggyBank className={cn(
                "h-4 w-4",
                activeTheme === 'japanese' ? "text-blue-400" : "text-blue-600"
              )} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                activeTheme === 'japanese' ? "text-blue-400" : "text-blue-600"
              )}>
                {formatCurrency(stats.totalSavings)}
              </div>
              <p className={cn(
                "text-xs mt-1",
                activeTheme === 'japanese' ? 'text-slate-300' : 'text-muted-foreground'
              )}>
                Tingkat tabungan: {stats.savingsRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "hover:shadow-lg transition-all duration-300 hover:scale-[1.02]",
            activeTheme === 'japanese' 
              ? "bg-slate-900/90 border-slate-700" 
              : "bg-gradient-to-br from-card to-card/50 border-primary/20"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={cn(
                "text-sm font-medium",
                activeTheme === 'japanese' ? 'text-slate-100' : ''
              )}>
                Sisa Budget
              </CardTitle>
              <Wallet className={cn(
                "h-4 w-4",
                stats.remainingBudget >= 0 ? "text-green-500" : "text-red-500"
              )} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.remainingBudget >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(stats.remainingBudget)}
              </div>
              <ColoredProgressBar 
                value={stats.monthlyBudget > 0 ? (stats.totalExpenses / stats.monthlyBudget) * 100 : 0}
              />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend Chart */}
          <Card className={cn(
            "hover:shadow-lg transition-all duration-300",
            activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "flex items-center gap-2",
                activeTheme === 'japanese' ? 'text-white' : 'text-foreground'
              )}>
                <TrendingUp className="h-5 w-5 text-primary" />
                Tren Bulanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={activeTheme === 'japanese' ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis 
                    dataKey="month"
                    tick={{ fill: activeTheme === 'japanese' ? '#94a3b8' : '#64748b' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
                      return value.toString();
                    }}
                    tick={{ 
                      fontSize: 12,
                      fill: activeTheme === 'japanese' ? '#94a3b8' : '#64748b'
                    }}
                    width={70}
                    tickCount={5}
                  />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ 
                      background: activeTheme === 'japanese' ? '#1e293b' : '#ffffff',
                      border: `1px solid ${activeTheme === 'japanese' ? '#334155' : '#e2e8f0'}`,
                      color: activeTheme === 'japanese' ? '#f1f5f9' : '#1e293b',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.3}
                    name="Pemasukan"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#EF4444" 
                    fill="#EF4444" 
                    fillOpacity={0.3}
                    name="Pengeluaran"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Income by Client Chart */}
          <Card className={cn(
            "hover:shadow-lg transition-all duration-300",
            activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "flex items-center gap-2",
                activeTheme === 'japanese' ? 'text-white' : 'text-foreground'
              )}>
                <Wallet className="h-5 w-5 text-primary" />
                Pemasukan per Klien
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeByClient}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={activeTheme === 'japanese' ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fill: activeTheme === 'japanese' ? '#94a3b8' : '#64748b' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
                      return value;
                    }}
                    tick={{ 
                      fontSize: 12,
                      fill: activeTheme === 'japanese' ? '#94a3b8' : '#64748b'
                    }}
                    width={70}
                  />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ 
                      background: activeTheme === 'japanese' ? '#1e293b' : '#ffffff',
                      border: `1px solid ${activeTheme === 'japanese' ? '#334155' : '#e2e8f0'}`,
                      color: activeTheme === 'japanese' ? '#f1f5f9' : '#1e293b',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" name="Pemasukan">
                    {incomeByClient.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Expenses by Category */}
          <Card className={cn(
            "hover:shadow-lg transition-all duration-300",
            activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "flex items-center gap-2",
                activeTheme === 'japanese' ? 'text-white' : 'text-foreground'
              )}>
                <TrendingDown className="h-5 w-5 text-primary" />
                Pengeluaran per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={{ stroke: activeTheme === 'japanese' ? '#94a3b8' : '#64748b' }}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ 
                      background: activeTheme === 'japanese' ? '#1e293b' : '#ffffff',
                      border: `1px solid ${activeTheme === 'japanese' ? '#334155' : '#e2e8f0'}`,
                      color: activeTheme === 'japanese' ? '#f1f5f9' : '#1e293b',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card className={cn(
            "hover:shadow-lg transition-all duration-300",
            activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                "flex items-center gap-2",
                activeTheme === 'japanese' ? 'text-white' : 'text-foreground'
              )}>
                <TrendingDown className="h-5 w-5 text-primary" />
                Pengeluaran Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExpenses.length > 0 ? (
                  recentExpenses.map((expense) => (
                    <div 
                      key={expense.id} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-colors",
                        activeTheme === 'japanese' ? "hover:bg-white/5" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <CategoryBadge category={expense.category} />
                        <div>
                          <p className={cn(
                            "font-medium",
                            activeTheme === 'japanese' ? 'text-slate-100' : 'text-foreground'
                          )}>
                            {expense.transaction_name || expense.category}
                          </p>
                          <p className={cn(
                            "text-xs",
                            activeTheme === 'japanese' ? 'text-slate-400' : 'text-muted-foreground'
                          )}>
                            {format(new Date(expense.date), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-500">-{formatCurrency(expense.amount)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={cn(
                    "text-center py-8",
                    activeTheme === 'japanese' ? 'text-slate-400' : 'text-muted-foreground'
                  )}>
                    Belum ada pengeluaran
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & AI Advisor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className={cn(
            "hover:shadow-lg transition-all duration-300",
            activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
          )}>
            <CardHeader>
              <CardTitle className={cn(
                activeTheme === 'japanese' ? 'text-white' : 'text-foreground'
              )}>
                Aksi Cepat
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              <GradientButton
                variant="income"
                className="h-16 justify-start gap-3"
                onClick={() => navigate("/")}
                icon={TrendingUp}
              >
                <span className="text-sm font-medium">Tambah Pemasukan</span>
              </GradientButton>
              <GradientButton
                variant="expense"
                className="h-16 justify-start gap-3"
                onClick={() => navigate("/")}
                icon={TrendingDown}
              >
                <span className="text-sm font-medium">Catat Pengeluaran</span>
              </GradientButton>
              <GradientButton
                variant="savings"
                className="h-16 justify-start gap-3"
                onClick={() => navigate("/")}
                icon={PiggyBank}
              >
                <span className="text-sm font-medium">Update Tabungan</span>
              </GradientButton>
            </CardContent>
          </Card>

          <AIBudgetAdvisor />
        </div>
      </div>
    </div>
  );
}
