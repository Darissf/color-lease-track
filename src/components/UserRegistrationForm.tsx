import { useState } from "react";
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
import { UserPlus } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";

interface UserRegistrationData {
  full_name: string;
  username?: string;
  email?: string;
  password: string;
  nomor_telepon: string;
  role: string;
}

export const UserRegistrationForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<UserRegistrationData>();

  const selectedRole = watch("role");

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Daftarkan User Baru</DialogTitle>
          <DialogDescription>
            Isi form di bawah untuk mendaftarkan user baru ke sistem
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {...register("username")}
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
          </div>

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
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            {!selectedRole && (
              <p className="text-sm text-destructive">Role wajib dipilih</p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
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
