import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FixedExpense, FixedExpenseHistory } from "@/pages/FixedExpenses";
import { formatCurrency } from "@/lib/currency";
import { TrendingUp, TrendingDown, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";

interface FixedExpenseSummaryProps {
  expenses: FixedExpense[];
  history: FixedExpenseHistory[];
}

export const FixedExpenseSummary = ({ expenses, history }: FixedExpenseSummaryProps) => {
  const totalFixed = expenses
    .filter(e => e.expense_type === 'fixed' && e.is_active)
    .reduce((sum, e) => sum + (e.fixed_amount || 0), 0);

  const totalVariable = expenses
    .filter(e => e.expense_type === 'variable' && e.is_active)
    .reduce((sum, e) => sum + (e.estimated_amount || 0), 0);

  const totalMonthly = totalFixed + totalVariable;

  const paidThisMonth = history
    .filter(h => h.status === 'paid')
    .reduce((sum, h) => sum + h.paid_amount, 0);

  const unpaidCount = expenses.filter(e => {
    const today = new Date().getDate();
    const isPaid = history.some(h => 
      h.fixed_expense_id === e.id && 
      h.status === 'paid'
    );
    return e.is_active && !isPaid && e.due_date_day <= today;
  }).length;

  const upcomingCount = expenses.filter(e => {
    const today = new Date().getDate();
    const isPaid = history.some(h => 
      h.fixed_expense_id === e.id && 
      h.status === 'paid'
    );
    return e.is_active && !isPaid && e.due_date_day > today && e.due_date_day <= today + 7;
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="japanese-card gradient-torii-gold text-white animate-card-appear border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Total Bulanan</CardTitle>
          <DollarSign className="h-8 w-8 animate-icon-bounce" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{formatCurrency(totalMonthly)}</div>
          <p className="text-xs opacity-90 mt-1">Tetap + Variabel</p>
        </CardContent>
      </Card>

      <Card className="japanese-card gradient-indigo text-white animate-card-appear border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Pengeluaran Tetap</CardTitle>
          <TrendingUp className="h-8 w-8 animate-trending-up" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{formatCurrency(totalFixed)}</div>
          <p className="text-xs opacity-90 mt-1">{expenses.filter(e => e.expense_type === 'fixed' && e.is_active).length} tagihan</p>
        </CardContent>
      </Card>

      <Card className="japanese-card gradient-sakura text-white animate-card-appear border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Pengeluaran Variabel</CardTitle>
          <TrendingDown className="h-8 w-8 animate-trending-down" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{formatCurrency(totalVariable)}</div>
          <p className="text-xs opacity-90 mt-1">{expenses.filter(e => e.expense_type === 'variable' && e.is_active).length} tagihan</p>
        </CardContent>
      </Card>

      <Card className="japanese-card gradient-matcha text-white animate-card-appear border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Sudah Dibayar</CardTitle>
          <CheckCircle2 className="h-8 w-8 animate-check-spin" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{formatCurrency(paidThisMonth)}</div>
          <p className="text-xs opacity-90 mt-1">{history.filter(h => h.status === 'paid').length} pembayaran</p>
        </CardContent>
      </Card>

      <Card className="japanese-card gradient-sunrise text-white animate-card-appear border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
          <AlertCircle className="h-8 w-8 animate-alert-blink" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{unpaidCount}</div>
          <p className="text-xs opacity-90 mt-1">{upcomingCount} segera jatuh tempo</p>
        </CardContent>
      </Card>
    </div>
  );
};
