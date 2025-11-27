import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon, Plus, Edit, Trash2, Check, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAppTheme } from "@/contexts/AppThemeContext";

interface ClientGroup {
  id: string;
  nama: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
}

interface RecurringIncome {
  id: string;
  user_id: string;
  client_group_id: string | null;
  bank_account_id: string | null;
  invoice: string;
  keterangan: string | null;
  catatan: string | null;
  rental_date_start: string;
  rental_date_end: string;
  period_start_month: string;
  period_end_month: string;
  nominal: number;
  paid_date: string | null;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  client_groups: ClientGroup | null;
  bank_accounts: BankAccount | null;
}

export default function RecurringIncome() {
  const { user } = useAuth();
  const { activeTheme } = useAppTheme();
  const [incomes, setIncomes] = useState<RecurringIncome[]>([]);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<RecurringIncome | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingCatatan, setEditingCatatan] = useState<string | null>(null);
  const [catatanValue, setCatatanValue] = useState("");

  const [formData, setFormData] = useState({
    invoice: "",
    client_group_id: "",
    bank_account_id: "",
    keterangan: "",
    catatan: "",
    rental_date_start: new Date(),
    rental_date_end: new Date(),
    period_start_month: new Date(),
    period_end_month: new Date(),
    nominal: 0,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [incomesRes, clientsRes, banksRes] = await Promise.all([
        supabase
          .from("fixed_monthly_income")
          .select(`
            *,
            client_groups (id, nama),
            bank_accounts (id, bank_name, account_number)
          `)
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("client_groups")
          .select("id, nama")
          .eq("user_id", user!.id),
        supabase
          .from("bank_accounts")
          .select("id, bank_name, account_number")
          .eq("user_id", user!.id),
      ]);

      if (incomesRes.error) throw incomesRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (banksRes.error) throw banksRes.error;

      setIncomes(incomesRes.data || []);
      setClientGroups(clientsRes.data || []);
      setBankAccounts(banksRes.data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        user_id: user!.id,
        invoice: formData.invoice,
        client_group_id: formData.client_group_id || null,
        bank_account_id: formData.bank_account_id || null,
        keterangan: formData.keterangan || null,
        catatan: formData.catatan || null,
        rental_date_start: format(formData.rental_date_start, "yyyy-MM-dd"),
        rental_date_end: format(formData.rental_date_end, "yyyy-MM-dd"),
        period_start_month: format(formData.period_start_month, "yyyy-MM-dd"),
        period_end_month: format(formData.period_end_month, "yyyy-MM-dd"),
        nominal: formData.nominal,
        is_paid: false,
      };

      if (editingIncome) {
        const { error } = await supabase
          .from("fixed_monthly_income")
          .update(data)
          .eq("id", editingIncome.id);

        if (error) throw error;
        toast.success("Pemasukan tetap berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("fixed_monthly_income")
          .insert(data);

        if (error) throw error;
        toast.success("Pemasukan tetap berhasil ditambahkan");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    }
  };

  const handleLunas = async (income: RecurringIncome) => {
    if (!income.paid_date) {
      toast.error("Silakan pilih tanggal lunas terlebih dahulu");
      return;
    }

    try {
      // 1. Duplikasi ke income_sources
      const bankName = income.bank_accounts?.bank_name || null;
      const clientName = income.client_groups?.nama || "Unknown";
      
      const { error: incomeError } = await supabase
        .from("income_sources")
        .insert({
          user_id: user!.id,
          source_name: `Pemasukan Tetap - ${clientName}`,
          amount: income.nominal,
          date: income.paid_date,
          bank_name: bankName,
        });

      if (incomeError) throw incomeError;

      // 2. Update status jadi sudah lunas
      const { error: updateError } = await supabase
        .from("fixed_monthly_income")
        .update({ is_paid: true })
        .eq("id", income.id);

      if (updateError) throw updateError;

      // 3. Auto-create entry baru untuk bulan berikutnya
      const nextMonthStart = new Date(income.rental_date_start);
      nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
      
      const nextMonthEnd = new Date(income.rental_date_end);
      nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);

      const nextPeriodStart = new Date(income.period_start_month);
      nextPeriodStart.setMonth(nextPeriodStart.getMonth() + 1);
      
      const nextPeriodEnd = new Date(income.period_end_month);
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

      const { error: createError } = await supabase
        .from("fixed_monthly_income")
        .insert({
          user_id: user!.id,
          client_group_id: income.client_group_id,
          bank_account_id: income.bank_account_id,
          invoice: income.invoice,
          keterangan: income.keterangan,
          catatan: null,
          rental_date_start: format(nextMonthStart, "yyyy-MM-dd"),
          rental_date_end: format(nextMonthEnd, "yyyy-MM-dd"),
          period_start_month: format(nextPeriodStart, "yyyy-MM-dd"),
          period_end_month: format(nextPeriodEnd, "yyyy-MM-dd"),
          nominal: income.nominal,
          is_paid: false,
        });

      if (createError) throw createError;

      toast.success("Pemasukan telah dilunasi dan entry baru telah dibuat untuk bulan berikutnya");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal memproses pelunasan: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pemasukan tetap ini?")) return;

    try {
      const { error } = await supabase
        .from("fixed_monthly_income")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Pemasukan tetap berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    }
  };

  const handleEdit = (income: RecurringIncome) => {
    setEditingIncome(income);
    setFormData({
      invoice: income.invoice,
      client_group_id: income.client_group_id || "",
      bank_account_id: income.bank_account_id || "",
      keterangan: income.keterangan || "",
      catatan: income.catatan || "",
      rental_date_start: new Date(income.rental_date_start),
      rental_date_end: new Date(income.rental_date_end),
      period_start_month: new Date(income.period_start_month),
      period_end_month: new Date(income.period_end_month),
      nominal: income.nominal,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingIncome(null);
    setFormData({
      invoice: "",
      client_group_id: "",
      bank_account_id: "",
      keterangan: "",
      catatan: "",
      rental_date_start: new Date(),
      rental_date_end: new Date(),
      period_start_month: new Date(),
      period_end_month: new Date(),
      nominal: 0,
    });
  };

  const handleUpdatePaidDate = async (id: string, date: Date | undefined) => {
    if (!date) return;

    try {
      const { error } = await supabase
        .from("fixed_monthly_income")
        .update({ paid_date: format(date, "yyyy-MM-dd") })
        .eq("id", id);

      if (error) throw error;
      toast.success("Tanggal lunas berhasil diperbarui");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal memperbarui tanggal: " + error.message);
    }
  };

  const handleSaveCatatan = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fixed_monthly_income")
        .update({ catatan: catatanValue })
        .eq("id", id);

      if (error) throw error;
      toast.success("Catatan berhasil disimpan");
      setEditingCatatan(null);
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyimpan catatan: " + error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateRange = (start: string, end: string) => {
    return `${format(new Date(start), "dd MMM", { locale: idLocale })} - ${format(new Date(end), "dd MMM yyyy", { locale: idLocale })}`;
  };

  const formatMonthRange = (start: string, end: string) => {
    return `${format(new Date(start), "MMM", { locale: idLocale })} - ${format(new Date(end), "MMM yyyy", { locale: idLocale })}`;
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIncomes = incomes.slice(startIndex, endIndex);
  const totalPages = Math.ceil(incomes.length / itemsPerPage);

  if (loading) {
    return (
      <div className="h-[calc(100vh-104px)] overflow-hidden flex items-center justify-center">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-2 py-2 md:px-8 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1 md:mb-4">
          <div>
            <h1 className="text-xl md:text-4xl font-bold text-foreground">
              💰 Pemasukan Tetap
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Kelola pemasukan berulang setiap bulan
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pemasukan Tetap
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingIncome ? "Edit Pemasukan Tetap" : "Tambah Pemasukan Tetap"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice">Invoice *</Label>
                    <Input
                      id="invoice"
                      value={formData.invoice}
                      onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_group">Kelompok</Label>
                    <Select
                      value={formData.client_group_id}
                      onValueChange={(value) => setFormData({ ...formData, client_group_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kelompok..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_account">Bank</Label>
                    <Select
                      value={formData.bank_account_id}
                      onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bank..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.bank_name} - {bank.account_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nominal">Nominal *</Label>
                    <Input
                      id="nominal"
                      type="number"
                      value={formData.nominal}
                      onChange={(e) => setFormData({ ...formData, nominal: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="keterangan">Keterangan</Label>
                    <Input
                      id="keterangan"
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal Sewa Mulai *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.rental_date_start, "dd MMM yyyy", { locale: idLocale })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar
                          mode="single"
                          selected={formData.rental_date_start}
                          onSelect={(date) => date && setFormData({ ...formData, rental_date_start: date })}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal Sewa Akhir *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.rental_date_end, "dd MMM yyyy", { locale: idLocale })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar
                          mode="single"
                          selected={formData.rental_date_end}
                          onSelect={(date) => date && setFormData({ ...formData, rental_date_end: date })}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Periode Billing Mulai *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.period_start_month, "MMMM yyyy", { locale: idLocale })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar
                          mode="single"
                          selected={formData.period_start_month}
                          onSelect={(date) => date && setFormData({ ...formData, period_start_month: date })}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Periode Billing Akhir *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.period_end_month, "MMMM yyyy", { locale: idLocale })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar
                          mode="single"
                          selected={formData.period_end_month}
                          onSelect={(date) => date && setFormData({ ...formData, period_end_month: date })}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="catatan">Catatan</Label>
                    <Input
                      id="catatan"
                      value={formData.catatan}
                      onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">
                    {editingIncome ? "Perbarui" : "Simpan"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 md:px-8">
        <Card className="bg-card/95 backdrop-blur-sm border-border/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Kelompok</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Tanggal Lunas</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIncomes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Belum ada data pemasukan tetap
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedIncomes.map((income, index) => (
                    <TableRow key={income.id}>
                      <TableCell>{startIndex + index + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateRange(income.rental_date_start, income.rental_date_end)}
                      </TableCell>
                      <TableCell>{income.invoice}</TableCell>
                      <TableCell>{income.client_groups?.nama || "-"}</TableCell>
                      <TableCell>{income.keterangan || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatMonthRange(income.period_start_month, income.period_end_month)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatCurrency(income.nominal)}</TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              disabled={income.is_paid}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {income.paid_date
                                ? format(new Date(income.paid_date), "dd MMM yyyy", { locale: idLocale })
                                : "Pilih tanggal..."}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <Calendar
                              mode="single"
                              selected={income.paid_date ? new Date(income.paid_date) : undefined}
                              onSelect={(date) => handleUpdatePaidDate(income.id, date)}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        {editingCatatan === income.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={catatanValue}
                              onChange={(e) => setCatatanValue(e.target.value)}
                              className="w-full"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveCatatan(income.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-muted/50 p-2 rounded"
                            onClick={() => {
                              setEditingCatatan(income.id);
                              setCatatanValue(income.catatan || "");
                            }}
                          >
                            {income.catatan || "Klik untuk tambah catatan..."}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {income.is_paid ? (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                            ✅ Sudah Lunas
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleLunas(income)}
                            disabled={!income.paid_date}
                          >
                            <Repeat className="mr-2 h-4 w-4" />
                            Lunas
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(income)}
                            disabled={income.is_paid}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(income.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Pagination */}
      <div className="shrink-0 px-2 py-2 md:px-8 md:py-4">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={incomes.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
          storageKey="recurring-income-pagination"
        />
      </div>
    </div>
  );
}
