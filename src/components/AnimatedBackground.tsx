import { ReactNode } from "react";
import { useTheme } from "@/components/ui/theme-provider";
import { useIsMobile } from "@/hooks/use-mobile";

interface AnimatedBackgroundProps {
  children: ReactNode;
}

export const AnimatedBackground = ({ children }: AnimatedBackgroundProps) => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  
  // Only show animations in dark mode and not on mobile
  const showAnimations = theme === 'dark' && !isMobile;

  return (
    <div className="h-full relative overflow-hidden flex flex-col">
      {/* Animated floating shapes - only show in dark mode and NOT on mobile */}
      {showAnimations && (
        <>
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mix-blend-normal filter blur-3xl opacity-30 animate-float"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full mix-blend-normal filter blur-3xl opacity-30 animate-float-delayed"></div>
          <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mix-blend-normal filter blur-3xl opacity-30 animate-float"></div>
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};
