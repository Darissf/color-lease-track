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
import { Plus, Trash2, Edit, Filter, Download, TrendingDown, Receipt, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/currency";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { getNowInJakarta, formatInJakarta, getJakartaDateString } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { CategoryBadge } from "@/components/CategoryBadge";
import { GradientButton } from "@/components/GradientButton";
import BankLogo from "@/components/BankLogo";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useAppTheme } from "@/contexts/AppThemeContext";

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
  const { activeTheme, themeColors } = useAppTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(getJakartaDateString().slice(0, 7));
  const [checkConfirmId, setCheckConfirmId] = useState<string | null>(null);
  const [checkConfirmValue, setCheckConfirmValue] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('expenseTracker_itemsPerPage');
    return saved ? parseInt(saved) : 10;
  });
  const [formData, setFormData] = useState({
    transaction_name: "",
    category: "",
    amount: "",
    bank_account_id: "",
    description: "",
    date: getNowInJakarta(),
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
    setCurrentPage(1); // Reset to page 1 on filter change
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
      date: getJakartaDateString(formData.date),
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
      date: getNowInJakarta(), // Use current Jakarta time for edit
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
      date: getNowInJakarta(),
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
    const headers = ["No", "Tanggal", "Transaksi", "Kategori", "Jumlah", "Rekening", "Checklist", "Catatan"];
    const rows = filteredExpenses.map((exp, index) => [
      (index + 1).toString(),
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
  const avgDaily = filteredExpenses.length > 0 ? totalExpenses / getNowInJakarta().getDate() : 0;

  // Helper functions for stats
  const getMostExpensiveCategory = () => {
    const categoryTotals = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0]?.[0] || "N/A";
  };

  const getMostExpensiveCategoryAmount = () => {
    const categoryTotals = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    return Math.max(...Object.values(categoryTotals), 0);
  };

  const getCheckedCount = () => filteredExpenses.filter(exp => exp.checked).length;
  const getCheckedPercentage = () => 
    filteredExpenses.length > 0 ? ((getCheckedCount() / filteredExpenses.length) * 100).toFixed(0) : "0";

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  return (
    <AnimatedBackground theme="expense">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg">
            <TrendingDown className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 bg-clip-text text-transparent">
              Tracking Pengeluaran
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor dan kelola semua pengeluaran Anda</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <GradientButton onClick={() => resetForm()} variant="expense" icon={Plus}>
              Tambah Pengeluaran
            </GradientButton>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto border-2 border-rose-500/20">
            <DialogHeader className="bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 -m-6 mb-6 p-6 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {editingId ? "Edit" : "Tambah"} Pengeluaran
                </DialogTitle>
              </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Tanggal *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-2 border-rose-500/20 hover:border-rose-500 focus:ring-2 focus:ring-rose-500/50 transition-all",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-rose-600" />
                      {formData.date ? format(formData.date, "PPP") : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-2 border-rose-500/20 shadow-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData({ ...formData, date })}
                      initialFocus
                      className="pointer-events-auto"
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
                  className="border-2 border-rose-500/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/50 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="category">Kategori *</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })} required>
                  <SelectTrigger className="border-2 border-orange-500/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50">
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
                  className="border-2 border-rose-500/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/50 transition-all"
                />
              </div>

              <div>
                <Label htmlFor="bank_account_id">Rekening</Label>
                <Select value={formData.bank_account_id || "none"} onValueChange={(val) => setFormData({ ...formData, bank_account_id: val === "none" ? "" : val })}>
                  <SelectTrigger className="border-2 border-orange-500/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50">
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
                  className="border-2 border-rose-500/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/50 transition-all"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm} className="border-2 border-rose-500/20 hover:bg-rose-500/10">
                  Batal
                </Button>
                <GradientButton type="submit" variant="expense">
                  {editingId ? "Update" : "Simpan"}
                </GradientButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert Dialog untuk konfirmasi checklist */}
      <AlertDialog open={checkConfirmId !== null} onOpenChange={() => setCheckConfirmId(null)}>
        <AlertDialogContent className="border-2 border-rose-500/20">
          <AlertDialogHeader className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 -m-6 mb-6 p-6 rounded-t-lg border-b-2 border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-red-600">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <AlertDialogTitle className="text-xl">Konfirmasi Perubahan</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-2">
              Apakah Anda yakin ingin mengubah status checklist pengeluaran ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-rose-500/20">Batal</AlertDialogCancel>
            <GradientButton onClick={confirmCheckToggle} variant="income">
              Ya, Ubah
            </GradientButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ColoredStatCard
          title="Total Pengeluaran"
          value={formatCurrency(totalExpenses)}
          icon={TrendingDown}
          gradient="expense"
          subtitle={`${filteredExpenses.length} transaksi`}
          trend={filteredExpenses.length > 0 ? { value: `${filteredExpenses.length} item`, isPositive: false } : undefined}
        />
        <ColoredStatCard
          title="Rata-rata Harian"
          value={formatCurrency(avgDaily)}
          icon={Receipt}
          gradient="budget"
          subtitle={`Periode ${filterMonth}`}
        />
        <ColoredStatCard
          title="Kategori Terbanyak"
          value={getMostExpensiveCategory()}
          icon={CreditCard}
          gradient="savings"
          subtitle={formatCurrency(getMostExpensiveCategoryAmount())}
        />
        <ColoredStatCard
          title="Terkonfirmasi"
          value={`${getCheckedCount()}/${filteredExpenses.length}`}
          icon={CheckCircle}
          gradient="income"
          subtitle={`${getCheckedPercentage()}% selesai`}
        />
      </div>

      {/* Filters */}
      <Card className={cn(
        "border-2 border-rose-500/20 shadow-lg",
        activeTheme === 'japanese' && "bg-slate-900/90 border-slate-700"
      )}>
        <CardHeader className="bg-gradient-to-r from-rose-500/10 via-red-500/10 to-orange-500/10 border-b-2 border-rose-500/20">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className={cn(
              "flex items-center gap-3",
              activeTheme === 'japanese' && 'text-white'
            )}>
              <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-red-600">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Filter & Export</span>
            </CardTitle>
            <GradientButton onClick={exportToCSV} variant="income" size="sm" icon={Download}>
              Export CSV
            </GradientButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Kategori</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="border-2 border-rose-500/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/50">
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
                className="border-2 border-orange-500/20 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border-2 border-rose-500/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-rose-500/10 via-red-500/10 to-orange-500/10 border-b-2 border-rose-500/20">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-red-600">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Daftar Pengeluaran</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <p>Loading...</p>
          ) : filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada data pengeluaran</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-rose-500/10 via-red-500/10 to-orange-500/10 border-b-2 border-rose-500/20">
                    <TableHead className="font-semibold w-[60px]">
                      <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">No</span>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Tanggal</span>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Transaksi</span>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Kategori</span>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Jumlah</span>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Rekening</span>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Checklist</span>
                    </TableHead>
                    <TableHead className="font-semibold">
                      <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Catatan</span>
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      <span className="bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">Aksi</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.map((expense, index) => (
                    <TableRow 
                      key={expense.id}
                      className="hover:bg-gradient-to-r hover:from-rose-500/5 hover:to-orange-500/5 transition-all duration-300 hover:shadow-md"
                    >
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell>{format(new Date(expense.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium">{expense.transaction_name || "-"}</TableCell>
                      <TableCell>
                        <CategoryBadge category={expense.category} />
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <span className="text-sm font-bold bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 bg-clip-text text-transparent">
                            {formatCurrency(expense.amount)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {expense.bank_accounts ? (
                          <div className="flex items-center gap-2">
                            <BankLogo bankName={expense.bank_accounts.bank_name} size="sm" />
                            <div className="text-sm">
                              <div className="font-medium">{expense.bank_accounts.bank_name}</div>
                              <div className="text-muted-foreground text-xs">{expense.bank_accounts.account_number}</div>
                            </div>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={expense.checked}
                          onCheckedChange={() => handleCheckToggle(expense.id, expense.checked)}
                          className="border-2 border-emerald-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-600"
                        />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{expense.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(expense)}
                            className="hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:border-transparent transition-all group"
                          >
                            <Edit className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(expense.id)}
                            className="hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all group"
                          >
                            <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredExpenses.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  localStorage.setItem('expenseTracker_itemsPerPage', items.toString());
                }}
                storageKey="expenseTracker"
              />
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AnimatedBackground>
  );
}
