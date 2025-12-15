import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

// Validation schemas
const loginSchema = z.object({
  identifier: z.string()
    .min(3, "Minimal 3 karakter")
    .refine(val => {
      const isEmail = val.includes('@');
      const isPhone = /^[0-9+\-\s()]+$/.test(val);
      return isEmail || isPhone || val.length >= 3;
    }, "Format tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter")
});

const forgotPasswordEmailSchema = z.object({
  email: z.string().email("Format email tidak valid")
});

const forgotPasswordOtpSchema = z.object({
  otp: z.string().length(6, "OTP harus 6 digit"),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Password minimal 6 karakter")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"]
});

const tempCodeSchema = z.object({
  code: z.string().min(1, "Kode tidak boleh kosong")
});

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
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
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
    
    // Validate input
    const validation = tempCodeSchema.safeParse({ code: tempCode });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);

    try {
      // Call edge function to verify temp code and get credentials
      const { data, error } = await supabase.functions.invoke('verify-temp-access', {
        body: { code: tempCode }
      });

      if (error || !data) {
        throw new Error(error?.message || "Kode akses tidak valid");
      }

      // Sign in with returned credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.tempPassword
      });

      if (signInError) throw signInError;

      if (data.forcePasswordChange) {
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
        // Validate email
        const validation = forgotPasswordEmailSchema.safeParse({ email: forgotEmail });
        if (!validation.success) {
          throw new Error(validation.error.errors[0].message);
        }
        
        // Send OTP to email
        const { error } = await supabase.functions.invoke('send-password-reset', {
          body: { email: forgotEmail }
        });

        if (error) throw error;

        toast.success("Kode OTP telah dikirim ke email Anda");
        setForgotStep('otp');
      } else {
        // Validate OTP and passwords
        const validation = forgotPasswordOtpSchema.safeParse({
          otp: resetOtp,
          newPassword,
          confirmPassword
        });
        
        if (!validation.success) {
          throw new Error(validation.error.errors[0].message);
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
          Client Area
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
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Minimal 6 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Ketik ulang password baru"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
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
              Untuk bantuan lebih lanjut, hubungi{' '}
              <a 
                href="https://wa.me/6289666666632" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                +6289666666632
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
