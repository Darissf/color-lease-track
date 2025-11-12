import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Trash2, Edit, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface ClientGroup {
  id: string;
  nama: string;
  nomor_telepon: string;
  ktp_files: Array<{ name: string; url: string }>;
  has_whatsapp: boolean | null;
  whatsapp_checked_at: string | null;
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

  const getContractCount = (groupId: string) => {
    // You could fetch this separately if needed, or remove this helper
    return 0;
  };

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

      {/* Client Groups Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clientGroups.length === 0 ? (
          <Card className="col-span-full p-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Belum Ada Kelompok Client</h3>
            <p className="text-muted-foreground mb-4">Mulai dengan menambahkan kelompok client pertama Anda</p>
            <Button onClick={() => setIsGroupDialogOpen(true)} className="gradient-primary text-white">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Kelompok
            </Button>
          </Card>
        ) : (
          clientGroups.map((group) => (
            <Card key={group.id} className="p-6 gradient-card border-0 shadow-md card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-white shadow-lg">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{group.nama}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">{group.nomor_telepon}</p>
                      {group.has_whatsapp !== null && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {group.has_whatsapp ? (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
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
                      )}
                      {group.has_whatsapp === null && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Status WhatsApp belum dicek</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditGroup(group)}
                    className="text-primary hover:bg-primary/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {group.ktp_files && group.ktp_files.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Dokumen KTP ({group.ktp_files.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.ktp_files.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                      >
                        <span className="truncate max-w-[120px]">{file.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientGroups;
