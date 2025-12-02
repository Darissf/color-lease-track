import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, Wallet, TrendingUp, Target, Snowflake, Flower2, Sun, Leaf, Clock, Moon, Waves, Sunset, Sparkles, Box, ArrowUpRight, ChevronRight, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GradientButton } from "@/components/GradientButton";
import { useProfile } from "@/hooks/useProfile";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { BankBalanceHistory } from "@/components/BankBalanceHistory";
import { useTheme } from "@/components/ui/theme-provider";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { accentTheme, setAccentTheme } = useAppTheme();
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

  const [volumePeriod, setVolumePeriod] = useState<'month' | 'year' | 'all'>('month');
  const [transactionVolume, setTransactionVolume] = useState({ income: 0, expense: 0, total: 0 });
  const [prevVolume, setPrevVolume] = useState({ income: 0, expense: 0 });
  const [loadingVolume, setLoadingVolume] = useState(true);
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);

  // Fetch transaction volume based on period
  useEffect(() => {
    const fetchTransactionVolume = async () => {
      if (!user) return;
      
      setLoadingVolume(true);
      try {
        const now = new Date();
        let startDate: string;
        let prevStartDate: string;
        let prevEndDate: string;

        if (volumePeriod === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate = monthStart.toISOString().split('T')[0];
          const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          prevStartDate = prevMonthStart.toISOString().split('T')[0];
          prevEndDate = prevMonthEnd.toISOString().split('T')[0];
        } else if (volumePeriod === 'year') {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          startDate = yearStart.toISOString().split('T')[0];
          const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
          const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31);
          prevStartDate = prevYearStart.toISOString().split('T')[0];
          prevEndDate = prevYearEnd.toISOString().split('T')[0];
        } else {
          startDate = '2000-01-01';
          prevStartDate = '2000-01-01';
          prevEndDate = '2000-01-01';
        }

        // Current period income
        const { data: incomeData } = await supabase
          .from('income_sources')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', startDate);

        // Current period expenses
        const { data: expenseData } = await supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user.id)
          .gte('date', startDate);

        const totalIncome = incomeData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
        const totalExpense = expenseData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

        setTransactionVolume({
          income: totalIncome,
          expense: totalExpense,
          total: totalIncome + totalExpense,
        });

        // Previous period data for comparison
        if (volumePeriod !== 'all') {
          const { data: prevIncomeData } = await supabase
            .from('income_sources')
            .select('amount')
            .eq('user_id', user.id)
            .gte('date', prevStartDate)
            .lte('date', prevEndDate);

          const { data: prevExpenseData } = await supabase
            .from('expenses')
            .select('amount')
            .eq('user_id', user.id)
            .gte('date', prevStartDate)
            .lte('date', prevEndDate);

          setPrevVolume({
            income: prevIncomeData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0,
            expense: prevExpenseData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching transaction volume:', error);
      } finally {
        setLoadingVolume(false);
      }
    };

    fetchTransactionVolume();
  }, [user, volumePeriod]);

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

  // Calculate percentage change
  const volumePercentChange = useMemo(() => {
    const prevTotal = prevVolume.income + prevVolume.expense;
    if (prevTotal === 0 || volumePeriod === 'all') return null;
    return ((transactionVolume.total - prevTotal) / prevTotal) * 100;
  }, [transactionVolume, prevVolume, volumePeriod]);

  // Real-time subscription for bank account changes
  useEffect(() => {
    if (!user) return;

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
    <div 
      className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col bg-background"
      data-editable-ignore
    >
      {/* Content */}
      <div className="relative z-10 space-y-4 px-2 py-2 md:px-8 md:py-4 flex-1 overflow-y-auto overflow-x-hidden w-full">
        {/* Header with Gradient */}
        <div className="text-center space-y-2 md:space-y-4 py-6 md:py-12 shrink-0">
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-serif italic text-primary drop-shadow-2xl animate-fade-in">
            Financial Planner.
          </h1>
          <p className="text-xl sm:text-3xl md:text-4xl font-serif italic text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
            KAKEIBO PAGE
          </p>
        </div>

        {/* User Info Card */}
        <Card className="p-8 backdrop-blur-lg shadow-2xl transition-all duration-300 animate-scale-in bg-card border">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-primary">
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
            
            {/* Quick Stats - Hero Style Layout */}
            <div className="space-y-4 pt-4 border-t border-border">
              {/* Hero Card - Minimal + Expandable */}
              <div 
                className={cn(
                  "rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border cursor-pointer transition-all duration-300 ease-in-out overflow-hidden group",
                  isHeroExpanded 
                    ? "p-5 border-primary/50 shadow-lg" 
                    : "p-3 border-primary/30 hover:border-primary/50 hover:shadow-md"
                )}
                onClick={() => navigate(`/vip/transaction-history?period=${volumePeriod}`)}
                onMouseEnter={() => setIsHeroExpanded(true)}
                onMouseLeave={() => setIsHeroExpanded(false)}
              >
                {/* Compact Header - Always Visible */}
                <div className={cn(
                  "flex items-center justify-between transition-all duration-300",
                  isHeroExpanded && "mb-3"
                )}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/20">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">Total Volume</span>
                    {/* Inline value when compact */}
                    <span className={cn(
                      "font-bold text-primary transition-all duration-300",
                      isHeroExpanded ? "opacity-0 w-0 overflow-hidden" : "text-base md:text-lg"
                    )}>
                      {loadingVolume ? '...' : formatCurrency(transactionVolume.total)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select 
                      value={volumePeriod} 
                      onValueChange={(v: 'month' | 'year' | 'all') => setVolumePeriod(v)}
                    >
                      <SelectTrigger 
                        className="h-7 w-[90px] text-xs border-primary/30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        <SelectItem value="month">Bulan Ini</SelectItem>
                        <SelectItem value="year">Tahun Ini</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                    <ChevronRight className={cn(
                      "h-4 w-4 text-primary/60 transition-transform duration-300",
                      isHeroExpanded && "rotate-90"
                    )} />
                  </div>
                </div>
                
                {/* Expanded Content - Animated */}
                <div className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  isHeroExpanded 
                    ? "grid-rows-[1fr] opacity-100" 
                    : "grid-rows-[0fr] opacity-0"
                )}>
                  <div className="overflow-hidden">
                    {/* Large Total Value */}
                    <div className="text-center py-3">
                      <div className="text-2xl md:text-3xl font-bold text-primary">
                        {loadingVolume ? '...' : formatCurrency(transactionVolume.total)}
                      </div>
                    </div>
                    
                    {/* Income/Expense Breakdown */}
                    <div className="grid grid-cols-2 gap-4 py-3 border-t border-primary/20">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Pemasukan</div>
                        <div className="text-base font-semibold text-green-600 dark:text-green-400">
                          {loadingVolume ? '...' : formatCurrency(transactionVolume.income)}
                        </div>
                      </div>
                      <div className="text-center border-l border-primary/20">
                        <div className="text-xs text-muted-foreground mb-1">Pengeluaran</div>
                        <div className="text-base font-semibold text-red-500 dark:text-red-400">
                          {loadingVolume ? '...' : formatCurrency(transactionVolume.expense)}
                        </div>
                      </div>
                    </div>
                    
                    {/* CTA */}
                    <div className="flex items-center justify-center pt-2 text-sm text-primary/80 group-hover:text-primary">
                      <span>Lihat Riwayat Transaksi</span>
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Stats - Inline Bar */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-secondary/10 via-primary/10 to-accent/10 border border-border/50">
                {/* Bulan */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-secondary-foreground" />
                  <span className="text-lg font-semibold text-foreground">12</span>
                  <span className="text-sm text-muted-foreground">Bulan</span>
                </div>
                
                {/* Divider */}
                <div className="h-6 w-px bg-border/50" />
                
                {/* Tahun Data */}
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold text-foreground">{availableYears.length}</span>
                  <span className="text-sm text-muted-foreground">Tahun</span>
                </div>
                
                {/* Divider */}
                <div className="h-6 w-px bg-border/50" />
                
                {/* Saldo Bersih */}
                <div className="flex items-center gap-2">
                  <TrendingUp className={cn(
                    "h-5 w-5",
                    transactionVolume.income - transactionVolume.expense >= 0 ? "text-green-600" : "text-red-600"
                  )} />
                  <span className={cn(
                    "text-lg font-semibold",
                    transactionVolume.income - transactionVolume.expense >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(transactionVolume.income - transactionVolume.expense)}
                  </span>
                  <span className="text-sm text-muted-foreground">Saldo</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Bank Balance History Accordion */}
        <Accordion type="single" collapsible className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <AccordionItem value="bank-history" className="border rounded-lg backdrop-blur-lg border-border bg-card">
            <AccordionTrigger className="px-6 py-4 hover:no-underline group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg transition-all bg-secondary/30 group-hover:bg-secondary/40">
                  <Clock className="h-5 w-5 text-secondary-foreground" />
                </div>
                <span className="text-lg font-semibold text-foreground">
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
        <Card className="p-8 relative overflow-hidden backdrop-blur-lg shadow-2xl animate-fade-in bg-card border" style={{ animationDelay: '0.4s' }}>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10"></div>
          
          <div className="relative space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg backdrop-blur-sm bg-primary/30">
                  <Calendar className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  Laporan Bulanan Finansial
                </h3>
              </div>
              
              {/* Year Selector */}
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-32 backdrop-blur-sm bg-card border-border">
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading data...</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {quarters.map((quarter) => {
                  const theme = QUARTER_THEMES[quarter.number as keyof typeof QUARTER_THEMES];
                  const Icon = theme.icon;
                  
                  return (
                    <Card
                      key={quarter.number}
                      className={`p-6 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:scale-[1.02] group bg-gradient-to-br ${theme.bg} border-2 ${theme.border} ${theme.shadow} ${theme.hover}`}
                    >
                      <div className="space-y-4">
                        {/* Quarter Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-lg shadow-lg bg-gradient-to-br ${theme.gradient}`}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-foreground">
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
                              className="h-auto py-4 backdrop-blur-sm border-2 hover:scale-105 transition-all duration-200 bg-card hover:bg-accent/10"
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
        <Card className="p-8 relative overflow-hidden backdrop-blur-lg shadow-2xl animate-fade-in bg-card border" style={{ animationDelay: '0.5s' }}>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10"></div>
          
          <div className="relative space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg backdrop-blur-sm bg-primary/30">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Rencana Anggaran & Tabungan Bulanan
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg backdrop-blur-sm bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <div className="text-xs font-semibold text-green-600">Target Budget</div>
                </div>
                <div className="text-lg font-bold text-green-600">
                  Rp 0
                </div>
              </div>
              
              <div className="p-4 rounded-lg backdrop-blur-sm bg-secondary/10 border border-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                  <div className="text-xs font-semibold text-secondary">Savings Goal</div>
                </div>
                <div className="text-lg font-bold text-secondary">
                  Rp 0
                </div>
              </div>
              
              <div className="p-4 rounded-lg backdrop-blur-sm bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <div className="text-xs font-semibold text-primary">Achievement</div>
                </div>
                <div className="text-lg font-bold text-primary">
                  0%
                </div>
              </div>
              
              <div className="p-4 rounded-lg backdrop-blur-sm bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <div className="text-xs font-semibold text-orange-600">Months</div>
                </div>
                <div className="text-lg font-bold text-orange-600">
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
