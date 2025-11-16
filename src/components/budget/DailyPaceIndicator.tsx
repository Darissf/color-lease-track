import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Info, Settings } from "lucide-react";
import { formatRupiah } from "@/lib/currency";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

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
  isOverPace: initialIsOverPace,
  projectedTotal,
  targetBudget
}: DailyPaceIndicatorProps) => {
  const [tolerance, setTolerance] = useState(10);
  const actualPercentage = (actualSpending / targetBudget) * 100;
  const projectedPercentage = (projectedTotal / targetBudget) * 100;
  const difference = actualSpending - expectedSpending;
  const isOverPace = actualSpending > expectedSpending * (1 + tolerance / 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOverPace ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600" />
            )}
            Kecepatan Pengeluaran
          </div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="h-4 w-4" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Toleransi Over Pace</h4>
                <p className="text-xs text-muted-foreground">
                  Atur batas toleransi untuk penentuan apakah pengeluaran terlalu cepat
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Toleransi:</span>
                    <span className="text-sm font-medium">{tolerance}%</span>
                  </div>
                  <Slider
                    value={[tolerance]}
                    onValueChange={(value) => setTolerance(value[0])}
                    min={0}
                    max={30}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pengeluaran Saat Ini:</span>
            <span className="font-medium">{formatRupiah(actualSpending)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Seharusnya:</span>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-64">
                  <p className="text-xs">
                    <strong>Rumus:</strong> (Target Budget ÷ Jumlah Hari dalam Bulan) × Hari Saat Ini
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pengeluaran ideal berdasarkan hari yang sudah berjalan dalam bulan ini
                  </p>
                </HoverCardContent>
              </HoverCard>
            </div>
            <span className="font-medium">{formatRupiah(expectedSpending)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Selisih:</span>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-64">
                  <p className="text-xs">
                    <strong>Rumus:</strong> Pengeluaran Saat Ini - Seharusnya
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Positif (+) berarti pengeluaran lebih cepat dari seharusnya. Negatif (-) berarti masih dalam track.
                  </p>
                </HoverCardContent>
              </HoverCard>
            </div>
            <span className={`font-medium ${difference > 0 ? 'text-destructive' : 'text-green-600'}`}>
              {difference > 0 ? '+' : difference < 0 ? '-' : ''}{formatRupiah(Math.abs(difference))}
            </span>
          </div>
        </div>

        <Progress value={actualPercentage} className="h-2" />

        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between text-sm items-center">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Proyeksi Akhir Bulan:</span>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3 w-3" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-64">
                  <p className="text-xs">
                    <strong>Rumus:</strong> (Pengeluaran Saat Ini ÷ Hari Saat Ini) × Jumlah Hari dalam Bulan
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimasi total pengeluaran di akhir bulan jika pola pengeluaran tetap sama
                  </p>
                </HoverCardContent>
              </HoverCard>
            </div>
            <span className={`font-semibold ${
              projectedTotal > targetBudget ? 'text-destructive' : 'text-green-600'
            }`}>
              {formatRupiah(projectedTotal)}
            </span>
          </div>
          <div className="text-xs text-center">
            {isOverPace ? (
              <span className="text-destructive">
                ⚠️ Pengeluaran {tolerance > 0 ? `${tolerance}% lebih` : ''} cepat! Proyeksi melebihi budget {projectedPercentage.toFixed(0)}%
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
