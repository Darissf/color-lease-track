import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatRupiah } from '@/lib/currency';
import { 
  generateRincianTemplate, 
  calculateLineItemSubtotal, 
  calculateTotalItems,
  calculateTotalTransport,
  calculateSubtotal,
  calculateGrandTotal,
  type TemplateData
} from '@/lib/contractTemplateGenerator';
import { Plus, Trash2, Package, Truck, Eye, Save, FileText, Zap, PackageOpen, Tag, FileSignature, Edit3, RefreshCw, AlertCircle, Layers, Unlink } from 'lucide-react';
import { useLineItemGroups, type LineItemGroup, type GroupedLineItem } from '@/hooks/useLineItemGroups';
import { CombineItemsDialog } from './CombineItemsDialog';
import { toast } from 'sonner';

// Extended LineItem interface with unit_mode and group_id
interface LineItem {
  id?: string;
  item_name: string;
  quantity: number;
  unit_price_per_day: number;
  duration_days: number;
  unit_mode?: 'pcs' | 'set';
  pcs_per_set?: number;
  group_id?: string | null;
}

interface ContractLineItemsEditorProps {
  contractId: string;
  existingTemplate?: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ContractLineItemsEditor({ 
  contractId, 
  existingTemplate,
  onSave, 
  onCancel 
}: ContractLineItemsEditorProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [transportDelivery, setTransportDelivery] = useState(0);
  const [transportPickup, setTransportPickup] = useState(0);
  const [contractTitle, setContractTitle] = useState('');
  const [discount, setDiscount] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [whatsappMode, setWhatsappMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingFromStock, setGeneratingFromStock] = useState(false);
  
  // Pengaturan Cepat
  const [defaultPricePerDay, setDefaultPricePerDay] = useState<number | ''>('');
  const [defaultDurationDays, setDefaultDurationDays] = useState<number | ''>('');
  const [priceMode, setPriceMode] = useState<'pcs' | 'set'>('set');
  
  // Mode Penagihan
  const [billingMode, setBillingMode] = useState<'edit' | 'new'>('edit');

  // Combine feature
  const [showCombineDialog, setShowCombineDialog] = useState(false);
  
  // Convert lineItems to GroupedLineItem format for the hook
  const groupedLineItems: GroupedLineItem[] = useMemo(() => 
    lineItems.map((item, index) => ({
      ...item,
      local_index: index,
    })), [lineItems]);

  const {
    groups,
    setGroups,
    selectedIndices,
    toggleSelection,
    clearSelection,
    fetchGroups,
    combineSelectedItems,
    uncombineGroup,
    updateGroupBilling,
    saveGroups,
    calculateGroupSubtotal,
    getIndicesInGroup,
    isIndexInGroup,
    getGroupIndexForItem,
  } = useLineItemGroups(contractId, user?.id);

  useEffect(() => {
    fetchExistingLineItems();
    fetchGroups();
  }, [contractId, fetchGroups]);

  // Removed fetchInventoryItems - no longer needed

  const fetchExistingLineItems = async () => {
    setLoading(true);
    
    // Fetch existing line items
    const { data: lineItemsData } = await supabase
      .from('contract_line_items')
      .select('*')
      .eq('contract_id', contractId)
      .order('sort_order');
    
    if (lineItemsData && lineItemsData.length > 0) {
      setLineItems(lineItemsData.map(item => ({
        id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price_per_day: Number(item.unit_price_per_day),
        duration_days: item.duration_days,
        unit_mode: (item.unit_mode as 'pcs' | 'set') || 'pcs',
        pcs_per_set: item.pcs_per_set || 1,
        group_id: item.group_id,
      })));
    }
    
    // Fetch transport costs, discount, dates, whatsapp mode and quick settings from contract
    const { data: contractData } = await supabase
      .from('rental_contracts')
      .select('transport_cost_delivery, transport_cost_pickup, discount, keterangan, whatsapp_template_mode, start_date, end_date, default_price_per_day, default_duration_days, default_price_mode')
      .eq('id', contractId)
      .single();
    
    if (contractData) {
      setTransportDelivery(Number(contractData.transport_cost_delivery) || 0);
      setTransportPickup(Number(contractData.transport_cost_pickup) || 0);
      setDiscount(Number(contractData.discount) || 0);
      setContractTitle(contractData.keterangan || '');
      setWhatsappMode(contractData.whatsapp_template_mode || false);
      setStartDate(contractData.start_date || '');
      setEndDate(contractData.end_date || '');
      
      // Load quick settings (Pengaturan Cepat)
      // Priority 1: Use saved values from database
      // Priority 2: Fallback to first line item if database values are null
      if (contractData.default_price_per_day !== null) {
        setDefaultPricePerDay(Number(contractData.default_price_per_day));
      } else if (lineItemsData && lineItemsData.length > 0) {
        setDefaultPricePerDay(Number(lineItemsData[0].unit_price_per_day));
      }
      
      if (contractData.default_duration_days !== null) {
        setDefaultDurationDays(contractData.default_duration_days);
      } else if (lineItemsData && lineItemsData.length > 0) {
        setDefaultDurationDays(lineItemsData[0].duration_days);
      }
      
      if (contractData.default_price_mode) {
        setPriceMode(contractData.default_price_mode as 'pcs' | 'set');
      } else if (lineItemsData && lineItemsData.length > 0 && lineItemsData[0].unit_mode) {
        setPriceMode(lineItemsData[0].unit_mode as 'pcs' | 'set');
      }
    }
    
    setLoading(false);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        item_name: '',
        quantity: 1,
        unit_price_per_day: defaultPricePerDay !== '' ? defaultPricePerDay : 0,
        duration_days: defaultDurationDays !== '' ? defaultDurationDays : 30,
      }
    ]);
  };

  const generateFromStock = async () => {
    setGeneratingFromStock(true);
    
    try {
      // Fetch stock items for this contract with unit_mode
      const { data: stockItems, error } = await supabase
        .from('contract_stock_items')
        .select(`
          quantity,
          unit_mode,
          inventory_items (
            item_name,
            unit_price,
            pcs_per_set
          )
        `)
        .eq('contract_id', contractId)
        .is('returned_at', null);
      
      if (error) throw error;
      
      if (!stockItems || stockItems.length === 0) {
        toast.error('Tidak ada item stok barang. Tambahkan item di Rincian Stok Barang terlebih dahulu.');
        return;
      }
      
      // Map stock items to line items with unit_mode
      const generatedItems: LineItem[] = stockItems.map((item: any) => {
        const unitMode = item.unit_mode || 'pcs';
        const pcsPerSet = item.inventory_items?.pcs_per_set || 1;
        // Display quantity based on unit_mode
        const displayQty = unitMode === 'set' && pcsPerSet > 0 
          ? Math.floor(item.quantity / pcsPerSet) 
          : item.quantity;
        
        return {
          item_name: item.inventory_items?.item_name || '',
          quantity: displayQty,
          unit_price_per_day: defaultPricePerDay !== '' ? defaultPricePerDay : (item.inventory_items?.unit_price || 0),
          duration_days: defaultDurationDays !== '' ? defaultDurationDays : 30,
          unit_mode: unitMode,
          pcs_per_set: pcsPerSet,
        };
      });
      
      setLineItems(generatedItems);
      toast.success(`${generatedItems.length} item berhasil di-generate dari stok barang`);
    } catch (error) {
      console.error('Error generating from stock:', error);
      toast.error('Gagal generate dari stok barang');
    } finally {
      setGeneratingFromStock(false);
    }
  };

  const applyDefaultsToAll = () => {
    if (lineItems.length === 0) return;
    
    const updated = lineItems.map(item => ({
      ...item,
      unit_price_per_day: defaultPricePerDay !== '' ? defaultPricePerDay : item.unit_price_per_day,
      duration_days: defaultDurationDays !== '' ? defaultDurationDays : item.duration_days,
    }));
    setLineItems(updated);
    toast.success(`Berhasil diterapkan ke ${lineItems.length} item`);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    const item = updated[index];
    if (field === 'item_name') {
      item.item_name = value as string;
    } else if (field === 'quantity') {
      item.quantity = Number(value) || 0;
    } else if (field === 'unit_price_per_day') {
      item.unit_price_per_day = Number(value) || 0;
    } else if (field === 'duration_days') {
      item.duration_days = Number(value) || 0;
    }
    setLineItems(updated);
  };

  // Removed selectInventoryItem - no longer needed

  const removeLineItem = (index: number) => {
    // Also check if this item is in a group and remove from group
    const groupIdx = getGroupIndexForItem(groupedLineItems, index);
    if (groupIdx >= 0) {
      // Item is in a group - we need to handle this
      toast.error('Un-combine group terlebih dahulu sebelum menghapus item');
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Handle combine confirmation
  const handleCombineConfirm = async (
    billingQuantity: number,
    billingPricePerDay: number,
    billingDurationDays: number,
    billingUnitMode: 'pcs' | 'set'
  ) => {
    await combineSelectedItems(
      groupedLineItems,
      billingQuantity,
      billingPricePerDay,
      billingDurationDays,
      billingUnitMode
    );
    toast.success(`${selectedIndices.size} item berhasil di-combine`);
  };

  // Handle uncombine
  const handleUncombine = (groupIndex: number) => {
    uncombineGroup(groupIndex);
    toast.success('Group berhasil di-uncombine');
  };

  // Get selected items for dialog
  const getSelectedItemsForDialog = () => {
    return Array.from(selectedIndices).map(idx => lineItems[idx]).filter(Boolean);
  };

  // Check if any selected item is already in a group
  const hasSelectedInGroup = () => {
    return Array.from(selectedIndices).some(idx => isIndexInGroup(groupedLineItems, idx));
  };

  const getTemplateData = (): TemplateData => ({
    lineItems,
    groups: groups.map((g, gIdx) => ({
      billing_quantity: g.billing_quantity,
      billing_unit_price_per_day: g.billing_unit_price_per_day,
      billing_duration_days: g.billing_duration_days,
      billing_unit_mode: g.billing_unit_mode,
      item_indices: getIndicesInGroup(groupedLineItems, gIdx),
    })),
    transportDelivery,
    transportPickup,
    contractTitle,
    discount,
    startDate,
    endDate,
    priceMode,
    pricePerUnit: defaultPricePerDay !== '' ? defaultPricePerDay : undefined,
  });

  const handleSave = async () => {
    if (!user) return;
    
    if (lineItems.length === 0) {
      toast.error('Tambahkan minimal 1 item');
      return;
    }

    // Validate all items have names
    const invalidItems = lineItems.filter(item => !item.item_name.trim());
    if (invalidItems.length > 0) {
      toast.error('Semua item harus memiliki nama');
      return;
    }

    setSaving(true);

    try {
      // First, save groups and get the mapping of local indices to group IDs
      const { success: groupsSaved, groupIdMap, indexToGroupIdMap } = await saveGroups(
        lineItems.map(item => item.id || '')
      );

      // Delete existing line items
      await supabase
        .from('contract_line_items')
        .delete()
        .eq('contract_id', contractId);

      // Insert new line items with unit_mode, pcs_per_set, and group_id
      // Use indexToGroupIdMap which correctly maps each item index to its group ID
      const lineItemsToInsert = lineItems.map((item, index) => ({
        user_id: user.id,
        contract_id: contractId,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price_per_day: item.unit_price_per_day,
        duration_days: item.duration_days,
        sort_order: index,
        unit_mode: item.unit_mode || 'pcs',
        pcs_per_set: item.pcs_per_set || 1,
        group_id: indexToGroupIdMap.get(index) || null,
      }));

      const { error: insertError } = await supabase
        .from('contract_line_items')
        .insert(lineItemsToInsert);

      if (insertError) throw insertError;

      // Generate template with current whatsapp mode
      const template = generateRincianTemplate(getTemplateData(), whatsappMode);
      
      // Calculate grand total considering groups
      const grandTotal = calculateTotalWithGroups();

      // Calculate tagihan_belum_bayar based on billing mode
      let tagihanBelumBayar = grandTotal;

      if (billingMode === 'edit') {
        // Mode Edit: Kurangi dengan total yang sudah dibayar
        const { data: payments } = await supabase
          .from('contract_payments')
          .select('amount')
          .eq('contract_id', contractId);

        const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        tagihanBelumBayar = Math.max(0, grandTotal - totalPaid);
      }
      // Mode Tagihan Baru: tagihanBelumBayar = grandTotal (reset)

      // Calculate total units for jumlah_unit: groups billing_qty + non-grouped items qty
      const totalUnitsForContract = (() => {
        const indicesInGroups = new Set<number>();
        const validGroups: typeof groups = [];
        
        groups.forEach((group, gIdx) => {
          const indices = getIndicesInGroup(groupedLineItems, gIdx);
          if (indices.length > 0) {
            validGroups.push(group);
            indices.forEach(idx => indicesInGroups.add(idx));
          }
        });
        
        // Sum: billing_quantity from groups + quantity from non-grouped items
        let total = validGroups.reduce((sum, g) => sum + (g.billing_quantity || 0), 0);
        lineItems.forEach((item, idx) => {
          if (!indicesInGroups.has(idx)) {
            total += item.quantity;
          }
        });
        return total;
      })();

      // Update contract with transport costs, discount, template, quick settings, and jumlah_unit
      const { error: updateError } = await supabase
        .from('rental_contracts')
        .update({
          transport_cost_delivery: transportDelivery,
          transport_cost_pickup: transportPickup,
          discount: discount,
          rincian_template: template,
          tagihan: grandTotal,
          tagihan_belum_bayar: tagihanBelumBayar,
          default_price_per_day: defaultPricePerDay !== '' ? defaultPricePerDay : null,
          default_duration_days: defaultDurationDays !== '' ? defaultDurationDays : null,
          default_price_mode: priceMode,
          jumlah_unit: totalUnitsForContract,
        })
        .eq('id', contractId);

      if (updateError) throw updateError;

      const modeText = billingMode === 'edit' ? 'diperbarui' : 'dibuat baru';
      toast.success(`Rincian kontrak berhasil ${modeText}`);
      onSave();
    } catch (error) {
      console.error('Error saving line items:', error);
      toast.error('Gagal menyimpan rincian');
    } finally {
      setSaving(false);
    }
  };

  // Calculate total considering groups - grouped items use group billing, non-grouped items use individual billing
  const calculateTotalWithGroups = (): number => {
    // Get indices that are in VALID groups only (groups with actual items)
    const indicesInGroups = new Set<number>();
    const validGroups: typeof groups = [];
    
    groups.forEach((group, gIdx) => {
      const indices = getIndicesInGroup(groupedLineItems, gIdx);
      // Only consider groups that have items
      if (indices.length > 0) {
        validGroups.push(group);
        indices.forEach(idx => indicesInGroups.add(idx));
      }
    });

    // Calculate non-grouped items total
    let nonGroupedTotal = 0;
    lineItems.forEach((item, idx) => {
      if (!indicesInGroups.has(idx)) {
        nonGroupedTotal += calculateLineItemSubtotal(item);
      }
    });

    // Calculate grouped items total (from VALID group billing only)
    const groupedTotal = validGroups.reduce((sum, group) => sum + calculateGroupSubtotal(group), 0);

    // Add transport and subtract discount
    const totalTransportCost = calculateTotalTransport(transportDelivery, transportPickup);
    const subtotalWithTransport = nonGroupedTotal + groupedTotal + totalTransportCost;
    return subtotalWithTransport - (discount || 0);
  };

  // Calculate subtotal considering groups for display
  const calculateSubtotalWithGroups = (): number => {
    const indicesInGroups = new Set<number>();
    const validGroups: typeof groups = [];
    
    groups.forEach((group, gIdx) => {
      const indices = getIndicesInGroup(groupedLineItems, gIdx);
      if (indices.length > 0) {
        validGroups.push(group);
        indices.forEach(idx => indicesInGroups.add(idx));
      }
    });

    let nonGroupedTotal = 0;
    lineItems.forEach((item, idx) => {
      if (!indicesInGroups.has(idx)) {
        nonGroupedTotal += calculateLineItemSubtotal(item);
      }
    });

    const groupedTotal = validGroups.reduce((sum, group) => sum + calculateGroupSubtotal(group), 0);
    return nonGroupedTotal + groupedTotal;
  };

  // Use group-aware calculation for subtotal items if groups exist
  const totalItems = groups.length > 0 ? calculateSubtotalWithGroups() : calculateTotalItems(lineItems);
  const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
  const subtotal = calculateSubtotal(getTemplateData());
  // Use group-aware calculation for display
  const grandTotal = groups.length > 0 ? calculateTotalWithGroups() : calculateGrandTotal(getTemplateData());

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Memuat data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Keterangan Kontrak */}
      <Card className="border-dashed border-2 border-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-4 w-4 text-blue-500" />
            Keterangan Kontrak
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Akan muncul di header template (opsional)
          </p>
        </CardHeader>
        <CardContent>
          <Input
            value={contractTitle}
            onChange={(e) => setContractTitle(e.target.value)}
            placeholder="Contoh: Nabila Beli Rumah Kucing"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Rincian Item Sewa
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Combine toolbar */}
              {selectedIndices.size >= 2 && !hasSelectedInGroup() && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowCombineDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Combine ({selectedIndices.size})
                </Button>
              )}
              {selectedIndices.size > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearSelection}
                >
                  Batal Pilih
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateFromStock}
                disabled={generatingFromStock}
                className="border-primary/50 text-primary hover:bg-primary/10"
              >
                <PackageOpen className="h-4 w-4 mr-2" />
                {generatingFromStock ? 'Generating...' : 'Generate dari Stok'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Klik "Generate dari Stok" untuk otomatis mengisi dari Rincian Stok Barang. Pilih 2+ item lalu klik "Combine" untuk menggabungkan billing.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Render groups first */}
          {groups.map((group, groupIndex) => {
            const itemsInGroup = getIndicesInGroup(groupedLineItems, groupIndex);
            if (itemsInGroup.length === 0) return null;
            
            return (
              <div key={`group-${groupIndex}`} className="border-2 border-purple-400/50 rounded-lg overflow-hidden bg-purple-50/30 dark:bg-purple-950/20">
                {/* Group header */}
                <div className="bg-purple-100 dark:bg-purple-900/50 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-sm text-purple-800 dark:text-purple-200">
                      📦 Group {groupIndex + 1}
                    </span>
                    <span className="text-xs text-purple-600 dark:text-purple-300">
                      ({itemsInGroup.length} item)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUncombine(groupIndex)}
                    className="h-7 text-purple-700 hover:text-purple-900 hover:bg-purple-200"
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    Un-combine
                  </Button>
                </div>
                
                {/* Items in group (display only - no editing quantity/price/duration) */}
                <div className="p-3 space-y-2">
                  {itemsInGroup.map(idx => {
                    const item = lineItems[idx];
                    if (!item) return null;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 rounded px-3 py-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{item.quantity} {item.unit_mode === 'set' ? 'Set' : 'Pcs'}</span>
                        <span className="font-medium">{item.item_name}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Group billing settings */}
                <div className="border-t border-purple-200 dark:border-purple-700 p-4 bg-white/50 dark:bg-gray-900/50">
                  <Label className="text-xs text-purple-700 dark:text-purple-300 mb-2 block">Pengaturan Billing Group</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Jumlah</Label>
                      <Input
                        type="number"
                        value={group.billing_quantity}
                        onChange={(e) => updateGroupBilling(groupIndex, 'billing_quantity', e.target.value)}
                        min={1}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mode</Label>
                      <Select 
                        value={group.billing_unit_mode} 
                        onValueChange={(v: 'pcs' | 'set') => updateGroupBilling(groupIndex, 'billing_unit_mode', v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="set">Set</SelectItem>
                          <SelectItem value="pcs">Pcs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Harga/Hari</Label>
                      <Input
                        type="number"
                        value={group.billing_unit_price_per_day}
                        onChange={(e) => updateGroupBilling(groupIndex, 'billing_unit_price_per_day', e.target.value)}
                        min={0}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Durasi (hari)</Label>
                      <Input
                        type="number"
                        value={group.billing_duration_days}
                        onChange={(e) => updateGroupBilling(groupIndex, 'billing_duration_days', e.target.value)}
                        min={1}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="mt-3 text-right">
                    <span className="text-xs text-muted-foreground">Subtotal Group: </span>
                    <span className="font-semibold text-purple-700 dark:text-purple-300">
                      {formatRupiah(calculateGroupSubtotal(group))}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({group.billing_quantity} {group.billing_unit_mode} × {formatRupiah(group.billing_unit_price_per_day)} × {group.billing_duration_days} hari)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Render non-grouped items with checkboxes */}
          {lineItems.map((item, index) => {
            // Skip items that are in a group
            if (isIndexInGroup(groupedLineItems, index)) return null;
            
            const isSelected = selectedIndices.has(index);
            
            return (
              <div 
                key={index} 
                className={`p-4 border rounded-lg space-y-3 transition-colors ${
                  isSelected 
                    ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-300' 
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(index)}
                      className="border-purple-400 data-[state=checked]:bg-purple-600"
                    />
                    <span className="font-medium text-sm">Item #{index + 1}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Nama Item</Label>
                  <Input
                    value={item.item_name}
                    onChange={(e) => updateLineItem(index, 'item_name', e.target.value)}
                    placeholder="Nama item..."
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Jumlah ({item.unit_mode === 'set' ? 'set' : 'pcs'})</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                      min={1}
                      className="h-9"
                    />
                    {item.unit_mode === 'set' && item.pcs_per_set && item.pcs_per_set > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Jadi {item.quantity} set = {item.quantity * item.pcs_per_set} pcs
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Harga/Hari (Rp)</Label>
                    <Input
                      type="number"
                      value={item.unit_price_per_day}
                      onChange={(e) => updateLineItem(index, 'unit_price_per_day', e.target.value)}
                      min={0}
                      className="h-9"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Durasi (hari)</Label>
                    <Input
                      type="number"
                      value={item.duration_days}
                      onChange={(e) => updateLineItem(index, 'duration_days', e.target.value)}
                      min={1}
                      className="h-9"
                    />
                  </div>
                </div>
                
                <div className="text-right text-sm">
                  <span className="text-muted-foreground">Subtotal: </span>
                  <span className="font-semibold text-primary">{formatRupiah(calculateLineItemSubtotal(item))}</span>
                </div>
              </div>
            );
          })}

          <Button variant="outline" onClick={addLineItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Item
          </Button>
        </CardContent>
      </Card>

      {/* Combine Dialog */}
      <CombineItemsDialog
        open={showCombineDialog}
        onClose={() => setShowCombineDialog(false)}
        onConfirm={handleCombineConfirm}
        selectedItems={getSelectedItemsForDialog()}
        defaultPrice={defaultPricePerDay !== '' ? defaultPricePerDay : 0}
        defaultDuration={defaultDurationDays !== '' ? defaultDurationDays : 30}
        defaultMode={priceMode}
      />

      {/* Pengaturan Cepat */}
      <Card className="border-dashed border-2 border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            Pengaturan Cepat (Opsional)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Isi di bawah ini untuk menerapkan harga & durasi yang sama ke semua item sekaligus
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                💰 Harga per Hari (Rp)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={defaultPricePerDay}
                  onChange={(e) => setDefaultPricePerDay(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Harga per unit"
                  min={0}
                  className="flex-1"
                />
                <Select value={priceMode} onValueChange={(v: 'pcs' | 'set') => setPriceMode(v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Per Set</SelectItem>
                    <SelectItem value="pcs">Per Pcs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {priceMode === 'set' 
                  ? 'Harga dihitung per set. Item pcs akan dikonversi ke set.'
                  : 'Harga dihitung per pcs. Item set akan dikonversi ke pcs.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                📅 Durasi (hari)
              </Label>
              <Input
                type="number"
                value={defaultDurationDays}
                onChange={(e) => setDefaultDurationDays(e.target.value ? Number(e.target.value) : '')}
                placeholder="Kosongkan jika manual"
                min={1}
              />
            </div>
            <div className="flex items-end">
              <Button 
                variant="secondary" 
                onClick={applyDefaultsToAll}
                disabled={lineItems.length === 0 || (defaultPricePerDay === '' && defaultDurationDays === '')}
                className="w-full"
              >
                🔄 Terapkan ({lineItems.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subtotal Items */}
      <Card>
        <CardContent className="py-4">
          <div className="text-right">
            <span className="text-muted-foreground">Subtotal Item: </span>
            <span className="font-bold text-lg">{formatRupiah(totalItems)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Ongkos Transport
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ongkos Pengiriman (Rp)</Label>
              <Input
                type="number"
                value={transportDelivery}
                onChange={(e) => setTransportDelivery(Number(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Ongkos Pengambilan (Rp)</Label>
              <Input
                type="number"
                value={transportPickup}
                onChange={(e) => setTransportPickup(Number(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>
          
          <div className="text-right p-3 bg-muted/50 rounded-lg">
            <span className="text-muted-foreground">Total Transport: </span>
            <span className="font-bold text-lg">{formatRupiah(totalTransport)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Diskon */}
      <Card className="border-dashed border-2 border-green-400/50 bg-green-50/30 dark:bg-green-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-green-500" />
            Diskon (Opsional)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Kosongkan atau isi 0 jika tidak ada diskon
          </p>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            value={discount || ''}
            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            placeholder="0"
            min={0}
          />
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal (Item + Transport)</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <span>🏷️ Diskon</span>
              <span>-{formatRupiah(discount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">💵 Total Tagihan</span>
            <span className="text-2xl font-bold text-primary">{formatRupiah(grandTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Preview Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-mono text-sm p-4 bg-muted rounded-lg overflow-x-auto">
              {generateRincianTemplate(getTemplateData(), whatsappMode)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Mode Penagihan - Hanya Admin/Super Admin */}
      {(isAdmin || isSuperAdmin) && (
        <Card className="bg-amber-50/50 dark:bg-amber-950/30 border-amber-300/50">
          <CardContent className="py-4 space-y-4">
            {/* Header dengan Toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {billingMode === 'edit' ? (
                  <Edit3 className="h-5 w-5 text-blue-600" />
                ) : (
                  <RefreshCw className="h-5 w-5 text-orange-600" />
                )}
                <Label className="text-base font-semibold">Mode Penagihan</Label>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${billingMode === 'edit' ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
                  Edit Tagihan
                </span>
                <Switch 
                  checked={billingMode === 'new'} 
                  onCheckedChange={(checked) => setBillingMode(checked ? 'new' : 'edit')}
                />
                <span className={`text-sm ${billingMode === 'new' ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                  Tagihan Baru
                </span>
              </div>
            </div>

            <Separator />

            {/* Penjelasan dan Contoh berdasarkan Mode */}
            {billingMode === 'edit' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Memperbarui tagihan yang sudah ada
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pembayaran yang sudah dilakukan akan tetap dihitung. Sisa tagihan = Total Baru - Sudah Dibayar.
                    </p>
                  </div>
                </div>
                <div className="bg-blue-100/50 dark:bg-blue-900/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">📌 Contoh Penggunaan:</p>
                  <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <li>• Tagihan lama: <strong>Rp 100.000</strong></li>
                    <li>• Sudah dibayar: <strong>Rp 50.000</strong></li>
                    <li>• Tagihan baru diubah menjadi: <strong>Rp 120.000</strong></li>
                    <li className="pt-1 border-t border-blue-200 dark:border-blue-700 mt-1">
                      ➔ <strong>Hasil:</strong> Sisa tagihan = 120.000 - 50.000 = <strong className="text-blue-800 dark:text-blue-200">Rp 70.000</strong>
                    </li>
                  </ul>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-3 italic">
                    💡 Gunakan mode ini untuk koreksi harga/durasi tanpa menghapus pembayaran yang sudah ada.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                      Membuat tagihan baru (reset total)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sisa tagihan sebelumnya diabaikan. Tagihan dimulai dari nol dengan total yang baru.
                    </p>
                  </div>
                </div>
                <div className="bg-orange-100/50 dark:bg-orange-900/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2">📌 Contoh Penggunaan:</p>
                  <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                    <li>• Tagihan lama: <strong>Rp 100.000</strong></li>
                    <li>• Sudah dibayar: <strong>Rp 50.000</strong> (sisa Rp 50.000)</li>
                    <li>• Tagihan baru dibuat: <strong>Rp 100.000</strong></li>
                    <li className="pt-1 border-t border-orange-200 dark:border-orange-700 mt-1">
                      ➔ <strong>Hasil:</strong> Sisa tagihan = <strong className="text-orange-800 dark:text-orange-200">Rp 100.000</strong> (bukan Rp 150.000)
                    </li>
                  </ul>
                  <p className="text-xs text-orange-500 dark:text-orange-400 mt-3 italic">
                    💡 Gunakan mode ini untuk perpanjangan sewa atau buat tagihan baru yang terpisah dari tagihan sebelumnya.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowPreview(!showPreview)}
          disabled={lineItems.length === 0}
        >
          <Eye className="h-4 w-4 mr-2" />
          {showPreview ? 'Sembunyikan' : 'Preview'}
        </Button>
        <Button onClick={handleSave} disabled={saving || lineItems.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Menyimpan...' : 'Simpan Rincian'}
        </Button>
      </div>
    </div>
  );
}
