import { useEffect, useState, useCallback } from "react";
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
  StickyNote,
  CreditCard,
  Plus,
  FileCheck,
  FileOutput,
  Banknote
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PaymentEditDialog } from "@/components/contracts/PaymentEditDialog";
import { EditRequestDialog } from "@/components/contracts/EditRequestDialog";
import { PendingEditRequests } from "@/components/contracts/PendingEditRequests";
import { ContractPublicLinkManager } from "@/components/contracts/ContractPublicLinkManager";
import { PaymentVerificationModal } from "@/components/payment/PaymentVerificationModal";
import { PaymentVerificationStatus } from "@/components/payment/PaymentVerificationStatus";
import { ContractLineItemsEditor } from "@/components/contracts/ContractLineItemsEditor";
import { RincianTemplateDisplay } from "@/components/contracts/RincianTemplateDisplay";
import { ContractStockItemsEditor } from "@/components/contracts/ContractStockItemsEditor";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { 
  generateRincianTemplate,
  type TemplateData 
} from "@/lib/contractTemplateGenerator";
import { WhatsAppMessageGenerator } from "@/components/contracts/WhatsAppMessageGenerator";

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
  tanggal_kirim?: string | null;
  tanggal_ambil?: string | null;
  status_pengiriman?: string | null;
  status_pengambilan?: string | null;
  admin_notes: string | null;
  admin_notes_edited_by: string | null;
  admin_notes_edited_at: string | null;
  rincian_template?: string | null;
  transport_cost_delivery?: number | null;
  transport_cost_pickup?: number | null;
  whatsapp_template_mode?: boolean | null;
  invoice_full_rincian?: boolean | null; // Toggle for full/simple invoice page 2
  client_groups?: {
    nama: string;
    nomor_telepon: string;
  };
  bank_accounts?: {
    bank_name: string;
    account_number: string;
    account_holder_name?: string;
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
  
  // Payment modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingPaymentRequest, setPendingPaymentRequest] = useState<any>(null);
  
  // Rincian editor states
  const [showRincianEditor, setShowRincianEditor] = useState(false);
  const [showStockEditor, setShowStockEditor] = useState(false);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [isTogglingWhatsAppMode, setIsTogglingWhatsAppMode] = useState(false);
  
  // Document generation states
  const [documentPreviewOpen, setDocumentPreviewOpen] = useState(false);
  const [documentData, setDocumentData] = useState<any>(null);
  
  // Invoice full rincian toggle state
  const [invoiceFullRincian, setInvoiceFullRincian] = useState(true);
  const [isSavingRincianMode, setIsSavingRincianMode] = useState(false);
  
  // Cash payment states
  const [isCashPaymentOpen, setIsCashPaymentOpen] = useState(false);
  const [cashPaymentAmount, setCashPaymentAmount] = useState("");
  const [isProcessingCashPayment, setIsProcessingCashPayment] = useState(false);

  const fetchPendingPaymentRequest = useCallback(async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from("payment_confirmation_requests")
      .select("*")
      .eq("contract_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    setPendingPaymentRequest(data);
  }, [id]);

  useEffect(() => {
    if (user && id) {
      fetchContractDetail();
      fetchPendingPaymentRequest();
      fetchStockItems();
      if (isSuperAdmin) {
        fetchEditRequests();
      }
    }
  }, [user, id, isSuperAdmin, fetchPendingPaymentRequest]);

  const fetchStockItems = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from('contract_stock_items')
      .select(`
        id,
        quantity,
        unit_mode,
        returned_at,
        inventory_items (
          item_name,
          item_code,
          unit_type,
          pcs_per_set
        )
      `)
      .eq('contract_id', id)
      .order('returned_at', { ascending: true, nullsFirst: true });
    
    setStockItems(data || []);
  };

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
          account_number,
          account_holder_name
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
    setInvoiceFullRincian(contractData.invoice_full_rincian !== false); // Default to true

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

  // Handle toggle WhatsApp mode
  const handleToggleWhatsAppMode = async (newMode: boolean) => {
    if (!contract || !user) return;
    
    setIsTogglingWhatsAppMode(true);
    try {
      // Fetch line items to regenerate template
      const { data: lineItemsData } = await supabase
        .from('contract_line_items')
        .select('*')
        .eq('contract_id', contract.id)
        .order('sort_order');
      
      const { data: contractData } = await supabase
        .from('rental_contracts')
        .select('transport_cost_delivery, transport_cost_pickup, discount, keterangan, start_date, end_date')
        .eq('id', contract.id)
        .single();
      
      if (lineItemsData && lineItemsData.length > 0 && contractData) {
        const templateData: TemplateData = {
          lineItems: lineItemsData.map(item => ({
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price_per_day: Number(item.unit_price_per_day),
            duration_days: item.duration_days,
          })),
          transportDelivery: Number(contractData.transport_cost_delivery) || 0,
          transportPickup: Number(contractData.transport_cost_pickup) || 0,
          contractTitle: contractData.keterangan || '',
          discount: Number(contractData.discount) || 0,
          startDate: contractData.start_date || '',
          endDate: contractData.end_date || '',
        };
        
        const newTemplate = generateRincianTemplate(templateData, newMode);
        
        const { error } = await supabase
          .from('rental_contracts')
          .update({
            whatsapp_template_mode: newMode,
            rincian_template: newTemplate,
          })
          .eq('id', contract.id);
        
        if (error) throw error;
        
        toast.success(newMode ? 'Mode WhatsApp diaktifkan' : 'Mode Normal diaktifkan');
        fetchContractDetail();
      } else {
        // No line items, just update the mode flag
        const { error } = await supabase
          .from('rental_contracts')
          .update({ whatsapp_template_mode: newMode })
          .eq('id', contract.id);
        
        if (error) throw error;
        toast.success(newMode ? 'Mode WhatsApp diaktifkan' : 'Mode Normal diaktifkan');
        fetchContractDetail();
      }
    } catch (error) {
      console.error("Error toggling mode:", error);
      toast.error("Gagal mengubah mode template");
    } finally {
      setIsTogglingWhatsAppMode(false);
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

  // Handle save invoice full rincian toggle
  const handleSaveInvoiceFullRincian = async (value: boolean) => {
    if (!contract || !user) return;
    
    setIsSavingRincianMode(true);
    try {
      const { error } = await supabase
        .from("rental_contracts")
        .update({ invoice_full_rincian: value })
        .eq("id", contract.id);
      
      if (error) throw error;
      
      setInvoiceFullRincian(value);
      setContract(prev => prev ? { ...prev, invoice_full_rincian: value } : null);
      toast.success(value ? "Mode Full Rincian aktif (Invoice & Kwitansi)" : "Mode Sederhana aktif (Invoice & Kwitansi)");
    } catch (error) {
      console.error("Error saving invoice full rincian:", error);
      toast.error("Gagal menyimpan pengaturan");
      // Revert toggle
      setInvoiceFullRincian(!value);
    } finally {
      setIsSavingRincianMode(false);
    }
  };

  // Handle cash payment (Admin/Super Admin only)
  const handleCashPayment = async () => {
    if (!contract || !user || !cashPaymentAmount) return;
    
    const amount = parseFloat(cashPaymentAmount.replace(/[^\d]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      toast.error("Masukkan jumlah yang valid");
      return;
    }
    
    if (amount > contract.tagihan_belum_bayar) {
      toast.error("Jumlah melebihi sisa tagihan");
      return;
    }
    
    setIsProcessingCashPayment(true);
    try {
      // Get payment count
      const { count } = await supabase
        .from("contract_payments")
        .select("*", { count: "exact", head: true })
        .eq("contract_id", contract.id);
      
      const paymentNumber = (count || 0) + 1;
      const paymentDate = format(new Date(), "yyyy-MM-dd");
      const sourceName = `${contract.invoice || "Sewa"} ${contract.keterangan || contract.client_groups?.nama || ""} #${paymentNumber} (Cash)`.trim();
      
      // Insert to income_sources
      const { data: incomeData, error: incomeError } = await supabase
        .from("income_sources")
        .insert({
          user_id: user.id,
          source_name: sourceName,
          amount: amount,
          date: paymentDate,
          bank_name: "Cash",
          contract_id: contract.id,
        })
        .select("id")
        .single();
      
      if (incomeError) throw incomeError;
      
      // Insert to contract_payments
      const { error: paymentError } = await supabase
        .from("contract_payments")
        .insert({
          user_id: user.id,
          contract_id: contract.id,
          payment_date: paymentDate,
          amount: amount,
          payment_number: paymentNumber,
          income_source_id: incomeData?.id,
          notes: "Pembayaran Cash",
          confirmed_by: user.id,
          payment_source: "cash",
        });
      
      if (paymentError) throw paymentError;
      
      // Update rental_contracts
      const newSisa = contract.tagihan_belum_bayar - amount;
      const { error: updateError } = await supabase
        .from("rental_contracts")
        .update({
          tagihan_belum_bayar: newSisa,
          tanggal_bayar_terakhir: paymentDate,
        })
        .eq("id", contract.id);
      
      if (updateError) throw updateError;
      
      toast.success(`Pembayaran Cash #${paymentNumber} berhasil dicatat`);
      setIsCashPaymentOpen(false);
      setCashPaymentAmount("");
      fetchContractDetail();
    } catch (error: any) {
      console.error("Error processing cash payment:", error);
      toast.error("Gagal mencatat pembayaran: " + error.message);
    } finally {
      setIsProcessingCashPayment(false);
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

  // Generate Invoice handler
  const handleGenerateInvoice = async () => {
    if (!contract) return;
    
    // Calculate total payment
    const totalPaid = paymentHistory.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = contract.tagihan_belum_bayar;
    
    // Check if invoice document already exists - use existing verification code
    const { data: existingDoc } = await supabase
      .from('invoice_receipts')
      .select('verification_code')
      .eq('contract_id', contract.id)
      .eq('document_type', 'invoice')
      .is('payment_id', null)
      .maybeSingle();
    
    // Use existing code or generate new one
    const verificationCode = existingDoc?.verification_code 
      || `VRF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    // Get active public link access code for payment QR
    const { data: publicLink } = await supabase
      .from('contract_public_links')
      .select('access_code')
      .eq('contract_id', contract.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Fetch line items for Page 2 (Rincian Tagihan)
    const { data: lineItemsData } = await supabase
      .from('contract_line_items')
      .select('item_name, quantity, unit_price_per_day, duration_days, subtotal')
      .eq('contract_id', contract.id)
      .order('sort_order', { ascending: true });
    
    console.log("=== handleGenerateInvoice Debug ===");
    console.log("contract.id:", contract.id);
    console.log("lineItemsData fetched:", lineItemsData);
    console.log("lineItemsData length:", lineItemsData?.length);
    console.log("transport_cost_delivery:", contract.transport_cost_delivery);
    console.log("transport_cost_pickup:", contract.transport_cost_pickup);
    
    setDocumentData({
      documentType: 'invoice',
      documentNumber: contract.invoice || contract.id.slice(0, 6).toUpperCase(),
      issuedAt: new Date(),
      dueDate: new Date(contract.end_date),
      clientName: contract.client_groups?.nama || 'Client',
      clientAddress: '',
      clientPhone: contract.client_groups?.nomor_telepon || '',
      description: contract.keterangan || 'Sewa Scaffolding',
      amount: remaining > 0 ? remaining : contract.tagihan,
      status: contract.tagihan_belum_bayar <= 0 ? 'lunas' : 'belum_lunas',
      verificationCode,
      contractInvoice: contract.invoice,
      period: `${format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - ${format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}`,
      contractId: contract.id,
      contractBankInfo: contract.bank_accounts ? {
        bank_name: contract.bank_accounts.bank_name,
        account_number: contract.bank_accounts.account_number,
        account_holder_name: contract.bank_accounts.account_holder_name,
      } : undefined,
      accessCode: publicLink?.access_code,
      // Page 2: Rincian Tagihan data
      lineItems: lineItemsData || [],
      transportDelivery: contract.transport_cost_delivery || 0,
      transportPickup: contract.transport_cost_pickup || 0,
      discount: 0, // Can be added to contract schema if needed
      fullRincian: invoiceFullRincian, // Pass saved setting for page 2 display mode
    });
    setDocumentPreviewOpen(true);
  };

  // Generate Receipt handler
  const handleGenerateReceipt = async (paymentId?: string) => {
    if (!contract) return;
    
    // Find specific payment or use the latest
    const payment = paymentId 
      ? paymentHistory.find(p => p.id === paymentId) 
      : paymentHistory[paymentHistory.length - 1];
    
    if (!payment) {
      toast.error("Tidak ada pembayaran untuk dibuat kwitansi");
      return;
    }
    
    // Fetch line items for Page 2 (Rincian Sewa)
    const { data: contractLineItems } = await supabase
      .from('contract_line_items')
      .select('*')
      .eq('contract_id', contract.id)
      .order('sort_order', { ascending: true });
    
    // Check if receipt document already exists for this payment - use existing verification code
    const { data: existingDoc } = await supabase
      .from('invoice_receipts')
      .select('verification_code')
      .eq('payment_id', payment.id)
      .eq('document_type', 'kwitansi')
      .maybeSingle();
    
    // Use existing code or generate new one
    const verificationCode = existingDoc?.verification_code 
      || `VRF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    // Validate payment date - fallback to current date if invalid
    const paymentDateValue = payment.payment_date 
      ? new Date(payment.payment_date) 
      : new Date();
    const validPaymentDate = isNaN(paymentDateValue.getTime()) 
      ? new Date() 
      : paymentDateValue;
    
    // Transform line items for Page 2
    const lineItemsData = (contractLineItems || []).map(item => ({
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price_per_day: item.unit_price_per_day,
      duration_days: item.duration_days,
      subtotal: item.subtotal,
    }));
    
    setDocumentData({
      documentType: 'kwitansi',
      documentNumber: contract.invoice || contract.id.slice(0, 6).toUpperCase(),
      issuedAt: validPaymentDate,
      clientName: contract.client_groups?.nama || 'Client',
      clientAddress: '',
      clientPhone: contract.client_groups?.nomor_telepon || '',
      description: `Pembayaran Lunas - ${contract.keterangan || 'Sewa Scaffolding'}`,
      amount: payment.amount,
      status: 'lunas',
      verificationCode,
      invoiceNumber: contract.invoice,
      paymentDate: validPaymentDate,
      contractId: contract.id,
      paymentId: payment.id,
      // Page 2: Rincian Sewa data
      lineItems: lineItemsData,
      transportDelivery: contract.transport_cost_delivery || 0,
      transportPickup: contract.transport_cost_pickup || 0,
      discount: 0,
      period: `${format(new Date(contract.start_date), 'dd MMM yyyy', { locale: localeId })} - ${format(new Date(contract.end_date), 'dd MMM yyyy', { locale: localeId })}`,
      fullRincian: invoiceFullRincian,
    });
    setDocumentPreviewOpen(true);
  };

  const getStatusBadge = (status: string, tagihanBelumBayar?: number) => {
    const normalizedStatus = status.toLowerCase();
    
    // Jika selesai dan sudah lunas → Closed (merah)
    if (normalizedStatus === 'selesai' && tagihanBelumBayar !== undefined && tagihanBelumBayar <= 0) {
      return <Badge className="bg-red-600 text-white">Closed</Badge>;
    }
    
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
        {getStatusBadge(contract.status, contract.tagihan_belum_bayar)}
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
                  <div className="mt-1">{getStatusBadge(contract.status, contract.tagihan_belum_bayar)}</div>
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

              {/* Tanggal Pengiriman & Pengambilan */}
              {(contract.tanggal_kirim || contract.tanggal_ambil) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contract.tanggal_kirim && (
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Tanggal Pengiriman
                        </p>
                        <p className="font-semibold text-blue-600">
                          {format(new Date(contract.tanggal_kirim), "dd MMMM yyyy", { locale: localeId })}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className="mt-1 text-xs bg-green-100 text-green-700"
                        >
                          Sudah Dikirim
                        </Badge>
                      </div>
                    )}
                    {contract.tanggal_ambil && (
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Tanggal Pengambilan
                        </p>
                        <p className="font-semibold text-emerald-600">
                          {format(new Date(contract.tanggal_ambil), "dd MMMM yyyy", { locale: localeId })}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className="mt-1 text-xs bg-emerald-100 text-emerald-700"
                        >
                          Sudah Diambil
                        </Badge>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Document Generation Buttons */}
          {(isSuperAdmin || isAdmin) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileOutput className="h-5 w-5" />
                  Generate Dokumen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={handleGenerateInvoice}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Invoice
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleGenerateReceipt()}
                    disabled={contract.tagihan_belum_bayar > 0}
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Generate Kwitansi
                  </Button>
                </div>
                {contract.tagihan_belum_bayar > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Kwitansi akan tersedia setelah tagihan lunas 100%
                  </p>
                )}
                
                {/* Invoice Full Rincian Toggle - Only for Admin/Super Admin */}
                <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="invoice-full-rincian"
                      checked={invoiceFullRincian}
                      onCheckedChange={handleSaveInvoiceFullRincian}
                      disabled={isSavingRincianMode}
                    />
                    <Label htmlFor="invoice-full-rincian" className="text-sm cursor-pointer">
                      Invoice & Kwitansi Full Rincian
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {invoiceFullRincian 
                      ? 'Halaman 2: Semua kolom (Invoice & Kwitansi)' 
                      : 'Halaman 2: Hanya No, Nama Item, Qty'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rincian Kontrak Section */}
          {showRincianEditor ? (
            <ContractLineItemsEditor
              contractId={contract.id}
              existingTemplate={contract.rincian_template}
              onSave={() => {
                setShowRincianEditor(false);
                fetchContractDetail();
              }}
              onCancel={() => setShowRincianEditor(false)}
            />
          ) : contract.rincian_template ? (
            <div className="space-y-2">
              <RincianTemplateDisplay
                template={contract.rincian_template}
                showCopyButton={true}
                showModeToggle={isSuperAdmin || isAdmin}
                isWhatsAppMode={contract.whatsapp_template_mode || false}
                onToggleMode={handleToggleWhatsAppMode}
                isTogglingMode={isTogglingWhatsAppMode}
              />
              {(isSuperAdmin || isAdmin) && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowRincianEditor(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Rincian
                  </Button>
                </div>
              )}
            </div>
          ) : (
            (isSuperAdmin || isAdmin) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Rincian Tagihan
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground mb-4">Belum ada rincian tagihan</p>
                  <Button onClick={() => setShowRincianEditor(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Buat Rincian
                  </Button>
                </CardContent>
              </Card>
            )
          )}

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
                          <span className="text-xs font-bold text-green-600">{payment.payment_number}</span>
                        </div>
                        
                        <div className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-200 border border-border hover:shadow-md">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="font-semibold text-foreground">
                                  Pembayaran {payment.payment_number}
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
                                  {payment.payment_number}
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
          {showStockEditor ? (
            <ContractStockItemsEditor
              contractId={id}
              onSave={() => {
                setShowStockEditor(false);
                fetchStockItems();
              }}
              onCancel={() => setShowStockEditor(false)}
            />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Rincian Stok Barang
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowStockEditor(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Item yang ditambahkan otomatis mengurangi stok gudang
                </p>
              </CardHeader>
              <CardContent>
                {stockItems.length > 0 ? (
                  <div className="space-y-3">
                    {stockItems.map((item: any) => (
                      <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${item.returned_at ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800' : 'bg-muted/30'}`}>
                        <div className="space-y-1">
                          <p className={`font-medium ${item.returned_at ? 'text-muted-foreground' : ''}`}>
                            {item.inventory_items?.item_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{item.inventory_items?.item_code}</p>
                          {item.returned_at && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-600 text-xs">
                              Dikembalikan: {format(new Date(item.returned_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={item.returned_at ? "outline" : "secondary"} className={`text-base ${item.returned_at ? 'text-muted-foreground' : ''}`}>
                          {item.unit_mode === 'set'
                            ? `${Math.floor(item.quantity / (item.inventory_items?.pcs_per_set || 1))} set`
                            : `${item.quantity} pcs`
                          }
                        </Badge>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Unit</span>
                      <Badge className="text-base">
                        {stockItems.reduce((sum: number, item: any) => sum + item.quantity, 0)} pcs
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">
                      Belum ada item stok barang
                    </p>
                    <Button onClick={() => setShowStockEditor(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Item Stok
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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

              {/* Tombol Bayar - Muncul hanya jika ada sisa tagihan */}
              {contract.tagihan_belum_bayar > 0 && (
                <>
                  <Separator />
                  <div className="pt-2 space-y-2">
                    {pendingPaymentRequest ? (
                      <PaymentVerificationStatus
                        requestId={pendingPaymentRequest.id}
                        uniqueAmount={pendingPaymentRequest.unique_amount}
                        expiresAt={pendingPaymentRequest.expires_at}
                        createdAt={pendingPaymentRequest.created_at}
                        burstTriggeredAt={pendingPaymentRequest.burst_triggered_at}
                        onClose={() => {
                          setPendingPaymentRequest(null);
                          fetchPendingPaymentRequest();
                          fetchContractDetail();
                        }}
                        onVerified={() => {
                          fetchContractDetail();
                          fetchPendingPaymentRequest();
                        }}
                      />
                    ) : (
                      <Button 
                        className="w-full"
                        onClick={() => setIsPaymentModalOpen(true)}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Bayar Sekarang
                      </Button>
                    )}
                    
                    {/* Bayar Cash Button - Admin/Super Admin Only */}
                    {(isSuperAdmin || isAdmin) && (
                      <AlertDialog 
                        open={isCashPaymentOpen} 
                        onOpenChange={(open) => {
                          setIsCashPaymentOpen(open);
                          if (open) {
                            setCashPaymentAmount(contract.tagihan_belum_bayar.toString());
                          }
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                          >
                            <Banknote className="h-4 w-4 mr-2" />
                            Bayar Cash
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <Banknote className="h-5 w-5 text-green-600" />
                              Catat Pembayaran Cash
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                              <div className="space-y-4 pt-2">
                                <p>Client sudah membayar secara cash. Masukkan jumlah pembayaran:</p>
                                <div className="space-y-2">
                                  <Label htmlFor="cash-amount">Jumlah Pembayaran</Label>
                                  <Input
                                    id="cash-amount"
                                    type="text"
                                    placeholder="Contoh: 500000"
                                    value={cashPaymentAmount}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^\d]/g, '');
                                      setCashPaymentAmount(value);
                                    }}
                                    className="text-lg font-mono"
                                  />
                                  {cashPaymentAmount && (
                                    <p className="text-sm text-muted-foreground">
                                      = {formatRupiah(parseInt(cashPaymentAmount) || 0)}
                                    </p>
                                  )}
                                </div>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-sm">
                                    <span className="text-muted-foreground">Sisa Tagihan:</span>{" "}
                                    <span className="font-semibold">{formatRupiah(contract.tagihan_belum_bayar)}</span>
                                  </p>
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel 
                              onClick={() => setCashPaymentAmount("")}
                              disabled={isProcessingCashPayment}
                            >
                              Batal
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                handleCashPayment();
                              }}
                              disabled={!cashPaymentAmount || isProcessingCashPayment}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isProcessingCashPayment ? "Memproses..." : "Konfirmasi Cash"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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

          {/* Public Link Manager - Only for Admin/Super Admin */}
          {(isSuperAdmin || isAdmin) && (
            <ContractPublicLinkManager contractId={contract.id} />
          )}
        </div>
      </div>

      {/* Catatan Admin - Only for Admin/Super Admin */}
      {(isSuperAdmin || isAdmin) && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Catatan
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

      {/* WhatsApp Message Generator - Only for Admin/Super Admin */}
      {(isSuperAdmin || isAdmin) && contract && user && (
        <WhatsAppMessageGenerator
          contract={{
            id: contract.id,
            invoice_number: contract.invoice || '',
            keterangan: contract.keterangan || undefined,
            start_date: contract.start_date,
            end_date: contract.end_date,
            lokasi_proyek: contract.google_maps_link || undefined,
            jenis_scaffolding: contract.jenis_scaffolding || undefined,
            jumlah_unit: contract.jumlah_unit || undefined,
            jumlah_tagihan: contract.tagihan || 0,
            tagihan_belum_bayar: contract.tagihan_belum_bayar || 0,
            tanggal_kirim: contract.tanggal_kirim || undefined,
            tanggal_ambil: contract.tanggal_ambil || undefined,
            status_pengiriman: contract.status_pengiriman || undefined,
            status_pengambilan: contract.status_pengambilan || undefined,
            client_groups: contract.client_groups ? {
              nama: contract.client_groups.nama,
              nomor_telepon: contract.client_groups.nomor_telepon,
            } : undefined,
          }}
          payments={paymentHistory.map(p => ({
            id: p.id,
            amount: p.amount,
            payment_date: p.payment_date,
            payment_number: p.payment_number,
            notes: p.notes || undefined,
          }))}
          bankAccount={contract.bank_accounts ? {
            bank_name: contract.bank_accounts.bank_name,
            account_number: contract.bank_accounts.account_number,
            account_holder_name: contract.bank_accounts.account_holder_name || undefined,
          } : null}
          userId={user.id}
        />
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

      {/* Payment Verification Modal */}
      {contract && contract.tagihan_belum_bayar > 0 && (
        <PaymentVerificationModal
          open={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          contractId={contract.id}
          remainingAmount={contract.tagihan_belum_bayar}
          customerName={contract.client_groups?.nama || "Customer"}
          onSuccess={() => {
            fetchPendingPaymentRequest();
            setIsPaymentModalOpen(false);
          }}
        />
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={documentPreviewOpen}
        onOpenChange={setDocumentPreviewOpen}
        documentData={documentData}
      />
    </div>
  );
}
