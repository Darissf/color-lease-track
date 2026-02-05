import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Search, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MassDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onDeleted: () => void;
}

export function MassDeleteDialog({
  open,
  onOpenChange,
  userId,
  onDeleted,
}: MassDeleteDialogProps) {
  const { toast } = useToast();
  const [fromAddress, setFromAddress] = useState("");
  const [emailCount, setEmailCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleCheck = async () => {
    if (!fromAddress.trim()) {
      toast({
        title: "Error",
        description: "Masukkan alamat email pengirim",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { count, error } = await supabase
        .from("mail_inbox")
        .select("*", { count: "exact", head: true })
        .eq("from_address", fromAddress.trim().toLowerCase())
        .eq("is_deleted", false);

      if (error) throw error;

      setEmailCount(count || 0);
      setChecked(true);
    } catch (error) {
      console.error("Error checking emails:", error);
      toast({
        title: "Error",
        description: "Gagal memeriksa email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMassDelete = async () => {
    if (!fromAddress.trim() || emailCount === 0) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("mail_inbox")
        .update({
          is_deleted: true,
          deleted_by: userId,
          deleted_at: new Date().toISOString(),
        })
        .eq("from_address", fromAddress.trim().toLowerCase())
        .eq("is_deleted", false);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `${emailCount} email dari ${fromAddress} berhasil dihapus`,
      });

      // Reset state and close dialog
      resetState();
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      console.error("Error mass deleting emails:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus email",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const resetState = () => {
    setFromAddress("");
    setEmailCount(null);
    setChecked(false);
    setLoading(false);
    setDeleting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Mass Delete Email
          </DialogTitle>
          <DialogDescription>
            Hapus semua email dari pengirim tertentu sekaligus. Masukkan alamat
            email pengirim untuk melihat preview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="from_address">Alamat Email Pengirim</Label>
            <div className="flex gap-2">
              <Input
                id="from_address"
                placeholder="contoh: noreply@lovable.dev"
                value={fromAddress}
                onChange={(e) => {
                  setFromAddress(e.target.value);
                  setChecked(false);
                  setEmailCount(null);
                }}
                disabled={loading || deleting}
              />
              <Button
                variant="secondary"
                onClick={handleCheck}
                disabled={loading || deleting || !fromAddress.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {checked && emailCount !== null && (
            <Alert variant={emailCount > 0 ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {emailCount > 0 ? (
                  <>
                    Ditemukan <strong>{emailCount} email</strong> dari{" "}
                    <strong>{fromAddress}</strong> yang akan dihapus.
                  </>
                ) : (
                  <>
                    Tidak ada email dari <strong>{fromAddress}</strong> yang
                    ditemukan.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleting}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleMassDelete}
            disabled={!checked || emailCount === 0 || deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus Semua ({emailCount || 0})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
