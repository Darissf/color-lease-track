import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FixedExpense, FixedExpenseHistory } from "@/pages/FixedExpenses";
import { formatCurrency } from "@/lib/currency";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FixedExpenseCalendarProps {
  expenses: FixedExpense[];
  history: FixedExpenseHistory[];
  onMarkAsPaid: (expense: FixedExpense, amount: number) => void;
}

export const FixedExpenseCalendar = ({ expenses, history, onMarkAsPaid }: FixedExpenseCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const isPaid = (expenseId: string, day: number) => {
    return history.some(h => {
      const paidDate = new Date(h.paid_date);
      return h.fixed_expense_id === expenseId && h.status === 'paid' && paidDate.getDate() === day && paidDate.getMonth() === currentDate.getMonth() && paidDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const getExpensesForDay = (day: number) => expenses.filter(e => e.due_date_day === day && e.is_active);

  const getDayStatus = (day: number) => {
    const dayExpenses = getExpensesForDay(day);
    if (dayExpenses.length === 0) return null;

    const allPaid = dayExpenses.every(e => isPaid(e.id, day));
    const today = new Date().getDate();
    const isToday = day === today && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

    if (allPaid) return 'paid';
    if (day < today && !allPaid) return 'overdue';
    if (isToday) return 'due-today';
    if (day <= today + 7) return 'due-soon';
    return 'upcoming';
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const day = i - firstDayOfMonth + 1;
      const isValidDay = day > 0 && day <= daysInMonth;
      const dayExpenses = isValidDay ? getExpensesForDay(day) : [];
      const status = isValidDay ? getDayStatus(day) : null;

      days.push(
        <div key={i} className={cn("min-h-[100px] border border-border p-2 transition-colors", !isValidDay && "bg-muted/50", status === 'paid' && "bg-green-50 dark:bg-green-950/20", status === 'overdue' && "bg-red-50 dark:bg-red-950/20 animate-urgent-shake", status === 'due-today' && "bg-orange-50 dark:bg-orange-950/20 animate-today-glow", status === 'due-soon' && "bg-yellow-50 dark:bg-yellow-950/20")}>
          {isValidDay && (
            <>
              <div className="font-semibold text-sm mb-2">{day}</div>
              <div className="space-y-1">
                {dayExpenses.map((expense) => {
                  const paid = isPaid(expense.id, day);
                  const amount = expense.expense_type === 'fixed' ? expense.fixed_amount || 0 : expense.estimated_amount || 0;

                  return (
                    <div key={expense.id} className="text-xs p-1 rounded bg-background/80 border border-border animate-pill-slide-in">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate flex-1">{expense.expense_name}</span>
                        {paid ? (
                          <CheckCircle className="h-3 w-3 text-green-500 animate-check-spin" />
                        ) : (
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => onMarkAsPaid(expense, amount)}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="font-semibold text-gradient-gold">{formatCurrency(amount)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4 animate-chevron-slide-left" />
          </Button>
          <CardTitle className="japanese-title">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</CardTitle>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4 animate-chevron-slide-right" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm p-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{renderCalendarDays()}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="default" className="gradient-matcha">Sudah Dibayar</Badge>
          <Badge variant="destructive">Terlambat</Badge>
          <Badge variant="secondary" className="gradient-sunrise">Jatuh Tempo Hari Ini</Badge>
          <Badge variant="outline" className="gradient-torii-gold">Segera Jatuh Tempo</Badge>
        </div>
      </CardContent>
    </Card>
  );
};
