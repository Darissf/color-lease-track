import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatRupiah } from "@/lib/currency";
import { getJakartaDay, toJakartaTime } from "@/lib/timezone";

interface BudgetForecastChartProps {
  expenses: any[];
  targetBudget: number;
  daysInMonth: number;
}

export const BudgetForecastChart = ({ expenses, targetBudget, daysInMonth }: BudgetForecastChartProps) => {
  const generateForecastData = () => {
    const dailyExpenses: Record<number, number> = {};
    
    expenses.forEach(expense => {
      const day = toJakartaTime(expense.date).getDate();
      dailyExpenses[day] = (dailyExpenses[day] || 0) + Number(expense.amount);
    });

    const data = [];
    let cumulative = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      cumulative += dailyExpenses[day] || 0;
      
      const idealSpending = (targetBudget / daysInMonth) * day;
      
      // Simple linear projection
      const avgDailySpending = cumulative / day;
      const projected = avgDailySpending * daysInMonth;
      
      const currentDay = getJakartaDay();
      data.push({
        day,
        actual: day <= currentDay ? cumulative : null,
        ideal: idealSpending,
        forecast: day > currentDay ? (cumulative + avgDailySpending * (day - currentDay)) : null,
      });
    }

    return data;
  };

  const data = generateForecastData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proyeksi Budget</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" label={{ value: 'Hari', position: 'insideBottom', offset: -5 }} />
            <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`} />
            <Tooltip formatter={(value: number) => formatRupiah(value)} />
            <Legend />
            <ReferenceLine y={targetBudget} stroke="red" strokeDasharray="3 3" label="Target" />
            <Line type="monotone" dataKey="actual" stroke="#10b981" name="Aktual" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ideal" stroke="#3b82f6" name="Ideal" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="forecast" stroke="#f59e0b" name="Proyeksi" strokeWidth={2} strokeDasharray="3 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
