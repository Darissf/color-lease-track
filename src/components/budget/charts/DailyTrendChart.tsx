import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatRupiah } from "@/lib/currency";
import { TrendingUp, Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface DailyTrendChartProps {
  expenses: any[];
  targetBudget: number;
  selectedMonth: number;
  selectedYear: number;
  currentDay: number;
  daysInMonth: number;
}

export const DailyTrendChart = ({
  expenses,
  targetBudget,
  selectedMonth,
  selectedYear,
  currentDay,
  daysInMonth
}: DailyTrendChartProps) => {
  // Hitung pengeluaran per hari
  const dailyExpenses = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getDate() === day;
    });
    
    const totalSpent = dayExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    return {
      day,
      spent: totalSpent,
      cumulative: 0, // akan dihitung di loop berikutnya
      target: (targetBudget / daysInMonth) * day,
      dailyTarget: targetBudget / daysInMonth,
    };
  });

  // Hitung kumulatif
  let cumulativeTotal = 0;
  dailyExpenses.forEach(day => {
    cumulativeTotal += day.spent;
    day.cumulative = cumulativeTotal;
  });

  // Hitung proyeksi untuk hari-hari yang belum terjadi
  const avgDailySpending = currentDay > 0 ? cumulativeTotal / currentDay : 0;
  const projectedData = dailyExpenses.map((day, index) => {
    if (day.day <= currentDay) {
      return day;
    } else {
      // Proyeksi berdasarkan rata-rata harian saat ini
      return {
        ...day,
        projected: avgDailySpending * day.day,
        isProjected: true
      };
    }
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-1">
          <p className="font-medium text-sm">Hari {label}</p>
          {data.spent !== undefined && (
            <p className="text-xs text-muted-foreground">
              Pengeluaran: <span className="font-medium text-foreground">{formatRupiah(data.spent)}</span>
            </p>
          )}
          {data.cumulative !== undefined && (
            <p className="text-xs text-blue-600">
              Kumulatif: <span className="font-medium">{formatRupiah(data.cumulative)}</span>
            </p>
          )}
          {data.target !== undefined && (
            <p className="text-xs text-orange-600">
              Target: <span className="font-medium">{formatRupiah(data.target)}</span>
            </p>
          )}
          {data.projected !== undefined && (
            <p className="text-xs text-purple-600">
              Proyeksi: <span className="font-medium">{formatRupiah(data.projected)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Tren Pengeluaran Harian
          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2">
                <p className="text-xs font-medium">Penjelasan Grafik:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li><span className="text-blue-600 font-medium">Kumulatif:</span> Total pengeluaran hingga hari tersebut</li>
                  <li><span className="text-orange-600 font-medium">Target:</span> Pengeluaran ideal kumulatif berdasarkan budget</li>
                  <li><span className="text-purple-600 font-medium">Proyeksi:</span> Estimasi pengeluaran di hari mendatang berdasarkan pola saat ini</li>
                </ul>
              </div>
            </HoverCardContent>
          </HoverCard>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projectedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="day" 
              className="text-xs"
              label={{ value: 'Hari', position: 'insideBottom', offset: -5, className: 'text-xs' }}
            />
            <YAxis 
              className="text-xs"
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              label={{ value: 'Rupiah (ribuan)', angle: -90, position: 'insideLeft', className: 'text-xs' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            
            {/* Garis referensi untuk hari ini */}
            <ReferenceLine 
              x={currentDay} 
              stroke="hsl(var(--primary))" 
              strokeDasharray="3 3" 
              label={{ value: 'Hari Ini', position: 'top', fontSize: 10 }}
            />
            
            {/* Target kumulatif */}
            <Line 
              type="monotone" 
              dataKey="target" 
              stroke="#f97316" 
              strokeWidth={2}
              dot={false}
              name="Target Kumulatif"
              strokeDasharray="5 5"
            />
            
            {/* Pengeluaran kumulatif aktual */}
            <Line 
              type="monotone" 
              dataKey="cumulative" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 2 }}
              name="Kumulatif Aktual"
            />
            
            {/* Proyeksi */}
            <Line 
              type="monotone" 
              dataKey="projected" 
              stroke="#a855f7" 
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              name="Proyeksi"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Statistik ringkas */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Rata-rata/Hari</p>
            <p className="text-sm font-medium text-blue-600">{formatRupiah(avgDailySpending)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Target/Hari</p>
            <p className="text-sm font-medium text-orange-600">{formatRupiah(targetBudget / daysInMonth)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Selisih/Hari</p>
            <p className={`text-sm font-medium ${avgDailySpending > (targetBudget / daysInMonth) ? 'text-destructive' : 'text-green-600'}`}>
              {avgDailySpending > (targetBudget / daysInMonth) ? '+' : ''}{formatRupiah(avgDailySpending - (targetBudget / daysInMonth))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
