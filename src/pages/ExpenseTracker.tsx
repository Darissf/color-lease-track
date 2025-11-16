import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Filter, Download, TrendingDown, Receipt, CreditCard } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/currency";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { CategoryBadge } from "@/components/CategoryBadge";
import { GradientButton } from "@/components/GradientButton";
import BankLogo from "@/components/BankLogo";

// KATEGORI PENGELUARAN
const EXPENSE_CATEGORIES = [
  "Makanan & Minuman",
  "Transportasi",
  "Komisi",
  "Sedekah",
  "Belanja",
  "Kesehatan",
  "Pendidikan",
  "Hiburan",
  "Listrik & Air",
  "Internet & Pulsa",
  "Rumah Tangga",
  "Kendaraan",
  "Asuransi",
  "Pajak",
  "Investasi",
  "Cicilan",
  "Pengeluaran Tetap",
  "Tak Terduga",
  "Lainnya",
];

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string | null;
}

interface Expense {
  id: string;
  transaction_name: string | null;
  category: string;
  amount: number;
  bank_account_id: string | null;
  description: string | null;
  date: string;
  checked: boolean;
  bank_accounts?: BankAccount;
}

export default function ExpenseTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [checkConfirmId, setCheckConfirmId] = useState<string | null>(null);
  const [checkConfirmValue, setCheckConfirmValue] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    transaction_name: "",
    category: "",
    amount: "",
    bank_account_id: "",
    description: "",
    date: new Date(),
    checked: false,
  });

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchBankAccounts();
    }
  }, [user]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, filterCategory, filterMonth]);

  const fetchBankAccounts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("bank_accounts")
      .select("id, bank_name, account_number, account_holder_name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("bank_name");

    if (error) {
      console.error("Error fetching bank accounts:", error);
    } else {
      setBankAccounts(data || []);
    }
  };

  const fetchExpenses = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        bank_accounts (
          id,
          bank_name,
          account_number,
          account_holder_name
        )
      `)
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Gagal memuat data pengeluaran", variant: "destructive" });
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const filterExpenses = () => {
    let filtered = expenses;

    if (filterCategory !== "all") {
      filtered = filtered.filter(exp => exp.category === filterCategory);
    }

    if (filterMonth) {
      filtered = filtered.filter(exp => exp.date.startsWith(filterMonth));
    }

    setFilteredExpenses(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      transaction_name: formData.transaction_name || null,
      category: formData.category,
      amount: parseFloat(formData.amount),
      bank_account_id: formData.bank_account_id || null,
      description: formData.description || null,
      date: format(formData.date, "yyyy-MM-dd"),
      checked: formData.checked,
      sub_category: null,
      is_fixed: false,
    };

    if (editingId) {
      const { error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast({ title: "Error", description: "Gagal mengupdate pengeluaran", variant: "destructive" });
      } else {
        toast({ title: "Sukses", description: "Pengeluaran berhasil diupdate" });
        fetchExpenses();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("expenses")
        .insert([payload]);

      if (error) {
        toast({ title: "Error", description: "Gagal menambah pengeluaran", variant: "destructive" });
      } else {
        toast({ title: "Sukses", description: "Pengeluaran berhasil ditambahkan" });
        fetchExpenses();
        resetForm();
      }
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      transaction_name: expense.transaction_name || "",
      category: expense.category,
      amount: expense.amount.toString(),
      bank_account_id: expense.bank_account_id || "",
      description: expense.description || "",
      date: new Date(expense.date),
      checked: expense.checked,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus pengeluaran ini?")) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Gagal menghapus pengeluaran", variant: "destructive" });
    } else {
      toast({ title: "Sukses", description: "Pengeluaran berhasil dihapus" });
      fetchExpenses();
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_name: "",
      category: "",
      amount: "",
      bank_account_id: "",
      description: "",
      date: new Date(),
      checked: false,
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleCheckToggle = (expenseId: string, currentValue: boolean) => {
    setCheckConfirmId(expenseId);
    setCheckConfirmValue(!currentValue);
  };

  const confirmCheckToggle = async () => {
    if (!checkConfirmId) return;

    const { error } = await supabase
      .from("expenses")
      .update({ checked: checkConfirmValue })
      .eq("id", checkConfirmId);

    if (error) {
      toast({ title: "Error", description: "Gagal mengubah status checklist", variant: "destructive" });
    } else {
      toast({ title: "Sukses", description: "Status checklist berhasil diubah" });
      fetchExpenses();
    }
    
    setCheckConfirmId(null);
  };

  const exportToCSV = () => {
    const headers = ["Tanggal", "Transaksi", "Kategori", "Jumlah", "Rekening", "Checklist", "Catatan"];
    const rows = filteredExpenses.map(exp => [
      exp.date,
      exp.transaction_name || "-",
      exp.category,
      exp.amount.toString(),
      exp.bank_accounts?.bank_name || "-",
      exp.checked ? "✓" : "-",
      exp.description || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pengeluaran_${filterMonth}.csv`;
    link.click();

    toast({ title: "Sukses", description: "Data berhasil diekspor ke CSV" });
  };

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgDaily = filteredExpenses.length > 0 ? totalExpenses / new Date(filterMonth + "-01").getDate() : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tracking Pengeluaran</h1>
          <p className="text-sm text-muted-foreground">Kelola pengeluaran Anda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pengeluaran
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Tambah"} Pengeluaran</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Tanggal *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, "PPP") : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData({ ...formData, date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="transaction_name">Transaksi</Label>
                <Input
                  id="transaction_name"
                  value={formData.transaction_name}
                  onChange={(e) => setFormData({ ...formData, transaction_name: e.target.value })}
                  placeholder="Nama transaksi"
                />
              </div>

              <div>
                <Label htmlFor="category">Kategori *</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Jumlah (Rp) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="50000"
                  required
                />
              </div>

              <div>
                <Label htmlFor="bank_account_id">Rekening</Label>
                <Select value={formData.bank_account_id || "none"} onValueChange={(val) => setFormData({ ...formData, bank_account_id: val === "none" ? "" : val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rekening" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada</SelectItem>
                    {bankAccounts.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bank_name} - {bank.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checked"
                  checked={formData.checked}
                  onCheckedChange={(checked) => setFormData({ ...formData, checked: checked as boolean })}
                />
                <Label htmlFor="checked" className="text-sm font-normal cursor-pointer">
                  Sudah selesai / terkonfirmasi
                </Label>
              </div>

              <div>
                <Label htmlFor="description">Catatan</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Catatan tambahan..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
                <Button type="submit">
                  {editingId ? "Update" : "Simpan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert Dialog untuk konfirmasi checklist */}
      <AlertDialog open={checkConfirmId !== null} onOpenChange={() => setCheckConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengubah status checklist pengeluaran ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCheckToggle}>Ya, Ubah</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredExpenses.length} transaksi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata Harian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgDaily)}</div>
            <p className="text-xs text-muted-foreground mt-1">Periode {filterMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter
            </CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Kategori</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bulan</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengeluaran</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada data pengeluaran</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Transaksi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Rekening</TableHead>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{expense.transaction_name || "-"}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell className="font-medium text-red-600">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>
                        {expense.bank_accounts ? (
                          <div className="text-sm">
                            <div className="font-medium">{expense.bank_accounts.bank_name}</div>
                            <div className="text-muted-foreground">{expense.bank_accounts.account_number}</div>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={expense.checked}
                          onCheckedChange={() => handleCheckToggle(expense.id, expense.checked)}
                        />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{expense.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
