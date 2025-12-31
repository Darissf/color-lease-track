import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/currency";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertTriangle, Loader2, X, Copy, CreditCard, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface PaymentVerificationStatusProps {
  requestId: string;
  uniqueAmount: number;
  expiresAt: string;
  createdAt?: string;
  burstTriggeredAt?: string | null;
  onClose: () => void;
  onVerified?: () => void;
}

type VerificationStatus = "pending" | "matched" | "expired" | "cancelled";

// Global cooldown: 6 minutes (must match edge function)
const GLOBAL_COOLDOWN_MS = 6 * 60 * 1000;

export function PaymentVerificationStatus({
  requestId,
  uniqueAmount,
  expiresAt,
  createdAt: initialCreatedAt,
  burstTriggeredAt: initialBurstTriggeredAt,
  onClose,
  onVerified,
}: PaymentVerificationStatusProps) {
  const [status, setStatus] = useState<VerificationStatus>("pending");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  
  // Global lock state
  const [globalLock, setGlobalLock] = useState<{
    locked: boolean;
    secondsRemaining: number;
    isOwner: boolean;
    ownerRequestId?: string;
  }>({ locked: false, secondsRemaining: 0, isOwner: false });
  
  // Loading state for initial global lock fetch - default TRUE to block button until fetch completes
  const [isLoadingGlobalLock, setIsLoadingGlobalLock] = useState(true);
  
  const [burstTriggeredAt, setBurstTriggeredAt] = useState<string | null>(initialBurstTriggeredAt || null);
  const [createdAt, setCreatedAt] = useState<string | null>(initialCreatedAt || null);
  const [isConfirmingTransfer, setIsConfirmingTransfer] = useState(false);
  
  // Use ref to track confetti state to avoid stale closure and dependency issues
  const hasTriggeredConfettiRef = useRef(false);

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
    // Block if still loading, global lock active (non-owner), or cooldown
    if (isLoadingGlobalLock || isConfirmingTransfer) return;
    
    if (globalLock.secondsRemaining > 0 && !globalLock.isOwner) {
      toast.error("Ada pengecekan dari user lain. Tunggu hingga selesai.");
      return;
    }
    
    if (globalLock.secondsRemaining > 0 || cooldownRemaining > 0) return;
    
    setIsConfirmingTransfer(true);
    try {
      console.log("[PaymentVerification] Triggering burst scrape...");
      const { data, error } = await supabase.functions.invoke("trigger-burst-scrape", {
        body: { request_id: requestId }
      });
      
      if (error) throw error;
      
      // Handle global lock response
      if (!data?.success && data?.global_locked) {
        const isOwner = data.burst_request_id === requestId;
        setGlobalLock({
          locked: true,
          secondsRemaining: data.seconds_remaining || 360,
          isOwner,
          ownerRequestId: data.burst_request_id
        });
        if (!isOwner) {
          toast.error("Ada pengecekan dari user lain. Tunggu hingga selesai.");
        } else {
          toast.info("Pengecekan sedang berjalan, mohon tunggu.");
        }
        return;
      }
      
      if (!data?.success) throw new Error(data?.error || "Gagal memicu pengecekan");
      
      setBurstTriggeredAt(new Date().toISOString());
      
      // Set global lock on success (6 minutes) - this user is the owner
      if (data?.burst_global_locked_at) {
        setGlobalLock({
          locked: true,
          secondsRemaining: data.global_cooldown_seconds || 360,
          isOwner: true,
          ownerRequestId: requestId
        });
      }
      
      toast.success("Pengecekan dipercepat diaktifkan! Sistem akan memverifikasi pembayaran Anda.");
    } catch (err: any) {
      console.error("Failed to trigger burst scrape:", err);
      toast.error(err.message || "Gagal mengaktifkan pengecekan cepat");
    } finally {
      setIsConfirmingTransfer(false);
    }
  };

  // Fetch global lock status on mount, periodic refetch, and subscribe to changes
  useEffect(() => {
    let isMounted = true;

    const fetchGlobalLock = async (showLoading = false) => {
      if (showLoading) setIsLoadingGlobalLock(true);
      try {
        const { data: settings } = await supabase
          .from("payment_provider_settings")
          .select("burst_global_locked_at, burst_request_id")
          .eq("provider", "vps_scraper")
          .eq("is_active", true)
          .maybeSingle();

        if (!isMounted) return;

        if (settings?.burst_global_locked_at) {
          const lockedAt = new Date(settings.burst_global_locked_at).getTime();
          const remaining = Math.max(0, GLOBAL_COOLDOWN_MS - (Date.now() - lockedAt));
          if (remaining > 0) {
            const isOwner = settings.burst_request_id === requestId;
            setGlobalLock({
              locked: true,
              secondsRemaining: Math.ceil(remaining / 1000),
              isOwner,
              ownerRequestId: settings.burst_request_id
            });
          } else {
            setGlobalLock({ locked: false, secondsRemaining: 0, isOwner: false });
          }
        } else {
          setGlobalLock({ locked: false, secondsRemaining: 0, isOwner: false });
        }
      } catch (error) {
        console.error("[GlobalLock] Fetch error:", error);
      } finally {
        if (isMounted && showLoading) setIsLoadingGlobalLock(false);
      }
    };

    // Initial fetch with loading state
    fetchGlobalLock(true);

    // Periodic refetch every 2 seconds (without loading indicator for smooth UX)
    const refetchInterval = setInterval(() => fetchGlobalLock(false), 2000);

    // Subscribe to realtime updates for global lock (as backup)
    const settingsChannel = supabase
      .channel('global-burst-lock-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payment_provider_settings',
        },
        () => fetchGlobalLock(false)
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(refetchInterval);
      supabase.removeChannel(settingsChannel);
    };
  }, [requestId]);

  // Global lock countdown effect
  useEffect(() => {
    if (!globalLock.locked || globalLock.secondsRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setGlobalLock(prev => {
        const newSeconds = prev.secondsRemaining - 1;
        if (newSeconds <= 0) {
          return { locked: false, secondsRemaining: 0, isOwner: false };
        }
        return { ...prev, secondsRemaining: newSeconds };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [globalLock.locked, globalLock.secondsRemaining]);

  // Calculate individual cooldown remaining (2 minutes)
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

  // Reset hasTriggeredConfettiRef when requestId changes
  useEffect(() => {
    hasTriggeredConfettiRef.current = false;
  }, [requestId]);

  // Polling fallback for reliable status checking (3 seconds interval)
  useEffect(() => {
    if (status !== "pending") return;

    console.log("[Polling] Starting polling for requestId:", requestId);

    const pollStatus = async () => {
      if (hasTriggeredConfettiRef.current) {
        console.log("[Polling] Skipping - confetti already triggered");
        return;
      }

      try {
        const { data } = await supabase
          .from("payment_confirmation_requests")
          .select("status")
          .eq("id", requestId)
          .single();

        console.log("[Polling] Status:", data?.status);

        if (data?.status && data.status !== status) {
          setStatus(data.status as VerificationStatus);

          if (data.status === "matched" && !hasTriggeredConfettiRef.current) {
            console.log("[Polling] Status matched! Triggering confetti!");
            hasTriggeredConfettiRef.current = true;
            triggerConfetti();
            toast.success("Pembayaran terverifikasi!");
            onVerified?.();
          }
        }
      } catch (err) {
        console.error("[Polling] Error:", err);
      }
    };

    // Initial check after 500ms
    const initialTimeout = setTimeout(pollStatus, 500);
    // Poll every 3 seconds
    const pollInterval = setInterval(pollStatus, 3000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(pollInterval);
    };
  }, [requestId, status, triggerConfetti, onVerified]);

  useEffect(() => {
    // Subscribe to realtime updates (as backup)
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
        async (payload) => {
          console.log("[Realtime] Payment request updated - raw payload:", payload);
          
          let newStatus = payload.new?.status as VerificationStatus;
          console.log("[Realtime] Status from payload:", newStatus);
          
          // Fallback: refetch if status is missing from payload
          if (!newStatus && payload.new?.id) {
            console.log("[Realtime] Status missing, refetching from database...");
            const { data } = await supabase
              .from("payment_confirmation_requests")
              .select("status")
              .eq("id", payload.new.id)
              .single();
            newStatus = data?.status as VerificationStatus;
            console.log("[Realtime] Refetched status:", newStatus);
          }
          
          if (newStatus) {
            setStatus(newStatus);
          }
          
          // Use ref to check confetti state (avoids stale closure)
          if (newStatus === "matched" && !hasTriggeredConfettiRef.current) {
            console.log("[Realtime] Status matched! Triggering confetti NOW!");
            hasTriggeredConfettiRef.current = true;
            triggerConfetti();
            toast.success("Pembayaran terverifikasi!");
            onVerified?.();
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
      });

    // Calculate time remaining
    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining("Kedaluwarsa");
        setStatus(prev => prev === "pending" ? "expired" : prev);
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
        .select("status, expires_at, unique_amount, burst_triggered_at, created_at, updated_at")
        .eq("id", requestId)
        .single();
      
      if (data) {
        setStatus(data.status as VerificationStatus);
        if (data.burst_triggered_at) {
          setBurstTriggeredAt(data.burst_triggered_at);
        }
        if (data.created_at) {
          setCreatedAt(data.created_at);
        }
        
        // Trigger confetti if status is matched and recently updated (within 30 seconds)
        if (data.status === "matched" && data.updated_at && !hasTriggeredConfettiRef.current) {
          const updatedAt = new Date(data.updated_at).getTime();
          const now = Date.now();
          const isRecentMatch = (now - updatedAt) < 30 * 1000; // 30 seconds
          
          if (isRecentMatch) {
            hasTriggeredConfettiRef.current = true;
            triggerConfetti();
            toast.success("Pembayaran terverifikasi!");
            onVerified?.();
          }
        }
      }
    };
    fetchStatus();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [requestId, expiresAt, onVerified, triggerConfetti]); // Removed status and hasTriggeredConfetti from deps

  // Determine which cooldown to show (global takes precedence)
  const effectiveCooldown = globalLock.secondsRemaining > 0 ? globalLock.secondsRemaining : cooldownRemaining;
  const isGlobalLocked = globalLock.secondsRemaining > 0;

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

                {/* Warning - SELALU muncul */}
                <div className="flex items-start gap-2 px-3 py-2 rounded-md text-sm border bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Transfer dulu sebelum klik!</span>
                    <p className="text-xs opacity-80 mt-0.5">
                      Pastikan Anda sudah transfer SEBELUM klik tombol ini agar pengecekan bisa dilakukan otomatis, terimakasih.
                    </p>
                  </div>
                </div>

                {/* Warning untuk non-owner saat global lock */}
                {isGlobalLocked && !globalLock.isOwner && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-md text-sm border bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">JANGAN TRANSFER DULU!</span>
                      <p className="text-xs opacity-80 mt-0.5">
                        Ada proses pengecekan dari user lain. Jangan transfer sampai tombol tersedia lagi dalam {formatCooldown(effectiveCooldown)}.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {/* Loading state - wait for global lock fetch */}
                    {isLoadingGlobalLock ? (
                      <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border bg-muted/50 text-muted-foreground border-muted">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Mengecek status...</span>
                      </div>
                    ) : effectiveCooldown > 0 ? (
                      <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border bg-muted/50 text-muted-foreground border-muted">
                        <Clock className="h-3 w-3" />
                        <span>Tunggu {formatCooldown(effectiveCooldown)} untuk cek ulang</span>
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
