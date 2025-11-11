import React, { useState, useEffect } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Calendar as CalendarIcon, FileText, MapPin, Trash2, Edit, ExternalLink, Lock, Unlock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface ClientGroup {
  id: string;
  nama: string;
  nomor_telepon: string;
  ktp_files: Array<{ name: string; url: string }>;
}

interface RentalContract {
  id: string;
  client_group_id: string;
  start_date: string;
  end_date: string;
  status: string;
  tagihan_belum_bayar: number;
  jumlah_lunas: number;
  invoice: string | null;
  keterangan: string | null;
  bukti_pembayaran_files: Array<{ name: string; url: string }>;
  bank_account_id: string | null;
  google_maps_link: string | null;
  notes: string | null;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
}

const ClientGroups = () => {
  const { user } = useAuth();
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [isTableLocked, setIsTableLocked] = useState(true);
  const [sortBy, setSortBy] = useState<'invoice' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    number: 80,
    invoice: 120,
    group: 200,
    keterangan: 250,
    periode: 180,
    status: 120,
    tagihan: 130,
    lunas: 130,
    aksi: 100,
  });
  const [columnOrder, setColumnOrder] = useState([
    "number",
    "invoice",
    "group",
    "keterangan",
    "periode",
    "status",
    "tagihan",
    "lunas",
    "aksi",
  ]);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Form states for Client Group
  const [groupForm, setGroupForm] = useState({
    nama: "",
    nomor_telepon: "",
  });
  const [ktpFiles, setKtpFiles] = useState<File[]>([]);

  // Form states for Rental Contract
  const [contractForm, setContractForm] = useState({
    client_group_id: "",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    status: "masa sewa",
    tagihan_belum_bayar: "",
    jumlah_lunas: "",
    invoice: "",
    keterangan: "",
    bank_account_id: "",
    google_maps_link: "",
    notes: "",
  });
  const [paymentProofFiles, setPaymentProofFiles] = useState<File[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Load saved preferences
  useEffect(() => {
    const savedWidths = localStorage.getItem("contractTableWidths");
    const savedOrder = localStorage.getItem("contractTableOrder");
    
    if (savedWidths) {
      setColumnWidths(JSON.parse(savedWidths));
    }
    if (savedOrder) {
      setColumnOrder(JSON.parse(savedOrder));
    }
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("contractTableWidths", JSON.stringify(columnWidths));
  }, [columnWidths]);

  useEffect(() => {
    localStorage.setItem("contractTableOrder", JSON.stringify(columnOrder));
  }, [columnOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch client groups
      const { data: groups, error: groupsError } = await supabase
        .from("client_groups")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;
      setClientGroups((groups || []).map(g => ({
        ...g,
        ktp_files: (g.ktp_files as any) || []
      })));

      // Fetch rental contracts
      const { data: contracts, error: contractsError } = await supabase
        .from("rental_contracts")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (contractsError) throw contractsError;
      setRentalContracts((contracts || []).map(c => ({
        ...c,
        bukti_pembayaran_files: (c.bukti_pembayaran_files as any) || []
      })));

      // Fetch bank accounts
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

  const handleSaveGroup = async () => {
    try {
      if (!groupForm.nama || !groupForm.nomor_telepon) {
        toast.error("Mohon lengkapi semua field");
        return;
      }

      let ktpFileUrls: Array<{ name: string; url: string }> = [];
      if (ktpFiles.length > 0) {
        ktpFileUrls = await uploadFiles(ktpFiles, "ktp-documents");
      }

      const { error } = await supabase
        .from("client_groups")
        .insert({
          user_id: user?.id,
          nama: groupForm.nama,
          nomor_telepon: groupForm.nomor_telepon,
          ktp_files: ktpFileUrls,
        });

      if (error) throw error;

      toast.success("Kelompok client berhasil ditambahkan");
      setIsGroupDialogOpen(false);
      resetGroupForm();
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    }
  };

  const handleSaveContract = async () => {
    try {
      if (!contractForm.client_group_id || !contractForm.start_date || !contractForm.end_date) {
        toast.error("Mohon lengkapi field wajib");
        return;
      }

      let paymentProofUrls: Array<{ name: string; url: string }> = [];
      
      if (editingContractId) {
        // Edit mode - get existing files first
        const existingContract = rentalContracts.find(c => c.id === editingContractId);
        paymentProofUrls = existingContract?.bukti_pembayaran_files || [];
        
        // Add new files if any
        if (paymentProofFiles.length > 0) {
          const newFiles = await uploadFiles(paymentProofFiles, "payment-proofs");
          paymentProofUrls = [...paymentProofUrls, ...newFiles];
        }
      } else {
        // Create mode
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
        status: contractForm.status,
        tagihan_belum_bayar: parseFloat(contractForm.tagihan_belum_bayar) || 0,
        jumlah_lunas: jumlahLunas,
        invoice: contractForm.invoice || null,
        keterangan: contractForm.keterangan || null,
        bukti_pembayaran_files: paymentProofUrls,
        bank_account_id: contractForm.bank_account_id || null,
        google_maps_link: contractForm.google_maps_link || null,
        notes: contractForm.notes || null,
      };

      if (editingContractId) {
        // Update existing contract
        const { error: contractError } = await supabase
          .from("rental_contracts")
          .update(contractData)
          .eq("id", editingContractId);

        if (contractError) throw contractError;
        toast.success("Kontrak berhasil diupdate");
      } else {
        // Insert new contract
        const { error: contractError } = await supabase
          .from("rental_contracts")
          .insert(contractData);

        if (contractError) throw contractError;

        // Auto-create income entry if jumlah_lunas > 0
        if (jumlahLunas > 0 && contractForm.bank_account_id) {
          const bankAccount = bankAccounts.find(b => b.id === contractForm.bank_account_id);
          const clientGroup = clientGroups.find(g => g.id === contractForm.client_group_id);
          
          await supabase
            .from("income_sources")
            .insert({
              user_id: user?.id,
              source_name: `Sewa - ${clientGroup?.nama || "Client"}`,
              bank_name: bankAccount?.bank_name || "Unknown",
              amount: jumlahLunas,
              date: format(new Date(), "yyyy-MM-dd"),
            });
        }

        toast.success("Kontrak sewa berhasil ditambahkan");
      }

      setIsContractDialogOpen(false);
      resetContractForm();
      setEditingContractId(null);
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kelompok ini? Semua kontrak terkait akan terhapus.")) return;
    
    try {
      const { error } = await supabase
        .from("client_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Kelompok berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    }
  };

  const handleEditContract = (contract: RentalContract) => {
    setEditingContractId(contract.id);
    setContractForm({
      client_group_id: contract.client_group_id,
      start_date: new Date(contract.start_date),
      end_date: new Date(contract.end_date),
      status: contract.status,
      tagihan_belum_bayar: contract.tagihan_belum_bayar.toString(),
      jumlah_lunas: contract.jumlah_lunas.toString(),
      invoice: contract.invoice || "",
      keterangan: contract.keterangan || "",
      bank_account_id: contract.bank_account_id || "",
      google_maps_link: contract.google_maps_link || "",
      notes: contract.notes || "",
    });
    setPaymentProofFiles([]);
    setIsContractDialogOpen(true);
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kontrak ini?")) return;
    
    try {
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

  const resetGroupForm = () => {
    setGroupForm({ nama: "", nomor_telepon: "" });
    setKtpFiles([]);
  };

  const resetContractForm = () => {
    setContractForm({
      client_group_id: "",
      start_date: undefined,
      end_date: undefined,
      status: "masa sewa",
      tagihan_belum_bayar: "",
      jumlah_lunas: "",
      invoice: "",
      keterangan: "",
      bank_account_id: "",
      google_maps_link: "",
      notes: "",
    });
    setPaymentProofFiles([]);
    setEditingContractId(null);
  };

  const getContractsForGroup = (groupId: string) => {
    return rentalContracts.filter(c => c.client_group_id === groupId);
  };

  const getRemainingDays = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date());
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      "perpanjangan": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "pending": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      "masa sewa": "bg-green-500/10 text-green-500 border-green-500/20",
      "berulang": "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    return styles[status as keyof typeof styles] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    if (isTableLocked) return;
    e.preventDefault();
    setResizingColumn(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnKey]);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumn) return;
    const diff = e.clientX - resizeStartX;
    const newWidth = Math.max(80, resizeStartWidth + diff);
    setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
  };

  const handleResizeEnd = () => {
    setResizingColumn(null);
  };

  useEffect(() => {
    if (resizingColumn) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
      return () => {
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  const handleDragStart = (columnKey: string) => {
    if (isTableLocked) return;
    setDraggedColumn(columnKey);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    if (isTableLocked || !draggedColumn) return;
    e.preventDefault();
    
    if (draggedColumn !== columnKey) {
      const newOrder = [...columnOrder];
      const draggedIdx = newOrder.indexOf(draggedColumn);
      const targetIdx = newOrder.indexOf(columnKey);
      
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedColumn);
      
      setColumnOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const getColumnLabel = (key: string) => {
    const labels: Record<string, string> = {
      number: "No",
      invoice: "Invoice",
      group: "Kelompok Client",
      keterangan: "Keterangan",
      periode: "Periode",
      status: "Status",
      tagihan: "Tagihan",
      lunas: "Lunas",
      aksi: "Aksi",
    };
    return labels[key] || key;
  };

  const handleSortByInvoice = () => {
    if (sortBy === 'invoice') {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy('invoice');
      setSortOrder('asc');
    }
  };

  const getColumnAlignment = (key: string) => {
    if (key === "tagihan" || key === "lunas") return "text-right";
    if (key === "aksi" || key === "number") return "text-center";
    return "";
  };

  const sortedContracts = React.useMemo(() => {
    if (!rentalContracts) return [];
    
    let sorted = [...rentalContracts];
    
    if (sortBy === 'invoice') {
      sorted.sort((a, b) => {
        const invoiceA = a.invoice || '';
        const invoiceB = b.invoice || '';
        const comparison = invoiceA.localeCompare(invoiceB, undefined, { numeric: true });
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    return sorted;
  }, [rentalContracts, sortBy, sortOrder]);

  const renderCellContent = (contract: RentalContract, columnKey: string, index: number) => {
    const group = clientGroups.find(g => g.id === contract.client_group_id);
    const remainingDays = getRemainingDays(contract.end_date);

    switch (columnKey) {
      case "number":
        return <span className="font-medium">{index + 1}</span>;
      case "invoice":
        return <span className="font-medium">{contract.invoice || "-"}</span>;
      case "group":
        return <span className="truncate block max-w-[200px]" title={group?.nama || "-"}>{group?.nama || "-"}</span>;
      case "keterangan":
        return (
          <div className="truncate max-w-[300px]" title={contract.keterangan || "-"}>
            {contract.keterangan || "-"}
          </div>
        );
      case "periode":
        return (
          <div className="text-sm whitespace-nowrap">
            <span>{format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })}</span>
            <span className="text-muted-foreground"> s/d </span>
            <span>{format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}</span>
            <span className={`ml-2 font-medium ${remainingDays > 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({remainingDays > 0 ? `${remainingDays} hari` : "Berakhir"})
            </span>
          </div>
        );
      case "status":
        return (
          <Badge className={`${getStatusBadge(contract.status)} border whitespace-nowrap`}>
            {contract.status}
          </Badge>
        );
      case "tagihan":
        return <span className="text-warning font-medium">{formatRupiah(contract.tagihan_belum_bayar)}</span>;
      case "lunas":
        return <span className="text-foreground font-medium">{formatRupiah(contract.jumlah_lunas)}</span>;
      case "aksi":
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEditContract(contract)}
              className="h-8 w-8 text-primary hover:bg-primary/10"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteContract(contract.id)}
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="min-h-screen p-8 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-2">
            Kelompok Client
          </h1>
          <p className="text-muted-foreground">Kelola client dan kontrak sewa peralatan</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white border-0 shadow-lg hover:shadow-xl transition-all">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Kelompok
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Kelompok Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nama Kelompok</Label>
                  <Input
                    value={groupForm.nama}
                    onChange={(e) => setGroupForm({ ...groupForm, nama: e.target.value })}
                    placeholder="Nama kelompok"
                  />
                </div>
                <div>
                  <Label>Nomor Telepon</Label>
                  <Input
                    value={groupForm.nomor_telepon}
                    onChange={(e) => setGroupForm({ ...groupForm, nomor_telepon: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <Label>Upload KTP (Multiple)</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => setKtpFiles(Array.from(e.target.files || []))}
                  />
                  {ktpFiles.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">{ktpFiles.length} file dipilih</p>
                  )}
                </div>
                <Button onClick={handleSaveGroup} className="w-full">
                  Simpan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isContractDialogOpen} onOpenChange={(open) => {
            setIsContractDialogOpen(open);
            if (!open) {
              resetContractForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Kontrak
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingContractId ? "Edit Kontrak Sewa" : "Tambah Kontrak Sewa"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Pilih Kelompok Client *</Label>
                  <Select
                    value={contractForm.client_group_id}
                    onValueChange={(value) => setContractForm({ ...contractForm, client_group_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kelompok" />
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tagihan (Belum Bayar)</Label>
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

                <Button onClick={handleSaveContract} className="w-full">
                  {editingContractId ? "Update Kontrak" : "Simpan Kontrak"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Client Groups List */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {clientGroups.map((group) => {
          const contracts = getContractsForGroup(group.id);

          return (
            <Card key={group.id} className="p-4 gradient-card border-0 shadow-md card-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-white shadow-lg">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{group.nama}</h3>
                    <p className="text-xs text-muted-foreground">{group.nomor_telepon}</p>
                    <Badge className="bg-primary/10 text-primary border-primary/20 border text-xs mt-1">
                      {contracts.length} kontrak
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteGroup(group.id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Contracts Table */}
      {rentalContracts.length > 0 && (
        <Card className="p-6 gradient-card border-0 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Daftar Kontrak Sewa</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSortByInvoice}
                className="gap-2"
              >
                Sort by Invoice {sortBy === 'invoice' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTableLocked(!isTableLocked)}
                className={cn(
                  "gap-2",
                  !isTableLocked && "border-primary text-primary"
                )}
              >
                {isTableLocked ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Terkunci
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    Bisa Diatur
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {!isTableLocked && (
            <p className="text-sm text-muted-foreground mb-3">
              Drag kolom untuk mengubah urutan, drag tepi kanan kolom untuk mengatur lebar
            </p>
          )}

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {columnOrder.map((columnKey) => (
                    <TableHead
                      key={columnKey}
                      className={cn(
                        "relative select-none",
                        getColumnAlignment(columnKey),
                        !isTableLocked && "cursor-move border-r border-black"
                      )}
                      style={{ width: columnWidths[columnKey] }}
                      draggable={!isTableLocked}
                      onDragStart={() => handleDragStart(columnKey)}
                      onDragOver={(e) => handleDragOver(e, columnKey)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{getColumnLabel(columnKey)}</span>
                        {!isTableLocked && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-black/30 hover:bg-primary transition-colors"
                            onMouseDown={(e) => handleResizeStart(columnKey, e)}
                          />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedContracts.map((contract, index) => (
                  <TableRow key={contract.id}>
                    {columnOrder.map((columnKey) => (
                      <TableCell
                        key={columnKey}
                        className={cn(
                          getColumnAlignment(columnKey),
                          !isTableLocked && "border-r border-black"
                        )}
                        style={{ width: columnWidths[columnKey] }}
                      >
                        {renderCellContent(contract, columnKey, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {clientGroups.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Belum ada kelompok client</h3>
          <p className="text-muted-foreground mb-4">Mulai dengan menambahkan kelompok client pertama</p>
        </div>
      )}
    </div>
  );
};

export default ClientGroups;
