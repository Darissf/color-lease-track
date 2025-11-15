import React, { useState, useEffect } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calculator, Calendar, Smile, TrendingUp, DollarSign, PieChart } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommand: (command: string) => void;
}

const QUICK_COMMANDS = [
  {
    group: 'Expenses',
    items: [
      { icon: DollarSign, label: 'Show this month expenses', command: 'Show my expenses for this month' },
      { icon: TrendingUp, label: 'Biggest expenses', command: 'What are my biggest expenses this month?' },
      { icon: PieChart, label: 'Expense breakdown', command: 'Show expense breakdown by category' },
    ]
  },
  {
    group: 'Income',
    items: [
      { icon: DollarSign, label: 'Show income', command: 'Show my income for this month' },
      { icon: TrendingUp, label: 'Income trend', command: 'Show my income trend over the last 6 months' },
    ]
  },
  {
    group: 'Analysis',
    items: [
      { icon: Calculator, label: 'Financial summary', command: 'Give me a financial summary for this month' },
      { icon: Calendar, label: 'Budget analysis', command: 'How am I doing against my budget?' },
      { icon: Smile, label: 'Savings tips', command: 'Give me personalized savings tips' },
    ]
  },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  open, 
  onOpenChange, 
  onCommand 
}) => {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (command: string) => {
    onCommand(command);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {QUICK_COMMANDS.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => handleSelect(item.command)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
};
