import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format, differenceInDays, parseISO, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";
import { Plus, Edit, Trash2, Check, CalendarIcon, FileText, Lock, Unlock, ArrowUpDown, Search, X, LayoutGrid, List, Clock, Wallet, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency as formatCurrencyLib } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { GradientButton } from "@/components/GradientButton";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { getNowInJakarta } from "@/lib/timezone";

interface ClientGroup {
  id: string;
  nama: string;
  icon: string | null;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
}

interface RecurringIncome {
  id: string;
  invoice: string;
  client_group_id: string;
  keterangan: string;
  period_start_month: string;
  period_end_month: string;
  nominal: number;
  paid_date: string | null;
  is_paid: boolean;
  catatan: string | null;
  bank_account_id: string | null;
  tanggal: string | null;
  tagihan_belum_bayar: number;
  status: string;
  tanggal_bayar_terakhir: string | null;
  client_groups?: { nama: string; icon: string | null; };
  bank_accounts?: { bank_name: string; account_number: string; };
}

export default function RecurringIncome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<RecurringIncome[]>([]);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isTableLocked, setIsTableLocked] = useState(true);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientGroupId, setClientGroupId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [periodStartMonth, setPeriodStartMonth] = useState("");
  const [periodEndMonth, setPeriodEndMonth] = useState("");
  const [nominal, setNominal] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [catatan, setCatatan] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('recurringIncomeItemsPerPage');
    return saved ? parseInt(saved, 10) : 10;
  });

  const [sortBy, setSortBy] = useState<'number' | 'tanggal' | 'invoice' | 'group' | 'keterangan' | 'periode' | 'status' | 'tagihan' | 'sisa' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [isCompactMode, setIsCompactMode] = useState(false);

  const [paymentContractId, setPaymentContractId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [editingTanggal, setEditingTanggal] = useState<string | null>(null);
  const [tanggalValue, setTanggalValue] = useState<Date | undefined>(undefined);

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [incomesRes, clientsRes, banksRes] = await Promise.all([
        supabase.from("fixed_monthly_income").select(`*, client_groups (nama, icon), bank_accounts (bank_name, account_number)`).eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("client_groups").select("id, nama, icon").eq("user_id", user.id).order("nama"),
        supabase.from("bank_accounts").select("id, bank_name, account_number").eq("user_id", user.id).eq("is_active", true).order("bank_name")
      ]);
      if (incomesRes.error) throw incomesRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (banksRes.error) throw banksRes.error;
      setIncomes(incomesRes.data || []);
      setClientGroups(clientsRes.data || []);
      setBankAccounts(banksRes.data || []);
    } catch (error: any) { toast.error("Gagal memuat data: " + error.message); } finally { setLoading(false); }
  };

  const filteredAndSortedIncomes = useMemo(() => {
    let filtered = [...incomes];
    if (invoiceSearch.trim()) {
      filtered = filtered.filter(income => income.invoice?.toLowerCase().includes(invoiceSearch.toLowerCase()) || income.keterangan?.toLowerCase().includes(invoiceSearch.toLowerCase()) || income.client_groups?.nama?.toLowerCase().includes(invoiceSearch.toLowerCase()));
    }
    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter(income => {
        const incomeDate = income.tanggal ? parseISO(income.tanggal) : null;
        if (!incomeDate) return false;
        if (startDateFilter && endDateFilter) return isWithinInterval(incomeDate, { start: startDateFilter, end: endDateFilter });
        if (startDateFilter) return incomeDate >= startDateFilter;
        if (endDateFilter) return incomeDate <= endDateFilter;
        return true;
      });
    }
    if (sortBy !== 'none') {
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'tanggal': comparison = (a.tanggal ? new Date(a.tanggal).getTime() : 0) - (b.tanggal ? new Date(b.tanggal).getTime() : 0); break;
          case 'invoice': comparison = (a.invoice || '').localeCompare(b.invoice || ''); break;
          case 'group': comparison = (a.client_groups?.nama || '').localeCompare(b.client_groups?.nama || ''); break;
          case 'periode': comparison = (a.period_start_month ? new Date(a.period_start_month).getTime() : 0) - (b.period_start_month ? new Date(b.period_start_month).getTime() : 0); break;
          case 'status': comparison = (a.status || '').localeCompare(b.status || ''); break;
          case 'tagihan': comparison = (a.nominal || 0) - (b.nominal || 0); break;
          case 'sisa': comparison = (a.tagihan_belum_bayar || 0) - (b.tagihan_belum_bayar || 0); break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    return filtered;
  }, [incomes, invoiceSearch, startDateFilter, endDateFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedIncomes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncomes = filteredAndSortedIncomes.slice(startIndex, startIndex + itemsPerPage);

  const handleItemsPerPageChange = (value: number) => { setItemsPerPage(value); setCurrentPage(1); localStorage.setItem('recurringIncomeItemsPerPage', value.toString()); };

  const stats = useMemo(() => ({
    totalEntries: incomes.length,
    activeEntries: incomes.filter(i => !i.is_paid).length,
    totalTagihan: incomes.reduce((sum, i) => sum + (i.nominal || 0), 0),
    totalLunas: incomes.filter(i => i.is_paid || i.tagihan_belum_bayar === 0).reduce((sum, i) => sum + (i.nominal || 0), 0)
  }), [incomes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const data = { user_id: user.id, invoice: invoiceNumber, client_group_id: clientGroupId, keterangan, period_start_month: periodStartMonth, period_end_month: periodEndMonth, nominal: parseFloat(nominal), bank_account_id: bankAccountId || null, catatan: catatan || null, tanggal: periodStartMonth || null, tagihan_belum_bayar: parseFloat(nominal), status: 'aktif' };
      if (editingId) { const { error } = await supabase.from("fixed_monthly_income").update(data).eq("id", editingId); if (error) throw error; toast.success("Data berhasil diupdate"); }
      else { const { error } = await supabase.from("fixed_monthly_income").insert([data]); if (error) throw error; toast.success("Data berhasil ditambahkan"); }
      resetForm(); setDialogOpen(false); fetchData();
    } catch (error: any) { toast.error("Gagal menyimpan: " + error.message); }
  };

  const handlePayment = async (incomeId: string) => {
    if (!user || !paymentDate || !paymentAmount) { toast.error("Lengkapi tanggal dan jumlah pembayaran"); return; }
    const income = incomes.find(i => i.id === incomeId);
    if (!income) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Jumlah pembayaran tidak valid"); return; }
    try {
      setIsSubmittingPayment(true);
      const newSisa = Math.max(0, (income.tagihan_belum_bayar || income.nominal) - amount);
      const isPaid = newSisa === 0;
      const { error: updateError } = await supabase.from("fixed_monthly_income").update({ tagihan_belum_bayar: newSisa, tanggal_bayar_terakhir: format(paymentDate, "yyyy-MM-dd"), paid_date: isPaid ? format(paymentDate, "yyyy-MM-dd") : income.paid_date, is_paid: isPaid, status: isPaid ? 'lunas' : 'aktif' }).eq("id", incomeId);
      if (updateError) throw updateError;
      const { error: incomeError } = await supabase.from("income_sources").insert([{ user_id: user.id, source_name: `${income.invoice || ""} ${income.keterangan || ""} - ${income.client_groups?.nama || "Pemasukan Tetap"}`.trim(), amount: amount, date: format(paymentDate, "yyyy-MM-dd"), bank_name: income.bank_accounts?.bank_name || null, bank_account_id: income.bank_account_id }]);
      if (incomeError) throw incomeError;
      toast.success(`Pembayaran Rp ${formatCurrencyLib(amount)} berhasil dicatat`);
      setPaymentContractId(null); setPaymentDate(undefined); setPaymentAmount(""); fetchData();
    } catch (error: any) { toast.error("Gagal menyimpan pembayaran: " + error.message); } finally { setIsSubmittingPayment(false); }
  };

  const handleLunas = async (income: RecurringIncome) => {
    if (!user) return;
    const remainingAmount = income.tagihan_belum_bayar || income.nominal;
    if (remainingAmount <= 0) { toast.info("Sudah lunas"); return; }
    try {
      const { error: updateError } = await supabase.from("fixed_monthly_income").update({ is_paid: true, paid_date: income.paid_date || format(getNowInJakarta(), "yyyy-MM-dd"), tagihan_belum_bayar: 0, tanggal_bayar_terakhir: income.paid_date || format(getNowInJakarta(), "yyyy-MM-dd"), status: 'lunas' }).eq("id", income.id);
      if (updateError) throw updateError;
      const { error: incomeError } = await supabase.from("income_sources").insert([{ user_id: user.id, source_name: `${income.invoice || ""} ${income.keterangan || ""} - ${income.client_groups?.nama || "Pemasukan Tetap"}`.trim(), amount: remainingAmount, date: income.paid_date || format(getNowInJakarta(), "yyyy-MM-dd"), bank_name: income.bank_accounts?.bank_name || null, bank_account_id: income.bank_account_id }]);
      if (incomeError) throw incomeError;
      const nextStartMonth = new Date(income.period_start_month); nextStartMonth.setMonth(nextStartMonth.getMonth() + 1);
      const nextEndMonth = new Date(income.period_end_month); nextEndMonth.setMonth(nextEndMonth.getMonth() + 1);
      const { error: insertError } = await supabase.from("fixed_monthly_income").insert([{ user_id: user.id, invoice: income.invoice, client_group_id: income.client_group_id, keterangan: income.keterangan, period_start_month: format(nextStartMonth, "yyyy-MM-dd"), period_end_month: format(nextEndMonth, "yyyy-MM-dd"), nominal: income.nominal, bank_account_id: income.bank_account_id, catatan: income.catatan, is_paid: false, tanggal: format(nextStartMonth, "yyyy-MM-dd"), tagihan_belum_bayar: income.nominal, status: 'aktif' }]);
      if (insertError) throw insertError;
      toast.success("Berhasil dilunas & entry bulan berikutnya dibuat"); fetchData();
    } catch (error: any) { toast.error("Gagal: " + error.message); }
  };

  const handleDelete = async (id: string) => { if (!confirm("Yakin ingin menghapus data ini?")) return; try { const { error } = await supabase.from("fixed_monthly_income").delete().eq("id", id); if (error) throw error; toast.success("Data berhasil dihapus"); fetchData(); } catch (error: any) { toast.error("Gagal menghapus: " + error.message); } };
  const handleEdit = (income: RecurringIncome) => { setEditingId(income.id); setInvoiceNumber(income.invoice); setClientGroupId(income.client_group_id); setKeterangan(income.keterangan); setPeriodStartMonth(income.period_start_month); setPeriodEndMonth(income.period_end_month); setNominal(income.nominal.toString()); setBankAccountId(income.bank_account_id || ""); setCatatan(income.catatan || ""); setDialogOpen(true); };
  const handleUpdateTanggal = async (incomeId: string, newDate: Date) => { try { const { error } = await supabase.from("fixed_monthly_income").update({ tanggal: format(newDate, "yyyy-MM-dd") }).eq("id", incomeId); if (error) throw error; toast.success("Tanggal diupdate"); setEditingTanggal(null); fetchData(); } catch (error: any) { toast.error("Gagal update tanggal: " + error.message); } };
  const resetForm = () => { setEditingId(null); setInvoiceNumber(""); setClientGroupId(""); setKeterangan(""); setPeriodStartMonth(""); setPeriodEndMonth(""); setNominal(""); setBankAccountId(""); setCatatan(""); };
  const formatMonthRange = (start: string, end: string) => { if (!start || !end) return "-"; const startDate = parseISO(start); const endDate = parseISO(end); const now = getNowInJakarta(); const daysRemaining = differenceInDays(endDate, now); return (<div className="flex flex-col"><span>{format(startDate, "MMM yyyy", { locale: id })} - {format(endDate, "MMM yyyy", { locale: id })}</span>{daysRemaining > 0 && <span className="text-xs text-muted-foreground">({daysRemaining} hari lagi)</span>}{daysRemaining <= 0 && daysRemaining > -30 && <span className="text-xs text-orange-500">(Jatuh tempo)</span>}</div>); };
  const getStatusBadge = (income: RecurringIncome) => { const status = income.status || 'aktif'; switch (status) { case 'lunas': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Lunas</Badge>; case 'selesai': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Selesai</Badge>; case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>; default: return <Badge className="bg-primary/10 text-primary border-primary/20">Aktif</Badge>; } };
  const getPaymentStatusBadge = (income: RecurringIncome) => { if (income.is_paid || income.tagihan_belum_bayar === 0) return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Lunas</Badge>; return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">Belum Lunas</Badge>; };
  const clearFilters = () => { setInvoiceSearch(""); setStartDateFilter(undefined); setEndDateFilter(undefined); setSortBy('none'); setSortOrder('asc'); setCurrentPage(1); };

  const renderClientIcon = (icon: string | null | undefined) => {
    if (!icon) return null;
    if (icon.startsWith('http')) {
      return <img src={icon} alt="" className="w-5 h-5 rounded-full" />;
    }
    return <span className="text-lg">{icon}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Pemasukan Tetap</h1><p className="text-muted-foreground">Kelola pemasukan rutin bulanan</p></div>
        <div className="flex items-center gap-2">
          <GradientButton variant="primary" icon={isTableLocked ? Lock : Unlock} onClick={() => setIsTableLocked(!isTableLocked)}>{isTableLocked ? "Unlock Table" : "Lock Table"}</GradientButton>
          <GradientButton variant="primary" icon={Plus} onClick={() => { resetForm(); setDialogOpen(true); }}>Tambah Entry</GradientButton>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Pemasukan</p><p className="text-xl font-bold text-foreground">{stats.totalEntries}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-500/10"><Clock className="h-5 w-5 text-rose-500" /></div><div><p className="text-sm text-muted-foreground">Belum Lunas</p><p className="text-xl font-bold text-foreground">{stats.activeEntries}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-orange-500/10"><Wallet className="h-5 w-5 text-orange-500" /></div><div><p className="text-sm text-muted-foreground">Total Tagihan</p><p className="text-xl font-bold text-foreground">{formatCurrencyLib(stats.totalTagihan)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-sm text-muted-foreground">Total Lunas</p><p className="text-xl font-bold text-foreground">{formatCurrencyLib(stats.totalLunas)}</p></div></div></CardContent></Card>
      </div>
      <Card><CardContent className="p-4"><div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"><div className="flex flex-wrap gap-2 items-center"><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari invoice, keterangan, kelompok..." value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} className="pl-9 w-64" /></div><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="gap-2"><CalendarIcon className="h-4 w-4" />{startDateFilter ? format(startDateFilter, "dd/MM/yy") : "Dari"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDateFilter} onSelect={setStartDateFilter} locale={id} /></PopoverContent></Popover><Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="gap-2"><CalendarIcon className="h-4 w-4" />{endDateFilter ? format(endDateFilter, "dd/MM/yy") : "Sampai"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDateFilter} onSelect={setEndDateFilter} locale={id} /></PopoverContent></Popover><Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}><SelectTrigger className="w-32"><ArrowUpDown className="h-4 w-4 mr-1" /><SelectValue placeholder="Urutkan" /></SelectTrigger><SelectContent><SelectItem value="none">Default</SelectItem><SelectItem value="tanggal">Tanggal</SelectItem><SelectItem value="invoice">Invoice</SelectItem><SelectItem value="group">Kelompok</SelectItem><SelectItem value="periode">Periode</SelectItem><SelectItem value="status">Status</SelectItem><SelectItem value="tagihan">Tagihan</SelectItem><SelectItem value="sisa">Sisa</SelectItem></SelectContent></Select>{sortBy !== 'none' && <Button variant="ghost" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>{sortOrder === 'asc' ? '↑' : '↓'}</Button>}{(invoiceSearch || startDateFilter || endDateFilter || sortBy !== 'none') && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Reset</Button>}</div><div className="flex items-center gap-2"><Button variant={isCompactMode ? "secondary" : "ghost"} size="sm" onClick={() => setIsCompactMode(!isCompactMode)}>{isCompactMode ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}</Button></div></div></CardContent></Card>
      <Card>
        <CardContent className="p-0">
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tagihan</TableHead>
                  <TableHead className="text-right">Sisa Tagihan</TableHead>
                  <TableHead>Tanggal Bayar</TableHead>
                  <TableHead>Status Bayar</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIncomes.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                ) : paginatedIncomes.map((income, index) => (
                  <TableRow key={income.id} className={cn(isCompactMode && "h-10")}>
                    <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                    <TableCell>
                      <Popover open={editingTanggal === income.id} onOpenChange={(open) => { if (!isTableLocked && open) { setEditingTanggal(income.id); setTanggalValue(income.tanggal ? parseISO(income.tanggal) : undefined); } else if (!open) setEditingTanggal(null); }}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("w-full justify-start font-normal", isTableLocked && "cursor-not-allowed opacity-50")} disabled={isTableLocked}>
                            <CalendarIcon className="mr-2 h-4 w-4" />{income.tanggal ? format(parseISO(income.tanggal), "dd/MM/yyyy") : "Set tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={tanggalValue} onSelect={(date) => { if (date) handleUpdateTanggal(income.id, date); }} locale={id} /></PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell><Button variant="link" className="p-0 h-auto font-medium text-primary" onClick={() => navigate(`/vip/recurring-income/${income.id}`)}>{income.invoice}</Button></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderClientIcon(income.client_groups?.icon)}
                        <span>{income.client_groups?.nama || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(isCompactMode && "max-w-32 truncate")}>{income.keterangan || "-"}</TableCell>
                    <TableCell>{formatMonthRange(income.period_start_month, income.period_end_month)}</TableCell>
                    <TableCell>{getStatusBadge(income)}</TableCell>
                    <TableCell className="text-right"><span className="text-blue-600 font-semibold">{formatCurrencyLib(income.nominal)}</span></TableCell>
                    <TableCell className="text-right"><span className={cn("font-semibold", income.tagihan_belum_bayar > 0 ? "text-rose-600" : "text-green-600")}>{formatCurrencyLib(income.tagihan_belum_bayar || 0)}</span></TableCell>
                    <TableCell>
                      <Popover open={paymentContractId === income.id} onOpenChange={(open) => { if (!isTableLocked && open && !income.is_paid) { setPaymentContractId(income.id); setPaymentDate(undefined); setPaymentAmount(""); } else if (!open) setPaymentContractId(null); }}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className={cn("w-full justify-start", isTableLocked && "cursor-not-allowed opacity-50")} disabled={isTableLocked || income.is_paid}>
                            <CalendarIcon className="mr-2 h-4 w-4" />{income.tanggal_bayar_terakhir ? format(parseISO(income.tanggal_bayar_terakhir), "dd/MM/yyyy") : "Input Bayar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-4">
                            <div className="space-y-2"><Label>Tanggal Pembayaran</Label><Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} locale={id} className="rounded-md border" /></div>
                            <div className="space-y-2"><Label>Jumlah Dibayar</Label><div className="flex gap-2"><Input type="number" placeholder="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /><Button variant="outline" size="sm" onClick={() => setPaymentAmount((income.tagihan_belum_bayar || income.nominal).toString())}>100%</Button></div><p className="text-xs text-muted-foreground">Sisa: {formatCurrencyLib(income.tagihan_belum_bayar || income.nominal)}</p></div>
                            <Button className="w-full" onClick={() => handlePayment(income.id)} disabled={isSubmittingPayment || !paymentDate || !paymentAmount}>{isSubmittingPayment ? "Menyimpan..." : "Simpan Pembayaran"}</Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(income)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(income)} disabled={isTableLocked || income.is_paid}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(income.id)} disabled={isTableLocked}><Trash2 className="h-4 w-4" /></Button>
                        {!income.is_paid && income.tagihan_belum_bayar > 0 && <Button size="sm" variant="destructive" onClick={() => handleLunas(income)} disabled={isTableLocked}><Check className="h-4 w-4 mr-1" />Lunas</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredAndSortedIncomes.length > 0 && (
            <div className="p-4 border-t">
              <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={filteredAndSortedIncomes.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={handleItemsPerPageChange} />
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit Entry" : "Tambah Entry Baru"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Invoice Number</Label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="FMI-202501-XXXX" required /></div>
              <div className="space-y-2"><Label>Kelompok Klien</Label><Select value={clientGroupId} onValueChange={setClientGroupId} required><SelectTrigger><SelectValue placeholder="Pilih kelompok" /></SelectTrigger><SelectContent>{clientGroups.map((group) => <SelectItem key={group.id} value={group.id}>{group.nama}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Keterangan</Label><Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Deskripsi pemasukan" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Periode Mulai</Label><Input type="date" value={periodStartMonth} onChange={(e) => setPeriodStartMonth(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Periode Akhir</Label><Input type="date" value={periodEndMonth} onChange={(e) => setPeriodEndMonth(e.target.value)} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nominal</Label><Input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="0" required /></div>
              <div className="space-y-2"><Label>Rekening Bank</Label><Select value={bankAccountId} onValueChange={setBankAccountId}><SelectTrigger><SelectValue placeholder="Pilih rekening" /></SelectTrigger><SelectContent>{bankAccounts.map((bank) => <SelectItem key={bank.id} value={bank.id}>{bank.bank_name} - {bank.account_number}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan (opsional)" rows={3} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button type="submit">{editingId ? "Update" : "Simpan"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
