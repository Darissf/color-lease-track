import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths } from "date-fns";
import { AIBudgetAdvisor } from "@/components/AIBudgetAdvisor";
import { CategoryBadge } from "@/components/CategoryBadge";
import { getCategoryStyle } from "@/lib/categoryColors";
import { DashboardLoadingSkeleton } from "@/components/SkeletonLoader";
import { GradientButton } from "@/components/GradientButton";
import { ColoredProgressBar } from "@/components/ColoredProgressBar";
import { useTheme } from "@/components/ui/theme-provider";

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
  const { theme, setTheme } = useTheme();
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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      {/* ===== ANIMATED BACKGROUND - LAYER 0 ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        
        {/* Layer 1: Sky & Celestial */}
        {/* Stars - 100 particles */}
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute w-1 h-1 rounded-full bg-white animate-[star-twinkle_3s_ease-in-out_infinite]"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.3 + Math.random() * 0.7,
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

        {/* Meteor Shower */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`meteor-${i}`}
            className="absolute w-1 h-20 bg-gradient-to-b from-white to-transparent opacity-60 animate-[meteor-streak_3s_linear_infinite]"
            style={{
              top: `${Math.random() * 30}%`,
              right: `${Math.random() * 30}%`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}

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
        {/* Sakura Petals */}
        {Array.from({ length: 20 }).map((_, i) => (
          <svg
            key={`sakura-${i}`}
            className="absolute opacity-60 animate-[sakura-fall_15s_linear_infinite]"
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

        {/* Wisteria */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`wisteria-${i}`}
            className="absolute top-0 w-2 h-32 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full opacity-40 animate-[wisteria-sway_4s_ease-in-out_infinite]"
            style={{
              left: `${20 + i * 12}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}

        {/* Maple Leaves */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`maple-${i}`}
            className="absolute w-6 h-6 opacity-50 animate-[maple-fall_18s_linear_infinite]"
            style={{
              top: '-50px',
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 1.2}s`,
              color: ['#ff6b6b', '#ffa500', '#ff8c00', '#dc143c'][Math.floor(Math.random() * 4)],
            }}
          >
            🍁
          </div>
        ))}

        {/* Bamboo Leaves */}
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={`bamboo-${i}`}
            className="absolute w-8 h-16 rounded-full bg-gradient-to-b from-[hsl(var(--bamboo-night-green))] to-emerald-800 opacity-40 animate-[bamboo-fall_12s_linear_infinite]"
            style={{
              top: '-100px',
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.4}s`,
              animation: `bamboo-fall 12s linear infinite ${i * 0.4}s, bamboo-sway 2s ease-in-out infinite`,
            }}
          />
        ))}

        {/* Lotus Flowers */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`lotus-${i}`}
            className="absolute bottom-20 w-12 h-12 opacity-30 animate-[lotus-float_5s_ease-in-out_infinite]"
            style={{
              left: `${10 + i * 15}%`,
              animationDelay: `${i * 0.8}s`,
            }}
          >
            🪷
          </div>
        ))}

        {/* Layer 5: Fauna */}
        {/* Koi Fish */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={`koi-${i}`}
            className="absolute bottom-32 opacity-40 animate-[koi-swim_25s_linear_infinite]"
            style={{
              animationDelay: `${i * 2.5}s`,
              fontSize: '32px',
            }}
          >
            🐟
          </div>
        ))}

        {/* Dragonfly */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`dragonfly-${i}`}
            className="absolute opacity-50 animate-[dragonfly-flight_10s_ease-in-out_infinite]"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${Math.random() * 90}%`,
              animationDelay: `${i * 1.5}s`,
            }}
          >
            🦗
          </div>
        ))}

        {/* Fireflies */}
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={`firefly-${i}`}
            className="absolute w-2 h-2 rounded-full bg-[hsl(var(--firefly-glow-green))]"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `firefly-glow 2s ease-in-out infinite ${Math.random() * 2}s, firefly-drift 8s ease-in-out infinite ${Math.random() * 2}s`,
              boxShadow: '0 0 10px hsl(var(--firefly-glow-green))',
            }}
          />
        ))}

        {/* Layer 6: Decorative */}
        {/* Floating Lanterns */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`lantern-${i}`}
            className="absolute w-16 h-20 rounded-lg bg-gradient-to-b from-[hsl(var(--lantern-glow-orange))] to-red-600 opacity-40 animate-[lantern-float_20s_ease-in-out_infinite]"
            style={{
              top: `${Math.random() * 70}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 2.5}s`,
              boxShadow: '0 0 30px hsl(var(--lantern-glow-orange))',
            }}
          />
        ))}

        {/* Paper Cranes */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`crane-${i}`}
            className="absolute opacity-50 animate-[crane-fly_30s_linear_infinite]"
            style={{
              animationDelay: `${i * 2}s`,
              color: `hsl(${Math.random() * 360}, 70%, 60%)`,
              fontSize: '24px',
            }}
          >
            🦢
          </div>
        ))}

        {/* Origami Triangles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <svg
            key={`origami-${i}`}
            className="absolute opacity-30 animate-[origami-float_15s_ease-in-out_infinite]"
            width="30"
            height="30"
            viewBox="0 0 30 30"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
            }}
          >
            <polygon
              points="15,5 25,25 5,25"
              fill={`hsl(${Math.random() * 360}, 70%, 60%)`}
            />
          </svg>
        ))}

        {/* Koinobori Streamers */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`koinobori-${i}`}
            className="absolute top-10 w-32 h-12 rounded-r-full opacity-40 animate-[koinobori-wave_3s_ease-in-out_infinite]"
            style={{
              left: `${10 + i * 18}%`,
              background: ['linear-gradient(90deg, #ef4444, #f97316)', 'linear-gradient(90deg, #3b82f6, #06b6d4)', 'linear-gradient(90deg, #10b981, #84cc16)', 'linear-gradient(90deg, #a855f7, #ec4899)', 'linear-gradient(90deg, #eab308, #f59e0b)'][i],
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}

        {/* Haiku Scrolls */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`scroll-${i}`}
            className="absolute w-20 h-32 bg-amber-50 opacity-20 rounded-md border-2 border-amber-900 animate-[scroll-drift_25s_linear_infinite]"
            style={{
              animationDelay: `${i * 6}s`,
            }}
          >
            <div className="text-xs text-amber-900 p-2 font-mono">
              月光<br/>静寂<br/>和
            </div>
          </div>
        ))}

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

      {/* ===== CONTENT - LAYER 10 ===== */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[hsl(var(--torii-red))] via-[hsl(var(--sakura-pink))] to-[hsl(var(--gold-kin))] bg-clip-text text-transparent">
              🏮 {getContent('dashboard.title', 'Dashboard Keuangan Nabila')} 🏮
            </h1>
            <p className="text-muted-foreground mt-2">
              {getContent('dashboard.subtitle', 'Kelola finansial Anda dengan ketenangan malam Jepang')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleTheme}
              className="transition-all duration-300 hover:scale-105"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
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
          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/50 border-[hsl(var(--gold-kin))]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
              <TrendingUp className="h-4 w-4 text-[hsl(var(--gold-kin))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--torii-red))] to-[hsl(var(--gold-kin))] bg-clip-text text-transparent">
                {formatCurrency(stats.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Periode: {period === 'week' ? 'Minggu' : period === 'month' ? 'Bulan' : 'Tahun'} ini
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/50 border-[hsl(var(--sakura-pink))]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
              <TrendingDown className="h-4 w-4 text-[hsl(var(--sakura-pink))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--sakura-pink))] to-pink-400 bg-clip-text text-transparent">
                {formatCurrency(stats.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.monthlyBudget > 0 
                  ? `${((stats.totalExpenses / stats.monthlyBudget) * 100).toFixed(1)}% dari budget`
                  : 'Budget belum diatur'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/50 border-[hsl(var(--matcha-green))]/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tabungan</CardTitle>
              <PiggyBank className="h-4 w-4 text-[hsl(var(--matcha-green))]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--matcha-green))] to-green-400 bg-clip-text text-transparent">
                {formatCurrency(stats.totalSavings)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tingkat tabungan: {stats.savingsRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-card to-card/50 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sisa Budget</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.remainingBudget >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(stats.remainingBudget)}
              </div>
              <ColoredProgressBar 
                value={stats.monthlyBudget > 0 ? (stats.totalExpenses / stats.monthlyBudget) * 100 : 0}
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Trend Chart */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Tren Bulanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--gold-kin))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--gold-kin))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--sakura-pink))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--sakura-pink))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="hsl(var(--gold-kin))" 
                    fillOpacity={1} 
                    fill="url(#incomeGradient)" 
                    name="Pemasukan"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="hsl(var(--sakura-pink))" 
                    fillOpacity={1} 
                    fill="url(#expenseGradient)" 
                    name="Pengeluaran"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Income by Client Chart */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Pemasukan per Klien
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeByClient}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
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
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                    labelLine={false}
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
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                Pengeluaran Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExpenses.length > 0 ? (
                  recentExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <CategoryBadge category={expense.category} />
                        <div>
                          <p className="font-medium">{expense.transaction_name || expense.category}</p>
                          <p className="text-xs text-muted-foreground">
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
                  <p className="text-muted-foreground text-center py-8">Belum ada pengeluaran</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & AI Advisor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle>Aksi Cepat</CardTitle>
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
  const { user } = useAuth();
  const { getContent } = useEditableContent();
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
    <AnimatedBackground theme="neutral">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg ring-4 ring-blue-500/20">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {getContent("dashboard.title", "Financial Dashboard")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {getContent("dashboard.subtitle", "Ringkasan keuangan Anda")} {period === "week" ? "minggu ini" : period === "month" ? "bulan ini" : "tahun ini"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(value: "week" | "month" | "year") => setPeriod(value)}>
              <SelectTrigger className="w-[180px] border-purple-500/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 bg-white/50 backdrop-blur-sm">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
            <GradientButton variant="income" onClick={() => navigate("/")}>
              Lihat Detail →
            </GradientButton>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ColoredStatCard
            title={getContent("dashboard.total_income", "Total Pemasukan")}
            value={formatCurrency(stats.totalIncome)}
            icon={ArrowUpRight}
            gradient="income"
            subtitle={period === "week" ? "Minggu ini" : period === "month" ? "Bulan ini" : "Tahun ini"}
          />
          <ColoredStatCard
            title={getContent("dashboard.total_expenses", "Total Pengeluaran")}
            value={formatCurrency(stats.totalExpenses)}
            icon={ArrowDownRight}
            gradient="expense"
            subtitle={period === "week" ? "Minggu ini" : period === "month" ? "Bulan ini" : "Tahun ini"}
          />
          <ColoredStatCard
            title={getContent("dashboard.total_savings", "Total Tabungan")}
            value={formatCurrency(stats.totalSavings)}
            icon={PiggyBank}
            gradient="savings"
            subtitle="Akumulasi"
          />
          <ColoredStatCard
            title={getContent("dashboard.savings_rate", "Savings Rate")}
            value={`${stats.savingsRate.toFixed(1)}%`}
            icon={Wallet}
            gradient="budget"
            subtitle="Dari pendapatan"
          />
        </div>

      {/* Charts Row 1: Monthly Trend & Income by Client */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend - Income vs Expenses */}
        <Card className="card-hover-effect overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
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
        <Card className="card-hover-effect overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-600" />
              Pemasukan per Client
            </CardTitle>
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
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-rose-500/10 via-red-500/10 to-orange-500/10 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-600" />
              Pengeluaran per Kategori
            </CardTitle>
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
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-pink-500/10 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
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
              <span className="font-bold text-rose-600 bg-rose-500/10 px-2 py-1 rounded-md">{formatCurrency(stats.totalExpenses)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className={`font-bold px-2 py-1 rounded-md ${stats.remainingBudget >= 0 ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10'}`}>
                {formatCurrency(stats.remainingBudget)}
              </span>
            </div>
            <ColoredProgressBar
              value={Math.min((stats.totalExpenses / stats.monthlyBudget) * 100, 100)}
              showLabel={true}
              height="h-3"
              animated={true}
            />
            <div className="text-xs bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-3 rounded-lg mt-2 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <strong className="text-purple-700 dark:text-purple-300">Savings Rate:</strong>
                <span className="font-bold text-purple-600">{stats.savingsRate.toFixed(1)}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground block mt-1">
                Formula: ((Pemasukan - Pengeluaran) / Pemasukan) × 100%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <Card className="card-hover-effect overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-rose-500/10 via-orange-500/10 to-amber-500/10 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-rose-600" />
              Pengeluaran Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between py-3 px-3 rounded-lg border border-border hover:bg-gradient-to-r hover:from-rose-500/5 hover:to-orange-500/5 hover:border-rose-500/50 transition-all hover:shadow-md">
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
                    <span className="font-bold text-rose-600 bg-rose-500/10 px-3 py-1.5 rounded-md text-base ml-4">
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
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-3">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Budget Advisor */}
      <AIBudgetAdvisor />
    </div>
  </AnimatedBackground>
  );
}
