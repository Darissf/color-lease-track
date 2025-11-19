import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Wallet, TrendingUp, Target, Snowflake, Flower2, Sun, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { GradientButton } from "@/components/GradientButton";
import { useProfile } from "@/hooks/useProfile";

const MONTHS = [
  { name: "Januari", quarter: 1, monthKey: "januari" },
  { name: "Februari", quarter: 1, monthKey: "februari" },
  { name: "Maret", quarter: 1, monthKey: "maret" },
  { name: "April", quarter: 2, monthKey: "april" },
  { name: "Mei", quarter: 2, monthKey: "mei" },
  { name: "Juni", quarter: 2, monthKey: "juni" },
  { name: "Juli", quarter: 3, monthKey: "juli" },
  { name: "Agustus", quarter: 3, monthKey: "agustus" },
  { name: "September", quarter: 3, monthKey: "september" },
  { name: "Oktober", quarter: 4, monthKey: "oktober" },
  { name: "November", quarter: 4, monthKey: "november" },
  { name: "Desember", quarter: 4, monthKey: "desember" },
];

const QUARTER_THEMES = {
  1: {
    name: "Winter/Spring",
    gradient: "from-blue-500 via-cyan-500 to-teal-500",
    textGradient: "from-blue-600 via-cyan-600 to-teal-600",
    bg: "from-blue-50/50 to-cyan-50/50",
    border: "border-blue-200",
    shadow: "shadow-blue-500/20",
    icon: Snowflake,
    emoji: "❄️",
    hover: "hover:shadow-blue-500/40 hover:border-blue-300",
  },
  2: {
    name: "Spring/Summer",
    gradient: "from-emerald-500 via-green-500 to-lime-500",
    textGradient: "from-emerald-600 via-green-600 to-lime-600",
    bg: "from-emerald-50/50 to-green-50/50",
    border: "border-emerald-200",
    shadow: "shadow-emerald-500/20",
    icon: Flower2,
    emoji: "🌸",
    hover: "hover:shadow-emerald-500/40 hover:border-emerald-300",
  },
  3: {
    name: "Summer/Fall",
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    textGradient: "from-orange-600 via-amber-600 to-yellow-600",
    bg: "from-orange-50/50 to-amber-50/50",
    border: "border-orange-200",
    shadow: "shadow-orange-500/20",
    icon: Sun,
    emoji: "☀️",
    hover: "hover:shadow-orange-500/40 hover:border-orange-300",
  },
  4: {
    name: "Fall/Winter",
    gradient: "from-rose-500 via-pink-500 to-purple-500",
    textGradient: "from-rose-600 via-pink-600 to-purple-600",
    bg: "from-rose-50/50 to-pink-50/50",
    border: "border-rose-200",
    shadow: "shadow-rose-500/20",
    icon: Leaf,
    emoji: "🍂",
    hover: "hover:shadow-rose-500/40 hover:border-rose-300",
  },
};

