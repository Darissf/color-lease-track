import { ReactNode } from "react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  children: ReactNode;
  theme?: "income" | "expense" | "savings" | "budget" | "neutral";
}

export const AnimatedBackground = ({ children, theme = "neutral" }: AnimatedBackgroundProps) => {
  const { activeTheme } = useAppTheme();
  const isMobile = useIsMobile();
  
  const themeColors = {
    income: {
      shapes: [
        "from-emerald-400 to-green-500",
        "from-green-400 to-teal-500",
        "from-teal-400 to-emerald-500",
      ]
    },
    expense: {
      shapes: [
        "from-rose-400 to-red-500",
        "from-red-400 to-orange-500",
        "from-orange-400 to-rose-500",
      ]
    },
    savings: {
      shapes: [
        "from-blue-400 to-cyan-500",
        "from-cyan-400 to-purple-500",
        "from-purple-400 to-blue-500",
      ]
    },
    budget: {
      shapes: [
        "from-purple-400 to-fuchsia-500",
        "from-fuchsia-400 to-pink-500",
        "from-pink-400 to-purple-500",
      ]
    },
    neutral: {
      shapes: [
        "from-blue-400 to-purple-500",
        "from-purple-400 to-pink-500",
        "from-pink-400 to-blue-500",
      ]
    }
  };

  const colors = themeColors[theme];

  return (
    <div className="h-full relative overflow-hidden flex flex-col">
      {/* Animated floating shapes - only show for Japanese theme and NOT on mobile */}
      {activeTheme === 'japanese' && !isMobile && (
        <>
          <div className={`absolute top-20 left-10 w-72 h-72 bg-gradient-to-br ${colors.shapes[0]} rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-20 dark:opacity-10 animate-float`}></div>
          <div className={`absolute top-40 right-10 w-96 h-96 bg-gradient-to-br ${colors.shapes[1]} rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-20 dark:opacity-10 animate-float-delayed`}></div>
          <div className={`absolute -bottom-32 left-1/3 w-80 h-80 bg-gradient-to-br ${colors.shapes[2]} rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-20 dark:opacity-10 animate-float`}></div>
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};
