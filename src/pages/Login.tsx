import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";

export default function Login() {
  const [identifier, setIdentifier] = useState(""); // email or phone
  const [password, setPassword] = useState("");
  const [tempCode, setTempCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTempCodeInput, setShowTempCodeInput] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  
  // Forgot Password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let loginEmail = identifier;
      
      // If not an email format, lookup by phone or username
      if (!identifier.includes('@')) {
        const { data, error } = await supabase.functions.invoke('get-user-by-phone', {
          body: { identifier }
        });
        
        if (error || !data?.email) {
          const isPhone = /^[0-9+\-\s()]+$/.test(identifier);
          throw new Error(
            isPhone 
              ? "Nomor telepon tidak terdaftar" 
              : "Username tidak terdaftar"
          );
        }
        
        loginEmail = data.email;
      }

      // Attempt login
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
      });

      if (signInError) throw signInError;

      // Check if 2FA is enabled
      const { data: profile } = await supabase
        .from('profiles')
        .select('two_factor_enabled, email_verified, temp_email')
        .eq('id', authData.user.id)
        .single();

      if (profile?.two_factor_enabled) {
        // Send 2FA code
        await supabase.functions.invoke('send-2fa-whatsapp', {
          body: { userId: authData.user.id }
        });
        
        setPendingUserId(authData.user.id);
        setShow2FA(true);
        toast.info("Kode 2FA telah dikirim ke WhatsApp Anda");
        return;
      }

      // Check email verification
      if (profile?.temp_email || !profile?.email_verified) {
        navigate('/vip/verify-email');
        return;
      }

      toast.success("Login berhasil!");
      navigate('/vip/');
    } catch (error: any) {
      toast.error(error.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleTempCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verify temp code exists and is valid
      const { data: tempCodeData, error } = await supabase
        .from('temporary_access_codes')
        .select('user_id, force_password_change')
        .eq('code', tempCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !tempCodeData) {
        throw new Error("Kode akses tidak valid atau sudah kadaluarsa");
      }

      // Get user auth to login
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(tempCodeData.user_id);
      
      if (userError || !user) {
        throw new Error("User tidak ditemukan");
      }

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: tempCode // Use temp code as temporary password
      });

      if (signInError) throw signInError;

      // Mark code as used
      await supabase
        .from('temporary_access_codes')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('code', tempCode);

      if (tempCodeData.force_password_change) {
        toast.info("Silakan ganti password Anda");
        navigate('/vip/settings/account');
      } else {
        navigate('/vip/');
      }

      toast.success("Login berhasil!");
    } catch (error: any) {
      toast.error(error.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { userId: pendingUserId, code: twoFACode }
      });

      if (error || !data?.verified) {
        throw new Error("Kode 2FA tidak valid");
      }

      toast.success("Login berhasil!");
      navigate('/vip/');
    } catch (error: any) {
      toast.error(error.message || "Verifikasi 2FA gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (forgotStep === 'email') {
        // Send OTP to email
        const { error } = await supabase.functions.invoke('send-password-reset', {
          body: { email: forgotEmail }
        });

        if (error) throw error;

        toast.success("Kode OTP telah dikirim ke email Anda");
        setForgotStep('otp');
      } else {
        // Verify OTP and reset password
        if (newPassword !== confirmPassword) {
          throw new Error("Password baru dan konfirmasi tidak cocok");
        }

        if (newPassword.length < 6) {
          throw new Error("Password minimal 6 karakter");
        }

        const { error } = await supabase.functions.invoke('verify-password-reset', {
          body: {
            email: forgotEmail,
            otp: resetOtp,
            new_password: newPassword
          }
        });

        if (error) throw error;

        toast.success("Password berhasil direset! Silakan login.");
        setShowForgotPassword(false);
        setForgotStep('email');
        setForgotEmail('');
        setResetOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <Building2 className="h-9 w-9 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Financial Tracker
            </CardTitle>
            <CardDescription className="mt-2">
              {show2FA
                ? "Masukkan kode 2FA yang dikirim ke WhatsApp Anda"
                : showForgotPassword
                ? forgotStep === 'email' 
                  ? "Masukkan email Anda untuk menerima kode reset password"
                  : "Masukkan kode OTP dan password baru Anda"
                : showTempCodeInput
                ? "Masukkan kode akses sementara dari administrator"
                : "Masuk dengan email/nomor telepon Anda"
              }
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {show2FA ? (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twoFACode">Kode 2FA (6 digit)</Label>
                <Input
                  id="twoFACode"
                  type="text"
                  placeholder="000000"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest font-bold"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || twoFACode.length !== 6}>
                {loading ? "Memverifikasi..." : "Verifikasi"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShow2FA(false);
                  setTwoFACode("");
                  setPendingUserId(null);
                }}
              >
                Kembali
              </Button>
            </form>
          ) : showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                  {forgotStep === 'email' ? 'Reset Password' : 'Masukkan Kode OTP'}
                </h3>
                <span className="text-sm text-muted-foreground">
                  Step {forgotStep === 'email' ? '1' : '2'} of 2
                </span>
              </div>

              {forgotStep === 'email' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="forgotEmail">Email Terdaftar</Label>
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="email@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Mengirim..." : "Kirim Kode OTP"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="resetOtp">Kode OTP (6 digit)</Label>
                    <Input
                      id="resetOtp"
                      type="text"
                      placeholder="000000"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest font-bold"
                      required
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Kode dikirim ke {forgotEmail}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Ketik ulang password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || resetOtp.length !== 6 || newPassword.length < 6}
                  >
                    {loading ? "Memproses..." : "Reset Password"}
                  </Button>
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotStep('email');
                  setForgotEmail('');
                  setResetOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Kembali ke Login
              </Button>
            </form>
          ) : showTempCodeInput ? (
            <form onSubmit={handleTempCodeLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tempCode">Kode Akses Sementara</Label>
                <Input
                  id="tempCode"
                  type="text"
                  placeholder="Masukkan kode dari administrator"
                  value={tempCode}
                  onChange={(e) => setTempCode(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : "Login dengan Kode"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowTempCodeInput(false);
                  setTempCode("");
                }}
              >
                Login Normal
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email, Username, atau Nomor WhatsApp</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="email@example.com, username, atau 08123456789"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : "Masuk"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowTempCodeInput(true)}
              >
                Login dengan Kode Akses
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full mt-2"
                onClick={() => setShowForgotPassword(true)}
              >
                Lupa Password?
              </Button>
            </form>
          )}
          
          {!show2FA && !showForgotPassword && !showTempCodeInput && (
            <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
              Untuk bantuan lebih lanjut, hubungi administrator
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
