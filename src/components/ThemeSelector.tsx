import { Moon, Sun, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/contexts/AppThemeContext';

export function ThemeSelector() {
  const { appTheme, setAppTheme } = useAppTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background border-border z-50">
        <DropdownMenuItem
          onClick={() => setAppTheme('japanese')}
          className={appTheme === 'japanese' ? 'bg-accent' : ''}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Japanese Night</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppTheme('professional')}
          className={appTheme === 'professional' ? 'bg-accent' : ''}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Professional Clean</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppTheme('auto')}
          className={appTheme === 'auto' ? 'bg-accent' : ''}
        >
          <Palette className="mr-2 h-4 w-4" />
          <span>Auto (System)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
