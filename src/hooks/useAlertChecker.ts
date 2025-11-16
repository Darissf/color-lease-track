import { useEffect, useState } from 'react';
import { Alert, CategoryProgress } from '@/types/budgetTypes';
import { calculateDailyPace } from '@/utils/budgetCalculations';

interface MonthlyBudget {
  id: string;
  target_belanja: number;
}

export const useAlertChecker = (
  currentBudget: MonthlyBudget | null,
  expenses: any[],
  categoryProgress: CategoryProgress[]
) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!currentBudget) {
      setAlerts([]);
      return;
    }

    const newAlerts: Alert[] = [];

    // Overall budget alerts
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const percentage = (totalSpent / currentBudget.target_belanja) * 100;

    if (percentage >= 100) {
      newAlerts.push({
        id: 'overall-over',
        message: `Budget terlampaui! Anda sudah menggunakan ${percentage.toFixed(0)}%`,
        severity: 'danger',
        type: 'over_budget'
      });
    } else if (percentage >= 90) {
      newAlerts.push({
        id: 'overall-warning',
        message: `Peringatan budget! Anda sudah menggunakan ${percentage.toFixed(0)}% dari budget`,
        severity: 'warning',
        type: 'threshold'
      });
    } else if (percentage >= 75) {
      newAlerts.push({
        id: 'overall-info',
        message: `Anda sudah menggunakan ${percentage.toFixed(0)}% dari budget`,
        severity: 'info',
        type: 'threshold'
      });
    }

    // Category alerts
    categoryProgress.forEach(cat => {
      if (cat.status === 'over') {
        newAlerts.push({
          id: `cat-${cat.category}-over`,
          message: `Budget ${cat.category} terlampaui!`,
          severity: 'danger',
          type: 'category_limit',
          category: cat.category
        });
      } else if (cat.status === 'danger') {
        newAlerts.push({
          id: `cat-${cat.category}-warning`,
          message: `${cat.category} hampir habis (${cat.percentage.toFixed(0)}%)`,
          severity: 'warning',
          type: 'category_limit',
          category: cat.category
        });
      }
    });

    // Daily pace alert
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const pace = calculateDailyPace(
      expenses,
      currentBudget.target_belanja,
      currentDay,
      daysInMonth
    );

    if (pace.isOverPace && pace.projectedTotal > currentBudget.target_belanja) {
      const overAmount = pace.projectedTotal - currentBudget.target_belanja;
      newAlerts.push({
        id: 'daily-pace',
        message: `Dengan pola pengeluaran saat ini, Anda akan melebihi budget sebesar Rp ${overAmount.toLocaleString()}`,
        severity: 'warning',
        type: 'daily_pace'
      });
    }

    // Smart recommendations
    const remaining = currentBudget.target_belanja - totalSpent;
    if (remaining > currentBudget.target_belanja * 0.1 && percentage > 0) {
      newAlerts.push({
        id: 'savings-opportunity',
        message: `Anda punya sisa budget Rp ${remaining.toLocaleString()}. Pertimbangkan untuk menabung?`,
        severity: 'info',
        type: 'smart_recommendation'
      });
    }

    setAlerts(newAlerts);
  }, [currentBudget, expenses, categoryProgress]);

  return alerts;
};
