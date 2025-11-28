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
  const showGalaxyAnimations = accentTheme === 'galaxy' && !isMobile;
  const showArtDecoAnimations = accentTheme === 'artdeco' && !isMobile;
  const showForestAnimations = accentTheme === 'forest' && !isMobile;

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

      {/* Galaxy Space Theme */}
      {showGalaxyAnimations && (
        <>
          {/* Twinkling Stars */}
          {[...Array(80)].map((_, i) => (
            <div key={`star-${i}`}
                 className="absolute rounded-full bg-white animate-twinkle"
                 style={{
                   left: `${Math.random() * 100}%`,
                   top: `${Math.random() * 100}%`,
                   width: `${Math.random() * 3 + 1}px`,
                   height: `${Math.random() * 3 + 1}px`,
                   animationDelay: `${Math.random() * 3}s`,
                   animationDuration: `${Math.random() * 2 + 2}s`
                 }} />
          ))}
          
          {/* Shooting Stars */}
          {[...Array(3)].map((_, i) => (
            <div key={`shooting-${i}`}
                 className="absolute h-px w-20 bg-gradient-to-r from-transparent via-purple-300 to-transparent"
                 style={{
                   left: `${Math.random() * 100}%`,
                   top: `${Math.random() * 50}%`,
                   transform: 'rotate(-45deg)',
                   animation: `shootingStar ${Math.random() * 3 + 4}s linear infinite`,
                   animationDelay: `${Math.random() * 5}s`
                 }} />
          ))}
          
          {/* Nebula Clouds */}
          {[...Array(4)].map((_, i) => (
            <div key={`nebula-${i}`}
                 className="absolute rounded-full blur-3xl animate-pulse"
                 style={{
                   left: `${Math.random() * 80}%`,
                   top: `${Math.random() * 80}%`,
                   width: `${200 + Math.random() * 300}px`,
                   height: `${200 + Math.random() * 300}px`,
                   background: i % 2 === 0 ? 'radial-gradient(circle, rgba(147, 51, 234, 0.2), transparent)' : 'radial-gradient(circle, rgba(79, 70, 229, 0.2), transparent)',
                   animationDelay: `${i * 0.8}s`,
                   animationDuration: `${6 + i * 2}s`
                 }} />
          ))}
        </>
      )}

      {/* Art Deco Luxury Theme */}
      {showArtDecoAnimations && (
        <>
          {/* Gold Sparkle Particles */}
          {[...Array(30)].map((_, i) => (
            <div key={`sparkle-${i}`}
                 className="absolute animate-twinkle"
                 style={{
                   left: `${Math.random() * 100}%`,
                   top: `${Math.random() * 100}%`,
                   width: `${Math.random() * 4 + 2}px`,
                   height: `${Math.random() * 4 + 2}px`,
                   background: '#d4af37',
                   borderRadius: '50%',
                   boxShadow: '0 0 10px #d4af37',
                   animationDelay: `${Math.random() * 2}s`,
                   animationDuration: `${Math.random() * 3 + 2}s`
                 }} />
          ))}
          
          {/* Geometric Patterns */}
          <div className="absolute inset-0 opacity-10"
               style={{
                 backgroundImage: `
                   linear-gradient(45deg, #d4af37 1px, transparent 1px),
                   linear-gradient(-45deg, #d4af37 1px, transparent 1px)
                 `,
                 backgroundSize: '60px 60px',
                 backgroundPosition: '0 0, 30px 30px'
               }} />
          
          {/* Elegant Shimmer Lines */}
          {[...Array(5)].map((_, i) => (
            <div key={`shimmer-${i}`}
                 className="absolute w-px h-full bg-gradient-to-b from-transparent via-yellow-500/30 to-transparent"
                 style={{
                   left: `${20 * (i + 1)}%`,
                   animation: 'shimmer 3s ease-in-out infinite',
                   animationDelay: `${i * 0.3}s`
                 }} />
          ))}
        </>
      )}

      {/* Enchanted Forest Theme */}
      {showForestAnimations && (
        <>
          {/* Fireflies */}
          {[...Array(25)].map((_, i) => (
            <div key={`firefly-${i}`}
                 className="absolute rounded-full animate-firefly-glow"
                 style={{
                   left: `${Math.random() * 100}%`,
                   top: `${Math.random() * 100}%`,
                   width: `${Math.random() * 6 + 3}px`,
                   height: `${Math.random() * 6 + 3}px`,
                   background: 'radial-gradient(circle, rgba(234, 179, 8, 0.9), rgba(234, 179, 8, 0.3))',
                   boxShadow: '0 0 15px rgba(234, 179, 8, 0.8)',
                   animationDelay: `${Math.random() * 3}s`,
                   animationDuration: `${Math.random() * 2 + 3}s`
                 }} />
          ))}
          
          {/* Falling Leaves */}
          {[...Array(15)].map((_, i) => (
            <div key={`leaf-${i}`}
                 className="absolute opacity-60"
                 style={{
                   left: `${Math.random() * 100}%`,
                   top: '-20px',
                   width: '20px',
                   height: '20px',
                   background: i % 3 === 0 ? 'rgba(34, 197, 94, 0.7)' : i % 3 === 1 ? 'rgba(22, 163, 74, 0.7)' : 'rgba(21, 128, 61, 0.7)',
                   borderRadius: '50% 0',
                   transform: 'rotate(45deg)',
                   animation: `sakuraFall ${Math.random() * 10 + 15}s linear infinite`,
                   animationDelay: `${Math.random() * 10}s`
                 }} />
          ))}
          
          {/* Mist Particles */}
          {[...Array(8)].map((_, i) => (
            <div key={`mist-${i}`}
                 className="absolute rounded-full blur-2xl opacity-20 animate-mist-float"
                 style={{
                   left: `${Math.random() * 100}%`,
                   top: `${60 + Math.random() * 40}%`,
                   width: `${150 + Math.random() * 200}px`,
                   height: `${80 + Math.random() * 100}px`,
                   background: 'rgba(255, 255, 255, 0.3)',
                   animationDelay: `${i * 1.5}s`,
                   animationDuration: `${8 + i * 2}s`
                 }} />
          ))}
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
};
