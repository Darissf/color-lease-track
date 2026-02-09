import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Calculator, Clock, Loader2, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FlexibleDurationClosingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: {
    id: string;
    invoice: string | null;
    start_date: string;
    end_date: string;
    keterangan: string | null;
  };
  onSuccess: () => void;
}

interface LineItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price_per_day: number;
  duration_days: number;
  unit_mode: string;
}

export function FlexibleDurationClosingDialog({ 
  open, 
  onOpenChange, 
  contract, 
  onSuccess 
}: FlexibleDurationClosingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [actualEndDate, setActualEndDate] = useState<Date | undefined>(undefined);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [calculatedBill, setCalculatedBill] = useState(0);

  const startDate = new Date(contract.start_date);

  useEffect(() => {
    if (open) {
      setActualEndDate(new Date());
      fetchLineItems();
    }
  }, [open, contract.id]);

  useEffect(() => {
    if (actualEndDate && lineItems.length > 0) {
      calculateBill();
    }
  }, [actualEndDate, lineItems]);

  const fetchLineItems = async () => {
    const { data } = await supabase
      .from('contract_line_items')
      .select('id, item_name, quantity, unit_price_per_day, duration_days, unit_mode')
      .eq('contract_id', contract.id);
    
    setLineItems((data as LineItem[]) || []);
  };

  const calculateBill = () => {
    if (!actualEndDate) return;
    
    const actualDays = differenceInDays(actualEndDate, startDate) + 1; // +1 to include both start and end days
    
    // Recalculate each line item with actual duration
    let total = 0;
    for (const item of lineItems) {
      const itemTotal = item.quantity * Number(item.unit_price_per_day) * actualDays;
      total += itemTotal;
    }
    
    setCalculatedBill(total);
  };

  const actualDays = actualEndDate 
    ? differenceInDays(actualEndDate, startDate) + 1 
    : 0;

  const handleClose = async () => {
    if (!actualEndDate) {
      toast.error("Mohon pilih tanggal selesai aktual");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update line items with actual duration
      // Note: subtotal is a generated column, no need to update it manually
      for (const item of lineItems) {
        await supabase
          .from('contract_line_items')
          .update({
            duration_days: actualDays,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      }

      // 2. Update contract
      await supabase
        .from('rental_contracts')
        .update({
          end_date: format(actualEndDate, "yyyy-MM-dd"),
          status: 'selesai',
          tagihan: calculatedBill,
          tagihan_belum_bayar: calculatedBill, // Full amount unpaid initially
          is_flexible_duration: false, // Mark as no longer flexible
          tanggal_ambil: format(actualEndDate, "yyyy-MM-dd"),
          status_pengambilan: 'diambil',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      // 3. Regenerate rincian template
      const { data: contractData } = await supabase
        .from('rental_contracts')
        .select('transport_cost_delivery, transport_cost_pickup, discount, whatsapp_template_mode')
        .eq('id', contract.id)
        .single();

      toast.success(`Kontrak berhasil ditutup. Tagihan: ${formatRupiah(calculatedBill)}`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error closing contract:", error);
      toast.error("Gagal menutup kontrak: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Selesaikan & Hitung Tagihan
          </DialogTitle>
          <DialogDescription>
            Kontrak dengan durasi fleksibel - {contract.invoice}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contract info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Durasi Fleksibel</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Tanggal Mulai:</span>{" "}
              <span className="font-medium">
                {format(startDate, "dd MMMM yyyy", { locale: localeId })}
              </span>
            </div>
            {contract.keterangan && (
              <div className="text-sm">
                <span className="text-muted-foreground">Keterangan:</span>{" "}
                <span>{contract.keterangan}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Actual end date picker */}
          <div className="space-y-2">
            <Label>Tanggal Selesai Aktual</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn("w-full justify-start", !actualEndDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {actualEndDate ? format(actualEndDate, "dd MMMM yyyy", { locale: localeId }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={actualEndDate}
                  onSelect={setActualEndDate}
                  disabled={(date) => date < startDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {actualEndDate && (
            <>
              {/* Duration calculation */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Durasi Aktual:</span>
                  <span className="font-bold text-blue-600">{actualDays} hari</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Jumlah Item:</span>
                  <span className="font-medium">{lineItems.length} item</span>
                </div>
              </div>

              {/* Calculated bill */}
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
                <Calculator className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-800 dark:text-green-200">
                      Total Tagihan:
                    </span>
                    <span className="text-xl font-bold text-green-600">
                      {formatRupiah(calculatedBill)}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>

              {lineItems.length === 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Tidak ada rincian item. Tagihan akan dihitung Rp 0.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button 
            onClick={handleClose} 
            disabled={isLoading || !actualEndDate}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Selesaikan Kontrak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
