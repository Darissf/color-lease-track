import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Target, PiggyBank, Wallet, Calendar, Plus, AlertTriangle, CheckCircle2, ArrowUpDown, Settings } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { GradientButton } from "@/components/GradientButton";
import { ColoredProgressBar } from "@/components/ColoredProgressBar";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { CategoryBadge } from "@/components/CategoryBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CategoryBudget, CategoryProgress } from "@/types/budgetTypes";
import { CategoryBudgetManager } from "@/components/budget/CategoryBudgetManager";
import { CategoryBudgetOverview } from "@/components/budget/CategoryBudgetOverview";
import { AlertNotificationCenter } from "@/components/budget/AlertNotificationCenter";
import { AlertBanner } from "@/components/budget/AlertBanner";
import { DailyPaceIndicator } from "@/components/budget/DailyPaceIndicator";
import { BudgetQuickActionBar } from "@/components/budget/BudgetQuickActionBar";
import { BudgetCommandPalette } from "@/components/budget/BudgetCommandPalette";
import { KeyboardShortcutsHelp } from "@/components/budget/KeyboardShortcutsHelp";
import { TemplateLibrary } from "@/components/budget/TemplateLibrary";
import { BudgetForecastChart } from "@/components/budget/charts/BudgetForecastChart";
import { AIInsightsPanel } from "@/components/budget/AIInsightsPanel";
import { calculateCategoryProgress, calculateDailyPace } from "@/utils/budgetCalculations";
import { useAlertChecker } from "@/hooks/useAlertChecker";
import { useBudgetKeyboardShortcuts } from "@/hooks/useBudgetKeyboardShortcuts";

interface MonthlyBudget {
  id: string;
  month: string;
  year: number;
  target_belanja: number;
  tanggal_pembelian: string | null;
  jangka_belakang: string | null;
  notes: string | null;
}

