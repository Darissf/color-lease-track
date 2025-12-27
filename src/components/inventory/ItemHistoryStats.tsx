import { Card, CardContent } from "@/components/ui/card";
import { Package, TrendingUp, CheckCircle, Clock } from "lucide-react";

interface ItemHistoryStatsProps {
  totalRentals: number;
  activeRentals: number;
  completedRentals: number;
  totalUnitDays: number;
}

export function ItemHistoryStats({
  totalRentals,
  activeRentals,
  completedRentals,
  totalUnitDays,
}: ItemHistoryStatsProps) {
  const stats = [
    {
      label: "Total Disewa",
      value: totalRentals,
      suffix: "kontrak",
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Sedang Aktif",
      value: activeRentals,
      suffix: "kontrak",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Selesai",
      value: completedRentals,
      suffix: "kontrak",
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Total Unit-Hari",
      value: totalUnitDays,
      suffix: "unit-hari",
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${stat.bg} shrink-0`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-sm sm:text-base font-bold leading-tight">
                  {stat.value.toLocaleString("id-ID")}
                  <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-1 hidden sm:inline">
                    {stat.suffix}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
