import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah } from "@/lib/currency";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, 
  FileText, 
  Calendar, 
  Wallet, 
  User,
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Download,
  ExternalLink,
  Clock,
  Receipt,
  Package,
  Trash2,
  Pencil,
  StickyNote
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { PaymentEditDialog } from "@/components/contracts/PaymentEditDialog";
import { EditRequestDialog } from "@/components/contracts/EditRequestDialog";
import { PendingEditRequests } from "@/components/contracts/PendingEditRequests";

interface Contract {
  id: string;
  client_group_id: string;
  start_date: string;
  end_date: string;
  tanggal: string | null;
  status: string;
  tagihan_belum_bayar: number;
  tagihan: number;
  invoice: string | null;
  keterangan: string | null;
  bukti_pembayaran_files: Array<{ name: string; url: string }>;
  bank_account_id: string | null;
  google_maps_link: string | null;
  notes: string | null;
  inventory_item_id: string | null;
  jumlah_unit: number | null;
  jenis_scaffolding: string | null;
  tanggal_bayar_terakhir?: string | null;
  admin_notes: string | null;
  admin_notes_edited_by: string | null;
  admin_notes_edited_at: string | null;
  client_groups?: {
    nama: string;
    nomor_telepon: string;
  };
  bank_accounts?: {
    bank_name: string;
    account_number: string;
  };
  inventory_items?: {
    id: string;
    item_code: string;
    item_name: string;
    category: string;
    unit_price: number;
    unit_type: string;
    description: string | null;
  };
  editor_profile?: {
    full_name: string | null;
    username: string | null;
  };
}

interface PaymentHistory {
  id: string;
  payment_date: string;
  amount: number;
  payment_number: number;
  notes: string | null;
  income_source_id: string | null;
}

interface EditRequest {
  id: string;
  user_id: string;
  payment_id: string;
  contract_id: string;
  current_amount: number;
  current_payment_date: string;
  current_notes: string | null;
  new_amount: number;
  new_payment_date: string;
  new_notes: string | null;
  request_reason: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  };
}

