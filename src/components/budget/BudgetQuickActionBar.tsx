import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Download, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BudgetQuickActionBarProps {
  onQuickExpense?: () => void;
  onEditBudget?: () => void;
  onExport?: () => void;
  onCopyToNextMonth?: () => void;
  onApplyTemplate?: () => void;
}

export const BudgetQuickActionBar = ({
  onQuickExpense,
  onEditBudget,
  onExport,
  onCopyToNextMonth,
  onApplyTemplate,
}: BudgetQuickActionBarProps) => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-300 z-40",
        isSticky && "sticky top-0 bg-background/95 backdrop-blur shadow-md"
      )}
    >
      <div className="container flex items-center gap-2 py-2 flex-wrap">
        {onQuickExpense && (
          <Button size="sm" variant="outline" onClick={onQuickExpense}>
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Tambah Pengeluaran</span>
          </Button>
        )}

        {onEditBudget && (
          <Button size="sm" variant="outline" onClick={onEditBudget}>
            <Edit className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Edit Budget</span>
          </Button>
        )}

        {onExport && (
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onCopyToNextMonth && (
              <DropdownMenuItem onClick={onCopyToNextMonth}>
                Copy ke Bulan Berikutnya
              </DropdownMenuItem>
            )}
            {onApplyTemplate && (
              <DropdownMenuItem onClick={onApplyTemplate}>
                Gunakan Template
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto text-xs text-muted-foreground hidden md:block">
          Tekan <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+K</kbd> untuk commands
        </div>
      </div>
    </div>
  );
};
