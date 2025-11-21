import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, Wallet, TrendingUp, Target, Snowflake, Flower2, Sun, Leaf, Clock, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GradientButton } from "@/components/GradientButton";
import { useProfile } from "@/hooks/useProfile";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { BankBalanceHistory } from "@/components/BankBalanceHistory";
import { useTheme } from "@/components/ui/theme-provider";

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
  const { user, userRole } = useAuth();
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [prevBalance, setPrevBalance] = useState(0);
  const [isBalanceAnimating, setIsBalanceAnimating] = useState(false);
  
  const displayName = profile?.full_name 
    ? toTitleCase(profile.full_name)
    : profile?.username 
    ? toTitleCase(profile.username)
    : 'User';

  const getRoleDisplay = (role: string | undefined) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'user':
        return 'User';
      default:
        return 'User';
    }
  };

  const getRoleBadgeStyle = (role: string | undefined) => {
    switch (role) {
      case 'super_admin':
        return 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600';
      case 'admin':
        return 'bg-gradient-to-r from-blue-600 to-cyan-600';
      case 'user':
        return 'bg-gradient-to-r from-gray-600 to-gray-700';
      default:
        return 'bg-gradient-to-r from-gray-600 to-gray-700';
    }
  };

  // Fetch bank accounts and calculate total balance
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!user) return;
      
      setLoadingBalance(true);
      try {
        const { data: accounts, error } = await supabase
          .from('bank_accounts')
          .select('balance')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        const total = accounts?.reduce((sum, account) => 
          sum + (Number(account.balance) || 0), 0
        ) || 0;
        
        // Trigger animation jika balance berubah
        if (total !== totalBalance && totalBalance !== 0) {
          setPrevBalance(totalBalance);
          setIsBalanceAnimating(true);
          setTimeout(() => setIsBalanceAnimating(false), 600);
        }
        
        setTotalBalance(total);
      } catch (error) {
        console.error('Error fetching bank accounts:', error);
        setTotalBalance(0);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBankAccounts();
  }, [user]);

  // Real-time subscription for bank account changes
  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime subscription for bank accounts...');

    const channel = supabase
      .channel('bank-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Bank account change detected:', payload);
          
          // Trigger animation sebelum fetch
          setIsBalanceAnimating(true);
          setTimeout(() => setIsBalanceAnimating(false), 600);
          
          // Recalculate total balance
          const fetchBankAccounts = async () => {
            try {
              const { data: accounts, error } = await supabase
                .from('bank_accounts')
                .select('balance, bank_name')
                .eq('user_id', user.id)
                .eq('is_active', true);
              
              if (error) throw error;
              
              const total = accounts?.reduce((sum, account) => 
                sum + (Number(account.balance) || 0), 0
              ) || 0;
              
              setPrevBalance(totalBalance);
              setTotalBalance(total);

              // Show notification based on event type
              if (payload.eventType === 'INSERT') {
                toast.success('Bank Account Ditambahkan', {
                  description: `Saldo baru telah ditambahkan`
                });
              } else if (payload.eventType === 'UPDATE') {
                const newBalance = (payload.new as any).balance;
                const oldBalance = (payload.old as any).balance;
                const bankName = (payload.new as any).bank_name;
                
                if (newBalance !== oldBalance) {
                  toast.info('Saldo Bank Diupdate', {
                    description: `${bankName}: ${formatCurrency(oldBalance)} → ${formatCurrency(newBalance)}`
                  });
                }
              } else if (payload.eventType === 'DELETE') {
                toast.warning('Bank Account Dihapus', {
                  description: 'Saldo telah diperbarui'
                });
              }
            } catch (error) {
              console.error('Error fetching updated bank accounts:', error);
            }
          };

          fetchBankAccounts();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription...');
      supabase.removeChannel(channel);
    };
  }, [user]);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900" data-editable-ignore>
      {/* Animated Stars Background - Minimal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 3 + 's',
              animationDuration: Math.random() * 2 + 2 + 's'
            }}
          />
        ))}
      </div>

      {/* Moon */}
      <div className="absolute top-20 right-20 pointer-events-none">
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-yellow-200 to-orange-200 shadow-2xl shadow-yellow-500/30 animate-float">
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 opacity-80"></div>
          {/* Crater details */}
          <div className="absolute top-8 left-8 w-6 h-6 rounded-full bg-yellow-300/30"></div>
          <div className="absolute bottom-10 right-12 w-4 h-4 rounded-full bg-orange-300/20"></div>
        </div>
      </div>

      {/* Sakura Petals - Minimal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={`sakura-${i}`}
            className="absolute text-2xl opacity-70 animate-float"
            style={{
              top: -20 + 'px',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 5 + 8 + 's'
            }}
          >
            🌸
          </div>
        ))}
      </div>

      {/* Fireflies - Minimal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={`firefly-${i}`}
            className="absolute w-1 h-1 bg-yellow-300 rounded-full shadow-lg shadow-yellow-400/50 animate-pulse"
            style={{
              top: Math.random() * 80 + 10 + '%',
              left: Math.random() * 90 + 5 + '%',
              animationDelay: Math.random() * 2 + 's',
              animationDuration: Math.random() * 2 + 1 + 's'
            }}
          />
        ))}
      </div>

      {/* Theme Toggle Button */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-yellow-300 group-hover:rotate-180 transition-transform duration-500" />
        ) : (
          <Moon className="h-5 w-5 text-indigo-300 group-hover:-rotate-12 transition-transform duration-500" />
        )}
      </button>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto space-y-8 p-6">
        {/* Header with Gradient */}
        <div className="text-center space-y-4 py-12">
          <h1 className="text-6xl md:text-8xl font-serif italic bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-2xl animate-fade-in">
            Financial Planner.
          </h1>
          <p className="text-3xl md:text-4xl font-serif italic bg-gradient-to-r from-slate-300 to-slate-400 bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: '0.2s' }}>
            KAKEIBO PAGE
          </p>
        </div>

        {/* Info Card with Glass Effect */}
        <Card className="p-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 animate-scale-in">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                  {displayName}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${getRoleBadgeStyle(userRole?.role)}`}>
                    {getRoleDisplay(userRole?.role)}
                  </span>
                </div>
              </div>
              <div className="hidden md:block text-6xl">🏦</div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-white/10">
              {/* Total Saldo Card */}
              <div className={`col-span-2 md:col-span-1 p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400/30 backdrop-blur-sm transition-all duration-300 ${
                isBalanceAnimating ? 'animate-pulse-scale' : ''
              }`}>
                <div className="space-y-1">
                  <div className="text-xs text-purple-200 font-medium">Total Saldo</div>
                  {loadingBalance ? (
                    <div className="text-lg font-bold text-purple-300">
                      <div className="animate-pulse">Loading...</div>
                    </div>
                  ) : (
                    <>
                      <div className={`text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent transition-all duration-500 ${
                        isBalanceAnimating ? 'animate-counter-up' : ''
                      }`}>
                        {formatCurrency(totalBalance)}
                      </div>
                      
                      {/* Show change indicator jika ada perubahan */}
                      {isBalanceAnimating && prevBalance > 0 && (
                        <div className={`text-xs font-semibold ${
                          totalBalance > prevBalance ? 'text-green-300' : 'text-red-300'
                        } animate-fade-in`}>
                          {totalBalance > prevBalance ? '↑' : '↓'} {formatCurrency(Math.abs(totalBalance - prevBalance))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="text-xs text-purple-200/70">Bank Accounts</div>
                </div>
              </div>
              
              {/* Bulan Card */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/30 backdrop-blur-sm">
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                    12
                  </div>
                  <div className="text-xs text-blue-200 font-medium">Bulan</div>
                </div>
              </div>
              
              {/* Kuartal Card */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-indigo-400/30 backdrop-blur-sm">
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                    4
                  </div>
                  <div className="text-xs text-indigo-200 font-medium">Kuartal</div>
                </div>
              </div>
              
              {/* Data Years Card */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-2 border-pink-400/30 backdrop-blur-sm">
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold bg-gradient-to-r from-pink-300 to-rose-300 bg-clip-text text-transparent">
                    {availableYears.length}
                  </div>
                  <div className="text-xs text-pink-200 font-medium">Data Years</div>
                </div>
              </div>
              
              {/* Readiness Card */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/30 backdrop-blur-sm">
                <div className="text-center space-y-1">
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                    95%
                  </div>
                  <div className="text-xs text-emerald-200 font-medium">Readiness</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Bank Balance History Accordion */}
        <Accordion type="single" collapsible className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <AccordionItem value="bank-history" className="border border-white/20 rounded-lg bg-white/10 backdrop-blur-lg">
            <AccordionTrigger className="px-6 py-4 hover:no-underline group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-500/30 group-hover:from-blue-500/40 group-hover:to-cyan-500/40 transition-all">
                  <Clock className="h-5 w-5 text-blue-200" />
                </div>
                <span className="text-lg font-semibold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  Riwayat Perubahan Saldo Bank
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <BankBalanceHistory />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Laporan Bulanan Finansial */}
        <Card className="p-8 relative overflow-hidden bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 pointer-events-none"></div>
          
          <div className="relative space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 backdrop-blur-sm">
                  <Calendar className="h-6 w-6 text-purple-200" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-rose-300 bg-clip-text text-transparent">
                  Laporan Bulanan Finansial
                </h3>
              </div>
              
              {/* Year Selector */}
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-32 bg-white/10 backdrop-blur-sm border-white/20 text-white">
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
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
                <p className="mt-4 text-purple-200">Loading data...</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {quarters.map((quarter) => {
                  const theme = QUARTER_THEMES[quarter.number as keyof typeof QUARTER_THEMES];
                  const Icon = theme.icon;
                  
                  return (
                    <Card
                      key={quarter.number}
                      className={`p-6 bg-gradient-to-br ${theme.bg} border-2 ${theme.border} ${theme.shadow} ${theme.hover} backdrop-blur-sm transition-all duration-300 cursor-pointer hover:scale-[1.02] group`}
                    >
                      <div className="space-y-4">
                        {/* Quarter Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-lg bg-gradient-to-br ${theme.gradient} shadow-lg`}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h4 className={`text-xl font-bold bg-gradient-to-r ${theme.textGradient} bg-clip-text text-transparent`}>
                                Kuartal {quarter.number}
                              </h4>
                              <p className="text-sm text-muted-foreground">{theme.name} {theme.emoji}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Months Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {quarter.months.map((month) => (
                            <Button
                              key={month.monthKey}
                              variant="outline"
                              onClick={() => navigate(`/month/${selectedYear}/${month.monthKey}`)}
                              className="h-auto py-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-slate-700/70 border-2 hover:scale-105 transition-all duration-200"
                            >
                              <div className="flex flex-col items-start w-full gap-1">
                                <div className="flex items-center gap-2 w-full">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold">{month.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  Lihat Detail →
                                </span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Rencana Anggaran & Tabungan Bulanan */}
        <Card className="p-8 relative overflow-hidden bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl animate-fade-in" style={{ animationDelay: '0.5s' }}>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 pointer-events-none"></div>
          
          <div className="relative space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 backdrop-blur-sm">
                <Target className="h-6 w-6 text-purple-200" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-rose-300 bg-clip-text text-transparent">
                Rencana Anggaran & Tabungan Bulanan
              </h3>
            </div>
            
            {/* Stats Preview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-400/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-emerald-300" />
                  <div className="text-xs font-semibold text-emerald-200">Target Budget</div>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-emerald-300 to-green-300 bg-clip-text text-transparent">
                  Rp 0
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-300" />
                  <div className="text-xs font-semibold text-blue-200">Savings Goal</div>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  Rp 0
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-300" />
                  <div className="text-xs font-semibold text-purple-200">Achievement</div>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  0%
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-400/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-300" />
                  <div className="text-xs font-semibold text-orange-200">Months</div>
                </div>
                <div className="text-lg font-bold bg-gradient-to-r from-orange-300 to-amber-300 bg-clip-text text-transparent">
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
    </div>
  );
}
