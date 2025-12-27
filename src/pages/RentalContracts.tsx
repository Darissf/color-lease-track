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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Calendar as CalendarIcon, Trash2, Edit, ExternalLink, Lock, Unlock, Check, ChevronsUpDown, FileText, Wallet, CheckCircle, Loader2, RefreshCw, Users, Package, HelpCircle, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ColoredStatCard } from "@/components/ColoredStatCard";
import { GradientButton } from "@/components/GradientButton";
import BankLogo from "@/components/BankLogo";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { getNowInJakarta } from "@/lib/timezone";
import { getAssetUrl } from "@/lib/assetUrl";
import { useAppTheme } from "@/contexts/AppThemeContext";

interface ClientGroup {
  id: string;
  nama: string;
  nomor_telepon: string;
  created_at: string;
}

interface RentalContract {
  id: string;
  client_group_id: string;
  start_date: string;
  end_date: string;
  tanggal: string | null;
  tanggal_bayar_terakhir: string | null;
  status: string;
  tagihan: number;
  tagihan_belum_bayar: number;
  invoice: string | null;
  keterangan: string | null;
  bukti_pembayaran_files: Array<{ name: string; url: string }>;
  bank_account_id: string | null;
  google_maps_link: string | null;
  notes: string | null;
  inventory_item_id: string | null;
  jenis_scaffolding: string | null;
  jumlah_unit: number | null;
  tanggal_kirim: string | null;
  tanggal_ambil: string | null;
  status_pengiriman: string | null;
  status_pengambilan: string | null;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
}

