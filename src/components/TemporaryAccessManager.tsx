import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { KeyRound, Copy } from "lucide-react";

interface TempAccessManagerProps {
  userId: string;
  userName: string;
}

export function TemporaryAccessManager({ userId, userName }: TempAccessManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiryHours, setExpiryHours] = useState("24");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-temp-access', {
        body: {
          userId,
          expiryHours: parseInt(expiryHours)
        }
      });

      if (error) throw error;

      setGeneratedCode(data.code);
      toast.success("Kode akses berhasil dibuat dan dikirim via WhatsApp");
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat kode akses");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.success("Kode berhasil disalin");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setGeneratedCode(null);
    setExpiryHours("24");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="w-4 h-4 mr-2" />
          Buat Kode Akses
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Kode Akses Sementara</DialogTitle>
          <DialogDescription>
            Untuk: {userName}
          </DialogDescription>
        </DialogHeader>

        {generatedCode ? (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-sm text-muted-foreground">Kode Akses</Label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-background p-3 rounded border text-sm font-mono break-all">
                  {generatedCode}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>✓ Kode telah dikirim ke WhatsApp user</p>
              <p>✓ User akan diminta mengganti password setelah login</p>
              <p>✓ Kode berlaku selama {expiryHours} jam</p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Selesai
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="expiryHours">Masa Berlaku</Label>
              <Select value={expiryHours} onValueChange={setExpiryHours}>
                <SelectTrigger id="expiryHours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Jam</SelectItem>
                  <SelectItem value="6">6 Jam</SelectItem>
                  <SelectItem value="12">12 Jam</SelectItem>
                  <SelectItem value="24">24 Jam</SelectItem>
                  <SelectItem value="48">48 Jam</SelectItem>
                  <SelectItem value="72">72 Jam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Kode akan dikirim via WhatsApp</p>
              <p>• User harus mengganti password setelah login</p>
              <p>• Kode hanya bisa digunakan sekali</p>
            </div>

            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading ? "Membuat..." : "Buat Kode Akses"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
