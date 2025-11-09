import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Filter, Download, TrendingDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

// KATEGORI PENGELUARAN KAKEIBO
const EXPENSE_CATEGORIES = [
  "Kebutuhan (Needs)",
  "Keinginan (Wants)",
  "Budaya (Culture)",
  "Tak Terduga (Unexpected)",
  "Pengeluaran Tetap",
  "Transport",
  "Makanan & Minuman",
  "Belanja",
  "Kesehatan",
  "Pendidikan",
  "Hiburan",
  "Lainnya",
];

interface Expense {
  id: string;
  category: string;
  sub_category: string | null;
  amount: number;
  description: string | null;
  date: string;
  is_fixed: boolean;
}

export default function ExpenseTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [formData, setFormData] = useState({
    category: "",
    sub_category: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    is_fixed: false,
  });

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, filterCategory, filterMonth]);

  const fetchExpenses = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch expenses", variant: "destructive" });
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
      category: formData.category,
      sub_category: formData.sub_category || null,
      amount: parseFloat(formData.amount),
      description: formData.description || null,
      date: formData.date,
      is_fixed: formData.is_fixed,
    };

    if (editingId) {
      const { error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast({ title: "Error", description: "Failed to update", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Expense updated" });
        resetForm();
        fetchExpenses();
      }
    } else {
      const { error } = await supabase
        .from("expenses")
        .insert(payload);

      if (error) {
        toast({ title: "Error", description: "Failed to add", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Expense added" });
        resetForm();
        fetchExpenses();
      }
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      category: expense.category,
      sub_category: expense.sub_category || "",
      amount: expense.amount.toString(),
      description: expense.description || "",
      date: expense.date,
      is_fixed: expense.is_fixed,
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
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Expense deleted" });
      fetchExpenses();
    }
  };

  const resetForm = () => {
    setFormData({
      category: "",
      sub_category: "",
      amount: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      is_fixed: false,
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const exportToCSV = () => {
    const headers = ["Tanggal", "Kategori", "Sub Kategori", "Deskripsi", "Jumlah", "Tetap"];
    const rows = filteredExpenses.map(exp => [
      exp.date,
      exp.category,
      exp.sub_category || "-",
      exp.description || "-",
      exp.amount.toString(),
      exp.is_fixed ? "Ya" : "Tidak",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${filterMonth}.csv`;
    link.click();

    toast({ title: "Success", description: "Data exported to CSV" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const fixedExpenses = filteredExpenses.filter(exp => exp.is_fixed).reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tracking Pengeluaran</h1>
          <p className="text-sm text-muted-foreground">Pembukuan - Metode Kakeibo</p>
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
                <Label htmlFor="sub_category">Sub Kategori</Label>
                <Input
                  id="sub_category"
                  value={formData.sub_category}
                  onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                  placeholder="Contoh: Grocery, Bensin, dll"
                />
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
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail pengeluaran..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="date">Tanggal *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_fixed"
                  checked={formData.is_fixed}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_fixed: checked as boolean })}
                />
                <Label htmlFor="is_fixed" className="text-sm font-normal cursor-pointer">
                  Pengeluaran Tetap (bulanan)
                </Label>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pengeluaran Tetap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fixedExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per bulan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata/Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses / 30)}</div>
            <p className="text-xs text-muted-foreground mt-1">Estimasi</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filter & Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter-category">Kategori</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua kategori" />
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
              <Label htmlFor="filter-month">Bulan</Label>
              <Input
                id="filter-month"
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={exportToCSV} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
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
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-center">Tetap</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{expense.category}</div>
                          {expense.sub_category && (
                            <div className="text-xs text-muted-foreground">{expense.sub_category}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description || "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {expense.is_fixed && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Tetap</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:text-red-700"
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada pengeluaran. Klik "Tambah Pengeluaran" untuk memulai.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
