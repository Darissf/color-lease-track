import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatRupiah } from "@/lib/currency";

interface DailyPaceIndicatorProps {
  expectedSpending: number;
  actualSpending: number;
  isOverPace: boolean;
  projectedTotal: number;
  targetBudget: number;
}

export const DailyPaceIndicator = ({
  expectedSpending,
  actualSpending,
  isOverPace,
  projectedTotal,
  targetBudget
}: DailyPaceIndicatorProps) => {
  const actualPercentage = (actualSpending / targetBudget) * 100;
  const projectedPercentage = (projectedTotal / targetBudget) * 100;
  const difference = actualSpending - expectedSpending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {isOverPace ? (
            <TrendingUp className="h-4 w-4 text-destructive" />
          ) : (
            <TrendingDown className="h-4 w-4 text-green-600" />
          )}
          Kecepatan Pengeluaran
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pengeluaran Saat Ini:</span>
            <span className="font-medium">{formatRupiah(actualSpending)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Seharusnya:</span>
            <span className="font-medium">{formatRupiah(expectedSpending)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Selisih:</span>
            <span className={`font-medium ${difference > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {difference > 0 ? '+' : difference < 0 ? '-' : ''}{formatRupiah(Math.abs(difference))}
            </span>
          </div>
        </div>

        <Progress value={actualPercentage} className="h-2" />

        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Proyeksi Akhir Bulan:</span>
            <span className={`font-semibold ${
              projectedTotal > targetBudget ? 'text-destructive' : 'text-green-600'
            }`}>
              {formatRupiah(projectedTotal)}
            </span>
          </div>
          <div className="text-xs text-center">
            {isOverPace ? (
              <span className="text-destructive">
                ⚠️ Pengeluaran terlalu cepat! Proyeksi melebihi budget {projectedPercentage.toFixed(0)}%
              </span>
            ) : (
              <span className="text-green-600">
                ✓ Anda on track! Tetap pertahankan pola pengeluaran ini
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
