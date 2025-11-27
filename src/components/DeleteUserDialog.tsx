import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteUserDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DeleteUserDialog = ({ 
  userId, 
  userName, 
  userEmail, 
  userRole,
  open, 
  onOpenChange, 
  onSuccess 
}: DeleteUserDialogProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setStep(1);
    setEmailConfirmation("");
    onOpenChange(false);
  };

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleDelete = async () => {
    if (emailConfirmation !== userEmail) {
      toast({
        title: "Error",
        description: "Email tidak cocok",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const response = await supabase.functions.invoke("admin-delete-user", {
        body: {
          user_id: userId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Berhasil",
        description: "User berhasil dihapus",
      });

      handleClose();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Hapus User
              </DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus user berikut?
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold min-w-[80px]">👤 Nama:</span>
                <span>{userName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold min-w-[80px]">📧 Email:</span>
                <span>{userEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold min-w-[80px]">🔰 Role:</span>
                <span>{userRole || 'user'}</span>
              </div>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  PERINGATAN
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tindakan ini tidak dapat dibatalkan! Semua data user akan dihapus permanen.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Batal
              </Button>
              <Button 
                type="button"
                variant="destructive"
                onClick={handleFirstConfirm}
                className="flex-1"
              >
                Ya, Lanjutkan
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Konfirmasi Penghapusan
              </DialogTitle>
              <DialogDescription>
                Untuk mengkonfirmasi penghapusan, ketik ulang email user di bawah ini
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-mono text-center">{userEmail}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_confirm">Ketik email untuk konfirmasi</Label>
                <Input
                  id="email_confirm"
                  type="email"
                  value={emailConfirmation}
                  onChange={(e) => setEmailConfirmation(e.target.value)}
                  placeholder="Ketik email di sini"
                  className="font-mono"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                ⚠️ Tombol hapus akan aktif jika email cocok
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Kembali
              </Button>
              <Button 
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={emailConfirmation !== userEmail || loading}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {loading ? "Menghapus..." : "Hapus Permanen"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
