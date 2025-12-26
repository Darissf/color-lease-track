import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/currency";
import { toast } from "sonner";
import { 
  CreditCard, 
  Loader2, 
  AlertCircle, 
  Clock, 
  Copy, 
  CheckCircle, 
  X,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface PendingRequest {
  id: string;
  unique_amount: number;
  unique_code: string;
  amount_expected: number;
  expires_at: string;
  created_by_role: string | null;
  status: string;
}

interface PublicPaymentRequestProps {
  accessCode: string;
  remainingAmount: number;
  pendingRequest: PendingRequest | null;
  onPaymentVerified?: () => void;
}

export function PublicPaymentRequest({
  accessCode,
  remainingAmount,
  pendingRequest: initialPendingRequest,
  onPaymentVerified,
}: PublicPaymentRequestProps) {
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(initialPendingRequest);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const minimumAmount = Math.ceil(remainingAmount * 0.5);

  // Subscribe to realtime updates for pending request
  useEffect(() => {
    if (!pendingRequest?.id) return;

    const channel = supabase
      .channel(`public-payment-${pendingRequest.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_confirmation_requests",
          filter: `id=eq.${pendingRequest.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === "matched") {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            toast.success("Pembayaran terverifikasi!");
            onPaymentVerified?.();
            setPendingRequest(null);
          } else if (newStatus === "cancelled" || newStatus === "expired") {
            setPendingRequest(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pendingRequest?.id, onPaymentVerified]);

  // Calculate time remaining
  useEffect(() => {
    if (!pendingRequest?.expires_at) return;

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(pendingRequest.expires_at).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining("Kedaluwarsa");
        setPendingRequest(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days} hari ${hours} jam`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} jam ${minutes} menit`);
      } else {
        setTimeRemaining(`${minutes} menit`);
      }
    };

    updateTimeRemaining();
    const timer = setInterval(updateTimeRemaining, 60000);

    return () => clearInterval(timer);
  }, [pendingRequest?.expires_at]);

  const formatInputValue = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, "");
    if (!numericValue) return "";
    return parseInt(numericValue).toLocaleString("id-ID");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatInputValue(e.target.value));
  };

  const copyAmount = async () => {
    if (!pendingRequest) return;
    try {
      await navigator.clipboard.writeText(pendingRequest.unique_amount.toString());
      setCopied(true);
      toast.success("Nominal disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  const handleGenerate = async () => {
    const parsedAmount = parseFloat(amount.replace(/[^\d]/g, ""));

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Masukkan nominal yang valid");
      return;
    }

    if (parsedAmount < minimumAmount) {
      toast.error(`Minimal pembayaran 50% (${formatRupiah(minimumAmount)})`);
      return;
    }

    if (parsedAmount > remainingAmount) {
      toast.error("Nominal melebihi sisa tagihan");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-payment-request", {
        body: {
          access_code: accessCode,
          amount_expected: parsedAmount,
          action: "create",
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Gagal membuat request");

      setPendingRequest({
        id: data.request_id,
        unique_amount: data.unique_amount,
        unique_code: data.unique_code,
        amount_expected: data.amount_expected,
        expires_at: data.expires_at,
        created_by_role: "user",
        status: "pending",
      });
      setAmount("");
      setIsGenerating(false);
      toast.success("Request pembayaran dibuat!");
    } catch (error: any) {
      console.error("Error creating payment request:", error);
      toast.error(error.message || "Gagal membuat request pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!pendingRequest) return;

    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-payment-request", {
        body: {
          access_code: accessCode,
          action: "cancel",
          request_id: pendingRequest.id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Gagal membatalkan request");

      setPendingRequest(null);
      toast.success("Request dibatalkan");
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      toast.error(error.message || "Gagal membatalkan request");
    } finally {
      setCancelling(false);
    }
  };

  // If there's a pending request, show the payment status
  if (pendingRequest) {
    return (
      <Card className="border-2 border-primary bg-primary/5">
        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Request Pembayaran Aktif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Berlaku: {timeRemaining}</span>
            <Badge variant="outline" className="text-[9px]">
              {pendingRequest.created_by_role === 'admin' || pendingRequest.created_by_role === 'super_admin' 
                ? 'Dibuat Admin' 
                : 'Dibuat Anda'}
            </Badge>
          </div>

          <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">
                  Nominal Transfer (wajib tepat)
                </p>
                <p className="text-xl sm:text-2xl font-bold text-primary break-all">
                  {formatRupiah(pendingRequest.unique_amount)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAmount}
                className="gap-1.5 shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Disalin!" : "Salin"}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Menunggu transfer masuk...</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="gap-1.5"
            >
              {cancelling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
              Batalkan
            </Button>
          </div>

          <div className="p-2.5 sm:p-3 bg-muted/50 rounded-lg">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              💡 Transfer nominal tepat di atas ke rekening yang tertera. 
              Pembayaran akan terverifikasi otomatis dalam beberapa menit.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show generate payment form
  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Bayar Tagihan
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-3 sm:space-y-4">
        {!isGenerating ? (
          <>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Verifikasi Pembayaran Otomatis
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    Generate nominal unik untuk transfer. Pembayaran Anda akan terverifikasi otomatis.
                  </p>
                </div>
              </div>
            </div>
            <Button 
              className="w-full" 
              onClick={() => {
                setIsGenerating(true);
                setAmount(remainingAmount.toLocaleString("id-ID"));
              }}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Generate Pembayaran
            </Button>
          </>
        ) : (
          <>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Cara Kerja:</p>
                  <ol className="text-blue-700 dark:text-blue-300 mt-1 list-decimal list-inside space-y-0.5">
                    <li>Masukkan nominal (min 50%)</li>
                    <li>Dapatkan nominal unik</li>
                    <li>Transfer tepat nominal tersebut</li>
                    <li>Otomatis terverifikasi!</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-amount" className="text-xs sm:text-sm">Nominal Transfer</Label>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-[10px] sm:text-xs"
                  onClick={() => setAmount(remainingAmount.toLocaleString("id-ID"))}
                >
                  Gunakan sisa tagihan
                </Button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  Rp
                </span>
                <Input
                  id="payment-amount"
                  className="pl-10 text-right text-base sm:text-lg font-semibold"
                  placeholder="0"
                  value={amount}
                  onChange={handleAmountChange}
                />
              </div>
              <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
                <span>Min: {formatRupiah(minimumAmount)} (50%)</span>
                <span>Max: {formatRupiah(remainingAmount)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsGenerating(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Dapatkan Nominal
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
