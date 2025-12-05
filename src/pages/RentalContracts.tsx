import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { Plus, Calendar as CalendarIcon, Trash2, Edit, ExternalLink, Lock, Unlock, Check, ChevronsUpDown, FileText, Wallet, CheckCircle, Loader2, RefreshCw, Users, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { GradientButton } from "@/components/GradientButton";
import BankLogo from "@/components/BankLogo";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/contexts/AppThemeContext";

interface ClientGroup {
  id: string;
  nama: string;
  nomor_telepon: string;
}

interface RentalContract {
  id: string;
  client_group_id: string;
  start_date: string;
  end_date: string;
  tanggal: string | null;
  tanggal_lunas: string | null;
  status: string;
  tagihan: number;
  tagihan_belum_bayar: number;
  jumlah_lunas: number;
  invoice: string | null;
  keterangan: string | null;
  bukti_pembayaran_files: Array<{ name: string; url: string }>;
  bank_account_id: string | null;
  google_maps_link: string | null;
  notes: string | null;
  inventory_item_id: string | null;
  jenis_scaffolding: string | null;
  jumlah_unit: number | null;
  lokasi_detail: string | null;
  tanggal_kirim: string | null;
  tanggal_ambil: string | null;
  status_pengiriman: string | null;
  status_pengambilan: string | null;
  biaya_kirim: number | null;
  penanggung_jawab: string | null;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
}

const RentalContracts = () => {
  const { user } = useAuth();
  const { activeTheme } = useAppTheme();
  const navigate = useNavigate();
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [isTableLocked, setIsTableLocked] = useState(true);
  const [sortBy, setSortBy] = useState<'number' | 'invoice' | 'group' | 'keterangan' | 'periode' | 'status' | 'tagihan' | 'lunas' | 'tanggal' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('rentalContracts_itemsPerPage');
    return saved ? parseInt(saved) : 10;
  });
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);
  const [paymentStatus, setPaymentStatus] = useState<"belum_lunas" | "sudah_lunas">("belum_lunas");
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const [contractForm, setContractForm] = useState({
    client_group_id: "",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    tanggal: undefined as Date | undefined,
    tanggal_lunas: undefined as Date | undefined,
    status: "masa sewa",
    tagihan: "",
    tagihan_belum_bayar: "",
    jumlah_lunas: "",
    invoice: "",
    keterangan: "",
    bank_account_id: "",
    google_maps_link: "",
    notes: "",
    jenis_scaffolding: "",
    jumlah_unit: "",
    lokasi_detail: "",
    tanggal_kirim: undefined as Date | undefined,
    tanggal_ambil: undefined as Date | undefined,
    status_pengiriman: "belum_kirim",
    status_pengambilan: "belum_diambil",
    biaya_kirim: "",
    penanggung_jawab: "",
  });
  const [paymentProofFiles, setPaymentProofFiles] = useState<File[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: groups, error: groupsError } = await supabase
        .from("client_groups")
        .select("id, nama, nomor_telepon")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;
      setClientGroups(groups || []);

      const { data: contracts, error: contractsError } = await supabase
        .from("rental_contracts")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (contractsError) throw contractsError;
      setRentalContracts((contracts || []).map(c => ({
        ...c,
        bukti_pembayaran_files: (c.bukti_pembayaran_files as any) || [],
        tanggal_lunas: (c as any).tanggal_lunas || null
      })) as any);

      const { data: banks, error: banksError } = await supabase
        .from("bank_accounts")
        .select("id, bank_name, account_number")
        .eq("user_id", user?.id)
        .eq("is_active", true);

      if (banksError) throw banksError;
      setBankAccounts(banks || []);
    } catch (error: any) {
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRecurringRentals = async () => {
    try {
      setIsProcessingRecurring(true);
      
      const { data, error } = await supabase.functions.invoke('process-recurring-rentals');
      
      if (error) throw error;
      
      toast.success(data.message || "Berhasil memproses kontrak recurring");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal memproses kontrak recurring: " + error.message);
    } finally {
      setIsProcessingRecurring(false);
    }
  };

  const uploadFiles = async (files: File[], bucket: string) => {
    const uploadedFiles = [];
    
    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      uploadedFiles.push({ name: file.name, url: publicUrl });
    }

    return uploadedFiles;
  };

  const handleSaveContract = async () => {
    try {
      if (!contractForm.client_group_id || !contractForm.start_date || !contractForm.end_date) {
        toast.error("Mohon lengkapi field wajib");
        return;
      }

      let paymentProofUrls: Array<{ name: string; url: string }> = [];
      
      if (editingContractId) {
        const existingContract = rentalContracts.find(c => c.id === editingContractId);
        paymentProofUrls = existingContract?.bukti_pembayaran_files || [];
        
        if (paymentProofFiles.length > 0) {
          const newFiles = await uploadFiles(paymentProofFiles, "payment-proofs");
          paymentProofUrls = [...paymentProofUrls, ...newFiles];
        }
      } else {
        if (paymentProofFiles.length > 0) {
          paymentProofUrls = await uploadFiles(paymentProofFiles, "payment-proofs");
        }
      }

      const jumlahLunas = parseFloat(contractForm.jumlah_lunas) || 0;

      const contractData = {
        user_id: user?.id,
        client_group_id: contractForm.client_group_id,
        start_date: format(contractForm.start_date, "yyyy-MM-dd"),
        end_date: format(contractForm.end_date, "yyyy-MM-dd"),
        tanggal: contractForm.tanggal ? format(contractForm.tanggal, "yyyy-MM-dd") : null,
        tanggal_lunas: contractForm.tanggal_lunas ? format(contractForm.tanggal_lunas, "yyyy-MM-dd") : null,
        status: contractForm.status,
        tagihan: parseFloat(contractForm.tagihan) || 0,
        tagihan_belum_bayar: parseFloat(contractForm.tagihan_belum_bayar) || 0,
        jumlah_lunas: jumlahLunas,
        invoice: contractForm.invoice || null,
        keterangan: contractForm.keterangan || null,
        bukti_pembayaran_files: paymentProofUrls,
        bank_account_id: contractForm.bank_account_id || null,
        google_maps_link: contractForm.google_maps_link || null,
        notes: contractForm.notes || null,
        jenis_scaffolding: contractForm.jenis_scaffolding || null,
        jumlah_unit: parseInt(contractForm.jumlah_unit) || 0,
        lokasi_detail: contractForm.lokasi_detail || null,
        tanggal_kirim: contractForm.tanggal_kirim ? format(contractForm.tanggal_kirim, "yyyy-MM-dd") : null,
        tanggal_ambil: contractForm.tanggal_ambil ? format(contractForm.tanggal_ambil, "yyyy-MM-dd") : null,
        status_pengiriman: contractForm.status_pengiriman || "belum_kirim",
        status_pengambilan: contractForm.status_pengambilan || "belum_diambil",
        biaya_kirim: parseFloat(contractForm.biaya_kirim) || 0,
        penanggung_jawab: contractForm.penanggung_jawab || null,
      };

      if (editingContractId) {
        const { error: contractError } = await supabase
          .from("rental_contracts")
          .update(contractData)
          .eq("id", editingContractId);

        if (contractError) throw contractError;
        
        // Sinkronisasikan pemasukan berdasarkan tanggal_lunas terisi
        if (contractForm.tanggal_lunas && jumlahLunas > 0) {
          const bankAccount = bankAccounts.find(b => b.id === contractForm.bank_account_id);
          const clientGroup = clientGroups.find(g => g.id === contractForm.client_group_id);
          const sourceName = contractForm.invoice 
            ? `${contractForm.invoice} - ${clientGroup?.nama || 'Unknown'}` 
            : `Sewa - ${clientGroup?.nama || "Client"}`;
          
          const incomeData = {
            user_id: user?.id,
            source_name: sourceName,
            bank_name: bankAccount?.bank_name || null,
            amount: jumlahLunas,
            date: format(contractForm.tanggal_lunas, "yyyy-MM-dd"),
            contract_id: editingContractId,
          };

          // Check if income entry already exists for this contract
          const { data: existingIncome } = await supabase
            .from("income_sources")
            .select("id")
            .eq("contract_id", editingContractId)
            .maybeSingle();

          if (existingIncome) {
            // Update existing income entry
            await supabase
              .from("income_sources")
              .update(incomeData)
              .eq("id", existingIncome.id);
          } else {
            // Insert new income entry
            await supabase
              .from("income_sources")
              .insert([incomeData]);
          }
        } else if (!contractForm.tanggal_lunas) {
          // Hapus pemasukan jika tanggal_lunas dikosongkan
          await supabase
            .from("income_sources")
            .delete()
            .eq("contract_id", editingContractId);
        }
        
        toast.success("Kontrak berhasil diupdate");
      } else {
        const { error: contractError } = await supabase
          .from("rental_contracts")
          .insert(contractData);

        if (contractError) throw contractError;

        const { data: newContract } = await supabase
          .from("rental_contracts")
          .select("id")
          .eq("user_id", user?.id)
          .eq("client_group_id", contractForm.client_group_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Buat pemasukan jika tanggal_lunas terisi dan jumlah_lunas > 0
        if (contractForm.tanggal_lunas && jumlahLunas > 0 && newContract) {
          const bankAccount = bankAccounts.find(b => b.id === contractForm.bank_account_id);
          const clientGroup = clientGroups.find(g => g.id === contractForm.client_group_id);
          const sourceName = contractForm.invoice 
            ? `${contractForm.invoice} - ${clientGroup?.nama || 'Unknown'}` 
            : `Sewa - ${clientGroup?.nama || "Client"}`;
          
          await supabase
            .from("income_sources")
            .insert([{
              user_id: user?.id,
              source_name: sourceName,
              bank_name: bankAccount?.bank_name || null,
              amount: jumlahLunas,
              date: format(contractForm.tanggal_lunas, "yyyy-MM-dd"),
              contract_id: newContract.id,
            }]);
        }

        toast.success("Kontrak berhasil ditambahkan");
      }

      setIsContractDialogOpen(false);
      resetContractForm();
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    }
  };

  const handleEditContract = (contract: RentalContract) => {
    setEditingContractId(contract.id);
    setPaymentStatus(contract.tanggal_lunas ? "sudah_lunas" : "belum_lunas");
    setContractForm({
      client_group_id: contract.client_group_id,
      start_date: new Date(contract.start_date),
      end_date: new Date(contract.end_date),
      tanggal: contract.tanggal ? new Date(contract.tanggal) : undefined,
      tanggal_lunas: contract.tanggal_lunas ? new Date(contract.tanggal_lunas) : undefined,
      status: contract.status,
      tagihan: contract.tagihan?.toString() || "",
      tagihan_belum_bayar: contract.tagihan_belum_bayar.toString(),
      jumlah_lunas: contract.jumlah_lunas.toString(),
      invoice: contract.invoice || "",
      keterangan: contract.keterangan || "",
      bank_account_id: contract.bank_account_id || "",
      google_maps_link: contract.google_maps_link || "",
      notes: contract.notes || "",
      jenis_scaffolding: contract.jenis_scaffolding || "",
      jumlah_unit: contract.jumlah_unit?.toString() || "",
      lokasi_detail: contract.lokasi_detail || "",
      tanggal_kirim: contract.tanggal_kirim ? new Date(contract.tanggal_kirim) : undefined,
      tanggal_ambil: contract.tanggal_ambil ? new Date(contract.tanggal_ambil) : undefined,
      status_pengiriman: contract.status_pengiriman || "belum_kirim",
      status_pengambilan: contract.status_pengambilan || "belum_diambil",
      biaya_kirim: contract.biaya_kirim?.toString() || "",
      penanggung_jawab: contract.penanggung_jawab || "",
    });
    setIsContractDialogOpen(true);
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kontrak ini?")) return;

    try {
      await supabase
        .from("income_sources")
        .delete()
        .eq("contract_id", id);

      const { error } = await supabase
        .from("rental_contracts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Kontrak berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    }
  };

  const resetContractForm = () => {
    setEditingContractId(null);
    setPaymentStatus("belum_lunas");
    setContractForm({
      client_group_id: "",
      start_date: undefined,
      end_date: undefined,
      tanggal: undefined,
      tanggal_lunas: undefined,
      status: "masa sewa",
      tagihan: "",
      tagihan_belum_bayar: "",
      jumlah_lunas: "",
      invoice: "",
      keterangan: "",
      bank_account_id: "",
      google_maps_link: "",
      notes: "",
      jenis_scaffolding: "",
      jumlah_unit: "",
      lokasi_detail: "",
      tanggal_kirim: undefined,
      tanggal_ambil: undefined,
      status_pengiriman: "belum_kirim",
      status_pengambilan: "belum_diambil",
      biaya_kirim: "",
      penanggung_jawab: "",
    });
    setPaymentProofFiles([]);
  };

  const getRemainingDays = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date());
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'masa sewa') {
      return activeTheme === 'japanese' 
        ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50"
        : "bg-blue-600 text-white";
    } else if (statusLower === 'selesai') {
      return activeTheme === 'japanese'
        ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/50"
        : "bg-emerald-600 text-white";
    } else if (statusLower === 'pending') {
      return activeTheme === 'japanese'
        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/50"
        : "bg-amber-600 text-white";
    } else if (statusLower === 'perpanjangan') {
      return activeTheme === 'japanese'
        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50"
        : "bg-purple-600 text-white";
    } else if (statusLower === 'berulang') {
      return "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/50";
    }
    return "bg-gradient-to-r from-slate-500 to-gray-500 text-white";
  };

  const sortedContracts = React.useMemo(() => {
    if (!rentalContracts) return [];
    
    // Filter by date range and invoice search
    let filtered = rentalContracts.filter(contract => {
      // Filter by invoice search
      if (invoiceSearch && !contract.invoice?.toLowerCase().includes(invoiceSearch.toLowerCase())) {
        return false;
      }
      
      // If date filters are active, exclude contracts without tanggal
      if ((startDateFilter || endDateFilter) && !contract.tanggal) return false;
      
      // If no date filters, include all contracts
      if (!startDateFilter && !endDateFilter) return true;
      
      // Compare dates without time (YYYY-MM-DD format)
      const contractDateStr = contract.tanggal; // Already in YYYY-MM-DD format from database
      const startDateStr = startDateFilter ? format(startDateFilter, 'yyyy-MM-dd') : null;
      const endDateStr = endDateFilter ? format(endDateFilter, 'yyyy-MM-dd') : null;
      
      if (startDateStr && contractDateStr < startDateStr) return false;
      if (endDateStr && contractDateStr > endDateStr) return false;
      
      return true;
    });
    
    let sorted = [...filtered];
    
    if (sortBy !== 'none') {
      sorted.sort((a, b) => {
        let comparison = 0;
        
        switch(sortBy) {
          case 'number':
            comparison = rentalContracts.indexOf(a) - rentalContracts.indexOf(b);
            break;
          case 'invoice':
            const invoiceA = a.invoice || '';
            const invoiceB = b.invoice || '';
            comparison = invoiceA.localeCompare(invoiceB, undefined, { numeric: true });
            break;
          case 'group':
            const groupA = clientGroups.find(g => g.id === a.client_group_id)?.nama || '';
            const groupB = clientGroups.find(g => g.id === b.client_group_id)?.nama || '';
            comparison = groupA.localeCompare(groupB);
            break;
          case 'keterangan':
            const ketA = a.keterangan || '';
            const ketB = b.keterangan || '';
            comparison = ketA.localeCompare(ketB);
            break;
          case 'periode':
            comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'tagihan':
            comparison = (a.tagihan_belum_bayar || 0) - (b.tagihan_belum_bayar || 0);
            break;
          case 'lunas':
            comparison = (a.jumlah_lunas || 0) - (b.jumlah_lunas || 0);
            break;
          case 'tanggal':
            const dateA = a.tanggal ? new Date(a.tanggal).getTime() : 0;
            const dateB = b.tanggal ? new Date(b.tanggal).getTime() : 0;
            comparison = dateA - dateB;
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    return sorted;
  }, [rentalContracts, sortBy, sortOrder, clientGroups, startDateFilter, endDateFilter, invoiceSearch]);

  const totalPages = Math.ceil(sortedContracts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContracts = sortedContracts.slice(startIndex, startIndex + itemsPerPage);

  const filteredClientGroups = clientGroups.filter(group =>
    group.nama.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    group.nomor_telepon.includes(clientSearchQuery)
  );

  // Calculate stats
  const totalTagihan = useMemo(() => 
    rentalContracts.reduce((sum, c) => sum + (c.tagihan_belum_bayar || 0), 0), 
    [rentalContracts]
  );
  
  const totalLunas = useMemo(() => 
    rentalContracts.reduce((sum, c) => sum + (c.jumlah_lunas || 0), 
    0), [rentalContracts]
  );
  
  const activeContracts = useMemo(() => 
    rentalContracts.filter(c => c.status.toLowerCase() === 'masa sewa').length, 
    [rentalContracts]
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-104px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto bg-gradient-to-r from-rose-500 to-orange-600 bg-clip-text text-transparent" />
          <p className="mt-4 text-lg bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent font-semibold">
            Memuat data kontrak...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header - shrink-0 */}
      <div className="shrink-0 px-2 py-2 md:px-8 md:py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-600 shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            List Kontrak Sewa
          </h1>
            </div>
            <p className="text-muted-foreground">Kelola semua kontrak sewa peralatan dengan mudah</p>
          </div>
          <Dialog open={isContractDialogOpen} onOpenChange={(open) => {
          setIsContractDialogOpen(open);
          if (!open) resetContractForm();
        }}>
          <DialogTrigger asChild>
            <GradientButton variant="expense" icon={Plus}>
              Tambah Kontrak
            </GradientButton>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 -mx-6 -mt-6 px-6 py-4 rounded-t-lg mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <DialogTitle className="text-white text-xl">{editingContractId ? "Edit Kontrak Sewa" : "Tambah Kontrak Sewa"}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Kelompok Client *</Label>
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !contractForm.client_group_id && "text-muted-foreground"
                      )}
                    >
                      {contractForm.client_group_id
                        ? clientGroups.find(g => g.id === contractForm.client_group_id)?.nama
                        : "Pilih client"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Cari client..." 
                        value={clientSearchQuery}
                        onValueChange={setClientSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>Client tidak ditemukan</CommandEmpty>
                        <CommandGroup>
                          {filteredClientGroups.map((group) => (
                            <CommandItem
                              key={group.id}
                              value={group.id}
                              onSelect={() => {
                                setContractForm({ ...contractForm, client_group_id: group.id });
                                setClientSearchOpen(false);
                                setClientSearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  contractForm.client_group_id === group.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <div className="font-medium">{group.nama}</div>
                                <div className="text-xs text-muted-foreground">{group.nomor_telepon}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Keterangan</Label>
                <Input
                  value={contractForm.keterangan}
                  onChange={(e) => setContractForm({ ...contractForm, keterangan: e.target.value })}
                  placeholder="Keterangan nama client"
                />
              </div>

              <div>
                <Label>Invoice</Label>
                <Input
                  type="text"
                  value={contractForm.invoice}
                  onChange={(e) => setContractForm({ ...contractForm, invoice: e.target.value })}
                  placeholder="Contoh: 000178"
                />
              </div>

              <div>
                <Label>Tanggal</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !contractForm.tanggal && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {contractForm.tanggal ? format(contractForm.tanggal, "PPP", { locale: localeId }) : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={contractForm.tanggal}
                      onSelect={(date) => setContractForm({ ...contractForm, tanggal: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Mulai *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !contractForm.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {contractForm.start_date ? format(contractForm.start_date, "PPP", { locale: localeId }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={contractForm.start_date}
                        onSelect={(date) => setContractForm({ ...contractForm, start_date: date })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Tanggal Berakhir *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !contractForm.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {contractForm.end_date ? format(contractForm.end_date, "PPP", { locale: localeId }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={contractForm.end_date}
                        onSelect={(date) => setContractForm({ ...contractForm, end_date: date })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={contractForm.status}
                  onValueChange={(value) => setContractForm({ ...contractForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perpanjangan">Perpanjangan</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="masa sewa">Masa Sewa</SelectItem>
                    <SelectItem value="berulang">Berulang</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scaffolding Details Section */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-sm text-foreground">Detail Scaffolding</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Jenis Scaffolding</Label>
                    <Select
                      value={contractForm.jenis_scaffolding}
                      onValueChange={(value) => setContractForm({ ...contractForm, jenis_scaffolding: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ring Lock">Ring Lock</SelectItem>
                        <SelectItem value="Cup Lock">Cup Lock</SelectItem>
                        <SelectItem value="Frame">Frame</SelectItem>
                        <SelectItem value="Kwikstage">Kwikstage</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Jumlah Unit</Label>
                    <Input
                      type="number"
                      value={contractForm.jumlah_unit}
                      onChange={(e) => setContractForm({ ...contractForm, jumlah_unit: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label>Lokasi Proyek</Label>
                  <Textarea
                    value={contractForm.lokasi_detail}
                    onChange={(e) => setContractForm({ ...contractForm, lokasi_detail: e.target.value })}
                    placeholder="Alamat detail lokasi proyek"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tanggal Pengiriman</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !contractForm.tanggal_kirim && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {contractForm.tanggal_kirim ? format(contractForm.tanggal_kirim, "PPP", { locale: localeId }) : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={contractForm.tanggal_kirim}
                          onSelect={(date) => setContractForm({ ...contractForm, tanggal_kirim: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Tanggal Pengambilan</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !contractForm.tanggal_ambil && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {contractForm.tanggal_ambil ? format(contractForm.tanggal_ambil, "PPP", { locale: localeId }) : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={contractForm.tanggal_ambil}
                          onSelect={(date) => setContractForm({ ...contractForm, tanggal_ambil: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status Pengiriman</Label>
                    <Select
                      value={contractForm.status_pengiriman}
                      onValueChange={(value) => setContractForm({ ...contractForm, status_pengiriman: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="belum_kirim">🔴 Belum Kirim</SelectItem>
                        <SelectItem value="dalam_perjalanan">🟡 Dalam Perjalanan</SelectItem>
                        <SelectItem value="terkirim">🟢 Terkirim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status Pengambilan</Label>
                    <Select
                      value={contractForm.status_pengambilan}
                      onValueChange={(value) => setContractForm({ ...contractForm, status_pengambilan: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="belum_diambil">🔴 Belum Diambil</SelectItem>
                        <SelectItem value="dijadwalkan">🟡 Dijadwalkan</SelectItem>
                        <SelectItem value="diambil">🟢 Diambil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Biaya Pengiriman</Label>
                    <Input
                      type="number"
                      value={contractForm.biaya_kirim}
                      onChange={(e) => setContractForm({ ...contractForm, biaya_kirim: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label>Penanggung Jawab</Label>
                    <Input
                      value={contractForm.penanggung_jawab}
                      onChange={(e) => setContractForm({ ...contractForm, penanggung_jawab: e.target.value })}
                      placeholder="Nama driver/teknisi"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tagihan</Label>
                  <Input
                    type="number"
                    value={contractForm.tagihan}
                    onChange={(e) => setContractForm({ ...contractForm, tagihan: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Sisa Tagihan</Label>
                  <Input
                    type="number"
                    value={contractForm.tagihan_belum_bayar}
                    onChange={(e) => setContractForm({ ...contractForm, tagihan_belum_bayar: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Jumlah Lunas</Label>
                  <Input
                    type="number"
                    value={contractForm.jumlah_lunas}
                    onChange={(e) => setContractForm({ ...contractForm, jumlah_lunas: e.target.value })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Otomatis masuk ke pendapatan</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Status Pembayaran</Label>
                <RadioGroup 
                  value={paymentStatus} 
                  onValueChange={(value: "belum_lunas" | "sudah_lunas") => {
                    setPaymentStatus(value);
                    if (value === "belum_lunas") {
                      setContractForm({ ...contractForm, tanggal_lunas: undefined });
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="belum_lunas" id="belum_lunas" />
                    <Label htmlFor="belum_lunas" className="font-normal cursor-pointer">Belum Lunas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sudah_lunas" id="sudah_lunas" />
                    <Label htmlFor="sudah_lunas" className="font-normal cursor-pointer">Input Tanggal Lunas</Label>
                  </div>
                </RadioGroup>

                {paymentStatus === "sudah_lunas" && (
                  <div className="mt-2">
                    <Label>Tanggal Lunas</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !contractForm.tanggal_lunas && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {contractForm.tanggal_lunas ? format(contractForm.tanggal_lunas, "PPP", { locale: localeId }) : "Pilih tanggal lunas"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={contractForm.tanggal_lunas}
                          onSelect={(date) => setContractForm({ ...contractForm, tanggal_lunas: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div>
                <Label>Akun Penerima</Label>
                <Select
                  value={contractForm.bank_account_id}
                  onValueChange={(value) => setContractForm({ ...contractForm, bank_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rekening" />
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

              <div>
                <Label>Upload Bukti Pembayaran (Multiple)</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(e) => setPaymentProofFiles(Array.from(e.target.files || []))}
                />
                {paymentProofFiles.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">{paymentProofFiles.length} file dipilih</p>
                )}
              </div>

              <div>
                <Label>Link Google Maps</Label>
                <Input
                  value={contractForm.google_maps_link}
                  onChange={(e) => setContractForm({ ...contractForm, google_maps_link: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={contractForm.notes}
                  onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
                  placeholder="Catatan tambahan"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsContractDialogOpen(false);
                    resetContractForm();
                  }}
                  className="flex-1 border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/5"
                >
                  Batal
                </Button>
                <GradientButton 
                  onClick={handleSaveContract} 
                  variant="income"
                  className="flex-1"
                >
                  {editingContractId ? "Update Kontrak" : "Simpan Kontrak"}
                </GradientButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Content - flex-1 overflow-y-auto */}
      <div className="flex-1 overflow-y-auto px-2 md:px-8 pb-4 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <ColoredStatCard 
          title="Total Kontrak"
          value={rentalContracts.length.toString()}
          icon={FileText}
          gradient="expense"
        />
        <ColoredStatCard 
          title="Masa Sewa"
          value={activeContracts.toString()}
          icon={CalendarIcon}
          gradient="savings"
          subtitle="kontrak aktif"
        />
        <ColoredStatCard 
          title="Total Tagihan"
          value={formatRupiah(totalTagihan)}
          icon={Wallet}
          gradient="budget"
        />
        <ColoredStatCard 
          title="Total Lunas"
          value={formatRupiah(totalLunas)}
          icon={CheckCircle}
          gradient="income"
        />
      </div>

      {/* Controls */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* First row: Sort and Date Range Filter */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label>Sort By:</Label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak Ada</SelectItem>
                    <SelectItem value="number">Nomor</SelectItem>
                    <SelectItem value="tanggal">Tanggal</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="group">Kelompok</SelectItem>
                    <SelectItem value="keterangan">Keterangan</SelectItem>
                    <SelectItem value="periode">Periode</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="tagihan">Tagihan</SelectItem>
                    <SelectItem value="lunas">Lunas</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
              
              {/* Invoice Search */}
              <div className="flex items-center gap-2">
                <Label>Cari Invoice:</Label>
                <Input
                  type="text"
                  placeholder="Masukkan nomor invoice..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-[200px]"
                />
                {invoiceSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInvoiceSearch("")}
                  >
                    Reset
                  </Button>
                )}
              </div>
              
              {/* Date Range Filter */}
              <div className="flex items-center gap-2">
                <Label>Filter Tanggal:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !startDateFilter && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDateFilter ? format(startDateFilter, "dd/MM/yyyy") : "Dari"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDateFilter}
                      onSelect={setStartDateFilter}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <span>-</span>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !endDateFilter && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDateFilter ? format(endDateFilter, "dd/MM/yyyy") : "Sampai"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDateFilter}
                      onSelect={setEndDateFilter}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                {(startDateFilter || endDateFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDateFilter(undefined);
                      setEndDateFilter(undefined);
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Second row: Action buttons */}
          <div className="flex items-center justify-end gap-2">
            <GradientButton
              variant="savings"
              icon={RefreshCw}
              onClick={handleProcessRecurringRentals}
              disabled={isProcessingRecurring}
            >
              {isProcessingRecurring ? "Memproses..." : "Proses Kontrak Bulanan"}
            </GradientButton>
            <GradientButton
              variant={isCompactMode ? "budget" : "primary"}
              onClick={() => setIsCompactMode(!isCompactMode)}
            >
              Compact Mode
            </GradientButton>
            <GradientButton
              variant="primary"
              icon={isTableLocked ? Lock : Unlock}
              onClick={() => setIsTableLocked(!isTableLocked)}
            >
              {isTableLocked ? "Unlock Table" : "Lock Table"}
            </GradientButton>
          </div>
        </div>
      </Card>

      {/* Contracts Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-rose-500/10 via-red-500/10 to-orange-500/10 border-b-2 border-rose-500/20">
              <TableRow className={cn(isCompactMode && "h-8")}>
                <TableHead className={cn("text-center w-20 font-semibold", isCompactMode && "py-1 text-xs")}>No</TableHead>
                <TableHead className={cn("text-center w-32 font-semibold", isCompactMode && "py-1 text-xs")}>Tanggal</TableHead>
                <TableHead className={cn("font-semibold", isCompactMode && "py-1 text-xs")}>Invoice</TableHead>
                <TableHead className={cn("font-semibold", isCompactMode && "py-1 text-xs")}>Kelompok</TableHead>
                <TableHead className={cn("font-semibold", isCompactMode && "py-1 text-xs")}>Keterangan</TableHead>
                <TableHead className={cn("font-semibold", isCompactMode && "py-1 text-xs")}>Periode</TableHead>
                <TableHead className={cn("font-semibold", isCompactMode && "py-1 text-xs")}>Status</TableHead>
                <TableHead className={cn("text-right font-semibold", isCompactMode && "py-1 text-xs")}>Tagihan</TableHead>
                <TableHead className={cn("text-right font-semibold", isCompactMode && "py-1 text-xs")}>Sisa Tagihan</TableHead>
                <TableHead className={cn("text-center font-semibold", isCompactMode && "py-1 text-xs")}>Input Data</TableHead>
                <TableHead className={cn("text-center w-24 font-semibold", isCompactMode && "py-1 text-xs")}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada kontrak sewa</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedContracts.map((contract, index) => {
                  const group = clientGroups.find(g => g.id === contract.client_group_id);
                  const remainingDays = getRemainingDays(contract.end_date);

                  return (
                    <TableRow 
                      key={contract.id} 
                      className={cn(
                        "transition-all duration-300 hover:bg-gradient-to-r hover:from-rose-500/5 hover:to-orange-500/5 hover:shadow-md",
                        isCompactMode && "h-10"
                      )}
                    >
                      <TableCell className={cn("text-center font-medium", isCompactMode && "py-1 px-2 text-xs")}>{startIndex + index + 1}</TableCell>
                      <TableCell className={cn("text-center whitespace-nowrap", isCompactMode && "py-1 px-2")}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isTableLocked}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !contract.tanggal && "text-muted-foreground",
                                isCompactMode ? "h-7 text-xs px-2" : "h-9"
                              )}
                            >
                              <CalendarIcon className={cn("mr-2", isCompactMode ? "h-3 w-3" : "h-4 w-4")} />
                              {contract.tanggal ? format(new Date(contract.tanggal), "dd/MM/yyyy") : "Pilih"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={contract.tanggal ? new Date(contract.tanggal) : undefined}
                              onSelect={async (date) => {
                                if (date) {
                                  try {
                                    const { error } = await supabase
                                      .from("rental_contracts")
                                      .update({ tanggal: format(date, "yyyy-MM-dd") })
                                      .eq("id", contract.id);
                                    
                                    if (error) throw error;
                                    toast.success("Tanggal berhasil diupdate");
                                    fetchData();
                                  } catch (error: any) {
                                    toast.error("Gagal update tanggal: " + error.message);
                                  }
                                }
                              }}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className={cn("font-medium whitespace-nowrap", isCompactMode && "py-1 px-2 text-xs")}>
                        <button
                          onClick={() => navigate(`/vip/contracts/${contract.id}`)}
                          className="text-primary hover:underline"
                        >
                          {contract.invoice || "-"}
                        </button>
                      </TableCell>
                      <TableCell className={cn(isCompactMode && "py-1 px-2 text-xs")}>
                        <span className="truncate block max-w-[200px]" title={group?.nama || "-"}>
                          {group?.nama || "-"}
                        </span>
                      </TableCell>
                      <TableCell className={cn(isCompactMode && "py-1 px-2 text-xs")}>
                        <div className="truncate max-w-[250px]">
                          {contract.keterangan || "-"}
                        </div>
                      </TableCell>
                      <TableCell className={cn("text-sm whitespace-nowrap", isCompactMode && "py-1 px-2 text-xs")}>
                        {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}{" "}
                        <span className={cn("text-xs font-medium ml-1", remainingDays > 0 ? "text-green-600" : "text-red-600", isCompactMode && "text-[10px]")}>
                          ({remainingDays > 0 ? `${remainingDays} hari` : "Berakhir"})
                        </span>
                      </TableCell>
                      <TableCell className={cn(isCompactMode && "py-1 px-2")}>
                        <Badge className={cn(getStatusBadge(contract.status), "border whitespace-nowrap", isCompactMode && "text-[10px] px-1.5 py-0")}>
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("text-right", isCompactMode && "py-1 px-2 text-xs")}>
                        <span className="text-blue-600 font-bold bg-blue-500/10 px-2 py-1 rounded-md">
                          {formatRupiah(contract.tagihan || 0)}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-right", isCompactMode && "py-1 px-2 text-xs")}>
                        <span className="text-rose-600 font-bold bg-rose-500/10 px-2 py-1 rounded-md">
                          {formatRupiah(contract.tagihan_belum_bayar)}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-right", isCompactMode && "py-1 px-2 text-xs")}>
                        <span className="text-emerald-600 font-bold bg-emerald-500/10 px-2 py-1 rounded-md">
                          {formatRupiah(contract.jumlah_lunas)}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-center whitespace-nowrap", isCompactMode && "py-1 px-2")}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isTableLocked}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !contract.tanggal_lunas && "text-muted-foreground",
                                isCompactMode ? "h-7 text-xs px-2" : "h-9"
                              )}
                            >
                              <CalendarIcon className={cn("mr-2", isCompactMode ? "h-3 w-3" : "h-4 w-4")} />
                              {contract.tanggal_lunas ? format(new Date(contract.tanggal_lunas), "dd/MM/yyyy") : "Pilih"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={contract.tanggal_lunas ? new Date(contract.tanggal_lunas) : undefined}
                              onSelect={async (date) => {
                                try {
                                  // Update tanggal_lunas
                                  const { error: updateError } = await supabase
                                    .from("rental_contracts")
                                    .update({ tanggal_lunas: date ? format(date, "yyyy-MM-dd") : null } as any)
                                    .eq("id", contract.id);
                                  
                                  if (updateError) throw updateError;

                                  if (date && contract.jumlah_lunas > 0) {
                                    // If tanggal_lunas is filled and jumlah_lunas > 0, create or update income
                                    const clientGroup = clientGroups.find(g => g.id === contract.client_group_id);
                                    const sourceName = contract.invoice 
                                      ? `${contract.invoice} - ${clientGroup?.nama || 'Unknown'}` 
                                      : clientGroup?.nama || 'Pembayaran Sewa';

                                    const incomeData = {
                                      user_id: user?.id,
                                      contract_id: contract.id,
                                      source_name: sourceName,
                                      amount: contract.jumlah_lunas,
                                      date: format(date, "yyyy-MM-dd"),
                                      bank_name: contract.bank_account_id ? 
                                        (bankAccounts.find(b => b.id === contract.bank_account_id)?.bank_name || null) 
                                        : null,
                                    };

                                    await supabase
                                      .from("income_sources")
                                      .upsert([incomeData], { onConflict: "contract_id" });

                                    toast.success("Tanggal lunas diupdate dan pemasukan berhasil disinkronkan");
                                  } else {
                                    // If tanggal_lunas is cleared, delete income entry
                                    await supabase
                                      .from("income_sources")
                                      .delete()
                                      .eq("contract_id", contract.id);
                                    
                                    toast.success("Tanggal lunas dikosongkan dan pemasukan dihapus");
                                  }
                                  
                                  fetchData();
                                } catch (error: any) {
                                  toast.error("Gagal update tanggal lunas: " + error.message);
                                }
                              }}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className={cn(isCompactMode && "py-1 px-2")}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditContract(contract)}
                            className={cn(
                              "transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:shadow-lg", 
                              isCompactMode ? "h-6 w-6" : "h-8 w-8"
                            )}
                          >
                            <Edit className={cn(isCompactMode ? "h-3 w-3" : "h-4 w-4")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteContract(contract.id)}
                            className={cn(
                              "transition-all duration-200 hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 hover:text-white hover:shadow-lg", 
                              isCompactMode ? "h-6 w-6" : "h-8 w-8"
                            )}
                          >
                            <Trash2 className={cn(isCompactMode ? "h-3 w-3" : "h-4 w-4")} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedContracts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          storageKey="rentalContracts"
        />
      </Card>
      </div>
    </div>
  );
};

export default RentalContracts;
