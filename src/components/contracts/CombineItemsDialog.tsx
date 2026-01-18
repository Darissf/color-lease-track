import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRupiah } from '@/lib/currency';
import { Layers } from 'lucide-react';

interface CombineItemsDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (
    billingQuantity: number,
    billingPricePerDay: number,
    billingDurationDays: number,
    billingUnitMode: 'pcs' | 'set'
  ) => void;
  selectedItems: Array<{
    item_name: string;
    quantity: number;
    unit_mode?: 'pcs' | 'set';
  }>;
  defaultPrice: number;
  defaultDuration: number;
  defaultMode: 'pcs' | 'set';
}

export function CombineItemsDialog({
  open,
  onClose,
  onConfirm,
  selectedItems,
  defaultPrice,
  defaultDuration,
  defaultMode,
}: CombineItemsDialogProps) {
  const [billingQuantity, setBillingQuantity] = useState(1);
  const [billingPricePerDay, setBillingPricePerDay] = useState(defaultPrice);
  const [billingDurationDays, setBillingDurationDays] = useState(defaultDuration);
  const [billingUnitMode, setBillingUnitMode] = useState<'pcs' | 'set'>(defaultMode);

  // Calculate suggested quantity based on selected items
  useEffect(() => {
    const totalQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    setBillingQuantity(totalQty);
    setBillingPricePerDay(defaultPrice);
    setBillingDurationDays(defaultDuration);
    setBillingUnitMode(defaultMode);
  }, [selectedItems, defaultPrice, defaultDuration, defaultMode]);

  const subtotal = billingQuantity * billingPricePerDay * billingDurationDays;

  const handleConfirm = () => {
    onConfirm(billingQuantity, billingPricePerDay, billingDurationDays, billingUnitMode);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Combine Items
          </DialogTitle>
          <DialogDescription>
            Gabungkan {selectedItems.length} item ke dalam 1 paket billing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected items preview */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Item yang akan digabung:</Label>
            {selectedItems.map((item, idx) => (
              <div key={idx} className="text-sm flex items-center gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{item.quantity} {item.unit_mode === 'set' ? 'Set' : 'Pcs'} {item.item_name}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Jumlah Billing</Label>
              <Input
                type="number"
                value={billingQuantity}
                onChange={(e) => setBillingQuantity(Number(e.target.value) || 1)}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                User tentukan manual
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Mode Unit</Label>
              <Select value={billingUnitMode} onValueChange={(v: 'pcs' | 'set') => setBillingUnitMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="pcs">Pcs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Harga/Hari (Rp)</Label>
              <Input
                type="number"
                value={billingPricePerDay}
                onChange={(e) => setBillingPricePerDay(Number(e.target.value) || 0)}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Durasi (hari)</Label>
              <Input
                type="number"
                value={billingDurationDays}
                onChange={(e) => setBillingDurationDays(Number(e.target.value) || 1)}
                min={1}
              />
            </div>
          </div>

          {/* Subtotal preview */}
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Subtotal Group</p>
            <p className="text-lg font-bold text-primary">{formatRupiah(subtotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {billingQuantity} {billingUnitMode} × {formatRupiah(billingPricePerDay)} × {billingDurationDays} hari
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleConfirm}>
            <Layers className="h-4 w-4 mr-2" />
            Combine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
