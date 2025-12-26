import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { cn } from "@/lib/utils";
import { renderIcon } from "@/lib/renderIcon";

interface UserRegistrationData {
  full_name: string;
  username?: string;
  email?: string;
  password: string;
  nomor_telepon: string;
  role: string;
}

interface MatchedClient {
  id: string;
  nama: string;
  icon?: string;
}

export const UserRegistrationForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchedClient, setMatchedClient] = useState<MatchedClient | null>(null);
  const [checkingClient, setCheckingClient] = useState(false);
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UserRegistrationData>();

  const selectedRole = watch("role");
  const watchedPhone = watch("nomor_telepon");

  // Auto-check client group when phone number changes
  useEffect(() => {
    const checkClientGroup = async () => {
      if (!watchedPhone || watchedPhone.length < 10 || selectedRole !== 'user') {
        setMatchedClient(null);
        return;
      }

      setCheckingClient(true);
      try {
        // Normalize phone number
        let cleanedPhone = watchedPhone.replace(/\D/g, '');
        if (cleanedPhone.startsWith('0')) {
          cleanedPhone = '62' + cleanedPhone.substring(1);
        } else if (!cleanedPhone.startsWith('62')) {
          cleanedPhone = '62' + cleanedPhone;
        }

        // Query client_groups with matching phone number that is not yet linked
        const { data } = await supabase
          .from('client_groups')
          .select('id, nama, icon, nomor_telepon, phone_numbers')
          .is('linked_user_id', null)
          .limit(50);

        if (data) {
          // Search through results for matching phone
          const match = data.find(client => {
            // Check main phone number
            const mainPhone = client.nomor_telepon?.replace(/\D/g, '');
            if (mainPhone === cleanedPhone || mainPhone === watchedPhone.replace(/\D/g, '')) {
              return true;
            }
            
            // Check phone_numbers array
            const phoneNumbers = client.phone_numbers as Array<{ nomor: string }> | null;
            if (phoneNumbers) {
              return phoneNumbers.some(p => {
                const num = p.nomor?.replace(/\D/g, '');
                return num === cleanedPhone || num === watchedPhone.replace(/\D/g, '');
              });
            }
            return false;
          });

          setMatchedClient(match ? { id: match.id, nama: match.nama, icon: match.icon || undefined } : null);
        }
      } catch (error) {
        console.error('Error checking client group:', error);
      } finally {
        setCheckingClient(false);
      }
    };

    const debounceTimer = setTimeout(checkClientGroup, 500);
    return () => clearTimeout(debounceTimer);
  }, [watchedPhone, selectedRole]);

  const onSubmit = async (data: UserRegistrationData) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const response = await supabase.functions.invoke("register-user", {
        body: data,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;

      await logAction(
        "create",
        "user",
        response.data.user_id,
        null,
        { email: data.email, role: data.role, full_name: data.full_name }
      );

      toast({
        title: "Berhasil",
        description: "User berhasil didaftarkan",
      });

      reset();
      setMatchedClient(null);
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mendaftarkan user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Daftarkan User Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Daftarkan User Baru</DialogTitle>
          <DialogDescription>
            Isi form di bawah untuk mendaftarkan user baru ke sistem
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue("role", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User (Client Portal)</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            {!selectedRole && (
              <p className="text-sm text-destructive">Role wajib dipilih</p>
            )}
            {selectedRole === 'user' && (
              <p className="text-xs text-muted-foreground">
                User akan terhubung dengan Client Group berdasarkan nomor telepon
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap *</Label>
            <Input
              id="full_name"
              {...register("full_name", { required: "Nama lengkap wajib diisi" })}
              placeholder="John Doe"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...register("username", {
                setValueAs: (value) => value?.trim() || undefined
              })}
              placeholder="johndoe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="john@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Opsional - jika tidak diisi, user harus verifikasi email setelah login
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              {...register("password", { 
                required: "Password wajib diisi",
                minLength: {
                  value: 6,
                  message: "Password minimal 6 karakter"
                }
              })}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomor_telepon">Nomor Telepon *</Label>
            <Input
              id="nomor_telepon"
              {...register("nomor_telepon", {
                required: "Nomor telepon wajib diisi"
              })}
              placeholder="08123456789"
            />
            {errors.nomor_telepon && (
              <p className="text-sm text-destructive">{errors.nomor_telepon.message}</p>
            )}
            
            {/* Client Group Match Preview - Only show for 'user' role */}
            {selectedRole === 'user' && watchedPhone && watchedPhone.length >= 10 && (
              <div className={cn(
                "p-3 rounded-lg border mt-2",
                matchedClient 
                  ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" 
                  : checkingClient 
                    ? "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                    : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
              )}>
                {checkingClient ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mencari client group...
                  </div>
                ) : matchedClient ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <span className="flex items-center gap-1">
                      Akan terhubung dengan: 
                      <strong className="inline-flex items-center gap-1">
                        {renderIcon({ icon: matchedClient.icon, alt: matchedClient.nama, size: 'sm' })}
                        {matchedClient.nama}
                      </strong>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <AlertCircle className="h-4 w-4" />
                    <span>Tidak ditemukan client dengan nomor ini (atau sudah terhubung)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setMatchedClient(null);
                setOpen(false);
              }}
              className="flex-1"
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Mendaftarkan..." : "Daftarkan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
