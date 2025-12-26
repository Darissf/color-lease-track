import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/currency";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface PaymentVerificationStatusProps {
  requestId: string;
  amountExpected: number;
  onClose: () => void;
  onVerified?: () => void;
}

type VerificationStatus = "pending" | "matched" | "expired";

export function PaymentVerificationStatus({
  requestId,
  amountExpected,
  onClose,
  onVerified,
}: PaymentVerificationStatusProps) {
  const [status, setStatus] = useState<VerificationStatus>("pending");
  const [secondsRemaining, setSecondsRemaining] = useState(180); // 3 minutes

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

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

    // Countdown timer
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (status === "pending") {
            setStatus("expired");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Fetch initial status
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("payment_confirmation_requests")
        .select("status, burst_expires_at")
        .eq("id", requestId)
        .single();
      
      if (data) {
        setStatus(data.status as VerificationStatus);
        
        if (data.burst_expires_at) {
          const expiresAt = new Date(data.burst_expires_at).getTime();
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
          setSecondsRemaining(remaining);
        }
      }
    };
    fetchStatus();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [requestId, status, onVerified, triggerConfetti]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      status === "matched" && "border-green-500 bg-green-50 dark:bg-green-950/20",
      status === "expired" && "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
      status === "pending" && "border-primary bg-primary/5"
    )}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {status === "pending" && (
              <>
                <div className="relative">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg">Menunggu Verifikasi...</p>
                  <p className="text-sm text-muted-foreground">
                    {formatRupiah(amountExpected)} • Waktu tersisa: {formatTime(secondsRemaining)}
                  </p>
                </div>
              </>
            )}
            
            {status === "matched" && (
              <>
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-green-700 dark:text-green-300">
                    Pembayaran Terverifikasi!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {formatRupiah(amountExpected)} berhasil dikonfirmasi
                  </p>
                </div>
              </>
            )}
            
            {status === "expired" && (
              <>
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-amber-700 dark:text-amber-300">
                    Belum Terdeteksi
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Pembayaran akan dicek berkala setiap 15 menit
                  </p>
                </div>
              </>
            )}
          </div>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {status === "pending" && (
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / 180) * 100}%` }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Sistem sedang memeriksa mutasi BCA...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
