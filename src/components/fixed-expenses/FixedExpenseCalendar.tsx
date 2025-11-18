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

export const FixedExpenseCalendar = ({
  expenses,
  history,
  onMarkAsPaid,
}: FixedExpenseCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const isPaid = (expenseId: string, day: number) => {
    return history.some(h => {
      const paidDate = new Date(h.paid_date);
      return (
        h.fixed_expense_id === expenseId &&
        h.status === 'paid' &&
        paidDate.getDate() === day &&
        paidDate.getMonth() === currentDate.getMonth() &&
        paidDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const getExpensesForDay = (day: number) => {
    return expenses.filter(e => e.due_date_day === day && e.is_active);
  };

  const getDayStatus = (day: number) => {
    const dayExpenses = getExpensesForDay(day);
    if (dayExpenses.length === 0) return null;

    const allPaid = dayExpenses.every(e => isPaid(e.id, day));
    const today = new Date().getDate();
    const isToday = day === today && 
      currentDate.getMonth() === new Date().getMonth() &&
      currentDate.getFullYear() === new Date().getFullYear();

    if (allPaid) return 'paid';
    if (day < today && !allPaid) return 'overdue';
    if (isToday) return 'due-today';
    if (day <= today + 7) return 'due-soon';
    return 'upcoming';
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
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
        <div
          key={i}
          className={cn(
            "min-h-[100px] border border-border p-2 transition-colors",
            !isValidDay && "bg-muted/50",
            status === 'paid' && "bg-green-50 dark:bg-green-950/20",
            status === 'overdue' && "bg-red-50 dark:bg-red-950/20",
            status === 'due-today' && "bg-orange-50 dark:bg-orange-950/20",
            status === 'due-soon' && "bg-yellow-50 dark:bg-yellow-950/20"
          )}
        >
          {isValidDay && (
            <>
              <div className="font-semibold text-sm mb-2">{day}</div>
              <div className="space-y-1">
                {dayExpenses.map((expense) => {
                  const paid = isPaid(expense.id, day);
                  const amount = expense.expense_type === 'fixed'
                    ? expense.fixed_amount || 0
                    : expense.estimated_amount || 0;

                  return (
                    <div
                      key={expense.id}
                      className="text-xs p-1 rounded bg-background/80 border border-border"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium truncate">{expense.expense_name}</span>
                        {paid && <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />}
                      </div>
                      <div className="text-muted-foreground">{formatCurrency(amount)}</div>
                      {!paid && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full mt-1 h-6 text-xs"
                          onClick={() => onMarkAsPaid(expense, amount)}
                        >
                          Bayar
                        </Button>
                      )}
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
          <CardTitle>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mt-4">
          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20">
            Sudah Dibayar
          </Badge>
          <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20">
            Terlambat
          </Badge>
          <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/20">
            Jatuh Tempo Hari Ini
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20">
            Segera Jatuh Tempo
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-0">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
            <div key={day} className="font-semibold text-center p-2 border border-border bg-muted">
              {day}
            </div>
          ))}
          {renderCalendarDays()}
        </div>
      </CardContent>
    </Card>
  );
};
