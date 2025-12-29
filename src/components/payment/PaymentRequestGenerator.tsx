import { useState, useEffect, useCallback, useRef } from "react";
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
  Wallet,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface PendingRequest {
  id: string;
  unique_amount: number;
  unique_code: string;
  amount_expected: number;
  expires_at: string;
  created_at?: string;
  created_by_role: string | null;
  status: string;
  burst_triggered_at?: string | null;
}

interface BankInfo {
  bank_name: string;
  account_number: string;
  account_holder_name?: string;
}

interface PaymentRequestGeneratorProps {
  // For public link mode (accessCode provided)
  accessCode?: string;
  // For internal mode (contractId + customerName provided)
  contractId?: string;
  customerName?: string;
  
  remainingAmount: number;
  pendingRequest?: PendingRequest | null;
  onPaymentVerified?: () => void;
  bankInfo?: BankInfo;
  
  // For card display
  showCard?: boolean;
  cardTitle?: string;
}

export function PaymentRequestGenerator({
  accessCode,
  contractId,
  customerName,
  remainingAmount,
  pendingRequest: initialPendingRequest,
  onPaymentVerified,
  bankInfo,
  showCard = true,
  cardTitle = "Bayar Tagihan",
}: PaymentRequestGeneratorProps) {
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(initialPendingRequest || null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirmingTransfer, setIsConfirmingTransfer] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [cancelCooldownRemaining, setCancelCooldownRemaining] = useState(0);
  
  // Use ref to track confetti state to avoid stale closure and dependency issues
  const hasTriggeredConfettiRef = useRef(false);

  const minimumAmount = Math.ceil(remainingAmount * 0.5);
  const isPublicMode = !!accessCode;

  // Reset hasTriggeredConfettiRef when pendingRequest changes
  useEffect(() => {
    if (!pendingRequest?.id) {
      hasTriggeredConfettiRef.current = false;
    }
  }, [pendingRequest?.id]);

  // Subscribe to realtime updates for pending request
  useEffect(() => {
    if (!pendingRequest?.id) return;

    const channel = supabase
      .channel(`payment-request-${pendingRequest.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_confirmation_requests",
          filter: `id=eq.${pendingRequest.id}`,
        },
        async (payload) => {
          console.log("[Realtime] Payment request updated - raw payload:", payload);
          
          let newStatus = payload.new?.status;
          console.log("[Realtime] Status from payload:", newStatus);
          
          // Fallback: refetch if status is missing from payload
          if (!newStatus && payload.new?.id) {
            console.log("[Realtime] Status missing, refetching from database...");
            const { data } = await supabase
              .from("payment_confirmation_requests")
              .select("status")
              .eq("id", payload.new.id)
              .single();
            newStatus = data?.status;
            console.log("[Realtime] Refetched status:", newStatus);
          }
          
          // Use ref to check confetti state (avoids stale closure)
          if (newStatus === "matched" && !hasTriggeredConfettiRef.current) {
            console.log("[Realtime] Status matched! Triggering confetti NOW!");
            hasTriggeredConfettiRef.current = true;
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            toast.success("Pembayaran terverifikasi!");
            onPaymentVerified?.();
            setPendingRequest(null);
          } else if (newStatus === "cancelled" || newStatus === "expired") {
            setPendingRequest(null);
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
      });

    // Check if initial pendingRequest status is already matched (for page refresh scenario)
    if (initialPendingRequest?.status === "matched" && !hasTriggeredConfettiRef.current) {
      hasTriggeredConfettiRef.current = true;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast.success("Pembayaran terverifikasi!");
      onPaymentVerified?.();
      setPendingRequest(null);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pendingRequest?.id, onPaymentVerified, initialPendingRequest?.status]); // Removed hasTriggeredConfetti from deps

  // Calculate time remaining for expiry
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

  // Calculate cooldown remaining for burst trigger (2 minutes)
  useEffect(() => {
    if (!pendingRequest?.burst_triggered_at) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const triggeredAt = new Date(pendingRequest.burst_triggered_at!).getTime();
      const now = Date.now();
      const cooldownMs = 2 * 60 * 1000; // 2 minutes
      const elapsed = now - triggeredAt;
      const remaining = Math.max(0, cooldownMs - elapsed);
      setCooldownRemaining(Math.ceil(remaining / 1000));
    };

    updateCooldown();
    const timer = setInterval(updateCooldown, 1000);

    return () => clearInterval(timer);
  }, [pendingRequest?.burst_triggered_at]);

  // Calculate cancel cooldown remaining (2 minutes from created_at)
  useEffect(() => {
    if (!pendingRequest?.created_at) {
      setCancelCooldownRemaining(0);
      return;
    }

    const updateCancelCooldown = () => {
      const createdAt = new Date(pendingRequest.created_at!).getTime();
      const now = Date.now();
      const cooldownMs = 2 * 60 * 1000; // 2 minutes
      const elapsed = now - createdAt;
      const remaining = Math.max(0, cooldownMs - elapsed);
      setCancelCooldownRemaining(Math.ceil(remaining / 1000));
    };

    updateCancelCooldown();
    const timer = setInterval(updateCancelCooldown, 1000);

    return () => clearInterval(timer);
  }, [pendingRequest?.created_at]);

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

  const copyAccountNumber = async () => {
    if (!bankInfo) return;
    try {
      await navigator.clipboard.writeText(bankInfo.account_number);
      setCopiedAccount(true);
      toast.success("No. rekening disalin!");
      setTimeout(() => setCopiedAccount(false), 2000);
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
      let data, error;

      if (isPublicMode) {
        // Use public-payment-request for public links
        const result = await supabase.functions.invoke("public-payment-request", {
          body: {
            access_code: accessCode,
            amount_expected: parsedAmount,
            action: "create",
          },
        });
        data = result.data;
        error = result.error;
      } else {
        // Use bca-request-payment-check for internal pages
        const result = await supabase.functions.invoke("bca-request-payment-check", {
          body: {
            contract_id: contractId,
            customer_name: customerName || "Customer",
            amount_expected: parsedAmount,
          },
        });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      if (!data?.success && isPublicMode) throw new Error(data?.error || "Gagal membuat request");

      setPendingRequest({
        id: data.request_id,
        unique_amount: data.unique_amount,
        unique_code: data.unique_code || "",
        amount_expected: data.amount_expected || parsedAmount,
        expires_at: data.expires_at,
        created_at: data.created_at || new Date().toISOString(),
        created_by_role: isPublicMode ? "user" : "admin",
        status: "pending",
        burst_triggered_at: data.burst_triggered_at || null,
      });
      setAmount("");
      setIsGenerating(false);
      setCooldownRemaining(0);
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
      if (isPublicMode) {
        // Use public-payment-request for public links
        const { data, error } = await supabase.functions.invoke("public-payment-request", {
          body: {
            access_code: accessCode,
            action: "cancel",
            request_id: pendingRequest.id,
          },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Gagal membatalkan request");
      } else {
        // Direct update for internal pages
        const { error } = await supabase
          .from("payment_confirmation_requests")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", pendingRequest.id);
        if (error) throw error;
      }

      setPendingRequest(null);
      setCooldownRemaining(0);
      toast.success("Request dibatalkan");
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      toast.error(error.message || "Gagal membatalkan request");
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!pendingRequest || cooldownRemaining > 0) return;

    setIsConfirmingTransfer(true);
    try {
      const { data, error } = await supabase.functions.invoke("trigger-burst-scrape", {
        body: { request_id: pendingRequest.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Gagal memicu pengecekan");

      // Update local state with new burst_triggered_at
      setPendingRequest(prev => prev ? {
        ...prev,
        burst_triggered_at: new Date().toISOString()
      } : null);
      
      toast.success("Pengecekan dipercepat! Pembayaran akan diverifikasi dalam 1-2 menit.", {
        duration: 5000,
      });
    } catch (error: any) {
      console.error("Error triggering burst mode:", error);
      toast.error(error.message || "Gagal memicu pengecekan cepat");
    } finally {
      setIsConfirmingTransfer(false);
    }
  };

  // Format cooldown remaining as MM:SS
  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render pending request view
  const renderPendingView = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        <span>Berlaku: {timeRemaining}</span>
        {pendingRequest?.created_by_role && (
          <Badge variant="outline" className="text-[9px]">
            {pendingRequest.created_by_role === 'admin' || pendingRequest.created_by_role === 'super_admin' 
              ? 'Dibuat Admin' 
              : 'Dibuat Anda'}
          </Badge>
        )}
      </div>

      <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">
              Nominal Transfer (wajib tepat)
            </p>
            <p className="text-xl sm:text-2xl font-bold text-primary break-all">
              {formatRupiah(pendingRequest?.unique_amount || 0)}
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

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Menunggu transfer masuk...</span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {cooldownRemaining > 0 ? (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              <Clock className="h-3 w-3" />
              Tunggu {formatCooldown(cooldownRemaining)}
            </Badge>
          ) : pendingRequest?.burst_triggered_at ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmTransfer}
              disabled={isConfirmingTransfer}
              className="gap-1.5 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
            >
              {isConfirmingTransfer ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              Cek Ulang Pembayaran
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmTransfer}
              disabled={isConfirmingTransfer}
              className="gap-1.5 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
            >
              {isConfirmingTransfer ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              Saya Sudah Transfer
            </Button>
          )}
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling || cancelCooldownRemaining > 0}
            className="gap-1.5"
          >
            {cancelling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : cancelCooldownRemaining > 0 ? (
              <Clock className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {cancelCooldownRemaining > 0 ? `Batalkan (${formatCooldown(cancelCooldownRemaining)})` : "Batalkan"}
          </Button>
        </div>
      </div>

      {/* Bank Info - Only shown when pending request is active */}
      {bankInfo && (
        <div className="p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2.5 sm:space-y-3">
          <div className="text-xs sm:text-sm font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4 flex-shrink-0" />
            Transfer ke Rekening:
          </div>
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
              <span className="text-muted-foreground text-xs sm:text-sm">Bank</span>
              <span className="font-medium text-sm">{bankInfo.bank_name}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
              <span className="text-muted-foreground text-xs sm:text-sm">No. Rekening</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-sm break-all">{bankInfo.account_number}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 sm:h-7 sm:w-7 flex-shrink-0"
                  onClick={copyAccountNumber}
                >
                  {copiedAccount ? (
                    <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  )}
                </Button>
              </div>
            </div>
            {bankInfo.account_holder_name && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                <span className="text-muted-foreground text-xs sm:text-sm">Atas Nama</span>
                <span className="font-medium text-sm">{bankInfo.account_holder_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-2.5 sm:p-3 bg-muted/50 rounded-lg">
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          💡 Transfer nominal tepat di atas ke rekening yang tertera. 
          Pembayaran akan terverifikasi otomatis dalam beberapa menit.
        </p>
      </div>
    </div>
  );

  // Render generate form view
  const renderGenerateFormView = () => (
    <div className="space-y-3 sm:space-y-4">
      {!isGenerating ? (
        <>
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Cara Bayar dengan Verifikasi Otomatis
                </p>
                <ol className="text-blue-700 dark:text-blue-300 mt-1 list-decimal list-inside space-y-0.5">
                  <li>Klik "Generate Pembayaran" di bawah</li>
                  <li>Masukkan nominal yang ingin ditransfer (min 50%)</li>
                  <li>Sistem akan memberikan nominal unik + info rekening</li>
                  <li>Transfer tepat nominal tersebut ke rekening yang tertera</li>
                  <li>Pembayaran terverifikasi otomatis dalam beberapa menit!</li>
                </ol>
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
    </div>
  );

  // Main render
  const content = pendingRequest ? renderPendingView() : renderGenerateFormView();

  if (!showCard) {
    return content;
  }

  // If there's a pending request, show with different styling
  if (pendingRequest) {
    return (
      <Card className="border-2 border-primary bg-primary/5">
        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Request Pembayaran Aktif
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {content}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          {cardTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {content}
      </CardContent>
    </Card>
  );
}
