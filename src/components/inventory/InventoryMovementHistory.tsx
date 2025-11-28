import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowUp, ArrowDown, RefreshCw, Truck, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  notes: string | null;
  movement_date: string;
  inventory_items: {
    item_code: string;
    item_name: string;
  };
  rental_contracts: {
    invoice: string;
  } | null;
}

interface InventoryMovementHistoryProps {
  itemId?: string;
}

export function InventoryMovementHistory({ itemId }: InventoryMovementHistoryProps) {
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMovements();
    }
  }, [user, itemId]);

  const fetchMovements = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from("inventory_movements")
        .select(`
          *,
          inventory_items(item_code, item_name),
          rental_contracts(invoice)
        `)
        .eq("user_id", user.id)
        .order("movement_date", { ascending: false })
        .limit(50);

      if (itemId) {
        query = query.eq("inventory_item_id", itemId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "in":
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      case "out":
        return <ArrowUp className="h-4 w-4 text-red-500" />;
      case "rental":
        return <Truck className="h-4 w-4 text-blue-500" />;
      case "return":
        return <PackageCheck className="h-4 w-4 text-green-500" />;
      case "adjustment":
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getMovementLabel = (type: string) => {
    const labels: Record<string, string> = {
      in: "Masuk",
      out: "Keluar",
      rental: "Sewa",
      return: "Kembali",
      adjustment: "Penyesuaian",
    };
    return labels[type] || type;
  };

  const getMovementBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      in: "default",
      out: "destructive",
      rental: "secondary",
      return: "default",
      adjustment: "outline",
    };
    return variants[type] || "outline";
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Memuat riwayat pergerakan...</p>
      </Card>
    );
  }

  if (movements.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Belum ada riwayat pergerakan barang</p>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Barang</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
            <TableHead>Kontrak</TableHead>
            <TableHead>Catatan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => (
            <TableRow key={movement.id}>
              <TableCell className="text-sm">
                {format(new Date(movement.movement_date), "dd MMM yyyy HH:mm", {
                  locale: localeId,
                })}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium text-sm">
                    {movement.inventory_items?.item_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {movement.inventory_items?.item_code}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getMovementBadge(movement.movement_type)}>
                  <span className="flex items-center gap-1">
                    {getMovementIcon(movement.movement_type)}
                    {getMovementLabel(movement.movement_type)}
                  </span>
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {movement.movement_type === "in" || movement.movement_type === "return"
                  ? `+${movement.quantity}`
                  : `-${movement.quantity}`}
              </TableCell>
              <TableCell className="text-sm">
                {movement.rental_contracts?.invoice || "-"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {movement.notes || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
