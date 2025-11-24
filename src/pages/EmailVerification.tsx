import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Shield } from "lucide-react";

export default function EmailVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-verification-email', {
        body: { email }
      });

      if (error) throw error;

      toast.success("Kode OTP telah dikirim ke email Anda");
      setStep('otp');
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('verify-email-otp', {
        body: { email, otp }
      });

      if (error) throw error;

      toast.success("Email berhasil diverifikasi!");
      navigate('/vip/dashboard');
    } catch (error: any) {
      toast.error(error.message || "Kode OTP tidak valid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'email' ? (
              <Mail className="w-8 h-8 text-primary" />
            ) : (
              <Shield className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold">Verifikasi Email</h1>
          <p className="text-muted-foreground mt-2">
            {step === 'email' 
              ? 'Masukkan email Anda untuk menerima kode verifikasi'
              : 'Masukkan kode OTP yang dikirim ke email Anda'
            }
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Kode OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <Label htmlFor="otp">Kode OTP (6 digit)</Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest font-bold"
                required
              />
              <p className="text-sm text-muted-foreground mt-2">
                Kode berlaku selama 15 menit
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
              {loading ? "Memverifikasi..." : "Verifikasi Email"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep('email')}
            >
              Kirim Ulang Kode
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Butuh bantuan? Hubungi administrator
          </p>
        </div>
      </Card>
    </div>
  );
}
