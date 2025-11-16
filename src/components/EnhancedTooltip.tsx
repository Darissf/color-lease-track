import { formatRupiah } from "@/lib/currency";
import { getCategoryStyle } from "@/lib/categoryColors";

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  type?: "pie" | "line" | "bar";
}

export const EnhancedTooltip = ({ active, payload, label, type = "line" }: TooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  if (type === "pie") {
    const data = payload[0];
    const categoryStyle = getCategoryStyle(data.name);
    const Icon = categoryStyle.icon;

    return (
      <div className="bg-card/95 backdrop-blur-sm border-2 rounded-lg shadow-xl p-4 animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className={`h-8 w-8 rounded-lg ${categoryStyle.bg} flex items-center justify-center`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
          <p className="font-semibold text-foreground">{data.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-foreground">
            {formatRupiah(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.payload.percentage ? `${data.payload.percentage}% dari total` : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/95 backdrop-blur-sm border-2 rounded-lg shadow-xl p-4 animate-in fade-in-0 zoom-in-95">
      <p className="font-semibold text-foreground mb-3 pb-2 border-b">{label}</p>
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-sm font-bold text-foreground">
              {formatRupiah(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
