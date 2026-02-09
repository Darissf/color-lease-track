import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, AlertTriangle, Copy, Clock, Loader2 } from "lucide-react";
import { format, addDays, addYears } from "date-fns";
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
  const [durationMode, setDurationMode] = useState<'flexible' | 'fixed'>('fixed');
  const [durationDays, setDurationDays] = useState<number>(30);
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
  
  // Preview counts for UI
  const [lineItemCount, setLineItemCount] = useState<number>(0);
  const [stockItemCount, setStockItemCount] = useState<number>(0);

  // Initialize dates when dialog opens
  useEffect(() => {
    if (open && contract) {
      const newStartDate = addDays(new Date(contract.end_date), 1);
      setStartDate(newStartDate);
      setDurationMode('fixed');
      setDurationDays(30); // Default 30 days
      setTransferUnpaidBalance(false);
      setCopyLineItems(true);
      setCopyStockItems(true);
      
      // Fetch auto invoice settings
      fetchAutoInvoiceSettings();
      // Fetch item counts for preview
      fetchItemCounts();
    }
  }, [open, contract]);

  const fetchItemCounts = async () => {
    if (!contract) return;
    
    // Count line items
    const { count: lineCount } = await supabase
      .from('contract_line_items')
      .select('*', { count: 'exact', head: true })
      .eq('contract_id', contract.id);
    
    // Count stock items (all items, including returned - for extension)
    const { count: stockCount } = await supabase
      .from('contract_stock_items')
      .select('*', { count: 'exact', head: true })
      .eq('contract_id', contract.id);
    
    setLineItemCount(lineCount || 0);
    setStockItemCount(stockCount || 0);
  };

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
      
      // Calculate next invoice number - check reusable pool first
      if (docSettings.auto_invoice_enabled) {
        // Check if there's a reusable invoice number from deleted contracts
        const { data: reusableNumber } = await supabase
          .from("deleted_invoice_numbers")
          .select("invoice_number")
          .eq("user_id", user.id)
          .order("invoice_sequence", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (reusableNumber) {
          setNextInvoiceNumber(reusableNumber.invoice_number);
        } else {
          const nextNumber = (docSettings.auto_invoice_current ?? 0) + 1;
          const paddedNumber = String(nextNumber).padStart(docSettings.auto_invoice_padding ?? 6, '0');
          setNextInvoiceNumber(`${docSettings.auto_invoice_prefix ?? ''}${paddedNumber}`);
        }
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
    if (!user || !startDate) {
      toast.error("Mohon pilih tanggal mulai");
      return;
    }
    
    if (durationMode === 'fixed' && (!durationDays || durationDays < 1)) {
      toast.error("Mohon masukkan durasi minimal 1 hari");
      return;
    }
    
    // Hitung end_date
    let endDate: Date;
    if (durationMode === 'flexible') {
      // Placeholder: 1 tahun dari start
      endDate = addYears(startDate, 1);
    } else {
      endDate = addDays(startDate, durationDays - 1);
    }

    setIsLoading(true);
    try {
      // 1. Generate invoice number - check reusable pool first
      let invoiceNumber = nextInvoiceNumber;
      let usedReusableInvoice = false;

      if (autoInvoiceSettings?.enabled) {
        // Check if there's a reusable invoice number from deleted contracts
        const { data: reusableNumber } = await supabase
          .from("deleted_invoice_numbers")
          .select("id, invoice_number, invoice_sequence")
          .eq("user_id", user.id)
          .order("invoice_sequence", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (reusableNumber) {
          // Use number from pool
          invoiceNumber = reusableNumber.invoice_number;
          usedReusableInvoice = true;
          
          // Remove from pool after using
          await supabase
            .from("deleted_invoice_numbers")
            .delete()
            .eq("id", reusableNumber.id);
        }
      }

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
          is_flexible_duration: durationMode === 'flexible',
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

      // 3. Update Auto Invoice counter only if we didn't use a reusable number
      if (autoInvoiceSettings?.enabled && !usedReusableInvoice) {
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

      // Track what was copied for toast message
      let copiedLineItemsCount = 0;
      let copiedStockItemsCount = 0;

      // 5. Copy line items if selected
      if (copyLineItems && newContract) {
        console.log(`[Extension v2.1] Starting to copy line items from contract ${contract.id}...`);
        console.log(`[Extension v2.1] BUILD: 2026-02-09T02:20:00Z - subtotal excluded`);
        
        // Copy line item groups first
        console.log(`[Extension v2.1] Fetching line item groups...`);
        const { data: groups, error: groupsFetchError } = await supabase
          .from('contract_line_item_groups')
          .select('*')
          .eq('contract_id', contract.id);

        if (groupsFetchError) {
          console.error('[Extension v2.1] Error fetching groups:', groupsFetchError);
          throw new Error(`Gagal mengambil data groups: ${groupsFetchError.message}`);
        }

        console.log(`[Extension v2.1] Found ${groups?.length || 0} groups to copy`);

        const groupIdMap: Record<string, string> = {};

        if (groups && groups.length > 0) {
          for (const group of groups) {
            const { data: newGroup, error: groupInsertError } = await supabase
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

            if (groupInsertError) {
              console.error('[Extension v2.1] Error inserting group:', groupInsertError);
              throw new Error(`Gagal copy group: ${groupInsertError.message}`);
            }

            if (newGroup) {
              groupIdMap[group.id] = newGroup.id;
              console.log(`[Extension v2.1] Copied group ${group.group_name || group.id} -> ${newGroup.id}`);
            }
          }
        }

        // Copy line items
        console.log(`[Extension v2.1] Fetching line items...`);
        const { data: lineItems, error: lineItemsFetchError } = await supabase
          .from('contract_line_items')
          .select('*')
          .eq('contract_id', contract.id);

        if (lineItemsFetchError) {
          console.error('[Extension v2.1] Error fetching line items:', lineItemsFetchError);
          throw new Error(`Gagal mengambil data line items: ${lineItemsFetchError.message}`);
        }

        console.log(`[Extension v2.1] Found ${lineItems?.length || 0} line items to copy`);

        if (lineItems && lineItems.length > 0) {
          const newLineItems = lineItems.map(item => {
            const mappedItem = {
              user_id: user.id,
              contract_id: newContract.id,
              item_name: item.item_name,
              quantity: item.quantity,
              unit_price_per_day: item.unit_price_per_day,
              duration_days: item.duration_days,
              // subtotal is a generated column - do not include
              unit_mode: item.unit_mode || 'pcs',
              pcs_per_set: item.pcs_per_set || 1,
              inventory_item_id: item.inventory_item_id || null,
              group_id: item.group_id ? groupIdMap[item.group_id] : null,
              sort_order: item.sort_order || 0,
            };
            console.log(`[Extension v2.1] Mapping line item: ${item.item_name}`);
            return mappedItem;
          });

          console.log(`[Extension v2.1] Inserting ${newLineItems.length} line items...`);
          const { data: insertedLineItems, error: lineItemsError } = await supabase
            .from('contract_line_items')
            .insert(newLineItems)
            .select();
            
          if (lineItemsError) {
            console.error('[Extension v2.1] Error copying line items:', lineItemsError);
            throw new Error(`Gagal copy rincian item sewa: ${lineItemsError.message}`);
          }

          copiedLineItemsCount = insertedLineItems?.length || 0;
          console.log(`[Extension v2.1] ✅ Successfully copied ${copiedLineItemsCount} line items`);
        }
      }

      // 6. Copy stock items if selected - TANPA filter returned_at
      // Karena perpanjangan = barang masih di lokasi client
      if (copyStockItems && newContract) {
        console.log(`[Extension v2.1] Starting to copy stock items from contract ${contract.id}...`);
        
        const { data: stockItems, error: stockFetchError } = await supabase
          .from('contract_stock_items')
          .select('*')
          .eq('contract_id', contract.id);
          // Tidak filter returned_at - copy semua items untuk perpanjangan

        if (stockFetchError) {
          console.error('[Extension v2.1] Error fetching stock items:', stockFetchError);
          throw new Error(`Gagal mengambil data stok: ${stockFetchError.message}`);
        }

        console.log(`[Extension v2.1] Found ${stockItems?.length || 0} stock items to copy`);

        if (stockItems && stockItems.length > 0) {
          const newStockItems = stockItems.map(item => {
            const mappedItem = {
              user_id: user.id,
              contract_id: newContract.id,
              inventory_item_id: item.inventory_item_id,
              quantity: item.quantity,
              unit_mode: item.unit_mode || 'pcs',
              // Marker khusus: barang ini dari perpanjangan, tidak mengurangi gudang
              notes: `Lanjutan dari ${contract.invoice}`,
              added_at: format(startDate, "yyyy-MM-dd"),
            };
            console.log(`[Extension v2.1] Mapping stock item: inventory_id=${item.inventory_item_id}, qty=${item.quantity}`);
            return mappedItem;
          });

          console.log(`[Extension v2.1] Inserting ${newStockItems.length} stock items...`);
          // Insert tanpa membuat inventory_movement karena barang sudah di lokasi client
          const { data: insertedStockItems, error: stockError } = await supabase
            .from('contract_stock_items')
            .insert(newStockItems)
            .select();
            
          if (stockError) {
            console.error('[Extension v2.1] Error copying stock items:', stockError);
            throw new Error(`Gagal copy rincian stok barang: ${stockError.message}`);
          }

          copiedStockItemsCount = insertedStockItems?.length || 0;
          console.log(`[Extension v2.1] ✅ Successfully copied ${copiedStockItemsCount} stock items`);
        }
      }

      // Success toast with copy counts
      const copyInfo = [];
      if (copiedLineItemsCount > 0) copyInfo.push(`${copiedLineItemsCount} rincian item`);
      if (copiedStockItemsCount > 0) copyInfo.push(`${copiedStockItemsCount} stok`);
      
      const copyMessage = copyInfo.length > 0 ? `. ${copyInfo.join(' dan ')} tercopy.` : '';
      toast.success(`Kontrak berhasil diperpanjang dengan invoice ${invoiceNumber}${copyMessage}`);
      
      console.log(`[Extension v2.1] ✅ Extension complete! Invoice: ${invoiceNumber}, Line Items: ${copiedLineItemsCount}, Stock Items: ${copiedStockItemsCount}`);
      
      onOpenChange(false);
      onSuccess(newContract.id);
    } catch (error: any) {
      console.error("[Extension v2.1] ❌ Error extending contract:", error);
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
            
              {/* Tanggal Mulai */}
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
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Mode Durasi */}
              <div className="space-y-3">
                <Label>Mode Durasi</Label>
                <RadioGroup value={durationMode} onValueChange={(v) => setDurationMode(v as 'flexible' | 'fixed')}>
                  <div className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    durationMode === 'flexible' ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700" : "bg-background"
                  )}>
                    <RadioGroupItem value="flexible" id="extend-flexible" className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor="extend-flexible" className="flex items-center gap-2 cursor-pointer">
                        <Clock className="h-4 w-4 text-blue-600" />
                        Fleksibel
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Client belum tahu akan perpanjang berapa lama, tagihan dihitung saat closing
                      </p>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    durationMode === 'fixed' ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700" : "bg-background"
                  )}>
                    <RadioGroupItem value="fixed" id="extend-fixed" />
                    <Label htmlFor="extend-fixed" className="cursor-pointer">Durasi Tetap</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Durasi & Preview Tanggal Selesai - hanya tampil jika mode fixed */}
              {durationMode === 'fixed' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Durasi (hari) *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                      placeholder="Contoh: 30"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tanggal Selesai</Label>
                    <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {startDate && durationDays > 0 ? (
                        <span className="font-medium text-sm">
                          {format(addDays(startDate, durationDays - 1), "dd/MM/yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
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

          {/* Copy options with preview counts */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Copy Data ke Kontrak Baru</p>
            
            {/* Preview info */}
            {(lineItemCount > 0 || stockItemCount > 0) && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">Data yang tersedia untuk dicopy:</p>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                  {lineItemCount > 0 && (
                    <li className="flex items-center gap-2">
                      <span>📋 Rincian Item Sewa:</span>
                      <Badge variant="secondary">{lineItemCount} item</Badge>
                    </li>
                  )}
                  {stockItemCount > 0 && (
                    <li className="flex items-center gap-2">
                      <span>📦 Rincian Stok Barang:</span>
                      <Badge variant="secondary">{stockItemCount} item</Badge>
                      <span className="text-xs text-blue-600 dark:text-blue-400">(tidak mengurangi gudang)</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="copy-line-items"
                checked={copyLineItems}
                onCheckedChange={(checked) => setCopyLineItems(checked === true)}
              />
              <Label htmlFor="copy-line-items" className="cursor-pointer flex items-center gap-2">
                Copy Rincian Item Sewa (Line Items)
                {lineItemCount > 0 && <Badge variant="outline" className="text-xs">{lineItemCount}</Badge>}
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="copy-stock-items"
                checked={copyStockItems}
                onCheckedChange={(checked) => setCopyStockItems(checked === true)}
              />
              <Label htmlFor="copy-stock-items" className="cursor-pointer flex items-center gap-2">
                Copy Rincian Stok Barang
                {stockItemCount > 0 && <Badge variant="outline" className="text-xs">{stockItemCount}</Badge>}
              </Label>
            </div>
            
            {stockItemCount > 0 && copyStockItems && (
              <p className="text-xs text-muted-foreground pl-6">
                ℹ️ Stok barang akan dicopy tanpa mengurangi gudang karena barang sudah di lokasi client
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button onClick={handleExtend} disabled={isLoading || !startDate || (durationMode === 'fixed' && durationDays < 1)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buat Perpanjangan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
