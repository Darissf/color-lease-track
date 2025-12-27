import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  type LineItem,
  type TemplateData
} from '@/lib/contractTemplateGenerator';
import { Plus, Trash2, Package, Truck, Eye, Save, FileText, Zap, PackageOpen, Tag, FileSignature } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  item_name: string;
  item_code: string;
  category: string;
  unit_price: number;
  unit_type: string;
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
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [transportDelivery, setTransportDelivery] = useState(0);
  const [transportPickup, setTransportPickup] = useState(0);
  const [contractTitle, setContractTitle] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingFromStock, setGeneratingFromStock] = useState(false);
  
  // Pengaturan Cepat
  const [defaultPricePerDay, setDefaultPricePerDay] = useState<number | ''>('');
  const [defaultDurationDays, setDefaultDurationDays] = useState<number | ''>('');

  useEffect(() => {
    fetchInventoryItems();
    fetchExistingLineItems();
  }, [contractId]);

  const fetchInventoryItems = async () => {
    const { data } = await supabase
      .from('inventory_items')
      .select('id, item_name, item_code, category, unit_price, unit_type')
      .order('item_name');
    
    if (data) {
      setInventoryItems(data);
    }
  };

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
      })));
    }
    
    // Fetch transport costs and discount from contract
    const { data: contractData } = await supabase
      .from('rental_contracts')
      .select('transport_cost_delivery, transport_cost_pickup, discount, keterangan')
      .eq('id', contractId)
      .single();
    
    if (contractData) {
      setTransportDelivery(Number(contractData.transport_cost_delivery) || 0);
      setTransportPickup(Number(contractData.transport_cost_pickup) || 0);
      setDiscount(Number(contractData.discount) || 0);
      setContractTitle(contractData.keterangan || '');
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
      // Fetch stock items for this contract
      const { data: stockItems, error } = await supabase
        .from('contract_stock_items')
        .select(`
          quantity,
          inventory_items (
            item_name,
            unit_price
          )
        `)
        .eq('contract_id', contractId)
        .is('returned_at', null);
      
      if (error) throw error;
      
      if (!stockItems || stockItems.length === 0) {
        toast.error('Tidak ada item stok barang. Tambahkan item di Rincian Stok Barang terlebih dahulu.');
        return;
      }
      
      // Map stock items to line items
      const generatedItems: LineItem[] = stockItems.map((item: any) => ({
        item_name: item.inventory_items?.item_name || '',
        quantity: item.quantity,
        unit_price_per_day: defaultPricePerDay !== '' ? defaultPricePerDay : (item.inventory_items?.unit_price || 0),
        duration_days: defaultDurationDays !== '' ? defaultDurationDays : 30,
      }));
      
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

  const selectInventoryItem = (index: number, itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      const updated = [...lineItems];
      updated[index].item_name = item.item_name;
      updated[index].unit_price_per_day = item.unit_price;
      setLineItems(updated);
    }
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const getTemplateData = (): TemplateData => ({
    lineItems,
    transportDelivery,
    transportPickup,
    contractTitle,
    discount,
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
      // Delete existing line items
      await supabase
        .from('contract_line_items')
        .delete()
        .eq('contract_id', contractId);

      // Insert new line items
      const lineItemsToInsert = lineItems.map((item, index) => ({
        user_id: user.id,
        contract_id: contractId,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price_per_day: item.unit_price_per_day,
        duration_days: item.duration_days,
        sort_order: index,
      }));

      const { error: insertError } = await supabase
        .from('contract_line_items')
        .insert(lineItemsToInsert);

      if (insertError) throw insertError;

      // Generate template
      const template = generateRincianTemplate(getTemplateData());
      const grandTotal = calculateGrandTotal(getTemplateData());

      // Update contract with transport costs, discount and template
      const { error: updateError } = await supabase
        .from('rental_contracts')
        .update({
          transport_cost_delivery: transportDelivery,
          transport_cost_pickup: transportPickup,
          discount: discount,
          rincian_template: template,
          tagihan: grandTotal,
          tagihan_belum_bayar: grandTotal, // Reset - in real app, calculate based on payments
        })
        .eq('id', contractId);

      if (updateError) throw updateError;

      toast.success('Rincian kontrak berhasil disimpan');
      onSave();
    } catch (error) {
      console.error('Error saving line items:', error);
      toast.error('Gagal menyimpan rincian');
    } finally {
      setSaving(false);
    }
  };

  const totalItems = calculateTotalItems(lineItems);
  const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
  const subtotal = calculateSubtotal(getTemplateData());
  const grandTotal = calculateGrandTotal(getTemplateData());

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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Rincian Item Sewa
            </CardTitle>
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
          <p className="text-xs text-muted-foreground mt-1">
            Klik "Generate dari Stok" untuk otomatis mengisi dari Rincian Stok Barang
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Item #{index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Pilih dari Inventori (opsional)</Label>
                  <Select onValueChange={(value) => selectInventoryItem(index, value)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pilih item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.item_name} ({inv.item_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Jumlah (pcs)</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                    min={1}
                    className="h-9"
                  />
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
          ))}

          <Button variant="outline" onClick={addLineItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Item
          </Button>
        </CardContent>
      </Card>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                💰 Harga per Hari (Rp)
              </Label>
              <Input
                type="number"
                value={defaultPricePerDay}
                onChange={(e) => setDefaultPricePerDay(e.target.value ? Number(e.target.value) : '')}
                placeholder="Kosongkan jika manual per item"
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                📅 Durasi (hari)
              </Label>
              <Input
                type="number"
                value={defaultDurationDays}
                onChange={(e) => setDefaultDurationDays(e.target.value ? Number(e.target.value) : '')}
                placeholder="Kosongkan jika manual per item"
                min={1}
              />
            </div>
          </div>
          
          <Button 
            variant="secondary" 
            onClick={applyDefaultsToAll}
            disabled={lineItems.length === 0 || (defaultPricePerDay === '' && defaultDurationDays === '')}
            className="w-full"
          >
            🔄 Terapkan ke Semua Item ({lineItems.length})
          </Button>
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
              {generateRincianTemplate(getTemplateData())}
            </pre>
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
