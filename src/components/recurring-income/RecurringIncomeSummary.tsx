import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { DollarSign, CheckCircle2, Clock, TrendingUp, Bell } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface RecurringIncome {
  id: string;
  invoice: string;
  nominal: number;
  is_paid: boolean;
  paid_date: string | null;
  period_start_month: string;
  period_end_month: string;
  rental_date_start: string;
  rental_date_end: string;
  keterangan: string | null;
  catatan: string | null;
  client_group_id: string | null;
  bank_account_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface RecurringIncomeSummaryProps {
  incomes: RecurringIncome[];
}

export const RecurringIncomeSummary = ({ incomes }: RecurringIncomeSummaryProps) => {
  const { activeTheme } = useAppTheme();

  // Total Bulanan - semua entry yang belum lunas
  const totalMonthly = incomes
    .filter(i => !i.is_paid)
    .reduce((sum, i) => sum + i.nominal, 0);

  const activeCount = incomes.filter(i => !i.is_paid).length;

  // Sudah Diterima - total yang sudah lunas
  const totalReceived = incomes
    .filter(i => i.is_paid)
    .reduce((sum, i) => sum + i.nominal, 0);

  const receivedCount = incomes.filter(i => i.is_paid).length;

  // Belum Diterima - total yang belum lunas
  const totalPending = incomes
    .filter(i => !i.is_paid)
    .reduce((sum, i) => sum + i.nominal, 0);

  const pendingCount = incomes.filter(i => !i.is_paid).length;

  // Performa Bulan Ini - persentase dari total
  const totalAll = incomes.reduce((sum, i) => sum + i.nominal, 0);
  const performancePercentage = totalAll > 0 ? Math.round((totalReceived / totalAll) * 100) : 0;

  // Segera Jatuh Tempo - entries dalam 7 hari ke depan
  const today = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(today.getDate() + 7);

  const dueSoonCount = incomes.filter(i => {
    if (i.is_paid) return false;
    const endDate = new Date(i.period_end_month);
    return endDate >= today && endDate <= sevenDaysLater;
  }).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className={cn(
        "animate-card-appear",
        activeTheme === 'japanese' 
          ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0"
          : "bg-card text-foreground border"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Total Bulanan</CardTitle>
          <DollarSign className="h-8 w-8 animate-icon-bounce" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{formatCurrency(totalMonthly)}</div>
          <p className={cn("text-xs mt-1", activeTheme === 'japanese' ? "opacity-90" : "text-muted-foreground")}>{activeCount} tagihan aktif</p>
        </CardContent>
      </Card>

      <Card className={cn(
        "animate-card-appear",
        activeTheme === 'japanese' 
          ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0"
          : "bg-card text-foreground border"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Sudah Diterima</CardTitle>
          <CheckCircle2 className="h-8 w-8 animate-check-spin" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{formatCurrency(totalReceived)}</div>
          <p className={cn("text-xs mt-1", activeTheme === 'japanese' ? "opacity-90" : "text-muted-foreground")}>{receivedCount} pembayaran diterima</p>
        </CardContent>
      </Card>

      <Card className={cn(
        "animate-card-appear",
        activeTheme === 'japanese' 
          ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0"
          : "bg-card text-foreground border"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Belum Diterima</CardTitle>
          <Clock className="h-8 w-8 animate-trending-down" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{formatCurrency(totalPending)}</div>
          <p className={cn("text-xs mt-1", activeTheme === 'japanese' ? "opacity-90" : "text-muted-foreground")}>{pendingCount} tagihan menunggu</p>
        </CardContent>
      </Card>

      <Card className={cn(
        "animate-card-appear",
        activeTheme === 'japanese' 
          ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0"
          : "bg-card text-foreground border"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Performa Bulan Ini</CardTitle>
          <TrendingUp className="h-8 w-8 animate-trending-up" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{performancePercentage}%</div>
          <p className={cn("text-xs mt-1", activeTheme === 'japanese' ? "opacity-90" : "text-muted-foreground")}>tercapai</p>
        </CardContent>
      </Card>

      <Card className={cn(
        "animate-card-appear",
        activeTheme === 'japanese' 
          ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0"
          : "bg-card text-foreground border"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Segera Jatuh Tempo</CardTitle>
          <Bell className="h-8 w-8 animate-alert-blink" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold animate-count-up">{dueSoonCount}</div>
          <p className={cn("text-xs mt-1", activeTheme === 'japanese' ? "opacity-90" : "text-muted-foreground")}>perlu ditagih segera</p>
        </CardContent>
      </Card>
    </div>
  );
};
