import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Wallet, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { GradientButton } from "@/components/GradientButton";
import BankLogo from "@/components/BankLogo";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

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
  const { activeTheme, themeColors } = useAppTheme();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('incomeManagement_itemsPerPage');
    return saved ? parseInt(saved) : 10;
  });
  const [formData, setFormData] = useState({
    source_name: "",
    bank_name: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchIncomeSources();
  }, [user]);

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
      // Flatten the nested rental_contracts data
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        keterangan: item.rental_contracts?.keterangan || null,
      }));
      setIncomeSources(formattedData);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      source_name: formData.source_name,
      bank_name: formData.bank_name || null,
      amount: parseFloat(formData.amount) || null,
      date: formData.date || null,
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
      date: income.date || new Date().toISOString().split('T')[0],
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
      date: new Date().toISOString().split('T')[0],
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

  const totalIncome = incomeSources.reduce((sum, source) => sum + (source.amount || 0), 0);

  // Pagination logic
  const totalPages = Math.ceil(incomeSources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIncomeSources = incomeSources.slice(startIndex, endIndex);

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-2 py-2 md:px-8 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={cn(
              "text-4xl font-bold mb-2",
              activeTheme === 'japanese' ? "text-gradient-income" : "text-foreground"
            )}>Kelola Pemasukan</h1>
            <p className="text-muted-foreground">Rekedi Jelai - Akar Asal</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <GradientButton variant="income" icon={Plus} onClick={() => resetForm()}>
                Tambah Pemasukan
              </GradientButton>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Tambah"} Sumber Pemasukan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="source_name">Nama Sumber *</Label>
                <Input
                  id="source_name"
                  value={formData.source_name}
                  onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                  placeholder="Gaji, Freelance, Bonus, dll"
                  required
                />
              </div>
              <div>
                <Label htmlFor="bank_name">Nama Bank / Metode</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="BCA, Mandiri, Cash, dll"
                />
              </div>
              <div>
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="5000000"
                />
              </div>
              <div>
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-8 pb-4 space-y-6">
      {/* Total Income Card */}
      <ColoredStatCard
        title="Total Pemasukan"
        value={formatCurrency(totalIncome)}
        icon={TrendingUp}
        gradient="income"
        subtitle={`Dari ${incomeSources.length} sumber pemasukan`}
      />

      {/* Income Sources Table */}
      <Card className={cn(
        activeTheme === 'japanese' 
          ? "bg-slate-900/90 border-slate-700" 
          : ""
      )}>
        <CardHeader>
          <CardTitle className={activeTheme === 'japanese' ? 'text-white' : ''}>
            Daftar Sumber Pemasukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : incomeSources.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Bank/Metode</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right w-24">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIncomeSources.map((income, index) => (
                    <TableRow key={income.id} className="hover:bg-accent/50 transition-colors">
                      <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">{income.keterangan || income.source_name}</TableCell>
                      <TableCell>
                        {income.bank_name ? (
                          <div className="flex items-center gap-2">
                            <BankLogo bankName={income.bank_name} size="sm" />
                            <span>{income.bank_name}</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{income.date ? new Date(income.date).toLocaleDateString('id-ID') : "-"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={cn(
                          activeTheme === 'japanese' ? "text-gradient-income" : "text-foreground"
                        )}>{formatCurrency(income.amount)}</span>
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
                totalItems={incomeSources.length}
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
