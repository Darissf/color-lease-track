import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

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
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
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
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kelola Pemasukan</h1>
          <p className="text-sm text-muted-foreground">Rekedi Jelai - Akar Asal</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pemasukan
            </Button>
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

      {/* Total Income Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Total Pemasukan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          <p className="text-sm text-muted-foreground mt-1">Dari {incomeSources.length} sumber</p>
        </CardContent>
      </Card>

      {/* Income Sources Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Sumber Pemasukan</CardTitle>
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
                    <TableRow key={income.id}>
                      <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-medium">{income.keterangan || income.source_name}</TableCell>
                      <TableCell>{income.bank_name || "-"}</TableCell>
                      <TableCell>{income.date ? new Date(income.date).toLocaleDateString('id-ID') : "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(income.amount)}
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
              
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada sumber pemasukan. Klik tombol "Tambah Pemasukan" untuk memulai.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
