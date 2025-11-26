import { Progress } from "@/components/ui/progress";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface ColoredProgressBarProps {
  value: number;
  showLabel?: boolean;
  height?: string;
  animated?: boolean;
}

export const ColoredProgressBar = ({ 
  value, 
  showLabel = false, 
  height = "h-3",
  animated = true 
}: ColoredProgressBarProps) => {
  const { activeTheme } = useAppTheme();
  
  const getGradient = (percentage: number) => {
    if (percentage < 50) return "from-emerald-500 via-green-500 to-teal-500";
    if (percentage < 75) return "from-yellow-500 via-amber-500 to-orange-400";
    if (percentage < 90) return "from-orange-500 via-orange-600 to-red-500";
    return "from-red-500 via-rose-500 to-red-600";
  };

  const getColor = (percentage: number) => {
    if (percentage < 50) return "text-emerald-600";
    if (percentage < 75) return "text-amber-600";
    if (percentage < 90) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className={`relative ${height} bg-muted rounded-full overflow-hidden`}>
          <div 
            className={cn(
              "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
              activeTheme === 'japanese' 
                ? `bg-gradient-to-r ${getGradient(value)} ${animated ? 'animate-shimmer' : ''}`
                : getColor(value).replace('text-', 'bg-')
            )}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </div>
      {showLabel && (
        <p className={`text-xs font-medium text-center ${getColor(value)}`}>
          {value.toFixed(1)}%
        </p>
      )}
    </div>
  );
};