interface CategoryData {
  category: string;
  budgeted: number;
  spent: number;
  percentage: number;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const CATEGORY_COLORS = {
  'Pemeliharaan Properti': '#6366f1',
  'Utilitas': '#8b5cf6',
  'Pajak': '#ec4899',
  'Belanja': '#f97316',
  'Transportasi': '#14b8a6',
  'Lainnya': '#64748b',
};

const BudgetTracker = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentBudget, setCurrentBudget] = useState<MonthlyBudget | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [income, setIncome] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [categoryBudgetDialogOpen, setCategoryBudgetDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    target_belanja: '',
    tanggal_pembelian: '',
    jangka_belakang: '',
    notes: ''
  });

  const alerts = useAlertChecker(currentBudget, expenses, categoryProgress);
  
  useBudgetKeyboardShortcuts({
    onCreateBudget: () => setDialogOpen(true),
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedMonth, selectedYear]);

  useEffect(() => {
    if (currentBudget && expenses.length > 0) {
      const progress = calculateCategoryProgress(categoryBudgets, expenses);
      setCategoryProgress(progress);
    }
  }, [categoryBudgets, expenses]);

  const fetchCategoryBudgets = async () => {
    if (!currentBudget) return;
    
    const { data } = await supabase
      .from('category_budgets')
      .select('*')
      .eq('monthly_budget_id', currentBudget.id)
      .order('category');
    
    setCategoryBudgets(data || []);
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!currentBudget) return;
    
    const { error } = await supabase.rpc('apply_budget_template', {
      p_user_id: user!.id,
      p_budget_id: currentBudget.id,
      p_template_id: templateId
    });
    
    if (!error) {
      toast({ title: "Template berhasil diterapkan!" });
      fetchCategoryBudgets();
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const monthName = MONTHS[selectedMonth];
      
      // Fetch current month budget
      const { data: budgetData } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', monthName)
        .eq('year', selectedYear)
        .maybeSingle();

      setCurrentBudget(budgetData);
      
      if (budgetData) {
        await fetchCategoryBudgets();
      }

      // Fetch expenses for selected month
      const startDate = format(new Date(selectedYear, selectedMonth, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(selectedYear, selectedMonth + 1, 0), 'yyyy-MM-dd');
      
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      setExpenses(expensesData || []);

      // Fetch income for selected month
      const { data: incomeData } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      setIncome(incomeData || []);

      // Fetch historical data (last 6 months)
      const historicalPromises = [];
      for (let i = 0; i < 6; i++) {
        const date = subMonths(new Date(selectedYear, selectedMonth, 1), i);
        const month = format(date, 'MMMM', { locale: localeId });
        const year = date.getFullYear();
        
        historicalPromises.push(
          supabase
            .from('monthly_budgets')
            .select('*, expenses:expenses(amount)')
            .eq('user_id', user.id)
            .eq('month', month)
            .eq('year', year)
            .maybeSingle()
        );
      }

      const historicalResults = await Promise.all(historicalPromises);
      const historical = historicalResults
        .map((result, index) => {
          const date = subMonths(new Date(selectedYear, selectedMonth, 1), index);
          const monthName = format(date, 'MMM');
          return {
            month: monthName,
            budget: result.data?.target_belanja || 0,
            spent: result.data?.expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0
          };
        })
        .reverse();

      setHistoricalData(historical);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data budget",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!user || !formData.target_belanja) {
      toast({
        title: "Error",
        description: "Mohon isi target belanja",
        variant: "destructive"
      });
      return;
    }

    try {
      const monthName = MONTHS[selectedMonth];
      const budgetData = {
        user_id: user.id,
        month: monthName,
        year: selectedYear,
        target_belanja: parseFloat(formData.target_belanja),
        tanggal_pembelian: formData.tanggal_pembelian || null,
        jangka_belakang: formData.jangka_belakang || null,
        notes: formData.notes || null
      };

      if (currentBudget) {
        await supabase
          .from('monthly_budgets')
          .update(budgetData)
          .eq('id', currentBudget.id);
      } else {
        await supabase
          .from('monthly_budgets')
          .insert(budgetData);
      }

      toast({
        title: "Berhasil",
        description: "Budget berhasil disimpan"
      });
      
      setDialogOpen(false);
      fetchData();
      setFormData({ target_belanja: '', tanggal_pembelian: '', jangka_belakang: '', notes: '' });
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan budget",
        variant: "destructive"
      });
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalBudget = currentBudget?.target_belanja || 0;
    const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0);
    const remaining = totalBudget - totalSpent;
    const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

    return { totalBudget, totalSpent, totalIncome, remaining, percentage, savingsRate };
  }, [currentBudget, expenses, income]);

  // Calculate category breakdown
  const categoryData: CategoryData[] = useMemo(() => {
    const categories = expenses.reduce((acc: any, expense) => {
      const cat = expense.category || 'Lainnya';
      if (!acc[cat]) {
        acc[cat] = { category: cat, spent: 0 };
      }
      acc[cat].spent += expense.amount || 0;
      return acc;
    }, {});

    return Object.values(categories).map((cat: any) => ({
      ...cat,
      budgeted: 0,
      percentage: stats.totalBudget > 0 ? (cat.spent / stats.totalBudget) * 100 : 0
    }));
  }, [expenses, stats.totalBudget]);

  const pieChartData = categoryData.map(cat => ({
    name: cat.category,
    value: cat.spent
  }));

  if (loading) {
    return (
      <AnimatedBackground theme="budget">
        <div className="p-8 space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground theme="budget">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gradient-budget mb-2">
              Pelacak Anggaran Bulanan
            </h1>
            <p className="text-muted-foreground">Monitor dan kelola anggaran bulanan Anda</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <GradientButton variant="budget" icon={Plus}>
                {currentBudget ? 'Edit Budget' : 'Buat Budget'}
              </GradientButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Budget untuk {MONTHS[selectedMonth]} {selectedYear}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="target_belanja">Target Belanja *</Label>
                  <Input
                    id="target_belanja"
                    type="number"
                    placeholder="10000000"
                    value={formData.target_belanja}
                    onChange={(e) => setFormData({ ...formData, target_belanja: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tanggal_pembelian">Tanggal Pembelian</Label>
                  <Input
                    id="tanggal_pembelian"
                    type="date"
                    value={formData.tanggal_pembelian}
                    onChange={(e) => setFormData({ ...formData, tanggal_pembelian: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="jangka_belakang">Jangka Belakang</Label>
                  <Input
                    id="jangka_belakang"
                    placeholder="30 hari"
                    value={formData.jangka_belakang}
                    onChange={(e) => setFormData({ ...formData, jangka_belakang: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan tambahan..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button onClick={handleSaveBudget} className="w-full">
                  Simpan Budget
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Month Selector */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Label>Pilih Bulan:</Label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {!currentBudget ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full gradient-budget flex items-center justify-center">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Belum Ada Budget</h3>
                <p className="text-muted-foreground mb-6">
                  Buat budget untuk {MONTHS[selectedMonth]} {selectedYear} untuk mulai melacak pengeluaran Anda
                </p>
                <GradientButton variant="budget" icon={Plus} onClick={() => setDialogOpen(true)}>
                  Buat Budget Pertama
                </GradientButton>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid gap-6 md:grid-cols-4">
              <ColoredStatCard
                title="Total Budget"
                value={formatRupiah(stats.totalBudget)}
                icon={Wallet}
                gradient="budget"
              />
              <ColoredStatCard
                title="Total Pengeluaran"
                value={formatRupiah(stats.totalSpent)}
                icon={TrendingUp}
                gradient="expense"
                trend={stats.percentage > 0 ? { value: stats.percentage.toFixed(1) + '%', isPositive: stats.percentage < 80 } : undefined}
              />
              <ColoredStatCard
                title="Sisa Budget"
                value={formatRupiah(stats.remaining)}
                icon={PiggyBank}
                gradient={stats.remaining >= 0 ? "income" : "expense"}
              />
              <ColoredStatCard
                title="Tingkat Tabungan"
                value={`${stats.savingsRate.toFixed(1)}%`}
                icon={Target}
                gradient="savings"
                trend={{ value: stats.savingsRate.toFixed(1) + '%', isPositive: stats.savingsRate > 20 }}
              />
            </div>

            {/* Budget Progress */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Progress Budget {MONTHS[selectedMonth]}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatRupiah(stats.totalSpent)} dari {formatRupiah(stats.totalBudget)}
                    </p>
                  </div>
                  <Badge variant={stats.percentage > 100 ? "destructive" : stats.percentage > 80 ? "default" : "outline"}>
                    {stats.percentage > 100 && <AlertTriangle className="h-4 w-4 mr-1" />}
                    {stats.percentage <= 80 && <CheckCircle2 className="h-4 w-4 mr-1" />}
                    {stats.percentage.toFixed(1)}%
                  </Badge>
                </div>
                <ColoredProgressBar value={stats.percentage} showLabel animated />
                {currentBudget.notes && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Catatan:</p>
                    <p className="text-sm text-muted-foreground">{currentBudget.notes}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Historical Trend */}
              <Card className="p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpDown className="h-5 w-5" />
                    Tren 6 Bulan Terakhir
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                      <Legend />
                      <Bar dataKey="budget" fill="#6366f1" name="Budget" />
                      <Bar dataKey="spent" fill="#ec4899" name="Pengeluaran" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card className="p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="flex items-center gap-2">
                    <PiggyBank className="h-5 w-5" />
                    Breakdown per Kategori
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${((entry.value / stats.totalSpent) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || '#64748b'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Belum ada pengeluaran
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Category Details */}
            <Card className="p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle>Detail Pengeluaran per Kategori</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {categoryData.length > 0 ? (
                  <div className="space-y-4">
                    {categoryData.map((cat, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <CategoryBadge category={cat.category} />
                          <div className="text-right">
                            <p className="text-sm font-bold">{formatRupiah(cat.spent)}</p>
                            <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}% dari budget</p>
                          </div>
                        </div>
                        <ColoredProgressBar value={cat.percentage} animated={false} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Belum ada pengeluaran untuk bulan ini
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AnimatedBackground>
  );
};

export default BudgetTracker;
