import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "income" | "expense" | "savings" | "budget" | "primary" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}

export const GradientButton = ({ 
  children, 
  onClick, 
  icon: Icon, 
  variant = "primary",
  size = "default",
  type = "button",
  disabled = false,
  className = ""
}: GradientButtonProps) => {
  const { activeTheme } = useAppTheme();
  
  const gradientClasses = {
    income: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
    expense: "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700",
    savings: "bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700",
    budget: "bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700",
    primary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
  };

  const glowClasses = {
    income: "shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/60",
    expense: "shadow-lg shadow-rose-500/50 hover:shadow-xl hover:shadow-rose-500/60",
    savings: "shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60",
    budget: "shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60",
    primary: "shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60",
    danger: "shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-500/60"
  };

  const solidClasses = {
    income: "bg-emerald-600 hover:bg-emerald-700",
    expense: "bg-rose-600 hover:bg-rose-700",
    savings: "bg-blue-600 hover:bg-blue-700",
    budget: "bg-purple-600 hover:bg-purple-700",
    primary: "bg-primary hover:bg-primary/90",
    danger: "bg-destructive hover:bg-destructive/90"
  };

  return (
    <Button
      onClick={onClick}
      size={size}
      type={type}
      disabled={disabled}
      className={cn(
        "text-white border-0 transition-all duration-300",
        activeTheme === 'japanese' 
          ? `${gradientClasses[variant]} ${glowClasses[variant]} hover:scale-105` 
          : solidClasses[variant],
        className
      )}
    >
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {children}
    </Button>
  );
};
