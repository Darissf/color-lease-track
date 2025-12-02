import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import type { Transaction } from "@/pages/TransactionHistory";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, startOfYear, endOfYear } from "date-fns";
import { id } from "date-fns/locale";

interface TransactionChartsProps {
  transactions: Transaction[];
  loading: boolean;
  period: string;
  selectedYear: number;
  selectedMonth: number;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c43',
  '#a4de6c',
];

export function TransactionCharts({ 
  transactions, 
  loading,
  period,
  selectedYear,
  selectedMonth
}: TransactionChartsProps) {
  const [activeTab, setActiveTab] = useState("cashflow");

  // Cash Flow Data by Month
  const cashFlowData = useMemo(() => {
    if (period === 'month') {
      // Daily data for month view
      const start = new Date(selectedYear, selectedMonth - 1, 1);
      const end = endOfMonth(start);
      const days = eachDayOfInterval({ start, end });
      
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayIncome = transactions
          .filter(t => t.type === 'income' && t.date === dayStr)
          .reduce((sum, t) => sum + t.amount, 0);
        const dayExpense = transactions
          .filter(t => t.type === 'expense' && t.date === dayStr)
          .reduce((sum, t) => sum + t.amount, 0);
        
        return {
          name: format(day, 'd'),
          income: dayIncome,
          expense: dayExpense,
          net: dayIncome - dayExpense,
        };
      });
    } else {
      // Monthly data for year/all view
      const start = new Date(selectedYear, 0, 1);
      const end = new Date(selectedYear, 11, 31);
      const months = eachMonthOfInterval({ start, end });
      
      return months.map(month => {
        const monthStart = format(month, 'yyyy-MM');
        const monthIncome = transactions
          .filter(t => t.type === 'income' && t.date?.startsWith(monthStart))
          .reduce((sum, t) => sum + t.amount, 0);
        const monthExpense = transactions
          .filter(t => t.type === 'expense' && t.date?.startsWith(monthStart))
          .reduce((sum, t) => sum + t.amount, 0);
        
        return {
          name: format(month, 'MMM', { locale: id }),
          income: monthIncome,
          expense: monthExpense,
          net: monthIncome - monthExpense,
        };
      });
    }
  }, [transactions, period, selectedYear, selectedMonth]);

  // Category Data for Pie Charts
  const incomeCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    transactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        const cat = t.source || 'Lainnya';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.amount);
      });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions]);

  const expenseCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
      });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions]);

  // Daily Trend Line
  const dailyTrendData = useMemo(() => {
    const trendMap = new Map<string, { income: number; expense: number }>();
    
    transactions.forEach(t => {
      if (!t.date) return;
      const existing = trendMap.get(t.date) || { income: 0, expense: 0 };
      if (t.type === 'income') {
        existing.income += t.amount;
      } else {
        existing.expense += t.amount;
      }
      trendMap.set(t.date, existing);
    });
    
    return Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date: format(parseISO(date), 'd MMM', { locale: id }),
        ...data,
        total: data.income + data.expense,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="border bg-card">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Visualisasi Data</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="income-cat">Kategori Income</TabsTrigger>
            <TabsTrigger value="expense-cat">Kategori Expense</TabsTrigger>
            <TabsTrigger value="trend">Tren Harian</TabsTrigger>
          </TabsList>

          <TabsContent value="cashflow" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`}
                  className="text-xs"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Pemasukan"
                  stackId="1"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Pengeluaran"
                  stackId="2"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="income-cat" className="h-[300px]">
            {incomeCategoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Tidak ada data pemasukan
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="expense-cat" className="h-[300px]">
            {expenseCategoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Tidak ada data pengeluaran
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </TabsContent>

          <TabsContent value="trend" className="h-[300px]">
            {dailyTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Tidak ada data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`}
                    className="text-xs"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Pemasukan"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Pengeluaran"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