const RentalContracts = () => {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { activeTheme } = useAppTheme();
  const navigate = useNavigate();
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [isTableLocked, setIsTableLocked] = useState(true);
  const [sortBy, setSortBy] = useState<'number' | 'invoice' | 'group' | 'keterangan' | 'periode' | 'status' | 'tagihan' | 'tanggal' | 'sisa' | 'none'>('none');
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
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  
  // Payment popover states
  const [paymentContractId, setPaymentContractId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Status change with tanggal_ambil states
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [statusChangeContract, setStatusChangeContract] = useState<{id: string, invoice: string | null} | null>(null);
  const [tanggalAmbilDate, setTanggalAmbilDate] = useState<Date | undefined>(undefined);

  const [contractForm, setContractForm] = useState({
    client_group_id: "",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    status: "masa sewa",
    tagihan: "",
    tagihan_belum_bayar: "",
    invoice: "",
    keterangan: "",
    bank_account_id: "",
    google_maps_link: "",
    notes: "",
    tanggal_ambil: undefined as Date | undefined,
  });

  // Auto-select bank account if only one exists
  useEffect(() => {
    if (bankAccounts.length === 1 && !contractForm.bank_account_id) {
      setContractForm(prev => ({
        ...prev,
        bank_account_id: bankAccounts[0].id
      }));
    }
  }, [bankAccounts, contractForm.bank_account_id]);

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
        .select("id, nama, nomor_telepon, created_at")
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
        tanggal_bayar_terakhir: (c as any).tanggal_bayar_terakhir || null
      })) as unknown as RentalContract[]);

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

      uploadedFiles.push({ name: file.name, url: getAssetUrl(publicUrl) });
    }

    return uploadedFiles;
  };

  const handleSaveContract = async () => {
    try {
      if (!contractForm.client_group_id || !contractForm.start_date || !contractForm.end_date) {
        toast.error("Mohon lengkapi field wajib");
        return;
      }

      const contractData = {
        user_id: user?.id,
        client_group_id: contractForm.client_group_id,
        start_date: format(contractForm.start_date, "yyyy-MM-dd"),
        end_date: format(contractForm.end_date, "yyyy-MM-dd"),
        status: contractForm.status,
        tagihan: parseFloat(contractForm.tagihan) || 0,
        tagihan_belum_bayar: parseFloat(contractForm.tagihan) || 0,
        invoice: contractForm.invoice || null,
        keterangan: contractForm.keterangan || null,
        bank_account_id: contractForm.bank_account_id || null,
        google_maps_link: contractForm.google_maps_link || null,
        notes: contractForm.notes || null,
        tanggal_ambil: contractForm.tanggal_ambil ? format(contractForm.tanggal_ambil, "yyyy-MM-dd") : null,
      };

      if (editingContractId) {
        const { error: contractError } = await supabase
          .from("rental_contracts")
          .update(contractData)
          .eq("id", editingContractId);

        if (contractError) throw contractError;
        
        // Pemasukan sekarang dikelola melalui contract_payments, tidak perlu sinkronisasi manual
        
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

        // Pemasukan sekarang dikelola melalui contract_payments

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
    setContractForm({
      client_group_id: contract.client_group_id,
      start_date: new Date(contract.start_date),
      end_date: new Date(contract.end_date),
      status: contract.status,
      tagihan: contract.tagihan?.toString() || "",
      tagihan_belum_bayar: contract.tagihan_belum_bayar.toString(),
      invoice: contract.invoice || "",
      keterangan: contract.keterangan || "",
      bank_account_id: contract.bank_account_id || "",
      google_maps_link: contract.google_maps_link || "",
      notes: contract.notes || "",
      tanggal_ambil: contract.tanggal_ambil ? new Date(contract.tanggal_ambil) : undefined,
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
    setContractForm({
      client_group_id: "",
      start_date: undefined,
      end_date: undefined,
      status: "masa sewa",
      tagihan: "",
      tagihan_belum_bayar: "",
      invoice: "",
      keterangan: "",
      bank_account_id: bankAccounts.length === 1 ? bankAccounts[0].id : "",
      google_maps_link: "",
      notes: "",
      tanggal_ambil: undefined,
    });
  };

  const getRemainingDays = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date());
  };

  // Function to update contract status with optional tanggal_ambil
  const updateContractStatus = async (contractId: string, newStatus: string, tanggalAmbil: Date | null) => {
    try {
      const updateData: Record<string, any> = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // Jika selesai dan ada tanggal_ambil, update juga
      if (newStatus === 'selesai' && tanggalAmbil) {
        updateData.tanggal_ambil = format(tanggalAmbil, "yyyy-MM-dd");
        updateData.status_pengambilan = 'sudah_diambil';
      }
      
      const { error } = await supabase
        .from("rental_contracts")
        .update(updateData)
        .eq("id", contractId);
      
      if (error) throw error;
      
      toast.success(`Status berhasil diubah ke "${capitalizeWords(newStatus)}"`);
      fetchData();
      
      // Reset dialog state
      setStatusChangeDialogOpen(false);
      setStatusChangeContract(null);
      setTanggalAmbilDate(undefined);
    } catch (error: any) {
      toast.error("Gagal update status: " + error.message);
    }
  };

  const capitalizeWords = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
          case 'sisa':
            comparison = (a.tagihan_belum_bayar || 0) - (b.tagihan_belum_bayar || 0);
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

  // Sort clients: yang baru dibuat (< 24 jam) di atas, sisanya abjad A-Z
  const sortedClientGroups = useMemo(() => {
    const filtered = clientGroups.filter(group =>
      group.nama.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      group.nomor_telepon.includes(clientSearchQuery)
    );
    
    const now = getNowInJakarta();
    
    return filtered.sort((a, b) => {
      const hoursA = differenceInHours(now, new Date(a.created_at));
      const hoursB = differenceInHours(now, new Date(b.created_at));
      
      // Client yang dibuat dalam 24 jam terakhir (belum 1 hari)
      const aIsNew = hoursA < 24;
      const bIsNew = hoursB < 24;
      
      if (aIsNew && !bIsNew) return -1; // A di atas
      if (!aIsNew && bIsNew) return 1;  // B di atas
      
      // Jika keduanya baru, yang paling baru di atas
      if (aIsNew && bIsNew) {
        return hoursA - hoursB;
      }
      
      // Sisanya sort berdasarkan abjad A-Z
      return a.nama.localeCompare(b.nama, 'id');
    });
  }, [clientGroups, clientSearchQuery]);

  // Calculate stats
  const totalTagihan = useMemo(() => 
    rentalContracts.reduce((sum, c) => sum + (c.tagihan_belum_bayar || 0), 0), 
    [rentalContracts]
  );
  
  const totalLunas = useMemo(() => 
    rentalContracts.reduce((sum, c) => sum + ((c.tagihan || 0) - (c.tagihan_belum_bayar || 0)), 
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
                <Label>List Client *</Label>
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
                          {sortedClientGroups.map((group) => {
                            const hoursAgo = differenceInHours(getNowInJakarta(), new Date(group.created_at));
                            const isNew = hoursAgo < 24;
                            return (
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
                                <div className="flex-1">
                                  <div className="font-medium flex items-center gap-2">
                                    {group.nama}
                                    {isNew && (
                                      <Badge variant="secondary" className="bg-green-500/20 text-green-600 text-[10px] px-1.5 py-0">
                                        Baru
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{group.nomor_telepon}</div>
                                </div>
                              </CommandItem>
                            );
                          })}
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
                  onValueChange={(value) => {
                    const updates: Partial<typeof contractForm> = { status: value };
                    // Auto-fill tanggal_ambil saat status = "selesai" dan belum ada tanggal
                    if (value === "selesai" && !contractForm.tanggal_ambil) {
                      updates.tanggal_ambil = new Date();
                    }
                    setContractForm({ ...contractForm, ...updates });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perpanjangan">Perpanjangan</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="masa sewa">Masa Sewa</SelectItem>
                    <SelectItem value="berulang">Berulang</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tagihan Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tagihan</Label>
                  <Input
                    type="number"
                    value={contractForm.tagihan}
                    onChange={(e) => setContractForm({ ...contractForm, tagihan: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">Pembayaran dikelola melalui kolom "Tanggal Bayar" di tabel kontrak</p>

              {/* Akun Penerima - Auto-select if only one */}
              {bankAccounts.length > 1 ? (
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
              ) : bankAccounts.length === 1 ? (
                <div>
                  <Label>Akun Penerima</Label>
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                    <BankLogo bankName={bankAccounts[0].bank_name} size="sm" />
                    <span className="text-sm font-medium">
                      {bankAccounts[0].bank_name} - {bankAccounts[0].account_number}
                    </span>
                  </div>
                </div>
              ) : null}

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
                    <SelectItem value="sisa">Sisa Tagihan</SelectItem>
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
                <TableHead className={cn("text-center font-semibold", isCompactMode && "py-1 text-xs")}>Tanggal Bayar</TableHead>
                <TableHead className={cn("text-center font-semibold", isCompactMode && "py-1 text-xs")}>Status Bayar</TableHead>
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
                        {isTableLocked ? (
                          <Badge className={cn(getStatusBadge(contract.status), "border whitespace-nowrap", isCompactMode && "text-[10px] px-1.5 py-0")}>
                            {capitalizeWords(contract.status)}
                          </Badge>
                        ) : (
                          <Select
                            value={contract.status}
                            onValueChange={(newStatus) => {
                              if (newStatus === 'selesai') {
                                setStatusChangeContract({ id: contract.id, invoice: contract.invoice });
                                setTanggalAmbilDate(undefined);
                                setStatusChangeDialogOpen(true);
                              } else {
                                updateContractStatus(contract.id, newStatus, null);
                              }
                            }}
                          >
                            <SelectTrigger className={cn("w-[130px]", isCompactMode ? "h-7 text-xs" : "h-9")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="masa sewa">Masa Sewa</SelectItem>
                              <SelectItem value="selesai">Selesai</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="perpanjangan">Perpanjangan</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
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
                      <TableCell className={cn("text-center", isCompactMode && "py-1 px-2 text-xs")}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isTableLocked}
                              className={cn(
                                "justify-start text-left font-normal",
                                !contract.tanggal_bayar_terakhir && "text-muted-foreground",
                                isCompactMode ? "h-7 text-xs px-2" : "h-9"
                              )}
                            >
                              <CalendarIcon className={cn("mr-2", isCompactMode ? "h-3 w-3" : "h-4 w-4")} />
                              {contract.tanggal_bayar_terakhir ? format(new Date(contract.tanggal_bayar_terakhir), "dd/MM/yy") : "Input"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4" align="start">
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Tanggal Bayar</Label>
                                <Calendar
                                  mode="single"
                                  selected={paymentContractId === contract.id ? paymentDate : undefined}
                                  onSelect={(date) => {
                                    setPaymentContractId(contract.id);
                                    setPaymentDate(date);
                                  }}
                                  initialFocus
                                  className="pointer-events-auto rounded-md border mt-2"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Jumlah Dibayar</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={paymentContractId === contract.id ? paymentAmount : ""}
                                  onChange={(e) => {
                                    setPaymentContractId(contract.id);
                                    setPaymentAmount(e.target.value);
                                  }}
                                  className="mt-1"
                                />
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    Sisa: {formatRupiah(contract.tagihan_belum_bayar)}
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                      setPaymentContractId(contract.id);
                                      setPaymentAmount(String(contract.tagihan_belum_bayar || 0));
                                    }}
                                  >
                                    100%
                                  </Button>
                                </div>
                              </div>
                              <Button
                                className="w-full bg-gradient-to-r from-emerald-500 to-green-600"
                                disabled={isSubmittingPayment || !paymentDate || !paymentAmount || paymentContractId !== contract.id}
                                onClick={async () => {
                                  if (!paymentDate || !paymentAmount || paymentContractId !== contract.id) return;
                                  
                                  try {
                                    setIsSubmittingPayment(true);
                                    const amount = parseFloat(paymentAmount);
                                    
                                    // Get payment count for this contract (use any until types regenerate)
                                    const { count } = await (supabase as any)
                                      .from("contract_payments")
                                      .select("*", { count: "exact", head: true })
                                      .eq("contract_id", contract.id);
                                    
                                    const paymentNumber = (count || 0) + 1;
                                    const group = clientGroups.find(g => g.id === contract.client_group_id);
                                    const bankAccount = bankAccounts.find(b => b.id === contract.bank_account_id);
                                    const sourceName = `${contract.invoice || "Sewa"} ${contract.keterangan || group?.nama || ""} #${paymentNumber}`.trim();
                                    
                                    // Insert to income_sources
                                    const { data: incomeData, error: incomeError } = await supabase
                                      .from("income_sources")
                                      .insert({
                                        user_id: user?.id,
                                        source_name: sourceName,
                                        amount: amount,
                                        date: format(paymentDate, "yyyy-MM-dd"),
                                        bank_name: bankAccount?.bank_name || null,
                                        contract_id: contract.id,
                                      })
                                      .select("id")
                                      .single();
                                    
                                    if (incomeError) throw incomeError;
                                    
                                    // Insert to contract_payments (use any until types regenerate)
                                    const { error: paymentError } = await (supabase as any)
                                      .from("contract_payments")
                                      .insert({
                                        user_id: user?.id,
                                        contract_id: contract.id,
                                        payment_date: format(paymentDate, "yyyy-MM-dd"),
                                        amount: amount,
                                        payment_number: paymentNumber,
                                        income_source_id: incomeData?.id,
                                      });
                                    
                                    if (paymentError) throw paymentError;
                                    
                                    // Update rental_contracts
                                    const newSisa = contract.tagihan_belum_bayar - amount;
                                    const { error: updateError } = await supabase
                                      .from("rental_contracts")
                                      .update({
                                        tagihan_belum_bayar: newSisa,
                                        tanggal_bayar_terakhir: format(paymentDate, "yyyy-MM-dd"),
                                      })
                                      .eq("id", contract.id);
                                    
                                    if (updateError) throw updateError;
                                    
                                    toast.success(`Pembayaran #${paymentNumber} berhasil dicatat`);
                                    setPaymentContractId(null);
                                    setPaymentDate(undefined);
                                    setPaymentAmount("");
                                    fetchData();
                                  } catch (error: any) {
                                    toast.error("Gagal menyimpan pembayaran: " + error.message);
                                  } finally {
                                    setIsSubmittingPayment(false);
                                  }
                                }}
                              >
                                {isSubmittingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                Simpan Pembayaran
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className={cn("text-center", isCompactMode && "py-1 px-2")}>
                        {contract.tagihan_belum_bayar > 0 ? (
                          <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 hover:bg-amber-500/30">
                            Belum Lunas
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300 hover:bg-emerald-500/30">
                            Lunas
                          </Badge>
                        )}
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

        {/* Tutorial Section - Only for Super Admin & Admin */}
        {(isSuperAdmin || isAdmin) && (
          <Collapsible open={isTutorialOpen} onOpenChange={setIsTutorialOpen} className="mt-6">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Panduan Penggunaan List Kontrak Sewa</span>
                </div>
                <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", isTutorialOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="p-5 rounded-xl border border-border/50 bg-muted/20 space-y-5">
                {/* Penjelasan Kolom */}
                <div>
                  <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Penjelasan Kolom
                  </h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex gap-3">
                      <span className="font-medium text-primary min-w-[100px]">Invoice</span>
                      <span className="text-muted-foreground">Nomor unik kontrak. <span className="text-foreground font-medium">Klik untuk melihat detail lengkap</span> termasuk riwayat pembayaran, info klien, dan progress.</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-medium text-primary min-w-[100px]">Kelompok</span>
                      <span className="text-muted-foreground">Nama klien/pelanggan yang menyewa scaffolding.</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-medium text-primary min-w-[100px]">Periode</span>
                      <span className="text-muted-foreground">Tanggal mulai dan selesai masa sewa.</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-medium text-primary min-w-[100px]">Status</span>
                      <span className="text-muted-foreground">Status kontrak: Masa Sewa (aktif), Selesai, Pending, atau Perpanjangan.</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-medium text-primary min-w-[100px]">Tagihan</span>
                      <span className="text-muted-foreground">Total nilai tagihan kontrak.</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-medium text-primary min-w-[100px]">Sisa</span>
                      <span className="text-muted-foreground">Sisa tagihan yang belum dibayar. <span className="text-foreground font-medium">Klik untuk input pembayaran baru.</span></span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-medium text-primary min-w-[100px]">Bayar Terakhir</span>
                      <span className="text-muted-foreground">Tanggal terakhir pembayaran diterima.</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-medium text-primary min-w-[100px]">Status Bayar</span>
                      <span className="text-muted-foreground"><Badge variant="default" className="mr-1">Lunas</Badge> = sudah dibayar penuh, <Badge variant="outline" className="mr-1">Belum Lunas</Badge> = masih ada sisa.</span>
                    </div>
                  </div>
                </div>

                {/* Isi Halaman Detail Invoice */}
                <div>
                  <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    Isi Halaman Detail Invoice (Klik Invoice)
                  </h4>
                  <ul className="grid gap-1.5 text-sm text-muted-foreground ml-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Informasi kontrak lengkap (invoice, status, tanggal, keterangan)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Data klien beserta nomor telepon
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Progress pembayaran dengan bar persentase
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Timeline riwayat pembayaran (#1, #2, dst)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Status pengiriman dan pengambilan scaffolding
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Link Google Maps lokasi proyek
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Rincian stok barang (jika terhubung inventory)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      File bukti pembayaran yang diupload
                    </li>
                  </ul>
                </div>

                {/* Tips Penggunaan */}
                <div>
                  <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Tips Penggunaan
                  </h4>
                  <ul className="grid gap-1.5 text-sm text-muted-foreground ml-1">
                    <li className="flex items-center gap-2">
                      <span className="text-primary">🔍</span>
                      Gunakan filter tanggal untuk mencari kontrak pada periode tertentu
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">🔤</span>
                      Ketik nomor invoice di kolom pencarian untuk menemukan kontrak
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">📊</span>
                      Klik header kolom untuk mengurutkan data (sorting)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">🔒</span>
                      Mode terkunci mencegah edit/hapus tidak sengaja
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-primary">💳</span>
                      Input pembayaran langsung dari kolom "Sisa" tanpa masuk detail
                    </li>
                  </ul>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </Card>
      </div>

      {/* Dialog untuk memilih tanggal pengambilan saat status = selesai */}
      <Dialog 
        open={statusChangeDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setStatusChangeDialogOpen(false);
            setStatusChangeContract(null);
            setTanggalAmbilDate(undefined);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Tanggal Pengambilan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pilih tanggal pengambilan scaffolding untuk kontrak{" "}
              <span className="font-semibold text-foreground">{statusChangeContract?.invoice || "ini"}</span>:
            </p>
            <Calendar
              mode="single"
              selected={tanggalAmbilDate}
              onSelect={setTanggalAmbilDate}
              initialFocus
              className="pointer-events-auto rounded-md border mx-auto"
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusChangeDialogOpen(false);
                  setStatusChangeContract(null);
                  setTanggalAmbilDate(undefined);
                }}
              >
                Batal
              </Button>
              <Button 
                disabled={!tanggalAmbilDate}
                onClick={() => {
                  if (statusChangeContract && tanggalAmbilDate) {
                    updateContractStatus(statusChangeContract.id, 'selesai', tanggalAmbilDate);
                  }
                }}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Konfirmasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentalContracts;
