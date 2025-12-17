import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { format, addMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, FileText, Calendar, Wallet, User, CheckCircle, AlertCircle, Receipt, Package, Trash2, Pencil, StickyNote, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { PaymentEditDialog } from "@/components/contracts/PaymentEditDialog";

interface RecurringIncome {
  id: string;
  client_group_id: string;
  bank_account_id: string | null;
  invoice: string;
  keterangan: string | null;
  catatan: string | null;
  period_start_month: string;
  period_end_month: string;
  nominal: number;
  tagihan: number;
  tagihan_belum_bayar: number;
  status: string;
  tanggal: string | null;
  tanggal_bayar_terakhir: string | null;
  admin_notes: string | null;
  admin_notes_edited_by: string | null;
  admin_notes_edited_at: string | null;
  lokasi_proyek: string | null;
  jenis_scaffolding: string | null;
  jumlah_unit: number | null;
  client_groups?: { nama: string; nomor_telepon: string; icon: string | null; };
  bank_accounts?: { bank_name: string; account_number: string; };
  editor_profile?: { full_name: string | null; username: string | null; };
}

interface PaymentHistory {
  id: string;
  payment_date: string;
  amount: number;
  payment_number: number;
  notes: string | null;
  income_source_id: string | null;
}

export default function RecurringIncomeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [income, setIncome] = useState<RecurringIncome | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState<PaymentHistory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isGeneratingNextPeriod, setIsGeneratingNextPeriod] = useState(false);

  useEffect(() => {
    if (user && id) fetchIncomeDetail();
  }, [user, id]);

  const fetchIncomeDetail = async () => {
    if (!user || !id) return;
    setLoading(true);

    const { data: incomeData, error } = await supabase
      .from("fixed_monthly_income")
      .select(`*, client_groups (nama, nomor_telepon, icon), bank_accounts (bank_name, account_number)`)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      toast.error("Gagal memuat detail pemasukan tetap");
      navigate(-1);
      return;
    }

    let editorProfile = null;
    if (incomeData.admin_notes_edited_by) {
      const { data: profileData } = await supabase.from("profiles").select("full_name, username").eq("id", incomeData.admin_notes_edited_by).single();
      editorProfile = profileData;
    }

    setIncome({ ...incomeData, editor_profile: editorProfile } as RecurringIncome);
    setAdminNotes(incomeData.admin_notes || "");

    const { data: paymentData } = await supabase
      .from("recurring_income_payments")
      .select("*")
      .eq("recurring_income_id", id)
      .eq("user_id", user.id)
      .order("payment_number", { ascending: true });

    if (paymentData) {
      setPaymentHistory(paymentData.map((p) => ({
        id: p.id, payment_date: p.payment_date || '', amount: Number(p.amount) || 0,
        payment_number: p.payment_number, notes: p.notes || null, income_source_id: p.income_source_id || null
      })));
    }
    setLoading(false);
  };

  const handleSaveNotes = async () => {
    if (!income || !user) return;
    setIsSavingNotes(true);
    const { error } = await supabase.from("fixed_monthly_income").update({ admin_notes: adminNotes || null, admin_notes_edited_by: user.id, admin_notes_edited_at: new Date().toISOString() }).eq("id", income.id);
    if (!error) { toast.success("Catatan berhasil disimpan"); setIsEditingNotes(false); fetchIncomeDetail(); }
    else toast.error("Gagal menyimpan catatan");
    setIsSavingNotes(false);
  };

  const handleDirectEdit = async (data: { amount: number; payment_date: string; notes: string }) => {
    if (!editPayment || !income) return;
    setIsEditLoading(true);
    try {
      const amountDiff = data.amount - editPayment.amount;
      await supabase.from("recurring_income_payments").update({ amount: data.amount, payment_date: data.payment_date, notes: data.notes || null }).eq("id", editPayment.id);
      if (editPayment.income_source_id) await supabase.from("income_sources").update({ amount: data.amount, date: data.payment_date }).eq("id", editPayment.income_source_id);
      await supabase.from("fixed_monthly_income").update({ tagihan_belum_bayar: income.tagihan_belum_bayar - amountDiff }).eq("id", income.id);
      toast.success("Pembayaran berhasil diperbarui");
      setIsEditDialogOpen(false); setEditPayment(null); fetchIncomeDetail();
    } catch { toast.error("Gagal memperbarui pembayaran"); }
    setIsEditLoading(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    const payment = paymentHistory.find(p => p.id === paymentId);
    if (!payment || !income) return;
    setIsDeleting(true);
    try {
      await supabase.from("recurring_income_payments").delete().eq("id", paymentId);
      if (payment.income_source_id) await supabase.from("income_sources").delete().eq("id", payment.income_source_id);
      await supabase.from("fixed_monthly_income").update({ tagihan_belum_bayar: income.tagihan_belum_bayar + payment.amount }).eq("id", income.id);
      toast.success("Riwayat pembayaran berhasil dihapus");
      setDeletePaymentId(null); setDeleteConfirmStep(1); fetchIncomeDetail();
    } catch { toast.error("Gagal menghapus riwayat pembayaran"); }
    setIsDeleting(false);
  };

  const handleGenerateNextPeriod = async () => {
    if (!income || !user) return;
    setIsGeneratingNextPeriod(true);
    try {
      const nextPeriodStart = addMonths(new Date(income.period_start_month), 1);
      const nextPeriodEnd = addMonths(new Date(income.period_end_month), 1);
      const invoiceNumber = parseInt(income.invoice?.replace(/\D/g, '') || '0', 10);
      const newInvoice = String(invoiceNumber + 1).padStart(6, '0');

      await supabase.from("fixed_monthly_income").insert({
        user_id: user.id, client_group_id: income.client_group_id, bank_account_id: income.bank_account_id,
        invoice: newInvoice, keterangan: income.keterangan, catatan: income.catatan,
        period_start_month: format(nextPeriodStart, 'yyyy-MM-dd'), period_end_month: format(nextPeriodEnd, 'yyyy-MM-dd'),
        nominal: income.nominal, tagihan: income.nominal, tagihan_belum_bayar: income.nominal, status: 'aktif',
        jenis_scaffolding: income.jenis_scaffolding, jumlah_unit: income.jumlah_unit, lokasi_proyek: income.lokasi_proyek
      });
      toast.success(`Periode berikutnya berhasil dibuat: Invoice ${newInvoice}`);
      navigate('/vip/recurring-income');
    } catch { toast.error("Gagal membuat periode berikutnya"); }
    setIsGeneratingNextPeriod(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "aktif": return <Badge className="bg-green-500 text-white">Aktif</Badge>;
      case "selesai": return <Badge variant="secondary">Selesai</Badge>;
      default: return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  if (!income) return <div className="container mx-auto p-6 text-center"><p className="text-muted-foreground">Pemasukan tetap tidak ditemukan</p><Button onClick={() => navigate(-1)} className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" />Kembali</Button></div>;

  const totalPayment = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  const tagihan = income.tagihan || income.nominal || 0;
  const paymentPercentage = tagihan > 0 ? Math.min(100, (totalPayment / tagihan) * 100) : 0;
  const isFullyPaid = income.tagihan_belum_bayar <= 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-3xl font-bold text-foreground">Detail Pemasukan Tetap</h1><p className="text-muted-foreground mt-1">{income.invoice || "No Invoice"}</p></div>
        </div>
        <div className="flex items-center gap-2">{getStatusBadge(income.status)}{isFullyPaid && <Badge className="bg-blue-500 text-white"><RefreshCw className="h-3 w-3 mr-1" />Recurring</Badge>}</div>
      </div>

      {isFullyPaid && (
        <Card className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center"><RefreshCw className="h-6 w-6 text-blue-500" /></div><div><p className="font-semibold text-foreground">Periode Ini Sudah Lunas!</p><p className="text-sm text-muted-foreground">Klik untuk membuat tagihan periode berikutnya</p></div></div>
            <Button onClick={handleGenerateNextPeriod} disabled={isGeneratingNextPeriod} className="bg-blue-500 hover:bg-blue-600"><RefreshCw className={cn("h-4 w-4 mr-2", isGeneratingNextPeriod && "animate-spin")} />{isGeneratingNextPeriod ? "Membuat..." : "Generate Periode Berikutnya"}</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Pembayaran</p><p className="text-2xl font-bold text-foreground mt-1">{formatRupiah(totalPayment)}</p></div><div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center"><Wallet className="h-6 w-6 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="pt-6 space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Persentase Lunas</p><p className={cn("text-2xl font-bold mt-1", paymentPercentage >= 100 ? "text-green-500" : paymentPercentage >= 50 ? "text-amber-500" : "text-red-500")}>{paymentPercentage.toFixed(0)}%</p></div><div className={cn("h-12 w-12 rounded-full flex items-center justify-center", paymentPercentage >= 100 ? "bg-green-500/10" : "bg-red-500/10")}><CheckCircle className={cn("h-6 w-6", paymentPercentage >= 100 ? "text-green-500" : "text-red-500")} /></div></div><Progress value={paymentPercentage} className={cn("h-2", paymentPercentage >= 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500")} /><p className="text-xs text-muted-foreground">{formatRupiah(totalPayment)} / {formatRupiah(tagihan)}</p></CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Sisa Tagihan</p><p className="text-2xl font-bold text-foreground mt-1">{formatRupiah(income.tagihan_belum_bayar)}</p></div><div className={cn("h-12 w-12 rounded-full flex items-center justify-center", isFullyPaid ? "bg-green-500/10" : "bg-red-500/10")}>{isFullyPaid ? <CheckCircle className="h-6 w-6 text-green-500" /> : <AlertCircle className="h-6 w-6 text-red-500" />}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Informasi Pemasukan Tetap</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Invoice</p><p className="font-semibold">{income.invoice || "-"}</p></div><div><p className="text-sm text-muted-foreground">Status</p><div className="mt-1">{getStatusBadge(income.status)}</div></div></div><Separator /><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Periode Mulai</p><p className="font-semibold">{income.period_start_month ? format(new Date(income.period_start_month), "MMMM yyyy", { locale: localeId }) : "-"}</p></div><div><p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Periode Selesai</p><p className="font-semibold">{income.period_end_month ? format(new Date(income.period_end_month), "MMMM yyyy", { locale: localeId }) : "-"}</p></div></div><Separator /><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Nominal Bulanan</p><p className="font-bold text-lg text-primary">{formatRupiah(income.nominal)}</p></div><div><p className="text-sm text-muted-foreground">Total Tagihan</p><p className="font-semibold">{formatRupiah(tagihan)}</p></div></div>{income.keterangan && <><Separator /><div><p className="text-sm text-muted-foreground">Keterangan</p><p className="mt-1">{income.keterangan}</p></div></>}</CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Riwayat Pembayaran</CardTitle></CardHeader><CardContent>{paymentHistory.length === 0 ? <div className="text-center py-8 text-muted-foreground"><Receipt className="h-12 w-12 mx-auto mb-2 opacity-20" /><p>Belum Ada Riwayat Pembayaran</p></div> : <div className="relative"><div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border" /><div className="space-y-6">{paymentHistory.map((payment, index) => <div key={payment.id} className="relative pl-16"><div className="absolute left-3 top-1 h-6 w-6 rounded-full bg-background border-2 border-green-500 flex items-center justify-center"><span className="text-xs font-bold text-green-600">#{payment.payment_number}</span></div><div className="bg-muted/30 rounded-lg p-4 border border-border"><div className="flex items-start justify-between gap-4"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><CheckCircle className="h-4 w-4 text-green-500" /><span className="font-semibold text-foreground">Pembayaran #{payment.payment_number}</span></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-3 w-3" /><span>{payment.payment_date ? format(new Date(payment.payment_date), "dd MMMM yyyy", { locale: localeId }) : "-"}</span></div>{payment.notes && <div className="text-sm text-muted-foreground mt-1">{payment.notes}</div>}</div><div className="text-right flex items-start gap-2"><div><Badge variant="secondary" className="bg-green-500/10 text-green-700">#{payment.payment_number}</Badge><p className="font-bold text-lg text-green-600 mt-1">{formatRupiah(payment.amount)}</p></div>{isSuperAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => { setEditPayment(payment); setIsEditDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>}{isSuperAdmin && <AlertDialog open={deletePaymentId === payment.id} onOpenChange={(open) => { if (!open) { setDeletePaymentId(null); setDeleteConfirmStep(1); } }}><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeletePaymentId(payment.id)}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent>{deleteConfirmStep === 1 ? <><AlertDialogHeader><AlertDialogTitle>Hapus Pembayaran?</AlertDialogTitle><AlertDialogDescription>Hapus Pembayaran #{payment.payment_number} sebesar {formatRupiah(payment.amount)}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); setDeleteConfirmStep(2); }} className="bg-red-500">Lanjutkan</AlertDialogAction></AlertDialogFooter></> : <><AlertDialogHeader><AlertDialogTitle className="text-red-600">Konfirmasi Final</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan!</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeleteConfirmStep(1)}>Kembali</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePayment(payment.id)} className="bg-red-600" disabled={isDeleting}>{isDeleting ? "Menghapus..." : "Ya, Hapus"}</AlertDialogAction></AlertDialogFooter></>}</AlertDialogContent></AlertDialog>}</div></div></div></div>)}</div></div>}</CardContent></Card>

          {(income.jenis_scaffolding || income.jumlah_unit) && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Rincian Scaffolding</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4">{income.jenis_scaffolding && <div><p className="text-sm text-muted-foreground">Jenis</p><p className="font-semibold">{income.jenis_scaffolding}</p></div>}{income.jumlah_unit && <div><p className="text-sm text-muted-foreground">Jumlah Unit</p><p className="font-bold text-lg text-primary">{income.jumlah_unit} unit</p></div>}</CardContent></Card>}
        </div>

        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Informasi Client</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-3">{income.client_groups?.icon && <img src={income.client_groups.icon} alt="" className="w-10 h-10 rounded-full object-cover" />}<div><p className="text-sm text-muted-foreground">Nama</p><p className="font-semibold">{income.client_groups?.nama || "-"}</p></div></div><div><p className="text-sm text-muted-foreground">Telepon</p><p className="font-semibold">{income.client_groups?.nomor_telepon || "-"}</p></div></CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Ringkasan Pembayaran</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg"><div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-sm font-medium">Sudah Dibayar</span></div><span className="font-bold text-green-600">{formatRupiah(totalPayment)}</span></div><div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-600" /><span className="text-sm font-medium">Belum Dibayar</span></div><span className="font-bold text-red-600">{formatRupiah(income.tagihan_belum_bayar || 0)}</span></div><Separator /><div className="flex items-center justify-between"><span className="font-medium">Total Tagihan</span><span className="font-bold text-lg">{formatRupiah(tagihan)}</span></div></CardContent></Card>

          {income.bank_accounts && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Rekening Tujuan</CardTitle></CardHeader><CardContent className="space-y-3"><div><p className="text-sm text-muted-foreground">Bank</p><p className="font-semibold">{income.bank_accounts.bank_name}</p></div><div><p className="text-sm text-muted-foreground">Nomor Rekening</p><p className="font-semibold">{income.bank_accounts.account_number}</p></div></CardContent></Card>}

          {(isSuperAdmin || isAdmin) && <Card><CardHeader><CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5" />Catatan Admin</CardTitle></CardHeader><CardContent>{isEditingNotes ? <div className="space-y-3"><Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Tulis catatan..." rows={4} /><div className="flex gap-2"><Button size="sm" onClick={handleSaveNotes} disabled={isSavingNotes}>{isSavingNotes ? "Menyimpan..." : "Simpan"}</Button><Button size="sm" variant="outline" onClick={() => { setIsEditingNotes(false); setAdminNotes(income.admin_notes || ""); }}>Batal</Button></div></div> : <div>{adminNotes ? <div className="space-y-2"><p className="text-sm whitespace-pre-wrap">{adminNotes}</p>{income.editor_profile && income.admin_notes_edited_at && <p className="text-xs text-muted-foreground">Diedit oleh {income.editor_profile.full_name || income.editor_profile.username} pada {format(new Date(income.admin_notes_edited_at), "dd MMM yyyy HH:mm", { locale: localeId })}</p>}</div> : <p className="text-sm text-muted-foreground">Belum ada catatan</p>}<Button size="sm" variant="outline" className="mt-3" onClick={() => setIsEditingNotes(true)}><Pencil className="h-3 w-3 mr-1" />{adminNotes ? "Edit" : "Tambah"} Catatan</Button></div>}</CardContent></Card>}
        </div>
      </div>

      <PaymentEditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} payment={editPayment} onSave={handleDirectEdit} isLoading={isEditLoading} />
    </div>
  );
}
