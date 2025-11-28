import { ReactNode } from "react";
import { useTheme } from "@/components/ui/theme-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppTheme } from "@/contexts/AppThemeContext";

interface AnimatedBackgroundProps {
  children: ReactNode;
}

export const AnimatedBackground = ({ children }: AnimatedBackgroundProps) => {
  const { theme } = useTheme();
  const { accentTheme } = useAppTheme();
  const isMobile = useIsMobile();
  
  // Show animations for atmospheric themes and not on mobile
  const showJapaneseAnimations = accentTheme === 'japanese' && !isMobile;
  const showAuroraAnimations = accentTheme === 'aurora' && !isMobile;
  const showCyberpunkAnimations = accentTheme === 'cyberpunk' && !isMobile;

  return (
    <div className="h-full relative overflow-hidden flex flex-col">
      {/* Japanese Night Theme Animations */}
      {showJapaneseAnimations && (
        <>
          {/* Moon */}
          <div className="absolute top-10 right-20 w-24 h-24 bg-amber-200/40 rounded-full blur-sm animate-float shadow-[0_0_60px_20px_rgba(251,191,36,0.3)]"></div>
          
          {/* Stars */}
          <div className="absolute top-20 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-32 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse delay-100"></div>
          <div className="absolute top-16 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse delay-200"></div>
          <div className="absolute top-40 right-1/3 w-1 h-1 bg-white rounded-full animate-pulse delay-300"></div>
          <div className="absolute top-24 left-1/2 w-1 h-1 bg-white rounded-full animate-pulse delay-500"></div>
          
          {/* Sakura petals */}
          <div className="absolute top-0 left-1/4 w-3 h-3 bg-pink-300/60 rounded-full animate-float blur-[1px]" style={{ animationDuration: '8s' }}></div>
          <div className="absolute top-10 left-1/3 w-2 h-2 bg-pink-200/50 rounded-full animate-float blur-[1px]" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
          <div className="absolute top-5 right-1/3 w-3 h-3 bg-pink-300/60 rounded-full animate-float blur-[1px]" style={{ animationDuration: '12s', animationDelay: '1s' }}></div>
          <div className="absolute top-0 right-1/4 w-2 h-2 bg-pink-200/50 rounded-full animate-float blur-[1px]" style={{ animationDuration: '9s', animationDelay: '3s' }}></div>
          
          {/* Fireflies */}
          <div className="absolute bottom-1/3 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-pulse shadow-[0_0_10px_4px_rgba(253,224,71,0.5)]"></div>
          <div className="absolute bottom-1/2 right-1/3 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-300 shadow-[0_0_10px_4px_rgba(253,224,71,0.5)]"></div>
          <div className="absolute bottom-2/3 left-1/3 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-700 shadow-[0_0_10px_4px_rgba(253,224,71,0.5)]"></div>
        </>
      )}

      {/* Aurora Borealis Theme Animations */}
      {showAuroraAnimations && (
        <>
          {/* Aurora waves */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-0 w-full h-32 bg-gradient-to-r from-cyan-400/20 via-green-400/30 to-purple-500/20 blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
            <div className="absolute top-1/3 left-0 w-full h-40 bg-gradient-to-r from-purple-500/20 via-pink-400/30 to-cyan-400/20 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
            <div className="absolute top-1/2 left-0 w-full h-36 bg-gradient-to-r from-green-400/20 via-cyan-400/30 to-purple-500/20 blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }}></div>
          </div>
          
          {/* Twinkling stars */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 60}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </>
      )}

      {/* Cyberpunk Neon Theme Animations */}
      {showCyberpunkAnimations && (
        <>
          {/* Grid perspective background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-1/2" style={{
              background: 'linear-gradient(transparent 0%, rgba(236, 72, 153, 0.1) 100%)',
              backgroundSize: '50px 50px',
              backgroundImage: 
                'linear-gradient(to right, rgba(236, 72, 153, 0.3) 1px, transparent 1px),' +
                'linear-gradient(to bottom, rgba(236, 72, 153, 0.3) 1px, transparent 1px)',
              transform: 'perspective(500px) rotateX(60deg)',
              transformOrigin: 'bottom'
            }}></div>
          </div>
          
          {/* Neon glowing orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/30 rounded-full mix-blend-screen filter blur-3xl animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-500/30 rounded-full mix-blend-screen filter blur-3xl animate-float-delayed"></div>
          <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-purple-500/30 rounded-full mix-blend-screen filter blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          
          {/* Scanning lines */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-slide-down"></div>
          <div className="absolute top-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-400 to-transparent animate-slide-down" style={{ animationDelay: '2s' }}></div>
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};
