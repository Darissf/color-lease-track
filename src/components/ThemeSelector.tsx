import { Moon, Sun, Palette, Waves, Sunset, Leaf, Sparkles, Box } from 'lucide-react';
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
          <Moon className="mr-2 h-4 w-4 text-purple-400" />
          <span>Japanese Night</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppTheme('professional')}
          className={appTheme === 'professional' ? 'bg-accent' : ''}
        >
          <Sun className="mr-2 h-4 w-4 text-blue-500" />
          <span>Professional Clean</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppTheme('ocean-bali')}
          className={appTheme === 'ocean-bali' ? 'bg-accent' : ''}
        >
          <Waves className="mr-2 h-4 w-4 text-cyan-500" />
          <span>Ocean Bali</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppTheme('sunset-warm')}
          className={appTheme === 'sunset-warm' ? 'bg-accent' : ''}
        >
          <Sunset className="mr-2 h-4 w-4 text-orange-500" />
          <span>Sunset Warm</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppTheme('bamboo-zen')}
          className={appTheme === 'bamboo-zen' ? 'bg-accent' : ''}
        >
          <Leaf className="mr-2 h-4 w-4 text-green-500" />
          <span>Bamboo Zen</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppTheme('sakura-bloom')}
          className={appTheme === 'sakura-bloom' ? 'bg-accent' : ''}
        >
          <Sparkles className="mr-2 h-4 w-4 text-pink-500" />
          <span>Sakura Bloom</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppTheme('neon-cyber')}
          className={appTheme === 'neon-cyber' ? 'bg-accent' : ''}
        >
          <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
          <span>Neon Cyber</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppTheme('mountain-stone')}
          className={appTheme === 'mountain-stone' ? 'bg-accent' : ''}
        >
          <Box className="mr-2 h-4 w-4 text-gray-500" />
          <span>Mountain Stone</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
