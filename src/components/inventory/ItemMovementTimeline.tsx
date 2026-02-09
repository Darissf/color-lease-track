import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw, 
  Settings, 
  Package,
  Repeat 
} from "lucide-react";

interface MovementRecord {
  id: string;
  movement_date: string;
  movement_type: string;
  quantity: number;
  contract_invoice: string | null;
  notes: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

interface ItemMovementTimelineProps {
  movements: MovementRecord[];
  loading?: boolean;
}

export function ItemMovementTimeline({ movements, loading }: ItemMovementTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Belum ada pergerakan barang tercatat</p>
        </CardContent>
      </Card>
    );
  }

  const getMovementConfig = (type: string) => {
    switch (type.toLowerCase()) {
      case "rental":
        return {
          icon: ArrowUpCircle,
          label: "Disewa",
          color: "text-amber-500",
          bg: "bg-amber-500/10",
          sign: "-",
        };
      case "return":
        return {
          icon: ArrowDownCircle,
          label: "Dikembalikan",
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
          sign: "+",
        };
      case "extension":
        return {
          icon: Repeat,
          label: "Diperpanjang",
          color: "text-purple-500",
          bg: "bg-purple-500/10",
          sign: "→",
        };
      case "adjustment":
        return {
          icon: Settings,
          label: "Penyesuaian",
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          sign: "",
        };
      case "purchase":
        return {
          icon: ArrowDownCircle,
          label: "Pembelian",
          color: "text-primary",
          bg: "bg-primary/10",
          sign: "+",
        };
      default:
        return {
          icon: RefreshCw,
          label: type,
          color: "text-muted-foreground",
          bg: "bg-muted",
          sign: "",
        };
    }
  };

  const getPeriodDisplay = (movement: MovementRecord) => {
    if (!movement.period_start || !movement.period_end) return null;
    
    const start = new Date(movement.period_start);
    const end = new Date(movement.period_end);
    const days = differenceInDays(end, start) + 1;
    
    return {
      text: `${format(start, 'd MMM', { locale: localeId })} - ${format(end, 'd MMM yyyy', { locale: localeId })}`,
      days,
    };
  };

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {movements.map((movement, index) => {
          const config = getMovementConfig(movement.movement_type);
          const Icon = config.icon;
          const period = getPeriodDisplay(movement);

          return (
            <div key={movement.id} className="relative flex gap-4">
              {/* Icon */}
              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${config.bg}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={config.color}>
                    {config.label}
                  </Badge>
                  {movement.movement_type !== 'extension' && (
                    <span className="text-sm font-bold">
                      {config.sign}{movement.quantity} unit
                    </span>
                  )}
                  {movement.contract_invoice && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {movement.contract_invoice}
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(movement.movement_date), "EEEE, d MMMM yyyy HH:mm", {
                    locale: localeId,
                  })}
                </p>

                {/* Period display for extension movements */}
                {period && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                      📅 {period.text} ({period.days} hari)
                    </Badge>
                  </div>
                )}

                {movement.notes && (
                  <p className="text-sm text-muted-foreground mt-1 bg-muted/50 px-2 py-1 rounded">
                    {movement.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
