import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency";
import { TransactionSummaryCards } from "@/components/transaction/TransactionSummaryCards";
import { TransactionCharts } from "@/components/transaction/TransactionCharts";
import { TransactionTable } from "@/components/transaction/TransactionTable";
import { TransactionInsights } from "@/components/transaction/TransactionInsights";
import { TransactionExport } from "@/components/transaction/TransactionExport";
import { getNowInJakarta, formatInJakarta } from "@/lib/timezone";
import { startOfMonth, startOfYear, endOfMonth, endOfYear, subMonths, format } from "date-fns";

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  category: string;
  description: string;
  source?: string;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number;
  transactionCount: number;
  avgDaily: number;
  prevPeriodIncome: number;
  prevPeriodExpense: number;
}

export default function TransactionHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [period, setPeriod] = useState(searchParams.get('period') || 'month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    savingsRate: 0,
    transactionCount: 0,
    avgDaily: 0,
    prevPeriodIncome: 0,
    prevPeriodExpense: 0,
  });
  const [showExport, setShowExport] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);

  // Fetch available years
  useEffect(() => {
    const fetchYears = async () => {
      if (!user) return;
      
      const yearsSet = new Set<number>();
      
      const { data: incomeData } = await supabase
        .from('income_sources')
        .select('date')
        .eq('user_id', user.id)
        .not('date', 'is', null);
      
      incomeData?.forEach(item => {
        if (item.date) yearsSet.add(new Date(item.date).getFullYear());
      });

      const { data: expenseData } = await supabase
        .from('expenses')
        .select('date')
        .eq('user_id', user.id);
      
      expenseData?.forEach(item => {
        yearsSet.add(new Date(item.date).getFullYear());
      });

      const years = Array.from(yearsSet).sort((a, b) => b - a);
      if (years.length > 0) {
        setAvailableYears(years);
      }
    };

    fetchYears();
  }, [user]);

  // Fetch transactions based on period
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const now = getNowInJakarta();
        let startDate: Date;
        let endDate: Date;
        let prevStartDate: Date;
        let prevEndDate: Date;

        if (period === 'month') {
          startDate = new Date(selectedYear, selectedMonth - 1, 1);
          endDate = endOfMonth(startDate);
          prevStartDate = subMonths(startDate, 1);
          prevEndDate = endOfMonth(prevStartDate);
        } else if (period === 'year') {
          startDate = new Date(selectedYear, 0, 1);
          endDate = endOfYear(startDate);
          prevStartDate = new Date(selectedYear - 1, 0, 1);
          prevEndDate = endOfYear(prevStartDate);
        } else {
          // All time - use a very old date
          startDate = new Date(2000, 0, 1);
          endDate = now;
          prevStartDate = new Date(2000, 0, 1);
          prevEndDate = now;
        }

        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        const prevStartStr = format(prevStartDate, 'yyyy-MM-dd');
        const prevEndStr = format(prevEndDate, 'yyyy-MM-dd');

        // Fetch income
        const { data: incomeData, error: incomeError } = await supabase
          .from('income_sources')
          .select('id, amount, date, source_name')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: false });

        if (incomeError) throw incomeError;

        // Fetch expenses
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select('id, amount, date, category, description, transaction_name')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: false });

        if (expenseError) throw expenseError;

        // Fetch previous period data for comparison
        let prevIncome = 0;
        let prevExpense = 0;

        if (period !== 'all') {
          const { data: prevIncomeData } = await supabase
            .from('income_sources')
            .select('amount')
            .eq('user_id', user.id)
            .gte('date', prevStartStr)
            .lte('date', prevEndStr);

          const { data: prevExpenseData } = await supabase
            .from('expenses')
            .select('amount')
            .eq('user_id', user.id)
            .gte('date', prevStartStr)
            .lte('date', prevEndStr);

          prevIncome = prevIncomeData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
          prevExpense = prevExpenseData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
        }

        // Transform data
        const incomeTransactions: Transaction[] = (incomeData || []).map(item => ({
          id: item.id,
          type: 'income' as const,
          amount: Number(item.amount),
          date: item.date || '',
          category: 'Pemasukan',
          description: '',
          source: item.source_name || 'Lainnya',
        }));

        const expenseTransactions: Transaction[] = (expenseData || []).map(item => ({
          id: item.id,
          type: 'expense' as const,
          amount: Number(item.amount),
          date: item.date,
          category: item.category,
          description: item.description || item.transaction_name || '',
        }));

        const allTransactions = [...incomeTransactions, ...expenseTransactions]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setTransactions(allTransactions);

        // Calculate stats
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
        const netBalance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;
        
        // Calculate days in period
        const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const avgDaily = (totalIncome + totalExpense) / daysDiff;

        setStats({
          totalIncome,
          totalExpense,
          netBalance,
          savingsRate,
          transactionCount: allTransactions.length,
          avgDaily,
          prevPeriodIncome: prevIncome,
          prevPeriodExpense: prevExpense,
        });

      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, period, selectedYear, selectedMonth]);

  const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col bg-background">
      <div className="relative z-10 space-y-4 px-2 py-2 md:px-6 md:py-4 flex-1 overflow-y-auto overflow-x-hidden w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/vip/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Riwayat Transaksi
              </h1>
              <p className="text-sm text-muted-foreground">
                Kelola dan analisis semua pemasukan & pengeluaran
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            {period === 'month' && (
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {period !== 'all' && (
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button variant="outline" onClick={() => setShowExport(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <TransactionSummaryCards stats={stats} loading={loading} period={period} />

        {/* Charts Section */}
        <TransactionCharts 
          transactions={transactions} 
          loading={loading}
          period={period}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
        />

        {/* Insights Panel */}
        <TransactionInsights 
          stats={stats} 
          transactions={transactions}
          period={period}
        />

        {/* Transaction Table */}
        <TransactionTable 
          transactions={transactions} 
          loading={loading}
        />

        {/* Export Dialog */}
        <TransactionExport 
          open={showExport}
          onOpenChange={setShowExport}
          transactions={transactions}
          stats={stats}
          period={period}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
        />
      </div>
    </div>
  );
}
