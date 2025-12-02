import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Target, Calendar, PiggyBank, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionStats } from "@/pages/TransactionHistory";
import { parseISO, isWeekend, format } from "date-fns";

interface TransactionInsightsProps {
  stats: TransactionStats;
  transactions: Transaction[];
  period: string;
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'tip';
  icon: React.ElementType;
  title: string;
  message: string;
}

export function TransactionInsights({ stats, transactions, period }: TransactionInsightsProps) {
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];

    // 1. Savings Rate Analysis
    if (stats.savingsRate >= 50) {
      result.push({
        type: 'success',
        icon: PiggyBank,
        title: 'Savings Rate Excellent!',
        message: `Tingkat tabungan ${stats.savingsRate.toFixed(1)}% sangat baik! Pertahankan pola keuangan ini.`,
      });
    } else if (stats.savingsRate >= 20) {
      result.push({
        type: 'info',
        icon: PiggyBank,
        title: 'Savings Rate Good',
        message: `Tingkat tabungan ${stats.savingsRate.toFixed(1)}% sudah bagus. Target 50%+ untuk kebebasan finansial.`,
      });
    } else if (stats.savingsRate > 0) {
      result.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Savings Rate Perlu Ditingkatkan',
        message: `Tingkat tabungan hanya ${stats.savingsRate.toFixed(1)}%. Coba kurangi pengeluaran tidak penting.`,
      });
    } else if (stats.savingsRate < 0) {
      result.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Pengeluaran Melebihi Pemasukan',
        message: `Anda menghabiskan lebih dari pendapatan. Evaluasi pengeluaran segera.`,
      });
    }

    // 2. Top Expense Category
    const expenseByCategory = new Map<string, number>();
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expenseByCategory.set(t.category, (expenseByCategory.get(t.category) || 0) + t.amount);
      });
    
    if (expenseByCategory.size > 0) {
      const sortedCategories = Array.from(expenseByCategory.entries())
        .sort((a, b) => b[1] - a[1]);
      
      const topCategory = sortedCategories[0];
      const topPercentage = (topCategory[1] / stats.totalExpense) * 100;
      
      result.push({
        type: 'info',
        icon: BarChart3,
        title: 'Pengeluaran Terbesar',
        message: `Kategori "${topCategory[0]}" menyumbang ${topPercentage.toFixed(0)}% (${formatCurrency(topCategory[1])}) dari total pengeluaran.`,
      });
    }

    // 3. Month-over-Month Comparison
    if (period !== 'all' && stats.prevPeriodIncome > 0) {
      const incomeChange = ((stats.totalIncome - stats.prevPeriodIncome) / stats.prevPeriodIncome) * 100;
      if (incomeChange > 10) {
        result.push({
          type: 'success',
          icon: TrendingUp,
          title: 'Pendapatan Meningkat',
          message: `Pendapatan naik ${incomeChange.toFixed(1)}% dibanding periode sebelumnya. Trend positif!`,
        });
      } else if (incomeChange < -10) {
        result.push({
          type: 'warning',
          icon: TrendingDown,
          title: 'Pendapatan Menurun',
          message: `Pendapatan turun ${Math.abs(incomeChange).toFixed(1)}% dibanding periode sebelumnya. Evaluasi sumber pendapatan.`,
        });
      }
    }

    // 4. Weekend vs Weekday Analysis
    let weekendExpense = 0;
    let weekdayExpense = 0;
    let weekendCount = 0;
    let weekdayCount = 0;

    transactions
      .filter(t => t.type === 'expense' && t.date)
      .forEach(t => {
        const date = parseISO(t.date);
        if (isWeekend(date)) {
          weekendExpense += t.amount;
          weekendCount++;
        } else {
          weekdayExpense += t.amount;
          weekdayCount++;
        }
      });

    if (weekdayCount > 0 && weekendCount > 0) {
      const avgWeekend = weekendExpense / weekendCount;
      const avgWeekday = weekdayExpense / weekdayCount;
      
      if (avgWeekend > avgWeekday * 1.5) {
        result.push({
          type: 'tip',
          icon: Calendar,
          title: 'Pola Pengeluaran Weekend',
          message: `Rata-rata pengeluaran weekend ${formatCurrency(avgWeekend)} lebih tinggi dari weekday ${formatCurrency(avgWeekday)}. Pertimbangkan budget khusus weekend.`,
        });
      }
    }

    // 5. Income Projection
    if (stats.totalIncome > 0 && period === 'month') {
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const currentDay = new Date().getDate();
      const projectedIncome = (stats.totalIncome / currentDay) * daysInMonth;
      
      result.push({
        type: 'info',
        icon: Target,
        title: 'Proyeksi Akhir Bulan',
        message: `Berdasarkan tren saat ini, projected net income: ${formatCurrency(projectedIncome - (stats.totalExpense / currentDay) * daysInMonth)}`,
      });
    }

    // 6. Transaction Frequency
    if (transactions.length > 0) {
      const incomeCount = transactions.filter(t => t.type === 'income').length;
      const expenseCount = transactions.filter(t => t.type === 'expense').length;
      
      if (expenseCount > incomeCount * 10) {
        result.push({
          type: 'tip',
          icon: Lightbulb,
          title: 'Banyak Transaksi Kecil',
          message: `Ada ${expenseCount} pengeluaran vs ${incomeCount} pemasukan. Konsolidasi pembelian untuk tracking lebih mudah.`,
        });
      }
    }

    return result;
  }, [stats, transactions, period]);

  if (insights.length === 0) {
    return null;
  }

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400';
      case 'tip':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400';
    }
  };

  const getBadgeVariant = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'warning':
        return 'bg-amber-500 text-white';
      case 'tip':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-purple-500 text-white';
    }
  };

  return (
    <Card className="border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Financial Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border-2 transition-all hover:shadow-md",
                getInsightStyles(insight.type)
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-full shrink-0",
                  insight.type === 'success' && "bg-green-500/20",
                  insight.type === 'warning' && "bg-amber-500/20",
                  insight.type === 'tip' && "bg-blue-500/20",
                  insight.type === 'info' && "bg-purple-500/20"
                )}>
                  <insight.icon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{insight.title}</span>
                    <Badge className={cn("text-xs", getBadgeVariant(insight.type))}>
                      {insight.type === 'success' ? '✓' : insight.type === 'warning' ? '!' : insight.type === 'tip' ? '💡' : 'ℹ'}
                    </Badge>
                  </div>
                  <p className="text-sm opacity-90">{insight.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
