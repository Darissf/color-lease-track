import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Eye, EyeOff, CheckCircle2, XCircle, Link2, Link2Off, Info, Phone, Sparkles } from "lucide-react";

interface UserEditData {
  full_name: string;
  username?: string;
  email: string;
  nomor_telepon?: string;
  role: string;
  new_password?: string;
}

interface PhoneNumberEntry {
  nomor: string;
  label: string;
  has_whatsapp: boolean;
}

interface ClientGroup {
  id: string;
  nama: string;
  icon: string | null;
  linked_user_id: string | null;
  nomor_telepon: string | null;
  phone_numbers: PhoneNumberEntry[] | null;
}

// Helper function to normalize phone numbers for comparison
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  // Remove spaces, dashes, and non-digit characters
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  // Convert +62 to 0
  if (normalized.startsWith('+62')) {
    normalized = '0' + normalized.slice(3);
  }
  // Convert 62 to 0 (if starts with 62 and has enough digits)
  if (normalized.startsWith('62') && normalized.length > 10) {
    normalized = '0' + normalized.slice(2);
  }
  return normalized;
};

interface UserEditFormProps {
  userId: string;
  currentData: {
    full_name: string | null;
    username?: string | null;
    email: string;
    nomor_telepon?: string | null;
    role: string | null;
    email_verified?: boolean;
    temp_email?: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const UserEditForm = ({ userId, currentData, open, onOpenChange, onSuccess }: UserEditFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forceVerifyEmail, setForceVerifyEmail] = useState(false);
  const [sendPasswordEmail, setSendPasswordEmail] = useState(false);
  const [availableClients, setAvailableClients] = useState<ClientGroup[]>([]);
  const [currentLinkedClientId, setCurrentLinkedClientId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("none");
  const [matchedClient, setMatchedClient] = useState<ClientGroup | null>(null);
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UserEditData>({
    defaultValues: {
      full_name: currentData.full_name || "",
      username: currentData.username || "",
      email: currentData.email,
      nomor_telepon: currentData.nomor_telepon || "",
      role: currentData.role || "user",
      new_password: "",
    }
  });

  const selectedRole = watch("role");
  const newPassword = watch("new_password");
  const isEmailVerified = currentData.email_verified && !currentData.temp_email;

  // Fetch available clients when dialog opens
  useEffect(() => {
    if (open) {
      fetchAvailableClients();
    }
  }, [open, userId]);

  const fetchAvailableClients = async () => {
    try {
      // Fetch all clients: unlinked OR linked to this user
      const { data: clients, error } = await supabase
        .from('client_groups')
        .select('id, nama, icon, linked_user_id, nomor_telepon, phone_numbers')
        .or(`linked_user_id.is.null,linked_user_id.eq.${userId}`)
        .order('nama');

      if (error) throw error;

      // Parse phone_numbers from JSON if needed
      const parsedClients: ClientGroup[] = (clients || []).map(c => ({
        ...c,
        phone_numbers: Array.isArray(c.phone_numbers) ? c.phone_numbers as unknown as PhoneNumberEntry[] : null
      }));

      setAvailableClients(parsedClients);

      // Find if this user is already linked to a client
      const linkedClient = parsedClients.find(c => c.linked_user_id === userId);
      if (linkedClient) {
        setCurrentLinkedClientId(linkedClient.id);
        setSelectedClientId(linkedClient.id);
      } else {
        setCurrentLinkedClientId(null);
        setSelectedClientId("none");
      }

      // Find matching client by phone number
      const userPhone = normalizePhone(currentData.nomor_telepon || '');
      if (userPhone && !linkedClient) {
        const matched = parsedClients.find(client => {
          // Check nomor_telepon
          if (normalizePhone(client.nomor_telepon || '') === userPhone) {
            return true;
          }
          // Check phone_numbers array
          if (client.phone_numbers && Array.isArray(client.phone_numbers)) {
            return client.phone_numbers.some(
              (p) => normalizePhone(p.nomor) === userPhone
            );
          }
          return false;
        });
        setMatchedClient(matched || null);
      } else {
        setMatchedClient(null);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  // Update form when currentData changes
  useEffect(() => {
    setValue("full_name", currentData.full_name || "");
    setValue("username", currentData.username || "");
    setValue("email", currentData.email);
    setValue("nomor_telepon", currentData.nomor_telepon || "");
    setValue("role", currentData.role || "user");
  }, [currentData, setValue]);

  const onSubmit = async (data: UserEditData) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const requestBody: any = {
        user_id: userId,
        full_name: data.full_name,
        username: data.username,
        email: data.email,
        nomor_telepon: data.nomor_telepon,
        role: data.role,
      };

      // Add optional fields
      if (data.new_password) {
        requestBody.new_password = data.new_password;
        requestBody.send_password_email = sendPasswordEmail;
      }

      if (forceVerifyEmail) {
        requestBody.force_verify_email = true;
      }

      const response = await supabase.functions.invoke("update-user", {
        body: requestBody,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;

      // Handle client linking/unlinking
      const newClientId = selectedClientId === "none" ? null : selectedClientId;
      
      if (newClientId !== currentLinkedClientId) {
        // Unlink from old client if there was one
        if (currentLinkedClientId) {
          await supabase
            .from('client_groups')
            .update({ linked_user_id: null })
            .eq('id', currentLinkedClientId);
        }
        
        // Link to new client if selected
        if (newClientId) {
          await supabase
            .from('client_groups')
            .update({ linked_user_id: userId })
            .eq('id', newClientId);
        }
      }

      await logAction(
        "update",
        "user",
        userId,
        currentData,
        { ...data, new_password: data.new_password ? "[PASSWORD_CHANGED]" : undefined, linked_client_id: newClientId }
      );

      toast({
        title: "Berhasil",
        description: "Data user berhasil diperbarui",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Perbarui informasi user di bawah ini
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Nama Lengkap *</Label>
            <Input
              id="edit_full_name"
              {...register("full_name", { required: "Nama lengkap wajib diisi" })}
              placeholder="John Doe"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_username">Username</Label>
            <Input
              id="edit_username"
              {...register("username")}
              placeholder="johndoe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_email">Email *</Label>
            <Input
              id="edit_email"
              type="email"
              {...register("email", { 
                required: "Email wajib diisi",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Email tidak valid"
                }
              })}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_nomor_telepon">Nomor Telepon</Label>
            <Input
              id="edit_nomor_telepon"
              {...register("nomor_telepon")}
              placeholder="08123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_role">Role *</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue("role", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          {/* Client Linking Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Hubungkan ke Client</Label>
            </div>
            
            {/* Phone Number Match Recommendation */}
            {matchedClient && selectedClientId !== matchedClient.id && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span>Rekomendasi Berdasarkan No. HP</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-background rounded-md">
                  <div className="flex-shrink-0">
                    {matchedClient.icon?.startsWith('http') ? (
                      <img 
                        src={matchedClient.icon} 
                        alt={matchedClient.nama}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">{matchedClient.icon || '👤'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{matchedClient.nama}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Nomor HP cocok dengan user
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setSelectedClientId(matchedClient.id)}
                  >
                    Hubungkan
                  </Button>
                </div>
              </div>
            )}

            {/* Show confirmation if matched client is selected */}
            {matchedClient && selectedClientId === matchedClient.id && (
              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>Client yang cocok akan dihubungkan saat simpan</span>
              </div>
            )}

            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih client..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <Link2Off className="h-4 w-4 text-muted-foreground" />
                    <span>Tidak ada (unlink)</span>
                  </div>
                </SelectItem>
                {availableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2 max-w-full overflow-hidden">
                      {client.icon?.startsWith('http') ? (
                        <img 
                          src={client.icon} 
                          alt={client.nama}
                          className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <span className="flex-shrink-0">{client.icon || '👤'}</span>
                      )}
                      <span className="truncate">{client.nama}</span>
                      {client.linked_user_id === userId && (
                        <Badge variant="secondary" className="ml-2 text-xs flex-shrink-0">Saat ini</Badge>
                      )}
                      {matchedClient?.id === client.id && client.linked_user_id !== userId && (
                        <Badge variant="default" className="ml-2 text-xs flex-shrink-0 gap-1">
                          <Phone className="h-3 w-3" />
                          Match
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Satu client hanya bisa dihubungkan ke satu user. Client yang sudah ter-link ke user lain tidak akan muncul dalam daftar.
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Email Status & Force Verify */}
          <div className="space-y-3 bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Status Email</Label>
              {isEmailVerified ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Belum Verified
                </Badge>
              )}
            </div>
            {!isEmailVerified && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="force_verify"
                  checked={forceVerifyEmail}
                  onCheckedChange={(checked) => setForceVerifyEmail(checked as boolean)}
                />
                <Label htmlFor="force_verify" className="text-sm cursor-pointer">
                  Verifikasi Email Langsung (tanpa OTP)
                </Label>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Reset Password Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">🔐 Reset Password (Opsional)</Label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  {...register("new_password")}
                  placeholder="Password baru (kosongkan jika tidak ingin mengubah)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="send_password"
                    checked={sendPasswordEmail}
                    onCheckedChange={(checked) => setSendPasswordEmail(checked as boolean)}
                  />
                  <Label htmlFor="send_password" className="text-sm cursor-pointer">
                    Kirim password baru ke email user
                  </Label>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4 sticky bottom-0 bg-background pb-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
