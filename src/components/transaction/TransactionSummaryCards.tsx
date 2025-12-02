import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3, ArrowUp, ArrowDown } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { TransactionStats } from "@/pages/TransactionHistory";

interface TransactionSummaryCardsProps {
  stats: TransactionStats;
  loading: boolean;
  period: string;
}

export function TransactionSummaryCards({ stats, loading, period }: TransactionSummaryCardsProps) {
  const incomeChange = stats.prevPeriodIncome > 0 
    ? ((stats.totalIncome - stats.prevPeriodIncome) / stats.prevPeriodIncome) * 100 
    : 0;
  const expenseChange = stats.prevPeriodExpense > 0 
    ? ((stats.totalExpense - stats.prevPeriodExpense) / stats.prevPeriodExpense) * 100 
    : 0;

  const cards = [
    {
      title: "Total Transaksi",
      value: stats.transactionCount,
      icon: BarChart3,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      format: (v: number) => `${v} transaksi`,
      change: null,
    },
    {
      title: "Total Pemasukan",
      value: stats.totalIncome,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      format: formatCurrency,
      change: period !== 'all' ? incomeChange : null,
    },
    {
      title: "Total Pengeluaran",
      value: stats.totalExpense,
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      format: formatCurrency,
      change: period !== 'all' ? expenseChange : null,
    },
    {
      title: "Saldo Bersih",
      value: stats.netBalance,
      icon: Wallet,
      color: stats.netBalance >= 0 ? "text-emerald-500" : "text-rose-500",
      bgColor: stats.netBalance >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10",
      borderColor: stats.netBalance >= 0 ? "border-emerald-500/30" : "border-rose-500/30",
      format: formatCurrency,
      change: null,
    },
    {
      title: "Savings Rate",
      value: stats.savingsRate,
      icon: PiggyBank,
      color: stats.savingsRate >= 20 ? "text-purple-500" : "text-amber-500",
      bgColor: stats.savingsRate >= 20 ? "bg-purple-500/10" : "bg-amber-500/10",
      borderColor: stats.savingsRate >= 20 ? "border-purple-500/30" : "border-amber-500/30",
      format: (v: number) => `${v.toFixed(1)}%`,
      change: null,
      subtitle: stats.savingsRate >= 50 ? "Excellent!" : stats.savingsRate >= 20 ? "Good" : "Perlu Ditingkatkan",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="border-2">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-28 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card, index) => (
        <Card 
          key={index} 
          className={cn(
            "border-2 transition-all duration-300 hover:shadow-lg",
            card.borderColor,
            card.bgColor
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
              <card.icon className={cn("h-4 w-4", card.color)} />
            </div>
            <div className={cn("text-lg md:text-xl font-bold", card.color)}>
              {card.format(card.value)}
            </div>
            {card.change !== null && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium mt-1",
                card.change >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {card.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(card.change).toFixed(1)}% vs periode lalu
              </div>
            )}
            {card.subtitle && (
              <div className="text-xs text-muted-foreground mt-1">{card.subtitle}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
