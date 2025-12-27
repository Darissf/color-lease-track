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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">
                  {stat.value.toLocaleString("id-ID")}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
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
