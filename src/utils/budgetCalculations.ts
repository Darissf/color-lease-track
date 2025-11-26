import { CategoryBudget, CategoryProgress } from "@/types/budgetTypes";
import { getNowInJakarta, getJakartaDay, getJakartaMonth, getJakartaYear } from "@/lib/timezone";

export const getCurrentDayForMonth = (selectedYear: number, selectedMonth: number): number => {
  const now = getNowInJakarta();
  const currentYear = getJakartaYear();
  const currentMonth = getJakartaMonth();
  
  // Jika melihat bulan yang sama dengan bulan sekarang
  if (selectedYear === currentYear && selectedMonth === currentMonth) {
    return getJakartaDay(); // Tanggal hari ini
  }
  
  // Jika melihat bulan lalu
  if (
    selectedYear < currentYear || 
    (selectedYear === currentYear && selectedMonth < currentMonth)
  ) {
    // Gunakan total hari di bulan itu (bulan sudah lewat)
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }
  
  // Jika melihat bulan depan (belum terjadi)
  return 0;
};

export const calculateCategoryProgress = (
  budgets: CategoryBudget[],
  expenses: any[]
): CategoryProgress[] => {
  return budgets.map(budget => {
    const spent = expenses
      .filter(e => e.category === budget.category)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    
    const percentage = budget.allocated_amount > 0 
      ? (spent / budget.allocated_amount) * 100 
      : 0;
    const remaining = budget.allocated_amount - spent;
    
    let status: 'safe' | 'warning' | 'danger' | 'over' = 'safe';
    if (percentage >= 100) status = 'over';
    else if (percentage >= 90) status = 'danger';
    else if (percentage >= 70) status = 'warning';
    
    return {
      category: budget.category,
      allocated: budget.allocated_amount,
      spent,
      remaining,
      percentage,
      status
    };
  });
};

export const calculateDailyPace = (
  expenses: any[],
  targetBudget: number,
  currentDay: number,
  daysInMonth: number
): {
  expectedSpending: number;
  actualSpending: number;
  isOverPace: boolean;
  projectedTotal: number;
} => {
  const actualSpending = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const expectedSpending = (targetBudget / daysInMonth) * currentDay;
  const isOverPace = actualSpending > expectedSpending * 1.1; // 10% tolerance
  const projectedTotal = (actualSpending / currentDay) * daysInMonth;
  
  return {
    expectedSpending,
    actualSpending,
    isOverPace,
    projectedTotal
  };
};

export const calculateBudgetScore = (
  totalSpent: number,
  targetBudget: number,
  categoryProgress: CategoryProgress[]
): number => {
  let score = 100;
  
  // Deduct for over-budget (-30 points max)
  const overBudgetPercentage = Math.max(0, (totalSpent / targetBudget - 1) * 100);
  score -= Math.min(30, overBudgetPercentage);
  
  // Deduct for category over-budget (-20 points max)
  const categoriesOver = categoryProgress.filter(c => c.status === 'over').length;
  score -= categoriesOver * 5;
  
  // Bonus for staying under budget
  if (totalSpent < targetBudget) {
    const underPercentage = ((targetBudget - totalSpent) / targetBudget) * 100;
    score += Math.min(20, underPercentage / 2);
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
};
