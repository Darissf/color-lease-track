import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Package, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface InventoryItem {
  id: string;
  item_name: string;
  item_code: string;
  category: string;
  total_quantity: number;
  unit_type: string;
  pcs_per_set: number;
}

interface StockItem {
  id?: string;
  inventory_item_id: string;
  quantity: number; // Always in pcs (base unit)
  unit_mode: 'pcs' | 'set';
  item_name?: string;
  item_code?: string;
  unit_type?: string;
  pcs_per_set?: number;
  available_stock?: number;
}

interface ContractStockItemsEditorProps {
  contractId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function ContractStockItemsEditor({ 
  contractId, 
  onSave, 
  onCancel 
}: ContractStockItemsEditorProps) {
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [originalItems, setOriginalItems] = useState<StockItem[]>([]);
  const [contractStatus, setContractStatus] = useState<string | null>(null);
  const [contractReturnDate, setContractReturnDate] = useState<string | null>(null);
  const [contractStartDate, setContractStartDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [contractId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch contract status and return date
    const { data: contractData } = await supabase
      .from('rental_contracts')
      .select('status, tanggal_ambil, start_date')
      .eq('id', contractId)
      .single();

    if (contractData) {
      setContractStatus(contractData.status);
      setContractReturnDate(contractData.tanggal_ambil);
      setContractStartDate(contractData.start_date);
    }

    // Fetch inventory items with calculated available stock
    const { data: invData } = await supabase
      .from('inventory_items')
      .select('id, item_name, item_code, category, total_quantity, unit_type, pcs_per_set')
      .eq('is_active', true)
      .order('item_name');
    
    if (invData) {
      // Get current stock usage from inventory_movements
      const { data: movements } = await supabase
        .from('inventory_movements')
        .select('inventory_item_id, movement_type, quantity');
      
      const stockUsage: Record<string, number> = {};
      movements?.forEach(m => {
        if (!stockUsage[m.inventory_item_id]) stockUsage[m.inventory_item_id] = 0;
        if (m.movement_type === 'rental' || m.movement_type === 'out') {
          stockUsage[m.inventory_item_id] -= m.quantity;
        } else if (m.movement_type === 'return' || m.movement_type === 'in') {
          stockUsage[m.inventory_item_id] += m.quantity;
        }
      });
      
      const itemsWithStock = invData.map(item => ({
        ...item,
        pcs_per_set: item.pcs_per_set || 1,
        available_stock: item.total_quantity + (stockUsage[item.id] || 0)
      }));
      
      setInventoryItems(itemsWithStock as any);
    }
    
    // Fetch existing stock items for this contract
    const { data: existingItems } = await supabase
      .from('contract_stock_items')
      .select(`
        id,
        inventory_item_id,
        quantity,
        unit_mode,
        inventory_items (
          item_name,
          item_code,
          unit_type,
          pcs_per_set
        )
      `)
      .eq('contract_id', contractId)
      .is('returned_at', null);
    
    if (existingItems) {
      const mapped = existingItems.map((item: any) => ({
        id: item.id,
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity, // This is in pcs
        unit_mode: (item.unit_mode || 'pcs') as 'pcs' | 'set',
        item_name: item.inventory_items?.item_name,
        item_code: item.inventory_items?.item_code,
        unit_type: item.inventory_items?.unit_type,
        pcs_per_set: item.inventory_items?.pcs_per_set || 1,
      }));
      setStockItems(mapped);
      // Deep clone untuk originalItems agar tidak ter-mutasi saat edit stockItems
      setOriginalItems(JSON.parse(JSON.stringify(mapped)));
    }
    
    setLoading(false);
  };

  const getAvailableStock = (inventoryItemId: string): number => {
    const item = inventoryItems.find(i => i.id === inventoryItemId);
    if (!item) return 0;
    
    // Add back current contract's usage
    const currentUsage = originalItems
      .filter(o => o.inventory_item_id === inventoryItemId)
      .reduce((sum, o) => sum + o.quantity, 0);
    
    return (item as any).available_stock + currentUsage;
  };

  const addStockItem = () => {
    setStockItems([
      ...stockItems,
      {
        inventory_item_id: '',
        quantity: 1,
        unit_mode: 'pcs',
      }
    ]);
  };

  const selectInventoryItem = (index: number, itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      const updated = [...stockItems];
      updated[index] = {
        ...updated[index],
        inventory_item_id: itemId,
        item_name: item.item_name,
        item_code: item.item_code,
        unit_type: item.unit_type,
        pcs_per_set: item.pcs_per_set || 1,
        available_stock: getAvailableStock(itemId),
      };
      setStockItems(updated);
    }
  };

  const updateQuantity = (index: number, displayQty: number) => {
    const updated = [...stockItems];
    const item = updated[index];
    const pcsPerSet = item.pcs_per_set || 1;
    
    // Convert to pcs based on mode
    if (item.unit_mode === 'set') {
      updated[index].quantity = displayQty * pcsPerSet;
    } else {
      updated[index].quantity = displayQty;
    }
    setStockItems(updated);
  };

  const updateUnitMode = (index: number, mode: 'pcs' | 'set') => {
    const updated = [...stockItems];
    const item = updated[index];
    const pcsPerSet = item.pcs_per_set || 1;
    const oldMode = item.unit_mode;
    
    // Get current display quantity based on OLD mode
    let currentDisplayQty: number;
    if (oldMode === 'set' && pcsPerSet > 1) {
      currentDisplayQty = Math.floor(item.quantity / pcsPerSet);
    } else {
      currentDisplayQty = item.quantity;
    }
    
    // Re-calculate quantity based on NEW mode with SAME display value
    if (mode === 'set' && pcsPerSet > 1) {
      updated[index].quantity = currentDisplayQty * pcsPerSet;
    } else {
      updated[index].quantity = currentDisplayQty;
    }
    
    updated[index].unit_mode = mode;
    setStockItems(updated);
  };

  const getDisplayQuantity = (item: StockItem): number => {
    const pcsPerSet = item.pcs_per_set || 1;
    if (item.unit_mode === 'set' && pcsPerSet > 1) {
      return Math.floor(item.quantity / pcsPerSet);
    }
    return item.quantity;
  };

  const removeStockItem = (index: number) => {
    setStockItems(stockItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validate
    const invalidItems = stockItems.filter(item => !item.inventory_item_id);
    if (invalidItems.length > 0) {
      toast.error('Pilih item inventori untuk semua barang');
      return;
    }

    // Check stock availability
    for (const item of stockItems) {
      const available = getAvailableStock(item.inventory_item_id);
      if (item.quantity > available) {
        const invItem = inventoryItems.find(i => i.id === item.inventory_item_id);
        toast.error(`Stok ${invItem?.item_name} tidak cukup. Tersedia: ${available}`);
        return;
      }
    }

    setSaving(true);

    try {
      // Find items to delete (in original but not in current)
      const itemsToDelete = originalItems.filter(
        orig => !stockItems.find(s => s.id === orig.id)
      );
      
      // Find items to add (in current but no id)
      const itemsToAdd = stockItems.filter(s => !s.id);
      
      // Find items to update (in both with changes)
      const itemsToUpdate = stockItems.filter(s => {
        if (!s.id) return false;
        const orig = originalItems.find(o => o.id === s.id);
        return orig && (
          orig.quantity !== s.quantity || 
          orig.inventory_item_id !== s.inventory_item_id ||
          orig.unit_mode !== s.unit_mode
        );
      });

      // Delete removed items - return stock
      for (const item of itemsToDelete) {
        // Insert return movement
        await supabase.from('inventory_movements').insert({
          user_id: user.id,
          inventory_item_id: item.inventory_item_id,
          contract_id: contractId,
          movement_type: 'return',
          quantity: item.quantity,
          movement_date: contractReturnDate || new Date().toISOString(),
          notes: 'Stok dikembalikan - item dihapus dari kontrak'
        });
        
        // Delete the stock item
        await supabase
          .from('contract_stock_items')
          .delete()
          .eq('id', item.id);
      }

      // Add new items - reduce stock
      for (const item of itemsToAdd) {
        const insertData: any = {
          user_id: user.id,
          contract_id: contractId,
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
          unit_mode: item.unit_mode,
        };

        // If contract is finished, auto-set returned_at
        if (contractStatus === 'selesai' && contractReturnDate) {
          insertData.returned_at = contractReturnDate;
        }

        const { data: inserted } = await supabase
          .from('contract_stock_items')
          .insert(insertData)
          .select()
          .single();
        
        if (inserted) {
          // Insert rental movement to reduce stock
          await supabase.from('inventory_movements').insert({
            user_id: user.id,
            inventory_item_id: item.inventory_item_id,
            contract_id: contractId,
            movement_type: 'rental',
            quantity: item.quantity,
            movement_date: contractStartDate || new Date().toISOString(),
            notes: 'Stok disewa - ditambahkan ke kontrak'
          });

          // If contract is finished, also create return movement so stock is restored
          if (contractStatus === 'selesai' && contractReturnDate) {
            await supabase.from('inventory_movements').insert({
              user_id: user.id,
              inventory_item_id: item.inventory_item_id,
              contract_id: contractId,
              movement_type: 'return',
              quantity: item.quantity,
              movement_date: contractReturnDate || new Date().toISOString(),
              notes: 'Stok dikembalikan - kontrak sudah selesai'
            });
          }
        }
      }

      // Update existing items
      for (const item of itemsToUpdate) {
        const orig = originalItems.find(o => o.id === item.id);
        if (!orig) continue;

        const qtyDiff = item.quantity - orig.quantity;
        
        // Update the stock item
        await supabase
          .from('contract_stock_items')
          .update({
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity, // Always in pcs
            unit_mode: item.unit_mode,
          })
          .eq('id', item.id);
        
        // If quantity changed, create movement
        if (qtyDiff !== 0) {
          await supabase.from('inventory_movements').insert({
            user_id: user.id,
            inventory_item_id: item.inventory_item_id,
            contract_id: contractId,
            movement_type: qtyDiff > 0 ? 'rental' : 'return',
            quantity: Math.abs(qtyDiff),
            movement_date: qtyDiff > 0 
              ? (contractStartDate || new Date().toISOString()) 
              : (contractReturnDate || new Date().toISOString()),
            notes: qtyDiff > 0 ? 'Penambahan qty sewa' : 'Pengurangan qty sewa'
          });
        }
      }

      toast.success('Rincian stok barang berhasil disimpan');
      onSave();
    } catch (error) {
      console.error('Error saving stock items:', error);
      toast.error('Gagal menyimpan rincian stok');
    } finally {
      setSaving(false);
    }
  };

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Rincian Stok Barang
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Item yang ditambahkan akan otomatis mengurangi stok gudang
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {stockItems.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Belum ada item stok</p>
            </div>
          ) : (
            stockItems.map((item, index) => {
              const available = item.inventory_item_id ? getAvailableStock(item.inventory_item_id) : 0;
              const pcsPerSet = item.pcs_per_set || 1;
              const displayQty = getDisplayQuantity(item);
              const isOverStock = item.quantity > available;
              const availableInSets = pcsPerSet > 1 ? Math.floor(available / pcsPerSet) : 0;
              
              return (
                <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Item #{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStockItem(index)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs">Pilih Barang</Label>
                      <Select 
                        value={item.inventory_item_id} 
                        onValueChange={(value) => selectInventoryItem(index, value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Pilih item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map(inv => {
                            const invPcsPerSet = inv.pcs_per_set || 1;
                            const invAvailable = getAvailableStock(inv.id);
                            return (
                              <SelectItem key={inv.id} value={inv.id}>
                                <div className="flex items-center gap-2">
                                  <span>{inv.item_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {invAvailable} pcs
                                    {invPcsPerSet > 1 && ` (${Math.floor(invAvailable / invPcsPerSet)} set)`}
                                  </Badge>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs">Jumlah</Label>
                      <Input
                        type="number"
                        value={displayQty}
                        onChange={(e) => updateQuantity(index, Number(e.target.value) || 1)}
                        min={1}
                        className={`h-9 ${isOverStock ? 'border-destructive' : ''}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Satuan</Label>
                      <Select
                        value={item.unit_mode}
                        onValueChange={(value: 'pcs' | 'set') => updateUnitMode(index, value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">pcs</SelectItem>
                          <SelectItem value="set">
                            set {pcsPerSet > 1 ? `(${pcsPerSet} pcs)` : ''}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {item.inventory_item_id && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {item.item_code}
                        </span>
                        {pcsPerSet > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {pcsPerSet} pcs/set
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Stok:</span>
                        <Badge variant={isOverStock ? "destructive" : "secondary"}>
                          {available} pcs
                          {pcsPerSet > 1 && ` (${availableInSets} set)`}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {/* Show conversion info */}
                  {item.inventory_item_id && item.unit_mode === 'set' && (
                    <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                      {displayQty} set = {item.quantity} pcs
                    </div>
                  )}
                  
                  {isOverStock && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Jumlah melebihi stok tersedia!</span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          <Button variant="outline" onClick={addStockItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Item
          </Button>
        </CardContent>
      </Card>

      {/* Summary */}
      {stockItems.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Item</span>
              <Badge variant="secondary" className="text-base">
                {stockItems.length} jenis barang
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium">Total Unit</span>
              <Badge variant="secondary" className="text-base">
                {stockItems.reduce((sum, item) => sum + item.quantity, 0)} pcs
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Batal
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </div>
  );
}
