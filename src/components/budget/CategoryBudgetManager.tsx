import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CategoryBudget } from "@/types/budgetTypes";
import { formatRupiah } from "@/lib/currency";

interface CategoryBudgetManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  targetBelanja: number;
  onUpdate: () => void;
}

export const CategoryBudgetManager = ({
  open,
  onOpenChange,
  budgetId,
  targetBelanja,
  onUpdate
}: CategoryBudgetManagerProps) => {
  const { toast } = useToast();
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && budgetId) {
      fetchCategoryBudgets();
    }
  }, [open, budgetId]);

  const fetchCategoryBudgets = async () => {
    const { data } = await supabase
      .from('category_budgets')
      .select('*')
      .eq('monthly_budget_id', budgetId)
      .order('category');
    
    setCategoryBudgets(data || []);
  };

  const handleAmountChange = (categoryId: string, newAmount: number) => {
    setCategoryBudgets(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, allocated_amount: newAmount } : cat
      )
    );
  };

  const getTotalAllocated = () => {
    return categoryBudgets.reduce((sum, cat) => sum + cat.allocated_amount, 0);
  };

  const handleSave = async () => {
    const total = getTotalAllocated();
    
    if (Math.abs(total - targetBelanja) > 1) {
      toast({
        title: "Total tidak sesuai",
        description: `Total alokasi (${formatRupiah(total)}) harus sama dengan target belanja (${formatRupiah(targetBelanja)})`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('category_budgets')
      .upsert(categoryBudgets.map(cat => ({
        id: cat.id,
        user_id: cat.user_id,
        monthly_budget_id: cat.monthly_budget_id,
        category: cat.category,
        allocated_amount: cat.allocated_amount,
        notes: cat.notes
      })));

    setLoading(false);

    if (error) {
      toast({
        title: "Error menyimpan",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Berhasil!",
      description: "Budget kategori berhasil diupdate"
    });
    
    onUpdate();
    onOpenChange(false);
  };

  const totalAllocated = getTotalAllocated();
  const difference = totalAllocated - targetBelanja;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kelola Budget Kategori</DialogTitle>
          <DialogDescription>
            Atur alokasi budget untuk setiap kategori pengeluaran
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {categoryBudgets.map(cat => (
            <div key={cat.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{cat.category}</Label>
                <span className="text-sm font-medium">
                  {formatRupiah(cat.allocated_amount)}
                </span>
              </div>
              <Slider
                value={[cat.allocated_amount]}
                min={0}
                max={targetBelanja}
                step={100000}
                onValueChange={([value]) => handleAmountChange(cat.id, value)}
              />
            </div>
          ))}

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Target Belanja:</span>
              <span className="font-semibold">{formatRupiah(targetBelanja)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Alokasi:</span>
              <span className={`font-semibold ${
                Math.abs(difference) > 1 ? 'text-destructive' : 'text-green-600'
              }`}>
                {formatRupiah(totalAllocated)}
              </span>
            </div>
            {Math.abs(difference) > 1 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Selisih:</span>
                <span className="font-semibold text-destructive">
                  {difference > 0 ? '+' : ''}{formatRupiah(difference)}
                </span>
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Menyimpan..." : "Simpan Budget Kategori"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
