import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTheme } from '@/components/ui/theme-provider';

type AccentTheme = 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'japanese' | 'aurora' | 'cyberpunk' | 'galaxy' | 'artdeco' | 'forest' | 'ocean' | 'fireplace';

// Deprecated old theme types - kept for backward compatibility during migration
type LegacyAppTheme = 'japanese' | 'professional' | 'ocean-bali' | 'sunset-warm' | 'bamboo-zen' | 'sakura-bloom' | 'neon-cyber' | 'mountain-stone';

interface AppThemeContextType {
  accentTheme: AccentTheme;
  setAccentTheme: (theme: AccentTheme) => void;
  isDarkMode: boolean;
  // Deprecated properties - will be removed after full migration
  /** @deprecated Use CSS variables instead */
  activeTheme?: string;
  /** @deprecated Use CSS variables instead */
  appTheme?: string;
  /** @deprecated Use CSS variables instead */
  setAppTheme?: (theme: any) => void;
  /** @deprecated Use CSS variables instead */
  themeColors?: any;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { theme: systemTheme } = useTheme();
  const [accentTheme, setAccentThemeState] = useState<AccentTheme>(() => {
    const saved = localStorage.getItem('accent_theme_preference');
    return (saved as AccentTheme) || 'blue';
  });

  const setAccentTheme = (theme: AccentTheme) => {
    setAccentThemeState(theme);
    localStorage.setItem('accent_theme_preference', theme);
  };

  // Determine dark mode based on system theme
  const isDarkMode = systemTheme === 'dark';

  // Set data-accent attribute on document for global CSS targeting
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentTheme);
  }, [accentTheme]);

  return (
    <AppThemeContext.Provider value={{ 
      accentTheme, 
      setAccentTheme, 
      isDarkMode,
      // Deprecated - provided for backward compatibility only
      activeTheme: undefined,
      appTheme: undefined,
      setAppTheme: undefined,
      themeColors: undefined
    }}>
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
