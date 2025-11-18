import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FixedExpense } from "@/pages/FixedExpenses";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface FixedExpenseFormProps {
  expense: FixedExpense | null;
  onSubmit: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  "Utilitas",
  "Internet & Telepon",
  "Asuransi",
  "Cicilan",
  "Langganan",
  "Pemeliharaan",
  "Transportasi",
  "Lainnya",
];

export const FixedExpenseForm = ({ expense, onSubmit, onCancel }: FixedExpenseFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    expense_name: "",
    category: "",
    expense_type: "fixed" as "fixed" | "variable",
    fixed_amount: "",
    estimated_amount: "",
    due_date_day: "",
    bank_account_id: "",
    reminder_days_before: "3",
    is_active: true,
    auto_create_expense: false,
    notes: "",
  });

  useEffect(() => {
    fetchBankAccounts();
    if (expense) {
      setFormData({
        expense_name: expense.expense_name,
        category: expense.category,
        expense_type: expense.expense_type,
        fixed_amount: expense.fixed_amount?.toString() || "",
        estimated_amount: expense.estimated_amount?.toString() || "",
        due_date_day: expense.due_date_day.toString(),
        bank_account_id: expense.bank_account_id || "",
        reminder_days_before: expense.reminder_days_before.toString(),
        is_active: expense.is_active,
        auto_create_expense: expense.auto_create_expense,
        notes: expense.notes || "",
      });
    }
  }, [expense]);

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        user_id: user?.id,
        expense_name: formData.expense_name,
        category: formData.category,
        expense_type: formData.expense_type,
        fixed_amount: formData.expense_type === 'fixed' ? parseFloat(formData.fixed_amount) : null,
        estimated_amount: formData.expense_type === 'variable' ? parseFloat(formData.estimated_amount) : null,
        due_date_day: parseInt(formData.due_date_day),
        bank_account_id: formData.bank_account_id || null,
        reminder_days_before: parseInt(formData.reminder_days_before),
        is_active: formData.is_active,
        auto_create_expense: formData.auto_create_expense,
        notes: formData.notes || null,
      };

      if (expense) {
        const { error } = await supabase
          .from('fixed_expenses')
          .update(dataToSave)
          .eq('id', expense.id);

        if (error) throw error;
        toast({
          title: "Berhasil",
          description: "Pengeluaran tetap berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('fixed_expenses')
          .insert(dataToSave);

        if (error) throw error;
        toast({
          title: "Berhasil",
          description: "Pengeluaran tetap berhasil ditambahkan",
        });
      }

      onSubmit();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengeluaran tetap",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          {expense ? "Edit Pengeluaran Tetap" : "Tambah Pengeluaran Tetap"}
        </h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expense_name">Nama Tagihan *</Label>
        <Input
          id="expense_name"
          value={formData.expense_name}
          onChange={(e) => setFormData({ ...formData, expense_name: e.target.value })}
          placeholder="Contoh: Listrik PLN"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Kategori *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense_type">Tipe Pengeluaran *</Label>
          <Select
            value={formData.expense_type}
            onValueChange={(value: "fixed" | "variable") =>
              setFormData({ ...formData, expense_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Tetap (Nominal Pasti)</SelectItem>
              <SelectItem value="variable">Variabel (Nominal Berubah)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {formData.expense_type === 'fixed' ? (
          <div className="space-y-2">
            <Label htmlFor="fixed_amount">Nominal Tetap *</Label>
            <Input
              id="fixed_amount"
              type="number"
              value={formData.fixed_amount}
              onChange={(e) => setFormData({ ...formData, fixed_amount: e.target.value })}
              placeholder="0"
              required
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="estimated_amount">Estimasi Nominal *</Label>
            <Input
              id="estimated_amount"
              type="number"
              value={formData.estimated_amount}
              onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
              placeholder="0"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="due_date_day">Tanggal Jatuh Tempo *</Label>
          <Input
            id="due_date_day"
            type="number"
            min="1"
            max="31"
            value={formData.due_date_day}
            onChange={(e) => setFormData({ ...formData, due_date_day: e.target.value })}
            placeholder="1-31"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bank_account_id">Rekening Bank</Label>
          <Select
            value={formData.bank_account_id || "none"}
            onValueChange={(value) => setFormData({ ...formData, bank_account_id: value === "none" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih rekening (opsional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak ada</SelectItem>
              {bankAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.bank_name} - {account.account_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reminder_days_before">Ingatkan (hari sebelumnya)</Label>
          <Input
            id="reminder_days_before"
            type="number"
            min="0"
            max="30"
            value={formData.reminder_days_before}
            onChange={(e) => setFormData({ ...formData, reminder_days_before: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="is_active">Aktif</Label>
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="auto_create_expense">Otomatis Buat Pengeluaran</Label>
          <Switch
            id="auto_create_expense"
            checked={formData.auto_create_expense}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, auto_create_expense: checked })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Tambahkan catatan (opsional)"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : expense ? "Update" : "Simpan"}
        </Button>
      </div>
    </form>
  );
};
