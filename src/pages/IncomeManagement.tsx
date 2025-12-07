import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, TrendingUp, Download, Filter, Receipt, Wallet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { getNowInJakarta, getJakartaDateString } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { GradientButton } from "@/components/GradientButton";
import BankLogo from "@/components/BankLogo";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useAppTheme } from "@/contexts/AppThemeContext";

interface IncomeSource {
  id: string;
  source_name: string;
  bank_name: string | null;
  amount: number | null;
  date: string | null;
  contract_id: string | null;
  keterangan?: string | null;
}

export default function IncomeManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeTheme } = useAppTheme();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [filteredIncome, setFilteredIncome] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>(getJakartaDateString().slice(0, 7));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('incomeManagement_itemsPerPage');
    return saved ? parseInt(saved) : 10;
  });
  const [formData, setFormData] = useState({
    source_name: "",
    bank_name: "",
    amount: "",
    date: getNowInJakarta(),
  });

  useEffect(() => {
    fetchIncomeSources();
  }, [user]);

  useEffect(() => {
    filterIncomeSources();
  }, [incomeSources, filterMonth]);

  const fetchIncomeSources = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("income_sources")
      .select(`
        *,
        rental_contracts!income_sources_contract_id_fkey(keterangan)
      `)
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch income sources", variant: "destructive" });
    } else {
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        keterangan: item.rental_contracts?.keterangan || null,
      }));
      setIncomeSources(formattedData);
    }
    setLoading(false);
  };

  const filterIncomeSources = () => {
    let filtered = incomeSources;

    if (filterMonth) {
      filtered = filtered.filter(inc => inc.date?.startsWith(filterMonth));
    }

    setFilteredIncome(filtered);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      source_name: formData.source_name,
      bank_name: formData.bank_name || null,
      amount: parseFloat(formData.amount) || null,
      date: getJakartaDateString(formData.date),
    };

    if (editingId) {
      const { error } = await supabase
        .from("income_sources")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast({ title: "Error", description: "Failed to update", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Income source updated" });
        resetForm();
        fetchIncomeSources();
      }
    } else {
      const { error } = await supabase
        .from("income_sources")
        .insert(payload);

      if (error) {
        toast({ title: "Error", description: "Failed to add", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Income source added" });
        resetForm();
        fetchIncomeSources();
      }
    }
  };

  const handleEdit = (income: IncomeSource) => {
    setEditingId(income.id);
    setFormData({
      source_name: income.source_name,
      bank_name: income.bank_name || "",
      amount: income.amount?.toString() || "",
      date: income.date ? new Date(income.date) : getNowInJakarta(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus?")) return;

    const { error } = await supabase
      .from("income_sources")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Income source deleted" });
      fetchIncomeSources();
    }
  };

  const resetForm = () => {
    setFormData({
      source_name: "",
      bank_name: "",
      amount: "",
      date: getNowInJakarta(),
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "Rp 0";
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ["No", "Tanggal", "Sumber", "Bank/Metode", "Jumlah", "Keterangan"];
    const rows = filteredIncome.map((inc, index) => [
      (index + 1).toString(),
      inc.date || "-",
      inc.source_name || "-",
      inc.bank_name || "-",
      (inc.amount || 0).toString(),
      inc.keterangan || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pemasukan_${filterMonth}.csv`;
    link.click();

    toast({ title: "Sukses", description: "Data berhasil diekspor ke CSV" });
  };

  const totalIncome = filteredIncome.reduce((sum, source) => sum + (source.amount || 0), 0);
  const avgDaily = filteredIncome.length > 0 ? totalIncome / getNowInJakarta().getDate() : 0;

  // Helper functions for stats
  const getHighestSource = () => {
    if (filteredIncome.length === 0) return "N/A";
    const highest = filteredIncome.reduce((max, inc) => 
      (inc.amount || 0) > (max.amount || 0) ? inc : max
    , filteredIncome[0]);
    return highest?.source_name || "N/A";
  };

  const getHighestAmount = () => {
    if (filteredIncome.length === 0) return 0;
    return Math.max(...filteredIncome.map(inc => inc.amount || 0));
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredIncome.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIncomeSources = filteredIncome.slice(startIndex, endIndex);

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-2 py-2 md:px-8 md:py-4">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-4xl font-bold text-foreground">
                Kelola Pemasukan
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden md:block">Rekedi Jelai - Akar Asal</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <GradientButton variant="income" icon={Plus} onClick={() => resetForm()}>
                Tambah Pemasukan
              </GradientButton>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto border-2 border-emerald-500/20">
              <DialogHeader className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 -m-6 mb-6 p-6 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <DialogTitle className="text-2xl font-bold text-white">
                    {editingId ? "Edit" : "Tambah"} Pemasukan
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
                          "w-full justify-start text-left font-normal border-2 border-emerald-500/20 hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-emerald-600" />
                        {formData.date ? format(formData.date, "PPP") : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-2 border-emerald-500/20 shadow-xl" align="start">
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
                  <Label htmlFor="source_name">Nama Sumber *</Label>
                  <Input
                    id="source_name"
                    value={formData.source_name}
                    onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                    placeholder="Gaji, Freelance, Bonus, dll"
                    required
                    className="border-2 border-emerald-500/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>

                <div>
                  <Label htmlFor="bank_name">Nama Bank / Metode</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="BCA, Mandiri, Cash, dll"
                    className="border-2 border-emerald-500/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Jumlah (Rp) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="5000000"
                    required
                    className="border-2 border-emerald-500/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Batal
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                  >
                    {editingId ? "Update" : "Simpan"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-8 pb-4 space-y-4 md:space-y-6">
        {/* Filter Section */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-40 border-2 border-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterMonth(getJakartaDateString().slice(0, 7))}
            className="border-emerald-500/30 hover:bg-emerald-50 hover:border-emerald-500"
          >
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="ml-auto border-emerald-500/30 hover:bg-emerald-50 hover:border-emerald-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <ColoredStatCard
            title="Total Pemasukan"
            value={formatCurrency(totalIncome)}
            icon={TrendingUp}
            gradient="income"
          />
          <ColoredStatCard
            title="Rata-rata Harian"
            value={formatCurrency(avgDaily)}
            icon={Receipt}
            gradient="budget"
          />
          <ColoredStatCard
            title="Sumber Tertinggi"
            value={getHighestSource()}
            icon={Wallet}
            gradient="savings"
            subtitle={formatCurrency(getHighestAmount())}
          />
          <ColoredStatCard
            title="Jumlah Transaksi"
            value={filteredIncome.length.toString()}
            icon={Receipt}
            gradient="budget"
            subtitle={`Dari ${incomeSources.length} total`}
          />
        </div>

        {/* Income Sources Table */}
        <Card className="bg-card border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Daftar Sumber Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredIncome.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>Bank/Metode</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="hidden md:table-cell">Catatan</TableHead>
                      <TableHead className="text-right w-24">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedIncomeSources.map((income, index) => (
                      <TableRow key={income.id} className="hover:bg-accent/50 transition-colors">
                        <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                        <TableCell>{income.date ? new Date(income.date).toLocaleDateString('id-ID') : "-"}</TableCell>
                        <TableCell className="font-medium">{income.source_name}</TableCell>
                        <TableCell>
                          {income.bank_name ? (
                            <div className="flex items-center gap-2">
                              <BankLogo bankName={income.bank_name} size="sm" />
                              <span>{income.bank_name}</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={cn(
                            activeTheme === 'japanese' ? "text-gradient-income" : "text-emerald-600"
                          )}>{formatCurrency(income.amount)}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                          {income.keterangan || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(income)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(income.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
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
                  totalItems={filteredIncome.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    localStorage.setItem('incomeManagement_itemsPerPage', items.toString());
                  }}
                  storageKey="incomeManagement"
                />
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada sumber pemasukan. Klik tombol "Tambah Pemasukan" untuk memulai.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
