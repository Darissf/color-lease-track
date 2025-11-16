import { useEffect } from 'react';

interface ShortcutHandlers {
  onCreateBudget?: () => void;
  onAddExpense?: () => void;
  onSave?: () => void;
  onOpenCommandPalette?: () => void;
}

export const useBudgetKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (!modKey) return;
      
      switch(e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handlers.onCreateBudget?.();
          break;
        case 'e':
          e.preventDefault();
          handlers.onAddExpense?.();
          break;
        case 's':
          e.preventDefault();
          handlers.onSave?.();
          break;
        case 'k':
        case '/':
          e.preventDefault();
          handlers.onOpenCommandPalette?.();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
