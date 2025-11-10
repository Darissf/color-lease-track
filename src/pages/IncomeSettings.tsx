import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Plus, Trash2, Edit, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface RecurringIncome {
  id: string;
  source_name: string;
  amount: number;
  frequency: string;
  bank_account_id: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
}

const IncomeSettings = () => {
  const [incomes, setIncomes] = useState<RecurringIncome[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<RecurringIncome | null>(null);
  const [formData, setFormData] = useState({
    source_name: "",
    amount: 0,
    frequency: "monthly",
    bank_account_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    is_active: true,
    notes: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [incomesData, accountsData] = await Promise.all([
        supabase
          .from("recurring_income")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("bank_accounts")
          .select("id, bank_name, account_number")
          .eq("user_id", user.id)
          .eq("is_active", true),
      ]);

      if (incomesData.error) throw incomesData.error;
      if (accountsData.error) throw accountsData.error;

      setIncomes(incomesData.data || []);
      setBankAccounts(accountsData.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        ...formData,
        bank_account_id: formData.bank_account_id || null,
        end_date: formData.end_date || null,
        user_id: user.id,
      };

      if (editingIncome) {
        const { error } = await supabase
          .from("recurring_income")
          .update(payload)
          .eq("id", editingIncome.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Pemasukan berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from("recurring_income")
          .insert(payload);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Pemasukan berhasil ditambahkan",
        });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (income: RecurringIncome) => {
    setEditingIncome(income);
    setFormData({
      source_name: income.source_name,
      amount: income.amount,
      frequency: income.frequency,
      bank_account_id: income.bank_account_id || "",
      start_date: income.start_date,
      end_date: income.end_date || "",
      is_active: income.is_active,
      notes: income.notes || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus pemasukan ini?")) return;

    try {
      const { error } = await supabase.from("recurring_income").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Pemasukan berhasil dihapus",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      source_name: "",
      amount: 0,
      frequency: "monthly",
      bank_account_id: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      is_active: true,
      notes: "",
    });
    setEditingIncome(null);
    setIsOpen(false);
  };

  const totalMonthlyIncome = incomes
    .filter((inc) => inc.is_active && inc.frequency === "monthly")
    .reduce((sum, inc) => sum + Number(inc.amount), 0);

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Pengaturan Pemasukan
          </h1>
          <p className="text-muted-foreground">Atur sumber pemasukan tetap Anda</p>
        </div>
      </div>

      <Card className="p-6 mb-6 gradient-card border-0 shadow-lg">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Total Pemasukan Bulanan</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(totalMonthlyIncome)}</p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg gradient-success flex items-center justify-center">
              <LogIn className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Daftar Pemasukan Tetap</h2>
              <p className="text-sm text-muted-foreground">Kelola sumber pemasukan rutin</p>
            </div>
          </div>

          <Button onClick={() => setIsOpen(true)} className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pemasukan
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        ) : incomes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Belum ada pemasukan yang ditambahkan</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sumber</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Frekuensi</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.map((income) => (
                <TableRow key={income.id}>
                  <TableCell className="font-medium">{income.source_name}</TableCell>
                  <TableCell>{formatCurrency(income.amount)}</TableCell>
                  <TableCell className="capitalize">{income.frequency}</TableCell>
                  <TableCell>
                    {new Date(income.start_date).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        income.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {income.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(income)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(income.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingIncome ? "Edit Pemasukan" : "Tambah Pemasukan"}
            </DialogTitle>
            <DialogDescription>
              Masukkan informasi pemasukan tetap Anda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source_name">Sumber Pemasukan</Label>
              <Input
                id="source_name"
                placeholder="Gaji, Bonus, dll"
                value={formData.source_name}
                onChange={(e) =>
                  setFormData({ ...formData, source_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frekuensi</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData({ ...formData, frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Harian</SelectItem>
                  <SelectItem value="weekly">Mingguan</SelectItem>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="yearly">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account_id">Rekening Bank (Opsional)</Label>
              <Select
                value={formData.bank_account_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, bank_account_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekening" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tidak ada</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Tanggal Selesai (Opsional)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Aktif</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan (opsional)"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Batal
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingIncome ? "Perbarui" : "Tambah"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncomeSettings;
