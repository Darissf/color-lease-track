import { useState } from "react";
import { CategoryProgress } from "@/types/budgetTypes";
import { CategoryProgressCard } from "./CategoryProgressCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, ArrowUpDown } from "lucide-react";

interface CategoryBudgetOverviewProps {
  categoryProgress: CategoryProgress[];
  onAddExpense?: (category: string) => void;
}

export const CategoryBudgetOverview = ({
  categoryProgress,
  onAddExpense
}: CategoryBudgetOverviewProps) => {
  const [filter, setFilter] = useState<'all' | 'safe' | 'warning' | 'danger' | 'over'>('all');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'highest_spent' | 'most_over'>('alphabetical');

  const getFilteredCategories = () => {
    let filtered = categoryProgress;

    // Apply filter
    if (filter !== 'all') {
      filtered = filtered.filter(cat => cat.status === filter);
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'highest_spent':
          return b.spent - a.spent;
        case 'most_over':
          return b.percentage - a.percentage;
        case 'alphabetical':
        default:
          return a.category.localeCompare(b.category);
      }
    });

    return sorted;
  };

  const filteredCategories = getFilteredCategories();

  const getCounts = () => {
    return {
      all: categoryProgress.length,
      safe: categoryProgress.filter(c => c.status === 'safe').length,
      warning: categoryProgress.filter(c => c.status === 'warning').length,
      danger: categoryProgress.filter(c => c.status === 'danger').length,
      over: categoryProgress.filter(c => c.status === 'over').length,
    };
  };

  const counts = getCounts();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua ({counts.all})</SelectItem>
              <SelectItem value="safe">Aman ({counts.safe})</SelectItem>
              <SelectItem value="warning">Perhatian ({counts.warning})</SelectItem>
              <SelectItem value="danger">Hampir Habis ({counts.danger})</SelectItem>
              <SelectItem value="over">Over Budget ({counts.over})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4" />
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="highest_spent">Tertinggi</SelectItem>
              <SelectItem value="most_over">Paling Over</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Tidak ada kategori dengan filter ini
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map(progress => (
            <CategoryProgressCard
              key={progress.category}
              progress={progress}
              onAddExpense={onAddExpense ? () => onAddExpense(progress.category) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
