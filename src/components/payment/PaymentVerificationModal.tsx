import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/currency";
import { toast } from "sonner";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";

interface PaymentVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  customerName: string;
  remainingAmount: number;
  onSuccess: (requestId: string) => void;
}

export function PaymentVerificationModal({
  open,
  onOpenChange,
  contractId,
  customerName,
  remainingAmount,
  onSuccess,
}: PaymentVerificationModalProps) {
  const [amount, setAmount] = useState(remainingAmount.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount.replace(/[^\d]/g, ""));
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Masukkan nominal yang valid");
      return;
    }

    if (parsedAmount > remainingAmount) {
      toast.error("Nominal melebihi sisa tagihan");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bca-request-payment-check", {
        body: {
          contract_id: contractId,
          customer_name: customerName,
          amount_expected: parsedAmount,
        }
      });

      if (error) throw error;

      toast.success("Permintaan verifikasi dikirim!");
      onSuccess(data.request_id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error requesting payment check:", error);
      toast.error(error.message || "Gagal mengirim permintaan verifikasi");
    } finally {
      setLoading(false);
    }
  };

  const formatInputValue = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, "");
    if (!numericValue) return "";
    return parseInt(numericValue).toLocaleString("id-ID");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInputValue(e.target.value);
    setAmount(formatted);
  };

  const setFullAmount = () => {
    setAmount(remainingAmount.toLocaleString("id-ID"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Konfirmasi Transfer
          </DialogTitle>
          <DialogDescription>
            Masukkan nominal yang sudah Anda transfer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Pastikan Anda sudah transfer!
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Sistem akan memverifikasi pembayaran Anda dalam waktu maksimal 3 menit.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Nominal Transfer</Label>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-xs"
                onClick={setFullAmount}
              >
                Gunakan sisa tagihan
              </Button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                Rp
              </span>
              <Input
                id="amount"
                className="pl-10 text-right text-lg font-semibold"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Sisa tagihan: {formatRupiah(remainingAmount)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Konfirmasi Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
