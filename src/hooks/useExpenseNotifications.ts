import { useEffect, useRef } from 'react';
import { useNotificationContext } from '@/contexts/NotificationContext';

interface FixedExpense {
  id: string;
  expense_name: string;
  due_date_day: number;
  fixed_amount: number | null;
  estimated_amount: number | null;
  is_active: boolean | null;
  reminder_days_before: number | null;
}

interface ExpenseHistory {
  fixed_expense_id: string;
  paid_date: string;
}

export const useExpenseNotifications = (
  expenses: FixedExpense[],
  history: ExpenseHistory[]
) => {
  const { addNotification } = useNotificationContext();
  const lastCheckRef = useRef<string>('');

  useEffect(() => {
    if (!expenses || expenses.length === 0) return;

    const checkDueDates = () => {
      const today = new Date();
      const todayDay = today.getDate();
      const todayKey = today.toISOString().split('T')[0];

      // Only check once per day
      if (lastCheckRef.current === todayKey) return;
      lastCheckRef.current = todayKey;

      expenses.forEach((expense) => {
        if (!expense.is_active) return;

        // Check if already paid this month
        const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
        const isPaidThisMonth = history.some(h => 
          h.fixed_expense_id === expense.id &&
          h.paid_date.startsWith(currentMonth)
        );

        if (isPaidThisMonth) return;

        const amount = expense.fixed_amount || expense.estimated_amount || 0;
        const daysUntilDue = expense.due_date_day - todayDay;
        const reminderDays = expense.reminder_days_before || 3;

        // Due today
        if (expense.due_date_day === todayDay) {
          addNotification({
            type: 'due-today',
            title: '本日支払期限',
            message: `${expense.expense_name} jatuh tempo hari ini`,
            expenseName: expense.expense_name,
            amount,
          });
        }
        // Overdue
        else if (daysUntilDue < 0) {
          addNotification({
            type: 'overdue',
            title: '支払遅延',
            message: `${expense.expense_name} sudah terlambat ${Math.abs(daysUntilDue)} hari`,
            expenseName: expense.expense_name,
            amount,
          });
        }
        // Due soon (reminder)
        else if (daysUntilDue > 0 && daysUntilDue <= reminderDays) {
          addNotification({
            type: 'due-soon',
            title: '支払期限接近',
            message: `${expense.expense_name} akan jatuh tempo dalam ${daysUntilDue} hari`,
            expenseName: expense.expense_name,
            amount,
          });
        }
      });
    };

    // Check immediately
    checkDueDates();

    // Check daily at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      checkDueDates();
      // Then check every 24 hours
      const intervalId = setInterval(checkDueDates, 24 * 60 * 60 * 1000);
      return () => clearInterval(intervalId);
    }, msUntilMidnight);

    return () => clearTimeout(timeoutId);
  }, [expenses, history, addNotification]);
};
