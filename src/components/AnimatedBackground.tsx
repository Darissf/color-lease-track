import { ReactNode } from "react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  children: ReactNode;
  theme?: "income" | "expense" | "savings" | "budget" | "neutral";
}

export const AnimatedBackground = ({ children, theme = "neutral" }: AnimatedBackgroundProps) => {
  const { activeTheme } = useAppTheme();
  
  const themeColors = {
    income: {
      bg: "from-emerald-50 via-green-50 to-teal-50",
      bgDark: "from-slate-900 via-emerald-950 to-teal-950",
      shapes: [
        "from-emerald-400 to-green-500",
        "from-green-400 to-teal-500",
        "from-teal-400 to-emerald-500",
      ]
    },
    expense: {
      bg: "from-rose-50 via-red-50 to-orange-50",
      bgDark: "from-slate-900 via-rose-950 to-red-950",
      shapes: [
        "from-rose-400 to-red-500",
        "from-red-400 to-orange-500",
        "from-orange-400 to-rose-500",
      ]
    },
    savings: {
      bg: "from-blue-50 via-cyan-50 to-purple-50",
      bgDark: "from-slate-900 via-blue-950 to-purple-950",
      shapes: [
        "from-blue-400 to-cyan-500",
        "from-cyan-400 to-purple-500",
        "from-purple-400 to-blue-500",
      ]
    },
    budget: {
      bg: "from-purple-50 via-fuchsia-50 to-pink-50",
      bgDark: "from-slate-900 via-purple-950 to-pink-950",
      shapes: [
        "from-purple-400 to-fuchsia-500",
        "from-fuchsia-400 to-pink-500",
        "from-pink-400 to-purple-500",
      ]
    },
    neutral: {
      bg: "from-slate-50 via-blue-50 to-purple-50",
      bgDark: "from-slate-900 via-slate-950 to-purple-950",
      shapes: [
        "from-blue-400 to-purple-500",
        "from-purple-400 to-pink-500",
        "from-pink-400 to-blue-500",
      ]
    }
  };

  const colors = themeColors[theme];

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden",
      activeTheme === 'japanese' 
        ? `bg-gradient-to-br ${colors.bgDark}` 
        : `bg-gradient-to-br ${colors.bg}`
    )}>
      {/* Animated floating shapes - only show for Japanese theme */}
      {activeTheme === 'japanese' && (
        <>
          <div className={`absolute top-20 left-10 w-72 h-72 bg-gradient-to-br ${colors.shapes[0]} rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-20 dark:opacity-10 animate-float`}></div>
          <div className={`absolute top-40 right-10 w-96 h-96 bg-gradient-to-br ${colors.shapes[1]} rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-20 dark:opacity-10 animate-float-delayed`}></div>
          <div className={`absolute -bottom-32 left-1/3 w-80 h-80 bg-gradient-to-br ${colors.shapes[2]} rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-20 dark:opacity-10 animate-float`}></div>
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
