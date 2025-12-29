import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/currency";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertTriangle, Loader2, X, Copy, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface PaymentVerificationStatusProps {
  requestId: string;
  uniqueAmount: number;
  expiresAt: string;
  burstTriggeredAt?: string | null;
  onClose: () => void;
  onVerified?: () => void;
}

type VerificationStatus = "pending" | "matched" | "expired" | "cancelled";

export function PaymentVerificationStatus({
  requestId,
  uniqueAmount,
  expiresAt,
  burstTriggeredAt: initialBurstTriggeredAt,
  onClose,
  onVerified,
}: PaymentVerificationStatusProps) {
  const [status, setStatus] = useState<VerificationStatus>("pending");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [burstTriggeredAt, setBurstTriggeredAt] = useState<string | null>(initialBurstTriggeredAt || null);
  const [isConfirmingTransfer, setIsConfirmingTransfer] = useState(false);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const copyAmount = async () => {
    try {
      await navigator.clipboard.writeText(uniqueAmount.toString());
      setCopied(true);
      toast.success("Nominal disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("payment_confirmation_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", requestId);
      
      if (error) throw error;
      
      setStatus("cancelled");
      toast.success("Request dibatalkan");
    } catch (err) {
      console.error("Failed to cancel request:", err);
      toast.error("Gagal membatalkan request");
    } finally {
      setCancelling(false);
    }
  };

  // Manual trigger burst scrape when user confirms transfer
  const handleConfirmTransfer = async () => {
    if (cooldownRemaining > 0 || isConfirmingTransfer) return;
    
    setIsConfirmingTransfer(true);
    try {
      console.log("[PaymentVerification] Triggering burst scrape...");
      const { data, error } = await supabase.functions.invoke("trigger-burst-scrape", {
        body: { request_id: requestId }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Gagal memicu pengecekan");
      
      setBurstTriggeredAt(new Date().toISOString());
      toast.success("Pengecekan dipercepat diaktifkan! Sistem akan memverifikasi pembayaran Anda.");
    } catch (err: any) {
      console.error("Failed to trigger burst scrape:", err);
      toast.error(err.message || "Gagal mengaktifkan pengecekan cepat");
    } finally {
      setIsConfirmingTransfer(false);
    }
  };

  // Calculate cooldown remaining (2 minutes)
  useEffect(() => {
    if (!burstTriggeredAt) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const triggeredAt = new Date(burstTriggeredAt).getTime();
      const now = Date.now();
      const cooldownMs = 2 * 60 * 1000; // 2 minutes
      const elapsed = now - triggeredAt;
      const remaining = Math.max(0, cooldownMs - elapsed);
      setCooldownRemaining(Math.ceil(remaining / 1000));
    };

    updateCooldown();
    const timer = setInterval(updateCooldown, 1000);

    return () => clearInterval(timer);
  }, [burstTriggeredAt]);

  // Format cooldown remaining as MM:SS
  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`payment-request-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_confirmation_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as VerificationStatus;
          setStatus(newStatus);
          
          if (newStatus === "matched") {
            triggerConfetti();
            toast.success("Pembayaran terverifikasi!");
            onVerified?.();
          }
        }
      )
      .subscribe();

    // Calculate time remaining
    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining("Kedaluwarsa");
        if (status === "pending") {
          setStatus("expired");
        }
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
    const timer = setInterval(updateTimeRemaining, 60000); // Update every minute

    // Fetch initial status
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("payment_confirmation_requests")
        .select("status, expires_at, unique_amount, burst_triggered_at")
        .eq("id", requestId)
        .single();
      
      if (data) {
        setStatus(data.status as VerificationStatus);
        if (data.burst_triggered_at) {
          setBurstTriggeredAt(data.burst_triggered_at);
        }
      }
    };
    fetchStatus();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [requestId, expiresAt, status, onVerified, triggerConfetti]);

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      status === "matched" && "border-green-500 bg-green-50 dark:bg-green-950/20",
      status === "expired" && "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
      status === "cancelled" && "border-muted bg-muted/20",
      status === "pending" && "border-primary bg-primary/5"
    )}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {status === "pending" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Transfer Tepat Nominal Ini</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Berlaku: {timeRemaining}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Nominal Transfer (wajib tepat)</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatRupiah(uniqueAmount)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyAmount}
                      className="gap-2"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? "Disalin!" : "Salin"}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menunggu transfer masuk...</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {cooldownRemaining > 0 ? (
                      <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm">
                        <Clock className="h-3 w-3" />
                        Tunggu {formatCooldown(cooldownRemaining)}
                      </div>
                    ) : burstTriggeredAt ? (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleConfirmTransfer}
                        disabled={isConfirmingTransfer}
                        className="gap-1.5 bg-green-600 hover:bg-green-700 flex-1"
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
                        className="gap-1.5 bg-green-600 hover:bg-green-700 flex-1"
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
                </div>
              </div>
            )}
            
            {status === "matched" && (
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-green-700 dark:text-green-300">
                    Pembayaran Terverifikasi!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {formatRupiah(uniqueAmount)} berhasil dikonfirmasi
                  </p>
                </div>
              </div>
            )}
            
            {status === "expired" && (
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-amber-700 dark:text-amber-300">
                    Request Kedaluwarsa
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Silakan buat request baru jika belum transfer
                  </p>
                </div>
              </div>
            )}

            {status === "cancelled" && (
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-muted">
                  <X className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-muted-foreground">
                    Request Dibatalkan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Request ini sudah tidak berlaku
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
