import React, { useEffect, useState, useRef } from 'react';

interface SakuraConfettiProps {
  trigger: boolean;
  onComplete: () => void;
  particleCount?: number;
  duration?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  color: string;
  delay: number;
}

const sakuraColors = [
  '#FFB7C5', // Classic pink
  '#FFC0CB', // Light pink
  '#FFF0F5', // White pink
  '#FFF5EE', // Cream pink
  '#FF1493', // Hot pink
];

export const SakuraConfetti: React.FC<SakuraConfettiProps> = ({
  trigger,
  onComplete,
  particleCount = 60,
  duration = 3000,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!trigger) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    // Play confetti sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      // Silently fail if audio context not available
    }

    // Generate particles
    const newParticles: Particle[] = [];
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? Math.floor(particleCount / 2) : particleCount;
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const velocity = 300 + Math.random() * 400; // 300-700px/s
      
      newParticles.push({
        id: i,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        velocityX: Math.cos(angle) * velocity,
        velocityY: Math.sin(angle) * velocity,
        rotation: Math.random() * 720 - 360,
        rotationSpeed: Math.random() * 720 - 360,
        scale: 0.8 + Math.random() * 0.4,
        color: sakuraColors[Math.floor(Math.random() * sakuraColors.length)],
        delay: Math.random() * 100,
      });
    }

    setParticles(newParticles);
    setIsActive(true);

    // Clean up after animation completes
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
      setParticles([]);
      onComplete();
    }, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [trigger, particleCount, duration, onComplete]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[999]" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-6 h-6 animate-[sakura-explode_3s_cubic-bezier(0.25,0.46,0.45,0.94)_forwards]"
          style={{
            left: particle.x,
            top: particle.y,
            animationDelay: `${particle.delay}ms`,
            '--velocity-x': `${particle.velocityX}px`,
            '--velocity-y': `${particle.velocityY}px`,
            '--rotation-speed': particle.rotationSpeed,
            '--final-rotation': `${particle.rotation}deg`,
            willChange: 'transform, opacity',
          } as React.CSSProperties}
        >
          <svg
            viewBox="0 0 50 50"
            className="w-full h-full"
            style={{
              filter: `drop-shadow(0 0 3px ${particle.color}80)`,
              transform: `scale(${particle.scale})`,
            }}
          >
            <defs>
              <linearGradient id={`petal-gradient-${particle.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={particle.color} />
                <stop offset="100%" stopColor={particle.color} stopOpacity="0.8" />
              </linearGradient>
            </defs>
            
            {/* Sakura petal shape - 5 petals */}
            <g transform="translate(25, 25)">
              {[0, 72, 144, 216, 288].map((angle, i) => (
                <ellipse
                  key={i}
                  cx="0"
                  cy="-12"
                  rx="6"
                  ry="12"
                  fill={`url(#petal-gradient-${particle.id})`}
                  stroke={particle.color}
                  strokeWidth="0.5"
                  transform={`rotate(${angle})`}
                />
              ))}
              
              {/* Center circle */}
              <circle
                cx="0"
                cy="0"
                r="3"
                fill={particle.color}
                opacity="0.9"
              />
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
};
