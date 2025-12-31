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
  // Ref for countdown interval to prevent race conditions
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const triggerConfetti = useCallback(() => {
    const colors = ['#ff0000', '#ff7700', '#ffdd00', '#00ff00', '#00ddff', '#0077ff', '#7700ff', '#ff00ff', '#ff0077', '#ffffff'];
    const duration = 5000; // 5 detik efek confetti
    const end = Date.now() + duration;

    // 30 ledakan bersamaan dari bawah ke atas - full screen
    const burstCount = 30;
    for (let i = 0; i < burstCount; i++) {
      const xPos = i / (burstCount - 1); // Spread across full width (0 to 1)
      confetti({
        particleCount: 50,
        angle: 90, // Straight up
        spread: 60,
        origin: { x: xPos, y: 1 }, // From bottom
        colors: colors,
        ticks: 400,
        gravity: 0.6,
        scalar: 1.3,
        startVelocity: 55,
        drift: (Math.random() - 0.5) * 0.5,
      });
    }

    // Continuous confetti rain for 5 seconds
    const frame = () => {
      if (Date.now() > end) return;

      // Random bursts from bottom
      confetti({
        particleCount: 8,
        angle: 90 + (Math.random() - 0.5) * 30,
        spread: 50,
        origin: { x: Math.random(), y: 1 },
        colors: colors,
        ticks: 350,
        gravity: 0.5,
        scalar: 1.2,
        startVelocity: 45 + Math.random() * 20,
      });

      // Side cannons
      if (Math.random() > 0.5) {
        confetti({
          particleCount: 15,
          angle: Math.random() > 0.5 ? 60 : 120,
          spread: 70,
          origin: { x: Math.random() > 0.5 ? 0 : 1, y: 0.8 },
          colors: colors,
          ticks: 300,
          gravity: 0.7,
          startVelocity: 50,
        });
      }

      requestAnimationFrame(frame);
    };

    // Start continuous animation after initial burst
    setTimeout(frame, 100);

    // Additional massive waves
    setTimeout(() => {
      for (let i = 0; i < 15; i++) {
        confetti({
          particleCount: 40,
          angle: 90,
          spread: 80,
          origin: { x: Math.random(), y: 1 },
          colors: colors,
          ticks: 350,
          gravity: 0.5,
          scalar: 1.4,
          startVelocity: 60,
        });
      }
    }, 500);

    setTimeout(() => {
      for (let i = 0; i < 20; i++) {
        confetti({
          particleCount: 35,
          angle: 90,
          spread: 90,
          origin: { x: Math.random(), y: 1 },
          colors: colors,
          ticks: 400,
          gravity: 0.4,
          scalar: 1.5,
          startVelocity: 65,
        });
      }
    }, 1500);

    setTimeout(() => {
      for (let i = 0; i < 25; i++) {
        confetti({
          particleCount: 30,
          angle: 90,
          spread: 100,
          origin: { x: Math.random(), y: 1 },
          colors: colors,
          ticks: 450,
          gravity: 0.3,
          scalar: 1.6,
          startVelocity: 70,
        });
      }
    }, 3000);
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
            const newSecondsRemaining = Math.ceil(remaining / 1000);
            
            // Hanya update jika ini adalah lock baru (request_id berbeda) atau belum ada lock
            // Jangan override countdown yang sudah berjalan
            setGlobalLock(prev => {
              // Jika sudah locked dengan request yang sama, jangan override secondsRemaining
              // agar countdown lokal tetap berjalan
              if (prev.locked && prev.ownerRequestId === settings.burst_request_id) {
                // Hanya update isOwner jika berubah, jangan sentuh secondsRemaining
                return { ...prev, isOwner };
              }
              // Lock baru atau lock pertama kali
              return {
                locked: true,
                secondsRemaining: newSecondsRemaining,
                isOwner,
                ownerRequestId: settings.burst_request_id
              };
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

  // Global lock countdown effect with ref for reliable interval management
  useEffect(() => {
    // Clear existing interval first
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // Don't start if not locked or no remaining time
    if (!globalLock.locked || globalLock.secondsRemaining <= 0) {
      return;
    }
    
    console.log("[GlobalLock] Starting countdown from:", globalLock.secondsRemaining);
    
    // Start new countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setGlobalLock(prev => {
        const newSeconds = prev.secondsRemaining - 1;
        if (newSeconds <= 0) {
          // Clear interval when done
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return { locked: false, secondsRemaining: 0, isOwner: false };
        }
        return { ...prev, secondsRemaining: newSeconds };
      });
    }, 1000);
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [globalLock.locked, globalLock.secondsRemaining > 0]); // Trigger when locked or has remaining time

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
                    ) : (effectiveCooldown > 0 && !globalLock.isOwner) ? (
                      /* Non-owner harus tunggu - TIDAK BISA klik sama sekali */
                      <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                        <Clock className="h-3 w-3" />
                        <span>Tunggu {formatCooldown(effectiveCooldown)} untuk bisa transfer</span>
                      </div>
                    ) : (effectiveCooldown > 0 && globalLock.isOwner) ? (
                      /* Owner melihat countdown konfirmasi otomatis - menggunakan globalLock.secondsRemaining yang terupdate tiap detik */
                      <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border bg-muted/50 text-muted-foreground border-muted">
                        <Clock className="h-3 w-3 animate-pulse" />
                        <span>Silahkan tunggu maksimal {formatCooldown(Math.min(120, globalLock.secondsRemaining))} untuk mendapatkan konfirmasi otomatis.</span>
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
