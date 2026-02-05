import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, AlertTriangle, Copy, Clock, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExtendContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: {
    id: string;
    invoice: string | null;
    client_group_id: string;
    start_date: string;
    end_date: string;
    tagihan_belum_bayar: number;
    keterangan: string | null;
    bank_account_id: string | null;
    google_maps_link: string | null;
    notes: string | null;
    extension_number?: number;
    client_groups?: {
      nama: string;
    };
  };
  onSuccess: (newContractId: string) => void;
}

export function ExtendContractDialog({ 
  open, 
  onOpenChange, 
  contract, 
  onSuccess 
}: ExtendContractDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isFlexibleDuration, setIsFlexibleDuration] = useState(false);
  const [transferUnpaidBalance, setTransferUnpaidBalance] = useState(false);
  const [copyLineItems, setCopyLineItems] = useState(true);
  const [copyStockItems, setCopyStockItems] = useState(true);
  
  // Auto Invoice settings
  const [autoInvoiceSettings, setAutoInvoiceSettings] = useState<{
    enabled: boolean;
    prefix: string;
    current: number;
    padding: number;
  } | null>(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>("");

  // Initialize dates when dialog opens
  useEffect(() => {
    if (open && contract) {
      const newStartDate = addDays(new Date(contract.end_date), 1);
      setStartDate(newStartDate);
      setEndDate(addDays(newStartDate, 30)); // Default 30 days
      setIsFlexibleDuration(false);
      setTransferUnpaidBalance(false);
      setCopyLineItems(true);
      setCopyStockItems(true);
      
      // Fetch auto invoice settings
      fetchAutoInvoiceSettings();
    }
  }, [open, contract]);

  const fetchAutoInvoiceSettings = async () => {
    if (!user) return;
    
    const { data: docSettings } = await supabase
      .from("document_settings")
      .select("auto_invoice_enabled, auto_invoice_prefix, auto_invoice_current, auto_invoice_padding")
      .eq("user_id", user.id)
      .maybeSingle();

    if (docSettings) {
      setAutoInvoiceSettings({
        enabled: docSettings.auto_invoice_enabled ?? false,
        prefix: docSettings.auto_invoice_prefix ?? "",
        current: docSettings.auto_invoice_current ?? 0,
        padding: docSettings.auto_invoice_padding ?? 6,
      });
      
      // Calculate next invoice number
      if (docSettings.auto_invoice_enabled) {
        const nextNumber = (docSettings.auto_invoice_current ?? 0) + 1;
        const paddedNumber = String(nextNumber).padStart(docSettings.auto_invoice_padding ?? 6, '0');
        setNextInvoiceNumber(`${docSettings.auto_invoice_prefix ?? ''}${paddedNumber}`);
      } else {
        // Fallback format
        const extensionNumber = (contract.extension_number ?? 0) + 1;
        setNextInvoiceNumber(`${contract.invoice}-P${extensionNumber}`);
      }
    } else {
      // Fallback format
      const extensionNumber = (contract.extension_number ?? 0) + 1;
      setNextInvoiceNumber(`${contract.invoice}-P${extensionNumber}`);
    }
  };

  const handleExtend = async () => {
    if (!user || !startDate || !endDate) {
      toast.error("Mohon lengkapi tanggal mulai dan selesai");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Generate invoice number
      let invoiceNumber = nextInvoiceNumber;

      // 2. Insert new contract
      const { data: newContract, error: insertError } = await supabase
        .from('rental_contracts')
        .insert({
          user_id: user.id,
          client_group_id: contract.client_group_id,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          status: 'masa sewa',
          invoice: invoiceNumber,
          parent_contract_id: contract.id,
          extension_number: (contract.extension_number ?? 0) + 1,
          is_flexible_duration: isFlexibleDuration,
          tagihan: transferUnpaidBalance ? contract.tagihan_belum_bayar : 0,
          tagihan_belum_bayar: transferUnpaidBalance ? contract.tagihan_belum_bayar : 0,
          keterangan: contract.keterangan,
          bank_account_id: contract.bank_account_id,
          google_maps_link: contract.google_maps_link,
          notes: `Perpanjangan dari ${contract.invoice}`,
          tanggal_kirim: format(startDate, "yyyy-MM-dd"),
        } as any)
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 3. Update Auto Invoice counter if enabled
      if (autoInvoiceSettings?.enabled) {
        await supabase
          .from("document_settings")
          .update({
            auto_invoice_current: autoInvoiceSettings.current + 1,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
      }

      // 4. Update old contract to selesai
      const updateData: Record<string, any> = {
        status: 'selesai',
        updated_at: new Date().toISOString(),
      };
      
      if (transferUnpaidBalance) {
        updateData.tagihan_belum_bayar = 0;
      }
      
      await supabase
        .from('rental_contracts')
        .update(updateData)
        .eq('id', contract.id);

      // 5. Copy line items if selected
      if (copyLineItems && newContract) {
        // Copy line item groups first
        const { data: groups } = await supabase
          .from('contract_line_item_groups')
          .select('*')
          .eq('contract_id', contract.id);

        const groupIdMap: Record<string, string> = {};

        if (groups && groups.length > 0) {
          for (const group of groups) {
            const { data: newGroup } = await supabase
              .from('contract_line_item_groups')
              .insert({
                user_id: user.id,
                contract_id: newContract.id,
                group_name: group.group_name,
                billing_quantity: group.billing_quantity,
                billing_unit_price_per_day: group.billing_unit_price_per_day,
                billing_duration_days: group.billing_duration_days,
                billing_unit_mode: group.billing_unit_mode,
                sort_order: group.sort_order,
              })
              .select('id')
              .single();

            if (newGroup) {
              groupIdMap[group.id] = newGroup.id;
            }
          }
        }

        // Copy line items
        const { data: lineItems } = await supabase
          .from('contract_line_items')
          .select('*')
          .eq('contract_id', contract.id);

        if (lineItems && lineItems.length > 0) {
          const newLineItems = lineItems.map(item => ({
            user_id: user.id,
            contract_id: newContract.id,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price_per_day: item.unit_price_per_day,
            duration_days: item.duration_days,
            subtotal: item.subtotal,
            unit_mode: item.unit_mode,
            pcs_per_set: item.pcs_per_set,
            inventory_item_id: item.inventory_item_id,
            group_id: item.group_id ? groupIdMap[item.group_id] : null,
            sort_order: item.sort_order,
          }));

          await supabase
            .from('contract_line_items')
            .insert(newLineItems);
        }
      }

      // 6. Copy stock items if selected
      if (copyStockItems && newContract) {
        const { data: stockItems } = await supabase
          .from('contract_stock_items')
          .select('*')
          .eq('contract_id', contract.id)
          .is('returned_at', null); // Only copy items that haven't been returned

        if (stockItems && stockItems.length > 0) {
          const newStockItems = stockItems.map(item => ({
            user_id: user.id,
            contract_id: newContract.id,
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity,
            unit_mode: item.unit_mode,
            notes: item.notes,
            added_at: format(startDate, "yyyy-MM-dd"),
          }));

          await supabase
            .from('contract_stock_items')
            .insert(newStockItems);
        }
      }

      toast.success(`Kontrak berhasil diperpanjang dengan invoice ${invoiceNumber}`);
      onOpenChange(false);
      onSuccess(newContract.id);
    } catch (error: any) {
      console.error("Error extending contract:", error);
      toast.error("Gagal memperpanjang kontrak: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasUnpaidBalance = contract.tagihan_belum_bayar > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Perpanjang Kontrak
          </DialogTitle>
          <DialogDescription>
            Buat kontrak perpanjangan dari kontrak yang sudah ada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Unpaid balance warning */}
          {hasUnpaidBalance && (
            <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <p className="font-medium">Kontrak ini memiliki sisa tagihan</p>
                <p className="text-lg font-bold">{formatRupiah(contract.tagihan_belum_bayar)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    id="transfer-balance"
                    checked={transferUnpaidBalance}
                    onCheckedChange={(checked) => setTransferUnpaidBalance(checked === true)}
                  />
                  <Label htmlFor="transfer-balance" className="text-sm cursor-pointer">
                    Pindahkan sisa tagihan ke kontrak baru
                  </Label>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Original contract info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">Kontrak Asal</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Invoice:</span>{" "}
                <span className="font-medium">{contract.invoice || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Client:</span>{" "}
                <span className="font-medium">{contract.client_groups?.nama || "-"}</span>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Periode:</span>{" "}
              <span className="font-medium">
                {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}
              </span>
            </div>
          </div>

          <Separator />

          {/* New period */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Periode Baru</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Pilih"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date && endDate && date > endDate) {
                          setEndDate(addDays(date, 30));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Tanggal Selesai
                  {isFlexibleDuration && (
                    <Badge variant="outline" className="ml-1 text-xs">Perkiraan</Badge>
                  )}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Pilih"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Flexible duration toggle */}
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
              <Switch
                id="flexible-duration"
                checked={isFlexibleDuration}
                onCheckedChange={setIsFlexibleDuration}
              />
              <div className="space-y-1">
                <Label htmlFor="flexible-duration" className="flex items-center gap-2 cursor-pointer">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Durasi Fleksibel
                </Label>
                <p className="text-xs text-muted-foreground">
                  Client belum tahu akan perpanjang berapa lama, tagihan dihitung saat closing
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* New Invoice */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Invoice Baru</p>
            <div className="flex items-center gap-2">
              {autoInvoiceSettings?.enabled ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Auto Invoice ON
                </Badge>
              ) : (
                <Badge variant="outline">Manual</Badge>
              )}
              <Input
                value={nextInvoiceNumber}
                readOnly={autoInvoiceSettings?.enabled}
                onChange={(e) => !autoInvoiceSettings?.enabled && setNextInvoiceNumber(e.target.value)}
                className={cn(
                  "font-mono",
                  autoInvoiceSettings?.enabled && "bg-muted"
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Copy options */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Opsi Copy Data</p>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="copy-line-items"
                checked={copyLineItems}
                onCheckedChange={(checked) => setCopyLineItems(checked === true)}
              />
              <Label htmlFor="copy-line-items" className="cursor-pointer">
                Copy Rincian Item Sewa (Line Items)
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="copy-stock-items"
                checked={copyStockItems}
                onCheckedChange={(checked) => setCopyStockItems(checked === true)}
              />
              <Label htmlFor="copy-stock-items" className="cursor-pointer">
                Copy Rincian Stok Barang
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button onClick={handleExtend} disabled={isLoading || !startDate || !endDate}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buat Perpanjangan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
