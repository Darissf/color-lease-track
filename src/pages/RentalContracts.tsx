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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Plus, Calendar as CalendarIcon, Trash2, Edit, ExternalLink, Lock, Unlock, Check, ChevronsUpDown, FileText } from "lucide-react";
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

const RentalContracts = () => {
  const { user } = useAuth();
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [isTableLocked, setIsTableLocked] = useState(true);
  const [sortBy, setSortBy] = useState<'number' | 'invoice' | 'group' | 'keterangan' | 'periode' | 'status' | 'tagihan' | 'lunas' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
        bukti_pembayaran_files: (c.bukti_pembayaran_files as any) || []
      })));

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
        const { error: contractError } = await supabase
          .from("rental_contracts")
          .update(contractData)
          .eq("id", editingContractId);

        if (contractError) throw contractError;
        
        const bankAccount = bankAccounts.find(b => b.id === contractForm.bank_account_id);
        const clientGroup = clientGroups.find(g => g.id === contractForm.client_group_id);
        
        if (jumlahLunas > 0) {
          const incomeData = {
            user_id: user?.id,
            source_name: `Sewa - ${clientGroup?.nama || "Client"}`,
            bank_name: bankAccount?.bank_name || "Unknown",
            amount: jumlahLunas,
            date: format(new Date(), "yyyy-MM-dd"),
            contract_id: editingContractId,
          };

          const { data: existingIncome } = await supabase
            .from("income_sources")
            .select("id")
            .eq("contract_id", editingContractId)
            .maybeSingle();

          if (existingIncome) {
            await supabase
              .from("income_sources")
              .update(incomeData)
              .eq("id", existingIncome.id);
          } else {
            await supabase
              .from("income_sources")
              .insert(incomeData);
          }
        } else {
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

        if (jumlahLunas > 0 && newContract) {
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
              contract_id: newContract.id,
            });
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
      tagihan_belum_bayar: "",
      jumlah_lunas: "",
      invoice: "",
      keterangan: "",
      bank_account_id: "",
      google_maps_link: "",
      notes: "",
    });
    setPaymentProofFiles([]);
  };

  const getRemainingDays = (endDate: string) => {
    return differenceInDays(new Date(endDate), new Date());
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      "perpanjangan": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      "pending": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      "masa sewa": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      "berulang": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    };
    return statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  const sortedContracts = React.useMemo(() => {
    if (!rentalContracts) return [];
    
    let sorted = [...rentalContracts];
    
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
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    return sorted;
  }, [rentalContracts, sortBy, sortOrder, clientGroups]);

  const totalPages = Math.ceil(sortedContracts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContracts = sortedContracts.slice(startIndex, startIndex + itemsPerPage);

  const filteredClientGroups = clientGroups.filter(group =>
    group.nama.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    group.nomor_telepon.includes(clientSearchQuery)
  );

  if (loading) {
    return <div className="min-h-screen p-8 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            List Kontrak Sewa
          </h1>
          <p className="text-muted-foreground">Kelola semua kontrak sewa peralatan</p>
        </div>
        <Dialog open={isContractDialogOpen} onOpenChange={(open) => {
          setIsContractDialogOpen(open);
          if (!open) resetContractForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white border-0 shadow-lg hover:shadow-xl transition-all">
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

      {/* Controls */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Sort By:</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ada</SelectItem>
                  <SelectItem value="number">Nomor</SelectItem>
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
          </div>
          <Button
            variant="outline"
            onClick={() => setIsTableLocked(!isTableLocked)}
          >
            {isTableLocked ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
            {isTableLocked ? "Unlock Table" : "Lock Table"}
          </Button>
        </div>
      </Card>

      {/* Contracts Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-20">No</TableHead>
                <TableHead className="text-center w-24">Kalender</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tagihan</TableHead>
                <TableHead className="text-right">Lunas</TableHead>
                <TableHead className="text-center w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada kontrak sewa</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedContracts.map((contract, index) => {
                  const group = clientGroups.find(g => g.id === contract.client_group_id);
                  const remainingDays = getRemainingDays(contract.end_date);

                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="text-center font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <CalendarIcon className="h-5 w-5 text-primary" />
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(contract.start_date), "dd/MM/yy")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{contract.invoice || "-"}</TableCell>
                      <TableCell>
                        <span className="truncate block max-w-[200px]" title={group?.nama || "-"}>
                          {group?.nama || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="truncate max-w-[250px]">
                          {contract.keterangan || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div>{format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })}</div>
                        <div className="text-muted-foreground text-xs">s/d {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}</div>
                        <span className={`text-xs font-medium ${remainingDays > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({remainingDays > 0 ? `${remainingDays} hari` : "Berakhir"})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadge(contract.status)} border whitespace-nowrap`}>
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-warning font-medium">{formatRupiah(contract.tagihan_belum_bayar)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-foreground font-medium">{formatRupiah(contract.jumlah_lunas)}</span>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t">
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
      </Card>
    </div>
  );
};

export default RentalContracts;
