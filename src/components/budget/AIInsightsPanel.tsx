import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BudgetInsight } from "@/types/budgetTypes";
import { CategoryProgress } from "@/types/budgetTypes";

interface AIInsightsPanelProps {
  totalSpent: number;
  targetBudget: number;
  categoryProgress: CategoryProgress[];
  expenses: any[];
}

export const AIInsightsPanel = ({
  totalSpent,
  targetBudget,
  categoryProgress,
  expenses
}: AIInsightsPanelProps) => {
  const insights = useMemo(() => {
    const generatedInsights: BudgetInsight[] = [];
    const percentage = (totalSpent / targetBudget) * 100;

    // Budget status insight
    if (percentage < 70) {
      generatedInsights.push({
        id: 'on-track',
        type: 'congratulation',
        icon: '🎉',
        title: 'Mantap!',
        message: `Anda baru menggunakan ${percentage.toFixed(0)}% dari budget. Tetap pertahankan!`,
        priority: 3
      });
    } else if (percentage >= 90) {
      generatedInsights.push({
        id: 'budget-warning',
        type: 'warning',
        icon: '⚠️',
        title: 'Perhatian Budget',
        message: `Sudah ${percentage.toFixed(0)}% dari budget terpakai. Hati-hati dengan pengeluaran.`,
        priority: 1
      });
    }

    // Category anomalies
    const overCategories = categoryProgress.filter(c => c.status === 'over');
    if (overCategories.length > 0) {
      generatedInsights.push({
        id: 'categories-over',
        type: 'warning',
        icon: '🚨',
        title: 'Kategori Over Budget',
        message: `${overCategories.length} kategori melebihi budget: ${overCategories.map(c => c.category).join(', ')}`,
        priority: 1
      });
    }

    // Savings opportunity
    const remaining = targetBudget - totalSpent;
    if (remaining > targetBudget * 0.15 && percentage > 20) {
      generatedInsights.push({
        id: 'savings-opp',
        type: 'tip',
        icon: '💰',
        title: 'Kesempatan Menabung',
        message: `Anda punya sisa Rp ${remaining.toLocaleString()}. Pertimbangkan untuk menabung!`,
        priority: 2
      });
    }

    // Weekend spending pattern
    const weekendExpenses = expenses.filter(e => {
      const day = new Date(e.date).getDay();
      return day === 0 || day === 6;
    });
    const weekdayExpenses = expenses.filter(e => {
      const day = new Date(e.date).getDay();
      return day >= 1 && day <= 5;
    });

    if (weekendExpenses.length > 0 && weekdayExpenses.length > 0) {
      const weekendAvg = weekendExpenses.reduce((sum, e) => sum + Number(e.amount), 0) / weekendExpenses.length;
      const weekdayAvg = weekdayExpenses.reduce((sum, e) => sum + Number(e.amount), 0) / weekdayExpenses.length;
      
      if (weekendAvg > weekdayAvg * 1.5) {
        generatedInsights.push({
          id: 'weekend-pattern',
          type: 'trend',
          icon: '📅',
          title: 'Pola Pengeluaran Weekend',
          message: `Pengeluaran weekend ${((weekendAvg / weekdayAvg - 1) * 100).toFixed(0)}% lebih tinggi dari weekday`,
          priority: 3
        });
      }
    }

    return generatedInsights.sort((a, b) => a.priority - b.priority);
  }, [totalSpent, targetBudget, categoryProgress, expenses]);

  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map(insight => (
          <Alert key={insight.id} variant={insight.type === 'warning' ? 'destructive' : 'default'}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{insight.icon}</span>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{insight.title}</h4>
                <AlertDescription>{insight.message}</AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
};
