import { Palette, Sun, Moon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useTheme } from '@/components/ui/theme-provider';

const accentThemes = [
  { value: 'blue' as const, label: 'Modern Blue', color: 'bg-blue-500' },
  { value: 'green' as const, label: 'Nature Green', color: 'bg-emerald-500' },
  { value: 'purple' as const, label: 'Elegant Purple', color: 'bg-purple-500' },
  { value: 'orange' as const, label: 'Warm Orange', color: 'bg-orange-500' },
  { value: 'teal' as const, label: 'Ocean Teal', color: 'bg-cyan-500' },
];

export function ThemeSelector() {
  const { accentTheme, setAccentTheme } = useAppTheme();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background border-border z-50">
        <div className="px-2 py-1.5 text-sm font-semibold">Accent Theme</div>
        {accentThemes.map((accentOption) => (
          <DropdownMenuItem
            key={accentOption.value}
            onClick={() => setAccentTheme(accentOption.value)}
            className={accentTheme === accentOption.value ? 'bg-accent' : ''}
          >
            <div className={`mr-2 h-4 w-4 rounded ${accentOption.color}`} />
            <span>{accentOption.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-sm font-semibold">Appearance</div>
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
