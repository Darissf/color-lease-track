import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface ColoredStatCardProps {
  title: string;
  value: string | ReactNode;
  icon: LucideIcon;
  gradient: "income" | "expense" | "savings" | "budget" | "neutral";
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
}

export const ColoredStatCard = ({ title, value, icon: Icon, gradient, trend, subtitle }: ColoredStatCardProps) => {
  const { activeTheme } = useAppTheme();
  
  const gradientClasses = {
    income: "from-emerald-500 via-green-500 to-teal-500",
    expense: "from-rose-500 via-red-500 to-orange-500",
    savings: "from-blue-500 via-cyan-500 to-purple-500",
    budget: "from-purple-500 via-fuchsia-500 to-pink-500",
    neutral: "from-slate-600 via-gray-600 to-zinc-600"
  };

  const glowClasses = {
    income: "hover:shadow-emerald-500/50",
    expense: "hover:shadow-rose-500/50",
    savings: "hover:shadow-blue-500/50",
    budget: "hover:shadow-purple-500/50",
    neutral: "hover:shadow-slate-500/50"
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl",
      activeTheme === 'japanese' && glowClasses[gradient],
      activeTheme === 'professional' && "bg-card border border-border"
    )}>
      {/* Gradient background - only for Japanese theme */}
      {activeTheme === 'japanese' && (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientClasses[gradient]} opacity-100`}></div>
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm dark:bg-black/20"></div>
        </>
      )}
      
      {/* Content */}
      <div className={cn(
        "relative p-6",
        activeTheme === 'japanese' ? "text-white" : "text-foreground"
      )}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium mb-1",
              activeTheme === 'japanese' ? "text-white/80" : "text-muted-foreground"
            )}>{title}</p>
            <div className="text-xl font-semibold">{value}</div>
            {subtitle && <p className={cn(
              "text-xs mt-1",
              activeTheme === 'japanese' ? "text-white/70" : "text-muted-foreground"
            )}>{subtitle}</p>}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-lg flex items-center justify-center",
            activeTheme === 'japanese' 
              ? "bg-white/20 backdrop-blur-sm text-white" 
              : "bg-primary/10 text-primary"
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            activeTheme === 'japanese' 
              ? (trend.isPositive ? 'text-white/90' : 'text-white/70')
              : (trend.isPositive ? 'text-green-600' : 'text-red-600')
          )}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </Card>
  );
};
