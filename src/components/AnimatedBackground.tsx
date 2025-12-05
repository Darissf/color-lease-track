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
  
  // Show animations for atmospheric themes on all devices
  const showJapaneseAnimations = accentTheme === 'japanese';
  const showAuroraAnimations = accentTheme === 'aurora';
  const showCyberpunkAnimations = accentTheme === 'cyberpunk';
  const showGalaxyAnimations = accentTheme === 'galaxy';
  const showArtDecoAnimations = accentTheme === 'artdeco';
  const showForestAnimations = accentTheme === 'forest';
  const showOceanAnimations = accentTheme === 'ocean';
  const showFireplaceAnimations = accentTheme === 'fireplace';

  // Dynamic particle counts - 3x busier animations (reduced by 50% on mobile for performance)
  const auroraStarCount = isMobile ? 30 : 60;
  const galaxyStarBg = isMobile ? 40 : 80;
  const galaxyStarMid = isMobile ? 30 : 60;
  const galaxyStarFg = isMobile ? 25 : 50;
  const galaxyPulsar = isMobile ? 5 : 10;
  const galaxySpiral = isMobile ? 8 : 15;
  const galaxyComet = isMobile ? 2 : 4;
  const galaxyNebula = isMobile ? 3 : 6;
  const artDecoSparkle = isMobile ? 40 : 80;
  const artDecoShimmer = isMobile ? 4 : 8;
  const forestFirefly = isMobile ? 30 : 60;
  const forestLeaf = isMobile ? 15 : 30;
  const forestMist = isMobile ? 8 : 15;
  const oceanBubble = isMobile ? 30 : 60;
  const oceanRay = isMobile ? 4 : 8;
  const oceanFish = isMobile ? 4 : 8;
  const oceanBio = isMobile ? 40 : 80;
  const oceanSeaweed = isMobile ? 8 : 15;
  const fireplaceEmber = isMobile ? 25 : 50;
  const fireplaceSmoke = isMobile ? 4 : 8;
  const fireplaceSparkle = isMobile ? 30 : 60;
  const fireplaceGlow = isMobile ? 2 : 5;

  return (
    <div className="min-h-full relative flex flex-col">
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
          {[...Array(auroraStarCount)].map((_, i) => (
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

      {/* Galaxy Space Theme - ULTRA ADVANCED */}
      {showGalaxyAnimations && (
        <>
          {/* Star Parallax System - 3 Layers */}
          {/* Layer 1: Background Stars (slow) */}
          {[...Array(galaxyStarBg)].map((_, i) => (
            <div key={`star-bg-${i}`} className="absolute rounded-full bg-white/40"
                 style={{
                   width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
                   top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                   animation: `parallaxStar1 ${Math.random() * 100 + 150}s linear infinite, twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 10}s`,
                 }} />
          ))}
          {/* Layer 2: Medium Stars (medium speed) */}
          {[...Array(galaxyStarMid)].map((_, i) => (
            <div key={`star-mid-${i}`} className="absolute rounded-full bg-white/60"
                 style={{
                   width: `${Math.random() * 2.5 + 1.5}px`, height: `${Math.random() * 2.5 + 1.5}px`,
                   top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                   animation: `parallaxStar2 ${Math.random() * 60 + 100}s linear infinite, twinkle ${Math.random() * 2 + 1.5}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 5}s`,
                 }} />
          ))}
          {/* Layer 3: Foreground Stars (fast) */}
          {[...Array(galaxyStarFg)].map((_, i) => (
            <div key={`star-fg-${i}`} className="absolute rounded-full bg-white"
                 style={{
                   width: `${Math.random() * 3 + 2}px`, height: `${Math.random() * 3 + 2}px`,
                   top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                   animation: `parallaxStar3 ${Math.random() * 40 + 60}s linear infinite, twinkle ${Math.random() * 2 + 1}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 3}s`,
                 }} />
          ))}

          {/* Pulsar Stars */}
          {[...Array(galaxyPulsar)].map((_, i) => (
            <div key={`pulsar-${i}`} className="absolute" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}>
              <div className="rounded-full bg-purple-300"
                   style={{
                     width: '4px', height: '4px',
                     boxShadow: '0 0 10px 2px rgba(168, 85, 247, 0.8)',
                     animation: `pulse ${Math.random() * 1 + 0.8}s ease-in-out infinite`,
                   }} />
            </div>
          ))}

          {/* Rotating Galaxy Spiral */}
          <div className="absolute" style={{ top: '10%', right: '15%', width: '300px', height: '300px', animation: 'galaxyRotate 60s linear infinite', opacity: 0.3 }}>
            <div className="w-full h-full rounded-full"
                 style={{
                   background: 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.4) 0%, rgba(79, 70, 229, 0.2) 30%, transparent 70%)',
                   filter: 'blur(2px)',
                 }} />
            {[...Array(galaxySpiral)].map((_, i) => (
              <div key={`spiral-${i}`} className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full"
                   style={{
                     transform: `rotate(${i * 45}deg) translateX(${50 + i * 15}px)`,
                     boxShadow: '0 0 4px rgba(255, 255, 255, 0.8)',
                   }} />
            ))}
          </div>

          {/* Comet System */}
          {[...Array(galaxyComet)].map((_, i) => (
            <div key={`comet-${i}`} className="absolute"
                 style={{
                   top: `${Math.random() * 40}%`, left: '-150px',
                   animation: `cometTrail ${Math.random() * 4 + 5}s linear infinite`,
                   animationDelay: `${Math.random() * 15}s`,
                 }}>
              <div className="w-3 h-3 bg-white rounded-full" style={{ boxShadow: '0 0 10px rgba(255, 255, 255, 0.9)' }} />
              <div className="absolute top-0 left-0 h-1"
                   style={{
                     width: '150px',
                     background: 'linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(147, 51, 234, 0.6), transparent)',
                     transformOrigin: 'left center',
                     transform: 'rotate(-30deg) translateY(1px)',
                   }} />
            </div>
          ))}

          {/* Constellation Lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20" style={{ pointerEvents: 'none' }}>
            <line x1="20%" y1="30%" x2="35%" y2="25%" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="35%" y1="25%" x2="42%" y2="35%" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="42%" y1="35%" x2="30%" y2="42%" stroke="white" strokeWidth="1" opacity="0.6" />
            <line x1="60%" y1="20%" x2="72%" y2="28%" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="72%" y1="28%" x2="78%" y2="22%" stroke="white" strokeWidth="1" opacity="0.5" />
            <line x1="78%" y1="22%" x2="68%" y2="15%" stroke="white" strokeWidth="1" opacity="0.5" />
          </svg>

          {/* Nebula Clouds */}
          {[...Array(galaxyNebula)].map((_, i) => (
            <div key={`nebula-${i}`} className="absolute rounded-full"
                 style={{
                   width: `${Math.random() * 400 + 300}px`, height: `${Math.random() * 400 + 300}px`,
                   top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                   background: `radial-gradient(circle, rgba(147, 51, 234, 0.25) 0%, rgba(79, 70, 229, 0.15) 50%, transparent 70%)`,
                   filter: 'blur(60px)',
                   animation: `float ${Math.random() * 30 + 40}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 10}s`,
                 }} />
          ))}
        </>
      )}

      {/* Art Deco Luxury Theme */}
      {showArtDecoAnimations && (
        <>
          {/* Gold Sparkle Particles */}
          {[...Array(artDecoSparkle)].map((_, i) => (
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
          {[...Array(artDecoShimmer)].map((_, i) => (
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
          {[...Array(forestFirefly)].map((_, i) => (
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
          {[...Array(forestLeaf)].map((_, i) => (
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
          {[...Array(forestMist)].map((_, i) => (
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

      {/* Deep Ocean Theme */}
      {showOceanAnimations && (
        <>
          {/* Rising Bubbles */}
          {[...Array(oceanBubble)].map((_, i) => (
            <div key={`bubble-${i}`} className="absolute rounded-full bg-white/20"
                 style={{
                   width: `${Math.random() * 12 + 4}px`, height: `${Math.random() * 12 + 4}px`,
                   bottom: '-50px', left: `${Math.random() * 100}%`,
                   animation: `bubbleRise ${Math.random() * 8 + 6}s linear infinite`,
                   animationDelay: `${Math.random() * 5}s`,
                   boxShadow: 'inset 0 -2px 4px rgba(255, 255, 255, 0.5)',
                 }} />
          ))}

          {/* God Rays / Light Rays */}
          {[...Array(oceanRay)].map((_, i) => (
            <div key={`ray-${i}`} className="absolute"
                 style={{
                   top: '-10%', left: `${i * 20 + 10}%`,
                   width: '80px', height: '120%',
                   background: 'linear-gradient(to bottom, rgba(100, 200, 255, 0.15) 0%, transparent 60%)',
                   transform: `rotate(${Math.random() * 10 - 5}deg)`,
                   animation: `godRays ${Math.random() * 15 + 20}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 5}s`,
                   filter: 'blur(5px)',
                 }} />
          ))}

          {/* Fish Silhouettes */}
          {[...Array(oceanFish)].map((_, i) => (
            <div key={`fish-${i}`} className="absolute"
                 style={{
                   top: `${Math.random() * 60 + 20}%`, left: '-100px',
                   width: '60px', height: '20px',
                   animation: `fishSwim ${Math.random() * 20 + 25}s linear infinite`,
                   animationDelay: `${Math.random() * 10}s`,
                 }}>
              <svg viewBox="0 0 60 20" className="w-full h-full fill-cyan-900/30">
                <ellipse cx="30" cy="10" rx="25" ry="8" />
                <path d="M 5 10 L 0 5 L 0 15 Z" />
              </svg>
            </div>
          ))}

          {/* Bioluminescent Particles */}
          {[...Array(oceanBio)].map((_, i) => (
            <div key={`bio-${i}`} className="absolute rounded-full"
                 style={{
                   width: `${Math.random() * 4 + 2}px`, height: `${Math.random() * 4 + 2}px`,
                   top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                   backgroundColor: 'rgba(100, 255, 218, 0.6)',
                   boxShadow: '0 0 8px rgba(100, 255, 218, 0.8)',
                   animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite, float ${Math.random() * 20 + 30}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 3}s`,
                 }} />
          ))}

          {/* Seaweed at Bottom */}
          {[...Array(oceanSeaweed)].map((_, i) => (
            <div key={`seaweed-${i}`} className="absolute bottom-0"
                 style={{
                   left: `${i * 12 + 5}%`,
                   width: '20px', height: `${Math.random() * 100 + 120}px`,
                   background: 'linear-gradient(to top, rgba(34, 139, 34, 0.4), transparent)',
                   transformOrigin: 'bottom center',
                   animation: `seaweedSway ${Math.random() * 4 + 3}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 2}s`,
                   borderRadius: '50% 50% 0 0',
                 }} />
          ))}

          {/* Water Caustics Effect */}
          <div className="absolute inset-0"
               style={{
                 background: 'repeating-linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.03) 50px, transparent 100px)',
                 animation: 'float 10s ease-in-out infinite',
                 opacity: 0.5,
               }} />
        </>
      )}

      {/* Cozy Fireplace Theme */}
      {showFireplaceAnimations && (
        <>
          {/* Floating Embers */}
          {[...Array(fireplaceEmber)].map((_, i) => (
            <div key={`ember-${i}`} className="absolute rounded-full"
                 style={{
                   width: `${Math.random() * 6 + 3}px`, height: `${Math.random() * 6 + 3}px`,
                   bottom: `${Math.random() * 20}%`, left: `${Math.random() * 100}%`,
                   backgroundColor: `rgba(255, ${Math.random() * 100 + 80}, 0, ${Math.random() * 0.5 + 0.5})`,
                   boxShadow: `0 0 ${Math.random() * 10 + 5}px rgba(255, 140, 0, 0.8)`,
                   animation: `emberFloat ${Math.random() * 8 + 6}s ease-out infinite`,
                   animationDelay: `${Math.random() * 5}s`,
                 }} />
          ))}

          {/* Smoke Wisps */}
          {[...Array(fireplaceSmoke)].map((_, i) => (
            <div key={`smoke-${i}`} className="absolute rounded-full"
                 style={{
                   width: `${Math.random() * 80 + 60}px`, height: `${Math.random() * 80 + 60}px`,
                   bottom: `${Math.random() * 30 + 20}%`, left: `${Math.random() * 80 + 10}%`,
                   background: 'radial-gradient(circle, rgba(100, 100, 100, 0.15) 0%, transparent 70%)',
                   filter: 'blur(20px)',
                   animation: `smokeWisp ${Math.random() * 12 + 10}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 5}s`,
                 }} />
          ))}

          {/* Warm Particle Sparkles */}
          {[...Array(fireplaceSparkle)].map((_, i) => (
            <div key={`sparkle-${i}`} className="absolute rounded-full"
                 style={{
                   width: `${Math.random() * 3 + 1}px`, height: `${Math.random() * 3 + 1}px`,
                   top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                   backgroundColor: `rgba(255, ${Math.random() * 100 + 155}, ${Math.random() * 50}, 0.8)`,
                   boxShadow: '0 0 4px rgba(255, 200, 100, 0.6)',
                   animation: `twinkle ${Math.random() * 2 + 1}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 2}s`,
                 }} />
          ))}

          {/* Heat Shimmer Effect */}
          <div className="absolute inset-0"
               style={{
                 background: 'repeating-linear-gradient(0deg, transparent, rgba(255, 150, 50, 0.02) 30px, transparent 60px)',
                 animation: 'heatShimmer 3s ease-in-out infinite',
               }} />

          {/* Crackling Glow Areas */}
          {[...Array(fireplaceGlow)].map((_, i) => (
            <div key={`glow-${i}`} className="absolute rounded-full"
                 style={{
                   width: `${Math.random() * 150 + 100}px`, height: `${Math.random() * 150 + 100}px`,
                   bottom: `${Math.random() * 20}%`, left: `${Math.random() * 80 + 10}%`,
                   background: 'radial-gradient(circle, rgba(255, 100, 0, 0.2) 0%, transparent 60%)',
                   filter: 'blur(40px)',
                   animation: `pulse ${Math.random() * 2 + 1.5}s ease-in-out infinite`,
                   animationDelay: `${Math.random() * 1}s`,
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
