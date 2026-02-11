import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Activity } from "lucide-react";
import { ItemHistoryStats } from "./ItemHistoryStats";
import { ItemContractHistory } from "./ItemContractHistory";
import { ItemMovementTimeline } from "./ItemMovementTimeline";

interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  total_quantity: number;
  unit_type: string;
}

interface InventoryItemHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

interface ContractRecord {
  id: string;
  invoice: string;
  client_name: string;
  quantity: number;
  start_date: string;
  end_date: string;
  status: string;
  location: string | null;
  returned_at: string | null;
}

interface MovementRecord {
  id: string;
  movement_date: string;
  movement_type: string;
  quantity: number;
  contract_invoice: string | null;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
}

export function InventoryItemHistory({
  open,
  onOpenChange,
  item,
}: InventoryItemHistoryProps) {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && item?.id) {
      fetchHistory();
    }
  }, [open, item?.id]);

  const fetchHistory = async () => {
    if (!item?.id) return;

    setLoading(true);
    try {
      // Fetch contract stock items with contract details
      const { data: stockItems, error: stockError } = await supabase
        .from("contract_stock_items")
        .select(`
          id,
          quantity,
          added_at,
          returned_at,
          contract_id,
          rental_contracts!contract_stock_items_contract_id_fkey (
            id,
            invoice,
            start_date,
            end_date,
            status,
            lokasi_detail,
            client_groups (
              nama
            )
          )
        `)
        .eq("inventory_item_id", item.id)
        .order("added_at", { ascending: false });

      if (stockError) throw stockError;

      // Transform contract data
      const contractRecords: ContractRecord[] = (stockItems || [])
        .filter((si: any) => si.rental_contracts)
        .map((si: any) => ({
          id: si.rental_contracts.id,
          invoice: si.rental_contracts.invoice || "N/A",
          client_name: si.rental_contracts.client_groups?.nama || "Unknown",
          quantity: si.quantity,
          start_date: si.rental_contracts.start_date,
          end_date: si.rental_contracts.end_date,
          status: si.rental_contracts.status,
          location: si.rental_contracts.lokasi_detail,
          returned_at: si.returned_at,
        }));

      setContracts(contractRecords);

      // Fetch movements with period data
      const { data: movementData, error: movementError } = await supabase
        .from("inventory_movements")
        .select(`
          id,
          movement_date,
          movement_type,
          quantity,
          notes,
          period_start,
          period_end,
          contract_id,
          rental_contracts (
            invoice
          )
        `)
        .eq("inventory_item_id", item.id)
        .order("movement_date", { ascending: false })
        .limit(100);

      if (movementError) throw movementError;

      const movementRecords: MovementRecord[] = (movementData || []).map((m: any) => ({
        id: m.id,
        movement_date: m.movement_date,
        movement_type: m.movement_type,
        quantity: m.quantity,
        contract_invoice: m.rental_contracts?.invoice || null,
        notes: m.notes,
        period_start: m.period_start || null,
        period_end: m.period_end || null,
      }));

      setMovements(movementRecords);
    } catch (error) {
      console.error("Error fetching item history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalRentals = contracts.length;
  const activeRentals = contracts.filter(
    (c) => c.status.toLowerCase() !== "selesai" && !c.returned_at
  ).length;
  const completedRentals = totalRentals - activeRentals;
  const totalUnitDays = contracts.reduce((sum, c) => {
    const days = differenceInDays(new Date(c.end_date), new Date(c.start_date)) + 1;
    return sum + c.quantity * days;
  }, 0);

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-4 sm:p-6">
        <SheetHeader className="pb-3 border-b">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">
              {item.item_code}
            </Badge>
            <Badge variant="secondary" className="text-xs">{item.category}</Badge>
          </div>
          <SheetTitle className="text-base sm:text-xl">{item.item_name}</SheetTitle>
          <SheetDescription className="text-xs sm:text-sm">
            Stok total: {item.total_quantity} {item.unit_type}
          </SheetDescription>
        </SheetHeader>

        <div className="py-3">
          <ItemHistoryStats
            totalRentals={totalRentals}
            activeRentals={activeRentals}
            completedRentals={completedRentals}
            totalUnitDays={totalUnitDays}
          />
        </div>

        <Tabs defaultValue="contracts" className="flex-1">
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="contracts" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Riwayat Kontrak</span>
              <span className="sm:hidden">Kontrak</span>
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-1.5 text-xs sm:text-sm">
              <Activity className="h-3.5 w-3.5" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-340px)] sm:h-[calc(100vh-380px)] mt-3">
            <TabsContent value="contracts" className="mt-0 pr-2">
              <ItemContractHistory contracts={contracts} loading={loading} />
            </TabsContent>

            <TabsContent value="movements" className="mt-0 pr-2">
              <ItemMovementTimeline movements={movements} loading={loading} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
