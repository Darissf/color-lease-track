import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTheme } from '@/components/ui/theme-provider';

type AppTheme = 'japanese' | 'professional' | 'auto';

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
  activeTheme: 'japanese' | 'professional';
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

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { theme: systemTheme } = useTheme();
  const [appTheme, setAppThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('app_theme_preference');
    return (saved as AppTheme) || 'auto';
  });

  const setAppTheme = (theme: AppTheme) => {
    setAppThemeState(theme);
    localStorage.setItem('app_theme_preference', theme);
  };

  // Determine active theme based on preference and system theme
  const activeTheme: 'japanese' | 'professional' = (() => {
    if (appTheme === 'japanese') return 'japanese';
    if (appTheme === 'professional') return 'professional';
    
    // Auto mode - follow system theme
    if (systemTheme === 'dark') return 'japanese';
    if (systemTheme === 'light') return 'professional';
    
    // System mode - check actual preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? 'japanese' : 'professional';
  })();

  const themeColors = activeTheme === 'japanese' ? japaneseColors : professionalColors;

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
