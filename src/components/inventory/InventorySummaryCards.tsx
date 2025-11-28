import { Package, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppTheme } from "@/contexts/AppThemeContext";

interface InventorySummaryCardsProps {
  totalItems: number;
  totalQuantity: number;
  availableQuantity: number;
  rentedQuantity: number;
  lowStockCount: number;
}

export function InventorySummaryCards({
  totalItems,
  totalQuantity,
  availableQuantity,
  rentedQuantity,
  lowStockCount,
}: InventorySummaryCardsProps) {
  const { activeTheme } = useAppTheme();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Barang
          </CardTitle>
          <Package className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{totalItems}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalQuantity} unit total
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Stok Tersedia
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{availableQuantity}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Siap disewakan
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Sedang Disewa
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{rentedQuantity}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Di lokasi proyek
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Stok Rendah
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{lowStockCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Perlu penambahan
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