export default function ContractDetail() {
  const { activeTheme } = useAppTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  
  // Edit payment states
  const [editPayment, setEditPayment] = useState<PaymentHistory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  
  // Admin notes states
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchContractDetail();
      if (isSuperAdmin) {
        fetchEditRequests();
      }
    }
  }, [user, id, isSuperAdmin]);

  const fetchContractDetail = async () => {
    if (!user || !id) return;

    setLoading(true);

    // Fetch contract details with editor profile join
    const { data: contractData, error: contractError } = await supabase
      .from("rental_contracts")
      .select(`
        *,
        client_groups (
          nama,
          nomor_telepon
        ),
        bank_accounts (
          bank_name,
          account_number
        ),
        inventory_items!rental_contracts_inventory_item_id_fkey (
          id,
          item_code,
          item_name,
          category,
          unit_price,
          unit_type,
          description
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    // Debug logging
    console.log('Contract Data:', contractData);
    console.log('Contract Error:', contractError);

    if (contractError) {
      console.error("Error fetching contract:", contractError);
      toast.error("Gagal memuat detail kontrak");
      navigate(-1);
      return;
    }

    // Ensure bukti_pembayaran_files is array and has correct type
    const buktiPembayaran = Array.isArray(contractData.bukti_pembayaran_files) 
      ? (contractData.bukti_pembayaran_files as Array<{ name: string; url: string }>)
      : [];

    // Fetch editor profile if admin_notes_edited_by exists
    let editorProfile = null;
    if (contractData.admin_notes_edited_by) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", contractData.admin_notes_edited_by)
        .single();
      editorProfile = profileData;
    }

    const processedContract: Contract = {
      ...contractData,
      bukti_pembayaran_files: buktiPembayaran,
      editor_profile: editorProfile
    };

    setContract(processedContract as unknown as Contract);
    setAdminNotes(contractData.admin_notes || "");

    // Fetch payment history from contract_payments table
    const { data: paymentData, error: paymentError } = await supabase
      .from("contract_payments")
      .select("*")
      .eq("contract_id", id)
      .eq("user_id", user.id)
      .order("payment_number", { ascending: true });

    if (!paymentError && paymentData) {
      setPaymentHistory(paymentData.map((p) => ({
        id: p.id,
        payment_date: p.payment_date || '',
        amount: Number(p.amount) || 0,
        payment_number: p.payment_number,
        notes: p.notes || null,
        income_source_id: p.income_source_id || null
      })));
    }

    setLoading(false);
  };

  // Handle save admin notes
  const handleSaveNotes = async () => {
    if (!contract || !user) return;
    
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from("rental_contracts")
        .update({
          admin_notes: adminNotes || null,
          admin_notes_edited_by: user.id,
          admin_notes_edited_at: new Date().toISOString()
        })
        .eq("id", contract.id);

      if (error) throw error;

      toast.success("Catatan berhasil disimpan");
      setIsEditingNotes(false);
      fetchContractDetail(); // Refresh to get updated editor info
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Gagal menyimpan catatan");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const fetchEditRequests = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("payment_edit_requests")
      .select(`
        *,
        profiles:user_id (full_name)
      `)
      .eq("contract_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEditRequests(data as unknown as EditRequest[]);
    }
  };

  // Handle direct edit (Super Admin)
  const handleDirectEdit = async (data: {
    amount: number;
    payment_date: string;
    notes: string;
  }) => {
    if (!editPayment || !contract) return;

    setIsEditLoading(true);
    try {
      const amountDiff = data.amount - editPayment.amount;

      // 1. Update contract_payments
      const { error: cpError } = await supabase
        .from("contract_payments")
        .update({
          amount: data.amount,
          payment_date: data.payment_date,
          notes: data.notes || null,
        })
        .eq("id", editPayment.id);

      if (cpError) throw cpError;

      // 2. Update income_sources if linked
      if (editPayment.income_source_id) {
        await supabase
          .from("income_sources")
          .update({
            amount: data.amount,
            date: data.payment_date,
          })
          .eq("id", editPayment.income_source_id);
      }

      // 3. Update tagihan_belum_bayar (adjust by the difference)
      const newSisaTagihan = contract.tagihan_belum_bayar - amountDiff;
      await supabase
        .from("rental_contracts")
        .update({ tagihan_belum_bayar: newSisaTagihan })
        .eq("id", contract.id);

      toast.success("Pembayaran berhasil diperbarui");
      setIsEditDialogOpen(false);
      setEditPayment(null);
      fetchContractDetail();
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error("Gagal memperbarui pembayaran");
    } finally {
      setIsEditLoading(false);
    }
  };

  // Handle submit edit request (Admin)
  const handleSubmitEditRequest = async (data: {
    new_amount: number;
    new_payment_date: string;
    new_notes: string;
    request_reason: string;
  }) => {
    if (!editPayment || !contract || !user) return;

    setIsEditLoading(true);
    try {
      const { error } = await supabase
        .from("payment_edit_requests")
        .insert({
          user_id: user.id,
          payment_id: editPayment.id,
          contract_id: contract.id,
          current_amount: editPayment.amount,
          current_payment_date: editPayment.payment_date,
          current_notes: editPayment.notes,
          new_amount: data.new_amount,
          new_payment_date: data.new_payment_date,
          new_notes: data.new_notes || null,
          request_reason: data.request_reason,
          status: "pending",
        });

      if (error) throw error;

      toast.success("Permintaan edit berhasil dikirim. Menunggu approval Super Admin.");
      setIsRequestDialogOpen(false);
      setEditPayment(null);
    } catch (error) {
      console.error("Error submitting edit request:", error);
      toast.error("Gagal mengirim permintaan edit");
    } finally {
      setIsEditLoading(false);
    }
  };

  // Handle approve request (Super Admin)
  const handleApproveRequest = async (requestId: string) => {
    const request = editRequests.find((r) => r.id === requestId);
    if (!request || !contract || !user) return;

    try {
      const amountDiff = request.new_amount - request.current_amount;

      // 1. Update contract_payments
      const { error: cpError } = await supabase
        .from("contract_payments")
        .update({
          amount: request.new_amount,
          payment_date: request.new_payment_date,
          notes: request.new_notes,
        })
        .eq("id", request.payment_id);

      if (cpError) throw cpError;

      // 2. Find and update income_sources if linked
      const { data: paymentData } = await supabase
        .from("contract_payments")
        .select("income_source_id")
        .eq("id", request.payment_id)
        .single();

      if (paymentData?.income_source_id) {
        await supabase
          .from("income_sources")
          .update({
            amount: request.new_amount,
            date: request.new_payment_date,
          })
          .eq("id", paymentData.income_source_id);
      }

      // 3. Update tagihan_belum_bayar
      const newSisaTagihan = contract.tagihan_belum_bayar - amountDiff;
      await supabase
        .from("rental_contracts")
        .update({ tagihan_belum_bayar: newSisaTagihan })
        .eq("id", contract.id);

      // 4. Update request status
      await supabase
        .from("payment_edit_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      toast.success("Permintaan edit disetujui");
      fetchContractDetail();
      fetchEditRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Gagal menyetujui permintaan");
    }
  };

  // Handle reject request (Super Admin)
  const handleRejectRequest = async (requestId: string, reason: string) => {
    if (!user) return;

    try {
      await supabase
        .from("payment_edit_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", requestId);

      toast.success("Permintaan edit ditolak");
      fetchEditRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Gagal menolak permintaan");
    }
  };

  // Handle edit button click
  const handleEditClick = (payment: PaymentHistory) => {
    setEditPayment(payment);
    if (isSuperAdmin) {
      setIsEditDialogOpen(true);
    } else if (isAdmin) {
      setIsRequestDialogOpen(true);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const payment = paymentHistory.find(p => p.id === paymentId);
    if (!payment || !contract) return;

    setIsDeleting(true);
    try {
      // 1. Delete from contract_payments
      const { error: cpError } = await supabase
        .from("contract_payments")
        .delete()
        .eq("id", paymentId);
      if (cpError) throw cpError;

      // 2. Delete from income_sources if linked
      if (payment.income_source_id) {
        await supabase
          .from("income_sources")
          .delete()
          .eq("id", payment.income_source_id);
      }

      // 3. Update sisa_tagihan (add back the deleted amount)
      const newSisaTagihan = contract.tagihan_belum_bayar + payment.amount;
      await supabase
        .from("rental_contracts")
        .update({ tagihan_belum_bayar: newSisaTagihan })
        .eq("id", contract.id);

      // 4. Renumber remaining payments
      const remainingPayments = paymentHistory
        .filter(p => p.id !== paymentId)
        .sort((a, b) => a.payment_number - b.payment_number);
      
      for (let i = 0; i < remainingPayments.length; i++) {
        const newNumber = i + 1;
        const p = remainingPayments[i];
        
        // Update contract_payments
        await supabase
          .from("contract_payments")
          .update({ payment_number: newNumber })
          .eq("id", p.id);
        
        // Update income_sources source_name
        if (p.income_source_id) {
          const newSourceName = `${contract.invoice || ''} ${contract.keterangan || ''} #${newNumber}`;
          await supabase
            .from("income_sources")
            .update({ source_name: newSourceName.trim() })
            .eq("id", p.income_source_id);
        }
      }

      toast.success("Riwayat pembayaran berhasil dihapus");
      setDeletePaymentId(null);
      setDeleteConfirmStep(1);
      fetchContractDetail(); // Refresh data
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Gagal menghapus riwayat pembayaran");
    } finally {
      setIsDeleting(false);
    }
  };

  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case "masa sewa":
        return <Badge className="bg-green-500 text-white">Masa Sewa</Badge>;
      case "habis sewa":
        return <Badge variant="secondary">Selesai</Badge>;
      case "perpanjangan":
        return <Badge variant="outline">Perpanjangan</Badge>;
      case "selesai":
        return <Badge variant="secondary">Selesai</Badge>;
      default:
        return <Badge variant="outline">{capitalizeWords(status)}</Badge>;
    }
  };

  const getPaymentStatusIcon = () => {
    if (!contract) return null;
    
    if (contract.tagihan_belum_bayar <= 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Kontrak tidak ditemukan</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalPayment = paymentHistory.reduce((sum, payment) => sum + Number(payment.amount), 0);
  
  // Calculate payment percentage
  const paymentPercentage = contract.tagihan > 0 
    ? Math.min(100, (totalPayment / contract.tagihan) * 100)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detail Kontrak</h1>
            <p className="text-muted-foreground mt-1">
              {contract.invoice || "No Invoice"}
            </p>
          </div>
        </div>
        {getStatusBadge(contract.status)}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatRupiah(totalPayment)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Persentase Lunas</p>
                  <p className={cn(
                    "text-2xl font-bold mt-1",
                    paymentPercentage >= 100 ? "text-green-500" : 
                    paymentPercentage >= 50 ? "text-amber-500" : "text-red-500"
                  )}>
                    {paymentPercentage.toFixed(0)}%
                  </p>
                </div>
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center",
                  paymentPercentage >= 100 ? "bg-green-500/10" : 
                  paymentPercentage >= 50 ? "bg-amber-500/10" : "bg-red-500/10"
                )}>
                  <CheckCircle className={cn(
                    "h-6 w-6",
                    paymentPercentage >= 100 ? "text-green-500" : 
                    paymentPercentage >= 50 ? "text-amber-500" : "text-red-500"
                  )} />
                </div>
              </div>
              <Progress 
                value={paymentPercentage} 
                className={cn(
                  "h-2",
                  paymentPercentage >= 100 ? "[&>div]:bg-green-500" : 
                  paymentPercentage >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500"
                )}
              />
              <p className="text-xs text-muted-foreground">
                {formatRupiah(totalPayment)} / {formatRupiah(contract.tagihan || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sisa Tagihan</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatRupiah(contract.tagihan_belum_bayar)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informasi Kontrak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice</p>
                  <p className="font-semibold">{contract.invoice || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(contract.status)}</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Tanggal Mulai
                  </p>
                  <p className="font-semibold">
                    {format(new Date(contract.start_date), "dd MMMM yyyy", { locale: localeId })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Tanggal Selesai
                  </p>
                  <p className="font-semibold">
                    {format(new Date(contract.end_date), "dd MMMM yyyy", { locale: localeId })}
                  </p>
                </div>
              </div>

              {contract.keterangan && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Keterangan</p>
                    <p className="mt-1">{contract.keterangan}</p>
                  </div>
                </>
              )}

              {contract.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Catatan</p>
                    <p className="mt-1">{contract.notes}</p>
                  </div>
                </>
              )}

              {contract.google_maps_link && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Lokasi</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(contract.google_maps_link!, "_blank")}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Lihat di Google Maps
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pending Edit Requests - Super Admin Only */}
          {isSuperAdmin && editRequests.filter(r => r.status === 'pending').length > 0 && (
            <PendingEditRequests
              requests={editRequests}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          )}

          {/* Payment History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Riwayat Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Belum Ada Riwayat Pembayaran</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border animate-fade-in" />
                  
                <div className="space-y-6">
                    {paymentHistory.map((payment, index) => (
                      <div 
                        key={payment.id} 
                        className="relative pl-16 animate-fade-in opacity-0"
                        style={{ 
                          animationDelay: `${index * 100}ms`,
                          animationFillMode: 'forwards'
                        }}
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-3 top-1 h-6 w-6 rounded-full bg-background border-2 border-green-500 flex items-center justify-center animate-scale-in"
                          style={{ 
                            animationDelay: `${index * 100 + 150}ms`,
                            animationFillMode: 'forwards'
                          }}
                        >
                          <span className="text-xs font-bold text-green-600">#{payment.payment_number}</span>
                        </div>
                        
                        <div className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-200 border border-border hover:shadow-md">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="font-semibold text-foreground">
                                  Pembayaran #{payment.payment_number}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {payment.payment_date
                                    ? format(new Date(payment.payment_date), "dd MMMM yyyy", { locale: localeId })
                                    : "-"}
                                </span>
                              </div>
                              
                              {payment.notes && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {payment.notes}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right flex items-start gap-2">
                              <div>
                                <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
                                  #{payment.payment_number}
                                </Badge>
                                <p className="font-bold text-lg text-green-600 mt-1">
                                  {formatRupiah(payment.amount)}
                                </p>
                              </div>
                              
                              {/* Edit Button - Super Admin & Admin */}
                              {(isSuperAdmin || isAdmin) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                                  onClick={() => handleEditClick(payment)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* Delete Button - Super Admin Only */}
                              {isSuperAdmin && (
                                <AlertDialog 
                                  open={deletePaymentId === payment.id}
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setDeletePaymentId(null);
                                      setDeleteConfirmStep(1);
                                    }
                                  }}
                                >
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                      onClick={() => setDeletePaymentId(payment.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    {deleteConfirmStep === 1 ? (
                                      <>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Hapus Riwayat Pembayaran?</AlertDialogTitle>
                                          <AlertDialogDescription asChild>
                                            <div>
                                              <p>
                                                Anda akan menghapus <strong>Pembayaran #{payment.payment_number}</strong> 
                                                sebesar <strong>{formatRupiah(payment.amount)}</strong>.
                                              </p>
                                              <p className="mt-2">Tindakan ini akan:</p>
                                              <ul className="list-disc ml-4 mt-2">
                                                <li>Menghapus catatan pembayaran</li>
                                                <li>Menghapus data pemasukan terkait</li>
                                                <li>Mengembalikan sisa tagihan</li>
                                                <li>Mengubah nomor pembayaran lainnya</li>
                                              </ul>
                                            </div>
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => {
                                            setDeletePaymentId(null);
                                            setDeleteConfirmStep(1);
                                          }}>
                                            Batal
                                          </AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={(e) => {
                                              e.preventDefault();
                                              setDeleteConfirmStep(2);
                                            }}
                                            className="bg-red-500 hover:bg-red-600"
                                          >
                                            Lanjutkan
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </>
                                    ) : (
                                      <>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-red-600">
                                            ⚠️ Konfirmasi Final
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Apakah Anda <strong>YAKIN</strong> ingin menghapus pembayaran ini?
                                            <br />
                                            <strong>Tindakan ini tidak dapat dibatalkan!</strong>
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => setDeleteConfirmStep(1)}>
                                            Kembali
                                          </AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => handleDeletePayment(payment.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                            disabled={isDeleting}
                                          >
                                            {isDeleting ? "Menghapus..." : "Ya, Hapus Permanen"}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </>
                                    )}
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Proofs */}
          {contract.bukti_pembayaran_files && contract.bukti_pembayaran_files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Bukti Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contract.bukti_pembayaran_files.map((file, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start"
                      onClick={() => window.open(file.url, "_blank")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="truncate">{file.name}</span>
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rincian Stok Barang */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Rincian Stok Barang
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contract.inventory_items ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Kode Barang</p>
                      <p className="font-semibold">{contract.inventory_items.item_code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nama Barang</p>
                      <p className="font-semibold">{contract.inventory_items.item_name}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Kategori</p>
                      <p className="font-semibold">{contract.inventory_items.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Satuan</p>
                      <p className="font-semibold">{contract.inventory_items.unit_type}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground">Jumlah Unit Disewa</p>
                    <p className="font-bold text-xl text-primary">
                      {contract.jumlah_unit} {contract.inventory_items.unit_type}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground">Harga Satuan</p>
                    <p className="font-semibold">
                      {formatRupiah(contract.inventory_items.unit_price)} / {contract.inventory_items.unit_type}
                    </p>
                  </div>

                  {contract.inventory_items.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Deskripsi</p>
                        <p className="mt-1">{contract.inventory_items.description}</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-yellow-500 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    Kontrak ini belum terhubung dengan item inventory
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/vip/contracts/${id}/scaffolding`)}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Hubungkan ke Inventory
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nama</p>
                <p className="font-semibold">{contract.client_groups?.nama || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nomor Telepon</p>
                <p className="font-semibold">{contract.client_groups?.nomor_telepon || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Ringkasan Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Sudah Dibayar</span>
                </div>
                <span className="font-bold text-green-600">
                  {formatRupiah(totalPayment)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Belum Dibayar</span>
                </div>
                <span className="font-bold text-red-600">
                  {formatRupiah(contract.tagihan_belum_bayar || 0)}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-medium">Total Tagihan</span>
                <span className="font-bold text-lg">
                  {formatRupiah(contract.tagihan || 0)}
                </span>
              </div>

              {contract.tanggal_bayar_terakhir && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pembayaran Terakhir</p>
                    <div className="flex items-center gap-2">
                      {getPaymentStatusIcon()}
                      <span className="font-semibold text-green-600">
                        {format(new Date(contract.tanggal_bayar_terakhir), "dd MMMM yyyy", { locale: localeId })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Bank Account */}
          {contract.bank_accounts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rekening Bank</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Bank</p>
                  <p className="font-semibold">{contract.bank_accounts.bank_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nomor Rekening</p>
                  <p className="font-mono font-semibold">{contract.bank_accounts.account_number}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Catatan Admin - Only for Admin/Super Admin */}
      {(isSuperAdmin || isAdmin) && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Catatan Admin
            </CardTitle>
            {contract.admin_notes_edited_at && contract.editor_profile && (
              <span className="text-xs text-muted-foreground">
                Terakhir diedit oleh: {contract.editor_profile.full_name || contract.editor_profile.username || "Unknown"} 
                {" • "}
                {format(new Date(contract.admin_notes_edited_at), "dd MMM yyyy HH:mm", { locale: localeId })}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {isEditingNotes ? (
              <div className="space-y-3">
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Tulis catatan untuk kontrak ini..."
                  rows={4}
                  className="resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setIsEditingNotes(false);
                      setAdminNotes(contract.admin_notes || "");
                    }}
                  >
                    Batal
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes} disabled={isSavingNotes}>
                    {isSavingNotes ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="min-h-[80px] p-3 rounded-md border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsEditingNotes(true)}
              >
                {contract.admin_notes ? (
                  <p className="text-sm whitespace-pre-wrap">{contract.admin_notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Klik untuk menambahkan catatan...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Edit Payment Dialog - Super Admin */}
      <PaymentEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        payment={editPayment}
        onSave={handleDirectEdit}
        isLoading={isEditLoading}
      />

      {/* Edit Request Dialog - Admin */}
      <EditRequestDialog
        open={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        payment={editPayment}
        onSubmit={handleSubmitEditRequest}
        isLoading={isEditLoading}
      />
    </div>
  );
}
