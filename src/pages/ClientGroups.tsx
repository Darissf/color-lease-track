import { useState, useEffect } from "react";
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
import { Plus, Users, Calendar as CalendarIcon, FileText, MapPin, Trash2, Edit, ExternalLink } from "lucide-react";
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
  invoice: number | null;
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
      if (paymentProofFiles.length > 0) {
        paymentProofUrls = await uploadFiles(paymentProofFiles, "payment-proofs");
      }

      const jumlahLunas = parseFloat(contractForm.jumlah_lunas) || 0;

      const { error: contractError } = await supabase
        .from("rental_contracts")
        .insert({
          user_id: user?.id,
          client_group_id: contractForm.client_group_id,
          start_date: format(contractForm.start_date, "yyyy-MM-dd"),
          end_date: format(contractForm.end_date, "yyyy-MM-dd"),
          status: contractForm.status,
          tagihan_belum_bayar: parseFloat(contractForm.tagihan_belum_bayar) || 0,
          jumlah_lunas: jumlahLunas,
          invoice: parseFloat(contractForm.invoice) || null,
          bukti_pembayaran_files: paymentProofUrls,
          bank_account_id: contractForm.bank_account_id || null,
          google_maps_link: contractForm.google_maps_link || null,
          notes: contractForm.notes || null,
        });

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
      setIsContractDialogOpen(false);
      resetContractForm();
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
      bank_account_id: "",
      google_maps_link: "",
      notes: "",
    });
    setPaymentProofFiles([]);
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

          <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Kontrak
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Kontrak Sewa</DialogTitle>
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

                {contractForm.client_group_id && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-sm text-muted-foreground">Nama Client</Label>
                    <p className="font-medium">
                      {clientGroups.find(g => g.id === contractForm.client_group_id)?.nama}
                    </p>
                  </div>
                )}

                <div>
                  <Label>Invoice</Label>
                  <Input
                    type="number"
                    value={contractForm.invoice}
                    onChange={(e) => setContractForm({ ...contractForm, invoice: e.target.value })}
                    placeholder="Nomor invoice"
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
                  Simpan Kontrak
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Client Groups Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {clientGroups.map((group) => {
          const contracts = getContractsForGroup(group.id);
          const activeContracts = contracts.filter(c => c.status === "masa sewa" || c.status === "berulang");

          return (
            <Card key={group.id} className="p-6 gradient-card border-0 shadow-md card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{group.nama}</h3>
                    <p className="text-sm text-muted-foreground">{group.nomor_telepon}</p>
                    {group.ktp_files && group.ktp_files.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <FileText className="inline h-3 w-3 mr-1" />
                        {group.ktp_files.length} file KTP
                      </p>
                    )}
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

              {/* Contracts for this group */}
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Kontrak Sewa</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 border">
                    {contracts.length} kontrak
                  </Badge>
                </div>

                {contracts.length > 0 ? (
                  <div className="space-y-2">
                    {contracts.map((contract) => {
                      const remainingDays = getRemainingDays(contract.end_date);
                      return (
                        <div key={contract.id} className="border border-border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={`${getStatusBadge(contract.status)} border`}>
                              {contract.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteContract(contract.id)}
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CalendarIcon className="h-3 w-3" />
                              <span>
                                {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Sisa waktu: {remainingDays > 0 ? `${remainingDays} hari` : "Berakhir"}
                              </span>
                              {contract.invoice && (
                                <span className="text-xs text-muted-foreground">
                                  Invoice: #{contract.invoice}
                                </span>
                              )}
                            </div>
                          </div>

                          {(contract.tagihan_belum_bayar > 0 || contract.jumlah_lunas > 0) && (
                            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                              <div>
                                <span className="text-muted-foreground">Tagihan: </span>
                                <span className="text-warning font-medium">{formatRupiah(contract.tagihan_belum_bayar)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Lunas: </span>
                                <span className="text-accent font-medium">{formatRupiah(contract.jumlah_lunas)}</span>
                              </div>
                            </div>
                          )}

                          {contract.google_maps_link && (
                            <a
                              href={contract.google_maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <MapPin className="h-3 w-3" />
                              Buka lokasi di Google Maps
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}

                          {contract.bukti_pembayaran_files && contract.bukti_pembayaran_files.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              <FileText className="inline h-3 w-3 mr-1" />
                              {contract.bukti_pembayaran_files.length} bukti pembayaran
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Belum ada kontrak
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

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
