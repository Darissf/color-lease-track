import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { CategoryProgress } from "@/types/budgetTypes";
import { formatRupiah } from "@/lib/currency";
import { ColoredProgressBar } from "@/components/ColoredProgressBar";
import { CategoryBadge } from "@/components/CategoryBadge";

interface CategoryProgressCardProps {
  progress: CategoryProgress;
  onAddExpense?: () => void;
}

export const CategoryProgressCard = ({ progress, onAddExpense }: CategoryProgressCardProps) => {
  const getStatusColor = () => {
    switch (progress.status) {
      case 'over':
        return 'destructive';
      case 'danger':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'over':
        return 'Over Budget';
      case 'danger':
        return 'Hampir Habis';
      case 'warning':
        return 'Perhatian';
      default:
        return 'Aman';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CategoryBadge category={progress.category} />
          {(progress.status === 'over' || progress.status === 'danger') && (
            <Badge variant={getStatusColor()}>
              {getStatusText()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Alokasi:</span>
            <span className="font-medium">{formatRupiah(progress.allocated)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Terpakai:</span>
            <span className="font-medium">{formatRupiah(progress.spent)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sisa:</span>
            <span className={`font-medium ${
              progress.remaining < 0 ? 'text-destructive' : 'text-green-600'
            }`}>
              {formatRupiah(progress.remaining)}
            </span>
          </div>
        </div>

        <ColoredProgressBar value={progress.percentage} />

        <div className="text-center text-sm font-semibold">
          {progress.percentage.toFixed(1)}% digunakan
        </div>

        {onAddExpense && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onAddExpense}
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pengeluaran
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