const toTitleCase = (str: string) => {
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export default function Nabila() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [loading, setLoading] = useState(true);
  
  const displayName = profile?.full_name 
    ? toTitleCase(profile.full_name)
    : profile?.username 
    ? toTitleCase(profile.username)
    : 'User';

  // Fetch available years from database based on actual financial data
  useEffect(() => {
    const fetchAvailableYears = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const yearsSet = new Set<number>();

        // Get years from income_sources
        const { data: incomeData } = await supabase
          .from('income_sources')
          .select('date')
          .eq('user_id', user.id)
          .not('date', 'is', null);
        
        if (incomeData) {
          incomeData.forEach((item) => {
            if (item.date) {
              const year = new Date(item.date).getFullYear();
              yearsSet.add(year);
            }
          });
        }

        // Get years from expenses
        const { data: expenseData } = await supabase
          .from('expenses')
          .select('date')
          .eq('user_id', user.id);
        
        if (expenseData) {
          expenseData.forEach((item) => {
            const year = new Date(item.date).getFullYear();
            yearsSet.add(year);
          });
        }

        // Get years from monthly_reports
        const { data: reportData } = await supabase
          .from('monthly_reports')
          .select('year')
          .eq('user_id', user.id);
        
        if (reportData) {
          reportData.forEach((item) => {
            yearsSet.add(item.year);
          });
        }

        // Get years from monthly_budgets
        const { data: budgetData } = await supabase
          .from('monthly_budgets')
          .select('year')
          .eq('user_id', user.id);
        
        if (budgetData) {
          budgetData.forEach((item) => {
            yearsSet.add(item.year);
          });
        }

        // Convert to sorted array (descending order - newest first)
        const years = Array.from(yearsSet).sort((a, b) => b - a);
        
        // If no data exists, use current year
        if (years.length === 0) {
          setAvailableYears([currentYear]);
          setSelectedYear(currentYear);
        } else {
          setAvailableYears(years);
          // Set to most recent year with data
          setSelectedYear(years[0]);
        }
      } catch (error) {
        console.error('Error fetching available years:', error);
        setAvailableYears([currentYear]);
        setSelectedYear(currentYear);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableYears();
  }, [user, currentYear]);

  const quarters = [
    { number: 1, months: MONTHS.filter(m => m.quarter === 1) },
    { number: 2, months: MONTHS.filter(m => m.quarter === 2) },
    { number: 3, months: MONTHS.filter(m => m.quarter === 3) },
    { number: 4, months: MONTHS.filter(m => m.quarter === 4) },
  ];

  return (
    <AnimatedBackground theme="neutral">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl md:text-7xl font-serif italic bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
            Financial Planner.
          </h1>
          <p className="text-3xl md:text-4xl font-serif italic bg-gradient-to-r from-slate-600 to-slate-400 bg-clip-text text-transparent">
            KAKEIBO PAGE
          </p>
        </div>

        {/* Info Card with Glassmorphic Style */}
        <Card className="p-8 bg-gradient-to-br from-white/60 to-white/40 dark:from-slate-900/60 dark:to-slate-800/40 backdrop-blur-sm border-2 shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                  {displayName}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold">
                    v24.0.0
                  </span>
                  <span className="text-sm text-muted-foreground">
                    DKI Bank II Sumitro + Minimalis
                  </span>
                </div>
              </div>
              <div className="hidden md:block text-6xl">🏦</div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  12
                </div>
                <div className="text-xs text-muted-foreground">Bulan</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  4
                </div>
                <div className="text-xs text-muted-foreground">Kuartal</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {availableYears.length}
                </div>
                <div className="text-xs text-muted-foreground">Tahun Data</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                  100%
                </div>
                <div className="text-xs text-muted-foreground">Siap</div>
              </div>
            </div>
          </div>
        </Card>



        {/* Laporan Bulanan Finansial - Quarters */}
        <Card className="p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                Laporan Bulanan Finansial
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Tahun:</span>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
                disabled={loading}
              >
                <SelectTrigger className="w-[140px] border-2 focus:border-purple-500 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quarters.map((quarter) => {
              const theme = QUARTER_THEMES[quarter.number as keyof typeof QUARTER_THEMES];
              const QuarterIcon = theme.icon;
              
              return (
                <div 
                  key={quarter.number} 
                  className={`relative overflow-hidden rounded-xl border-2 ${theme.border} bg-gradient-to-br ${theme.bg} p-6 shadow-lg ${theme.shadow} transition-all duration-300 hover:shadow-2xl`}
                >
                  {/* Gradient Top Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`}></div>
                  
                  {/* Quarter Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{theme.emoji}</span>
                        <h4 className={`text-xl font-bold bg-gradient-to-r ${theme.textGradient} bg-clip-text text-transparent`}>
                          Q{quarter.number}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{theme.name}</p>
                    </div>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${theme.gradient} bg-opacity-10`}>
                      <QuarterIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  
                  {/* Month Buttons */}
                  <div className="space-y-2">
                    {quarter.months.map((month) => (
                      <button
                        key={month.name}
                        className={`w-full group relative overflow-hidden rounded-lg border ${theme.border} bg-white/80 dark:bg-slate-900/80 p-3 text-left transition-all duration-300 ${theme.hover} hover:scale-105 active:scale-95`}
                        onClick={() => navigate(`/month/${selectedYear}/${month.monthKey}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md bg-gradient-to-br ${theme.gradient} group-hover:scale-110 transition-transform duration-300`}>
                            <Calendar className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-foreground group-hover:translate-x-1 transition-transform duration-300">
                              {month.name}
                            </div>
                            <div className="text-xs text-muted-foreground">{selectedYear}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Rencana Anggaran & Tabungan Bulanan */}
        <Card className="p-8 relative overflow-hidden shadow-xl">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-rose-500/5 pointer-events-none"></div>
          
          <div className="relative space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                Rencana Anggaran & Tabungan Bulanan
              </h3>
            </div>
            
            {/* Stats Preview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Target Budget</div>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Rp 0
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">Savings Goal</div>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Rp 0
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <div className="text-xs font-semibold text-purple-700 dark:text-purple-400">Achievement</div>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  0%
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <div className="text-xs font-semibold text-orange-700 dark:text-orange-400">Months</div>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  0/12
                </div>
              </div>
            </div>
            
            {/* Action Button */}
            <div className="pt-2">
              <GradientButton
                variant="income"
                size="lg"
                onClick={() => navigate("/monthly-budget")}
                className="w-full"
              >
                <Target className="h-5 w-5 mr-2" />
                Lihat Anggaran Bulanan
              </GradientButton>
            </div>
          </div>
        </Card>
      </div>
    </AnimatedBackground>
  );
}
