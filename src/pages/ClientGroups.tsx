import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Plus, Users, Trash2, Edit, CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface ClientGroup {
  id: string;
  nama: string;
  nomor_telepon: string;
  ktp_files: Array<{ name: string; url: string }>;
  has_whatsapp: boolean | null;
  whatsapp_checked_at: string | null;
  created_at: string;
}

// Validation schema for Indonesian phone numbers
const phoneSchema = z.string()
  .trim()
  .refine(
    (val) => {
      // Accept formats: +62xxx or 08xx
      const indonesianPhoneRegex = /^(\+62|08)\d{8,12}$/;
      return indonesianPhoneRegex.test(val);
    },
    {
      message: "Nomor telepon harus format +62xxx atau 08xx (minimal 10 digit)"
    }
  );

const ClientGroups = () => {
  const { user } = useAuth();
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [validatingWhatsApp, setValidatingWhatsApp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{has_whatsapp: boolean | null; confidence: string; reason: string} | null>(null);
  const [sortBy, setSortBy] = useState<'number' | 'nama' | 'telepon' | 'whatsapp' | 'created' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [groupForm, setGroupForm] = useState({
    nama: "",
    nomor_telepon: "",
  });
  const [phoneError, setPhoneError] = useState<string>("");
  const [ktpFiles, setKtpFiles] = useState<File[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Debounced WhatsApp validation
  useEffect(() => {
    if (!groupForm.nomor_telepon || phoneError) {
      setWhatsappStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      await validateWhatsApp(groupForm.nomor_telepon);
    }, 1500);

    return () => clearTimeout(timer);
  }, [groupForm.nomor_telepon, phoneError]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: groups, error: groupsError } = await supabase
        .from("client_groups")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;
      setClientGroups((groups || []).map(g => ({
        ...g,
        ktp_files: (g.ktp_files as any) || [],
        has_whatsapp: g.has_whatsapp,
        whatsapp_checked_at: g.whatsapp_checked_at
      })));
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

  const validateWhatsApp = async (phoneNumber: string) => {
    try {
      setValidatingWhatsApp(true);
      setWhatsappStatus(null);

      const { data, error } = await supabase.functions.invoke("validate-whatsapp", {
        body: { phoneNumber }
      });

      if (error) {
        if (error.message.includes("AI settings not configured")) {
          toast.error("Konfigurasi AI belum disetup. Silakan ke Settings → AI");
        } else {
          console.error("WhatsApp validation error:", error);
        }
        return;
      }

      setWhatsappStatus({
        has_whatsapp: data.has_whatsapp,
        confidence: data.confidence,
        reason: data.reason
      });

      if (data.has_whatsapp) {
        toast.success(`✅ ${data.confidence === "high" ? "Kemungkinan besar" : "Mungkin"} ada WhatsApp`);
      } else {
        toast.info(`❌ ${data.confidence === "high" ? "Kemungkinan besar" : "Mungkin"} tidak ada WhatsApp`);
      }
    } catch (error: any) {
      console.error("Error validating WhatsApp:", error);
    } finally {
      setValidatingWhatsApp(false);
    }
  };

  const handleSaveGroup = async () => {
    try {
      if (!groupForm.nama || !groupForm.nomor_telepon) {
        toast.error("Mohon lengkapi semua field");
        return;
      }

      const phoneValidation = phoneSchema.safeParse(groupForm.nomor_telepon);
      if (!phoneValidation.success) {
        setPhoneError(phoneValidation.error.errors[0].message);
        toast.error(phoneValidation.error.errors[0].message);
        return;
      }
      setPhoneError("");

      let ktpFileUrls: Array<{ name: string; url: string }> = [];
      
      if (editingGroupId) {
        const existingGroup = clientGroups.find(g => g.id === editingGroupId);
        ktpFileUrls = existingGroup?.ktp_files || [];
        
        if (ktpFiles.length > 0) {
          const newFiles = await uploadFiles(ktpFiles, "ktp-documents");
          ktpFileUrls = [...ktpFileUrls, ...newFiles];
        }
      } else {
        if (ktpFiles.length > 0) {
          ktpFileUrls = await uploadFiles(ktpFiles, "ktp-documents");
        }
      }

      const groupData = {
        user_id: user?.id,
        nama: groupForm.nama,
        nomor_telepon: groupForm.nomor_telepon,
        ktp_files: ktpFileUrls,
        has_whatsapp: whatsappStatus?.has_whatsapp || null,
        whatsapp_checked_at: whatsappStatus ? new Date().toISOString() : null,
      };

      if (editingGroupId) {
        const { error } = await supabase
          .from("client_groups")
          .update(groupData)
          .eq("id", editingGroupId);

        if (error) throw error;
        toast.success("Kelompok client berhasil diupdate");
      } else {
        const { error } = await supabase
          .from("client_groups")
          .insert(groupData);

        if (error) throw error;
        toast.success("Kelompok client berhasil ditambahkan");
      }

      setIsGroupDialogOpen(false);
      resetGroupForm();
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    }
  };

  const handleEditGroup = (group: ClientGroup) => {
    setEditingGroupId(group.id);
    setGroupForm({
      nama: group.nama,
      nomor_telepon: group.nomor_telepon,
    });
    setIsGroupDialogOpen(true);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kelompok client ini? Semua kontrak terkait juga akan terhapus.")) return;

    try {
      // Delete related contracts first
      await supabase
        .from("rental_contracts")
        .delete()
        .eq("client_group_id", id);

      const { error } = await supabase
        .from("client_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Kelompok client berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    }
  };

  const resetGroupForm = () => {
    setEditingGroupId(null);
    setGroupForm({
      nama: "",
      nomor_telepon: "",
    });
    setKtpFiles([]);
    setPhoneError("");
    setWhatsappStatus(null);
  };

  const sortedGroups = React.useMemo(() => {
    if (!clientGroups) return [];
    
    let sorted = [...clientGroups];
    
    if (sortBy !== 'none') {
      sorted.sort((a, b) => {
        let comparison = 0;
        
        switch(sortBy) {
          case 'number':
            comparison = clientGroups.indexOf(a) - clientGroups.indexOf(b);
            break;
          case 'nama':
            comparison = a.nama.localeCompare(b.nama);
            break;
          case 'telepon':
            comparison = a.nomor_telepon.localeCompare(b.nomor_telepon);
            break;
          case 'whatsapp':
            const aVal = a.has_whatsapp === null ? -1 : a.has_whatsapp ? 1 : 0;
            const bVal = b.has_whatsapp === null ? -1 : b.has_whatsapp ? 1 : 0;
            comparison = aVal - bVal;
            break;
          case 'created':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    return sorted;
  }, [clientGroups, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGroups = sortedGroups.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return <div className="min-h-screen p-8 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-2">
            Kelompok Client
          </h1>
          <p className="text-muted-foreground">Kelola data kelompok client</p>
        </div>
        <Dialog open={isGroupDialogOpen} onOpenChange={(open) => {
          setIsGroupDialogOpen(open);
          if (!open) resetGroupForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white border-0 shadow-lg hover:shadow-xl transition-all">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Kelompok
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGroupId ? "Edit Kelompok Client" : "Tambah Kelompok Client"}</DialogTitle>
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
                <div className="relative">
                  <Input
                    value={groupForm.nomor_telepon}
                    onChange={(e) => {
                      setGroupForm({ ...groupForm, nomor_telepon: e.target.value });
                      setPhoneError("");
                    }}
                    placeholder="+62812345678 atau 08123456789"
                    className={cn(
                      "pr-10",
                      phoneError && "border-destructive",
                      whatsappStatus?.has_whatsapp !== null && !phoneError && "border-green-500"
                    )}
                  />
                  {validatingWhatsApp && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {whatsappStatus && !validatingWhatsApp && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {whatsappStatus.has_whatsapp ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
                {phoneError && (
                  <p className="text-xs text-destructive mt-1">{phoneError}</p>
                )}
                {whatsappStatus && !phoneError && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {whatsappStatus.reason}
                  </p>
                )}
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
              <Button onClick={handleSaveGroup} className="w-full" disabled={validatingWhatsApp}>
                {validatingWhatsApp ? "Memvalidasi..." : editingGroupId ? "Update Kelompok" : "Simpan Kelompok"}
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
                  <SelectItem value="nama">Nama</SelectItem>
                  <SelectItem value="telepon">Telepon</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="created">Tanggal Dibuat</SelectItem>
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
          <div className="text-sm text-muted-foreground">
            Total: {clientGroups.length} kelompok
          </div>
        </div>
      </Card>

      {/* Client Groups Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-20">No</TableHead>
                <TableHead>Nama Kelompok</TableHead>
                <TableHead>Nomor Telepon</TableHead>
                <TableHead className="text-center">WhatsApp</TableHead>
                <TableHead className="text-center">Dokumen KTP</TableHead>
                <TableHead>Tanggal Dibuat</TableHead>
                <TableHead className="text-center w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada kelompok client</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.map((group, index) => (
                  <TableRow key={group.id}>
                    <TableCell className="text-center font-medium">{startIndex + index + 1}</TableCell>
                    <TableCell>
                      <span className="font-medium">{group.nama}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{group.nomor_telepon}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {group.has_whatsapp !== null ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {group.has_whatsapp ? (
                                <CheckCircle className="h-5 w-5 mx-auto text-green-600 dark:text-green-400" />
                              ) : (
                                <XCircle className="h-5 w-5 mx-auto text-red-600 dark:text-red-400" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {group.has_whatsapp 
                                  ? "Kemungkinan ada WhatsApp" 
                                  : "Kemungkinan tidak ada WhatsApp"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Status WhatsApp belum dicek</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {group.ktp_files && group.ktp_files.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {group.ktp_files.length} file
                          </Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <FileText className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Dokumen KTP - {group.nama}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2">
                                {group.ktp_files.map((file, idx) => (
                                  <a
                                    key={idx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                                  >
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="flex-1 text-sm truncate">{file.name}</span>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                  </a>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{format(new Date(group.created_at), "dd MMM yyyy", { locale: localeId })}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditGroup(group)}
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
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

export default ClientGroups;
