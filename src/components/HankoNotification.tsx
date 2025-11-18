import React, { useEffect } from 'react';
import { X, CheckCircle, Clock, AlertCircle, Bell } from 'lucide-react';
import { HankoStamp } from './HankoStamp';
import { formatCurrency } from '@/lib/currency';

interface HankoNotificationProps {
  id: string;
  type: 'paid' | 'due-today' | 'overdue' | 'due-soon';
  title: string;
  message: string;
  expenseName: string;
  amount: number;
  onClose: () => void;
}

const notificationConfig = {
  paid: {
    gradient: 'from-[hsl(var(--matcha-green))] to-emerald-500',
    hankoColor: 'hsl(var(--moon-gold))',
    hankoText: '支払済',
    icon: CheckCircle,
    borderColor: 'border-[hsl(var(--moon-gold))]',
    iconAnimation: 'animate-[spin_0.5s_ease-out]',
  },
  'due-today': {
    gradient: 'from-orange-500 to-amber-500',
    hankoColor: '#dc2626',
    hankoText: '本日',
    icon: Clock,
    borderColor: 'border-red-600',
    iconAnimation: 'animate-pulse',
  },
  overdue: {
    gradient: 'from-[hsl(var(--torii-red))] to-red-700',
    hankoColor: '#7f1d1d',
    hankoText: '延滞',
    icon: AlertCircle,
    borderColor: 'border-red-900',
    iconAnimation: 'animate-[urgent-shake_0.5s_ease-in-out_infinite]',
  },
  'due-soon': {
    gradient: 'from-[hsl(var(--moon-gold))] to-yellow-500',
    hankoColor: '#ea580c',
    hankoText: '警告',
    icon: Bell,
    borderColor: 'border-orange-600',
    iconAnimation: 'animate-[swing_1s_ease-in-out_infinite]',
  },
};

export const HankoNotification: React.FC<HankoNotificationProps> = ({
  id,
  type,
  title,
  message,
  expenseName,
  amount,
  onClose,
}) => {
  const config = notificationConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion && type !== 'paid') {
      // Play subtle sound for notifications (except paid which has confetti sound)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = type === 'overdue' ? 600 : 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        // Silently fail if audio context not available
      }
    }
  }, [type]);

  return (
    <div
      className="relative w-80 animate-[notification-slide-in_0.3s_ease-out] mb-3"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Ink splatter background effect */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-20 blur-xl animate-[ink-splatter_0.4s_ease-out]`}
        style={{ zIndex: -1 }}
      />
      
      {/* Main notification card */}
      <div
        className={`relative bg-gradient-to-br ${config.gradient} rounded-lg border-2 ${config.borderColor} shadow-2xl overflow-hidden backdrop-blur-sm`}
        style={{ 
          boxShadow: `0 10px 30px -10px ${config.hankoColor}60, 0 0 20px ${config.hankoColor}30` 
        }}
      >
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-white/50 animate-[progress-countdown_5s_linear]" />
        </div>
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Hanko Stamp */}
            <div className="flex-shrink-0">
              <HankoStamp 
                text={config.hankoText}
                color={config.hankoColor}
                size={70}
                animate={true}
              />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 animate-[fadeIn_0.3s_ease-out_0.2s_both]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 text-white ${config.iconAnimation}`} />
                  <h3 className="font-bold text-white text-sm">{title}</h3>
                </div>
                
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                  aria-label="Close notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-white/90 text-sm mb-2 font-medium">
                {expenseName}
              </p>
              
              <p className="text-white/80 text-xs mb-2">
                {message}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-lg">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
