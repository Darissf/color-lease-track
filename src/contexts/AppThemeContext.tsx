import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTheme } from '@/components/ui/theme-provider';

type AppTheme = 
  | 'japanese'       // Japanese Night
  | 'professional'   // Professional Clean
  | 'ocean-bali'     // Ocean Bali - Tropical blue
  | 'sunset-warm'    // Sunset Warm - Orange/coral
  | 'bamboo-zen'     // Bamboo Zen - Green earthy
  | 'sakura-bloom'   // Sakura Bloom - Pink soft
  | 'neon-cyber'     // Neon Cyber - Purple/blue neon
  | 'mountain-stone'; // Mountain Stone - Grey industrial

interface ThemeColors {
  text: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
  chartAxis: string;
  chartGrid: string;
  chartTooltipBg: string;
  chartTooltipBorder: string;
  hoverOverlay: string;
}

interface AppThemeContextType {
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void;
  activeTheme: 'japanese' | 'professional' | 'ocean-bali' | 'sunset-warm' | 'bamboo-zen' | 'sakura-bloom' | 'neon-cyber' | 'mountain-stone';
  themeColors: ThemeColors;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

const japaneseColors: ThemeColors = {
  text: '#FFFFFF',
  textSecondary: '#E2E8F0',
  textMuted: '#94A3B8',
  cardBg: 'bg-slate-900/90',
  cardBorder: 'border-slate-700',
  chartAxis: '#94A3B8',
  chartGrid: '#334155',
  chartTooltipBg: 'rgba(15, 23, 42, 0.95)',
  chartTooltipBorder: '#475569',
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
};

const professionalColors: ThemeColors = {
  text: 'hsl(var(--foreground))',
  textSecondary: 'hsl(var(--foreground))',
  textMuted: 'hsl(var(--muted-foreground))',
  cardBg: 'bg-card',
  cardBorder: 'border-border',
  chartAxis: 'hsl(var(--muted-foreground))',
  chartGrid: 'hsl(var(--border))',
  chartTooltipBg: 'hsl(var(--popover))',
  chartTooltipBorder: 'hsl(var(--border))',
  hoverOverlay: 'hsl(var(--muted) / 0.5)',
};

const oceanBaliColors: ThemeColors = {
  text: '#FFFFFF',
  textSecondary: '#BDE0FE',
  textMuted: '#87CEEB',
  cardBg: 'bg-cyan-900/90',
  cardBorder: 'border-cyan-700',
  chartAxis: '#87CEEB',
  chartGrid: '#0E7490',
  chartTooltipBg: 'rgba(8, 51, 68, 0.95)',
  chartTooltipBorder: '#0891B2',
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
};

const sunsetWarmColors: ThemeColors = {
  text: '#FFFFFF',
  textSecondary: '#FED7AA',
  textMuted: '#FDBA74',
  cardBg: 'bg-orange-900/90',
  cardBorder: 'border-orange-700',
  chartAxis: '#FDBA74',
  chartGrid: '#C2410C',
  chartTooltipBg: 'rgba(67, 20, 7, 0.95)',
  chartTooltipBorder: '#EA580C',
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
};

const bambooZenColors: ThemeColors = {
  text: '#FFFFFF',
  textSecondary: '#BBF7D0',
  textMuted: '#86EFAC',
  cardBg: 'bg-green-900/90',
  cardBorder: 'border-green-700',
  chartAxis: '#86EFAC',
  chartGrid: '#166534',
  chartTooltipBg: 'rgba(5, 46, 22, 0.95)',
  chartTooltipBorder: '#16A34A',
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
};

const sakuraBloomColors: ThemeColors = {
  text: '#FFFFFF',
  textSecondary: '#FBCFE8',
  textMuted: '#F9A8D4',
  cardBg: 'bg-pink-900/90',
  cardBorder: 'border-pink-700',
  chartAxis: '#F9A8D4',
  chartGrid: '#9F1239',
  chartTooltipBg: 'rgba(76, 5, 25, 0.95)',
  chartTooltipBorder: '#DB2777',
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
};

const neonCyberColors: ThemeColors = {
  text: '#FFFFFF',
  textSecondary: '#C4B5FD',
  textMuted: '#A78BFA',
  cardBg: 'bg-purple-900/90',
  cardBorder: 'border-purple-700',
  chartAxis: '#A78BFA',
  chartGrid: '#6B21A8',
  chartTooltipBg: 'rgba(46, 16, 101, 0.95)',
  chartTooltipBorder: '#9333EA',
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
};

const mountainStoneColors: ThemeColors = {
  text: '#FFFFFF',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  cardBg: 'bg-gray-800/90',
  cardBorder: 'border-gray-600',
  chartAxis: '#9CA3AF',
  chartGrid: '#374151',
  chartTooltipBg: 'rgba(31, 41, 55, 0.95)',
  chartTooltipBorder: '#4B5563',
  hoverOverlay: 'rgba(255, 255, 255, 0.05)',
};

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { theme: systemTheme } = useTheme();
  const [appTheme, setAppThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('app_theme_preference');
    return (saved as AppTheme) || 'japanese';
  });

  const setAppTheme = (theme: AppTheme) => {
    setAppThemeState(theme);
    localStorage.setItem('app_theme_preference', theme);
  };

  // Determine active theme based on preference
  const activeTheme = appTheme;

  const themeColors = (() => {
    switch (activeTheme) {
      case 'japanese': return japaneseColors;
      case 'professional': return professionalColors;
      case 'ocean-bali': return oceanBaliColors;
      case 'sunset-warm': return sunsetWarmColors;
      case 'bamboo-zen': return bambooZenColors;
      case 'sakura-bloom': return sakuraBloomColors;
      case 'neon-cyber': return neonCyberColors;
      case 'mountain-stone': return mountainStoneColors;
      default: return japaneseColors;
    }
  })();

  // Set data-theme attribute on document for global CSS targeting
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    
    // Remove all possible theme classes
    const allThemes: AppTheme[] = ['japanese', 'professional', 'ocean-bali', 'sunset-warm', 'bamboo-zen', 'sakura-bloom', 'neon-cyber', 'mountain-stone'];
    allThemes.forEach(theme => {
      document.body.classList.remove(`theme-${theme}`);
    });
    
    // Add the active theme class
    document.body.classList.add(`theme-${activeTheme}`);
  }, [activeTheme]);

  return (
    <AppThemeContext.Provider value={{ appTheme, setAppTheme, activeTheme, themeColors }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
}
