import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

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
    <Card className={`relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl ${glowClasses[gradient]}`}>
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClasses[gradient]} opacity-100`}></div>
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm dark:bg-black/20"></div>
      
      {/* Content */}
      <div className="relative p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
            <div className="text-3xl font-bold">{value}</div>
            {subtitle && <p className="text-xs text-white/70 mt-1">{subtitle}</p>}
          </div>
          <div className="h-12 w-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-white/90' : 'text-white/70'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </Card>
  );
};
