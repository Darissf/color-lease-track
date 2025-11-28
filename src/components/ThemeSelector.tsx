import { Palette, Sun, Moon, Sparkles, Zap, Mountain } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useTheme } from '@/components/ui/theme-provider';

const accentThemes = [
  { 
    value: 'blue' as const, 
    label: 'Modern Blue', 
    color: 'bg-blue-500',
    icon: Palette,
    category: 'Modern'
  },
  { 
    value: 'green' as const, 
    label: 'Nature Green', 
    color: 'bg-emerald-500',
    icon: Mountain,
    category: 'Modern'
  },
  { 
    value: 'purple' as const, 
    label: 'Elegant Purple', 
    color: 'bg-purple-500',
    icon: Sparkles,
    category: 'Modern'
  },
  { 
    value: 'orange' as const, 
    label: 'Warm Orange', 
    color: 'bg-orange-500',
    icon: Sun,
    category: 'Modern'
  },
  { 
    value: 'teal' as const, 
    label: 'Ocean Teal', 
    color: 'bg-cyan-500',
    icon: Palette,
    category: 'Modern'
  },
  { 
    value: 'japanese' as const, 
    label: 'Japanese Night', 
    color: 'bg-gradient-to-r from-indigo-600 to-purple-600',
    icon: Sparkles,
    category: 'Atmospheric',
    animated: true
  },
  { 
    value: 'aurora' as const, 
    label: 'Aurora Borealis', 
    color: 'bg-gradient-to-r from-cyan-400 via-green-400 to-purple-500',
    icon: Zap,
    category: 'Atmospheric',
    animated: true
  },
  { 
    value: 'cyberpunk' as const, 
    label: 'Cyberpunk Neon', 
    color: 'bg-gradient-to-r from-pink-500 to-cyan-500',
    icon: Zap,
    category: 'Atmospheric',
    animated: true
  },
];

export function ThemeSelector() {
  const { accentTheme, setAccentTheme } = useAppTheme();
  const { theme, setTheme } = useTheme();

  const modernThemes = accentThemes.filter(t => t.category === 'Modern');
  const atmosphericThemes = accentThemes.filter(t => t.category === 'Atmospheric');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-background border-border z-50">
        <DropdownMenuLabel>Modern Themes</DropdownMenuLabel>
        {modernThemes.map((accentOption) => {
          const Icon = accentOption.icon;
          return (
            <DropdownMenuItem
              key={accentOption.value}
              onClick={() => setAccentTheme(accentOption.value)}
              className={accentTheme === accentOption.value ? 'bg-accent' : ''}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`h-8 w-8 rounded-lg ${accentOption.color} flex items-center justify-center shadow-sm`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="flex-1">{accentOption.label}</span>
                {accentTheme === accentOption.value && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Atmospheric (Animated)
        </DropdownMenuLabel>
        {atmosphericThemes.map((accentOption) => {
          const Icon = accentOption.icon;
          return (
            <DropdownMenuItem
              key={accentOption.value}
              onClick={() => setAccentTheme(accentOption.value)}
              className={accentTheme === accentOption.value ? 'bg-accent' : ''}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`h-8 w-8 rounded-lg ${accentOption.color} flex items-center justify-center shadow-sm`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="flex-1">{accentOption.label}</span>
                {accentOption.animated && (
                  <Sparkles className="h-3 w-3 text-muted-foreground" />
                )}
                {accentTheme === accentOption.value && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Palette className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
