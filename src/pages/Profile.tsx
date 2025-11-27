import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Bell, Shield, Mail, Phone, Eye, EyeOff, Lock, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AvatarUpload } from "@/components/AvatarUpload";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const { activeTheme } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { addNotification } = useNotificationContext();

  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    nomor_telepon: "",
  });

  const [notifications, setNotifications] = useState({
    notification_email: true,
    notification_push: true,
    notification_due_date: true,
    notification_payment: true,
    notification_budget_alert: true,
    notification_monthly_report: false,
  });

  // Password change states
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    old: true,
    new: true,
    confirm: true,
  });
  const [sendToEmail, setSendToEmail] = useState(false);

  // Email change states
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'input' | 'otp'>('input');
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  // Username change states
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [usernameForm, setUsernameForm] = useState({ newUsername: "", password: "" });
  const [showUsernamePassword, setShowUsernamePassword] = useState(true);
  const [changingUsername, setChangingUsername] = useState(false);

  // Initialize form data when profile loads
  useState(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        nomor_telepon: profile.nomor_telepon || "",
      });
      setNotifications({
        notification_email: profile.notification_email ?? true,
        notification_push: profile.notification_push ?? true,
        notification_due_date: profile.notification_due_date ?? true,
        notification_payment: profile.notification_payment ?? true,
        notification_budget_alert: profile.notification_budget_alert ?? true,
        notification_monthly_report: profile.notification_monthly_report ?? false,
      });
    }
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        nomor_telepon: profile.nomor_telepon || "",
      });
    }
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const validateUsername = async (username: string): Promise<boolean> => {
    if (!username || username === profile?.username) return true;

    if (username.length < 3) {
      toast({
        title: "Username terlalu pendek",
        description: "Username minimal 3 karakter",
        variant: "destructive",
      });
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast({
        title: "Format username tidak valid",
        description: "Username hanya boleh berisi huruf, angka, dan underscore",
        variant: "destructive",
      });
      return false;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user?.id || "")
      .maybeSingle();

    if (data) {
      toast({
        title: "Username sudah digunakan",
        description: "Silakan pilih username lain",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    
    if (!/^(\+62|62|0)[0-9]{9,12}$/.test(phone)) {
      toast({
        title: "Format nomor telepon tidak valid",
        description: "Contoh format: 081234567890",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!validatePhone(formData.nomor_telepon)) return;
    if (!(await validateUsername(formData.username))) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name || null,
          username: formData.username || null,
          nomor_telepon: formData.nomor_telepon || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      addNotification({
        type: "paid",
        title: "更新完了",
        message: "Profil berhasil diperbarui",
        expenseName: "Profile Update",
        amount: 0,
      });

      toast({
        title: "Berhasil!",
        description: "Profil telah diperbarui",
      });

      await refetch();
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menyimpan profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = async (key: string, value: boolean) => {
    if (!user) return;

    setNotifications((prev) => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [key]: value })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Preferensi disimpan",
        description: "Pengaturan notifikasi berhasil diperbarui",
      });
    } catch (error) {
      console.error("Error updating notification:", error);
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menyimpan preferensi",
        variant: "destructive",
      });
      setNotifications((prev) => ({ ...prev, [key]: !value }));
    }
  };

  const handleAvatarSuccess = async (url: string) => {
    await refetch();
    addNotification({
      type: "paid",
      title: "更新完了",
      message: "Avatar berhasil diperbarui!",
      expenseName: "Avatar Update",
      amount: 0,
    });
  };

  const handleChangePassword = async () => {
    // Validate password match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password tidak cocok",
        description: "Password baru dan konfirmasi harus sama",
        variant: "destructive",
      });
      return;
    }

    // Validate minimum length
    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Password terlalu pendek",
        description: "Password minimal 6 karakter",
        variant: "destructive",
      });
      return;
    }

    // Check email verification if sendToEmail is checked
    if (sendToEmail) {
      const isEmailVerified = profile?.email_verified === true && profile?.temp_email !== true;
      
      if (!isEmailVerified || !user?.email || user.email.includes('@temp.local')) {
        toast({
          title: "Email belum diverifikasi",
          description: "Silakan verifikasi email Anda terlebih dahulu",
          variant: "destructive",
        });
        return;
      }
    }

    setChangingPassword(true);

    try {
      // Verify old password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordForm.oldPassword,
      });

      if (signInError) {
        toast({
          title: "Password lama salah",
          description: "Silakan periksa kembali password lama Anda",
          variant: "destructive",
        });
        return;
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      // Send email if checkbox is checked
      if (sendToEmail) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: user?.email,
            subject: 'Password Anda Telah Diubah',
            template_type: 'password_change',
            variables: {
              name: profile?.full_name || 'User',
              new_password: passwordForm.newPassword,
            }
          }
        });
      }

      toast({
        title: "Berhasil!",
        description: "Password berhasil diubah",
      });

      // Reset form and close dialog
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setSendToEmail(false);
      setIsPasswordDialogOpen(false);

    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Gagal mengubah password",
        description: "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim()) {
      toast({ title: "Email tidak boleh kosong", variant: "destructive" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({ title: "Format email tidak valid", variant: "destructive" });
      return;
    }

    // Check if old email is verified
    const isEmailVerified = profile?.email_verified === true && profile?.temp_email !== true;
    if (!isEmailVerified || !user?.email || user.email.includes('@temp.local')) {
      toast({ 
        title: "Email belum diverifikasi",
        description: "Silakan verifikasi email Anda terlebih dahulu sebelum mengubahnya",
        variant: "destructive" 
      });
      return;
    }

    setChangingEmail(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-email-change-otp', {
        body: { new_email: newEmail }
      });

      if (error) throw error;

      toast({ 
        title: "Kode OTP terkirim!",
        description: `Kode verifikasi telah dikirim ke ${user.email}. Berlaku selama 1 jam.`
      });
      
      setEmailChangeStep('otp');
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({ 
        title: "Gagal mengirim kode OTP", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setChangingEmail(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    if (!emailOtp.trim() || emailOtp.length !== 6) {
      toast({ title: "Kode OTP harus 6 digit", variant: "destructive" });
      return;
    }

    setChangingEmail(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-change-otp', {
        body: { 
          otp: emailOtp,
          new_email: newEmail 
        }
      });

      if (error) throw error;

      toast({ 
        title: "Email berhasil diubah!",
        description: "Email Anda telah diperbarui."
      });
      
      // Reset form and close dialog
      setNewEmail("");
      setEmailOtp("");
      setEmailChangeStep('input');
      setIsEmailDialogOpen(false);
      
      // Refresh profile to show new email
      refetch();
      
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({ 
        title: "Verifikasi gagal", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangeUsername = async () => {
    // Validate username format
    if (!usernameForm.newUsername.trim()) {
      toast({ title: "Username tidak boleh kosong", variant: "destructive" });
      return;
    }

    if (usernameForm.newUsername.length < 3) {
      toast({
        title: "Username terlalu pendek",
        description: "Username minimal 3 karakter",
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usernameForm.newUsername)) {
      toast({
        title: "Format username tidak valid",
        description: "Username hanya boleh berisi huruf, angka, dan underscore",
        variant: "destructive",
      });
      return;
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", usernameForm.newUsername.toLowerCase())
      .neq("id", user?.id || "")
      .maybeSingle();

    if (existingUser) {
      toast({
        title: "Username sudah digunakan",
        description: "Silakan pilih username lain",
        variant: "destructive",
      });
      return;
    }

    setChangingUsername(true);

    try {
      // Verify password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: usernameForm.password,
      });

      if (signInError) {
        toast({
          title: "Password salah",
          description: "Silakan periksa kembali password Anda",
          variant: "destructive",
        });
        return;
      }

      // Update username
      const { error } = await supabase
        .from("profiles")
        .update({ username: usernameForm.newUsername.toLowerCase() })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Berhasil!",
        description: "Username berhasil diubah. Username dapat digunakan untuk login.",
      });

      // Reset form and close dialog
      setUsernameForm({ newUsername: "", password: "" });
      setIsUsernameDialogOpen(false);
      
      // Refresh profile
      await refetch();

    } catch (error) {
      console.error("Error changing username:", error);
      toast({
        title: "Gagal mengubah username",
        description: "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive",
      });
    } finally {
      setChangingUsername(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground>
        <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">
            Profile 👤
          </h1>
          <p className="text-muted-foreground mt-2">Kelola informasi pribadi dan preferensi Anda</p>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Avatar
              </CardTitle>
              <CardDescription>Upload atau ubah foto profil Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <AvatarUpload
                currentAvatarUrl={profile?.avatar_url || null}
                userId={user?.id || ""}
                onUploadSuccess={handleAvatarSuccess}
              />
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Pribadi
              </CardTitle>
              <CardDescription>Kelola data pribadi Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap</Label>
                <Input
                  id="full_name"
                  value={editing ? formData.full_name : profile?.full_name || "-"}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={!editing}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={editing ? formData.username : profile?.username || "-"}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!editing}
                  placeholder="Pilih username unik"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Nomor Telepon
                </Label>
                <Input
                  id="phone"
                  value={profile?.nomor_telepon || "-"}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Nomor telepon tidak dapat diubah
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
              </div>

              <Separator />

              {editing ? (
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Perubahan
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    Batal
                  </Button>
                </div>
              ) : (
                <Button onClick={handleEdit}>Edit Informasi</Button>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferensi Notifikasi
              </CardTitle>
              <CardDescription>Atur kapan Anda ingin menerima notifikasi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Terima pembaruan via email</p>
                </div>
                <Switch
                  checked={notifications.notification_email}
                  onCheckedChange={(checked) => handleNotificationChange("notification_email", checked)}
                />
              </div>

              {notifications.notification_email && (
                <div className="ml-8 space-y-4 border-l-2 border-sakura-pink/20 pl-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Pengingat Jatuh Tempo</Label>
                    <Switch
                      checked={notifications.notification_due_date}
                      onCheckedChange={(checked) => handleNotificationChange("notification_due_date", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Konfirmasi Pembayaran</Label>
                    <Switch
                      checked={notifications.notification_payment}
                      onCheckedChange={(checked) => handleNotificationChange("notification_payment", checked)}
                    />
                  </div>

                  {(isAdmin || isSuperAdmin) && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Peringatan Budget</Label>
                        <Switch
                          checked={notifications.notification_budget_alert}
                          onCheckedChange={(checked) => handleNotificationChange("notification_budget_alert", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Laporan Bulanan</Label>
                        <Switch
                          checked={notifications.notification_monthly_report}
                          onCheckedChange={(checked) => handleNotificationChange("notification_monthly_report", checked)}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Terima notifikasi langsung di browser</p>
                </div>
                <Switch
                  checked={notifications.notification_push}
                  onCheckedChange={(checked) => handleNotificationChange("notification_push", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Aksi Akun
              </CardTitle>
              <CardDescription>Kelola keamanan akun Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Ubah Password
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setIsEmailDialogOpen(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Ubah Email
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setIsUsernameDialogOpen(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Ubah Username
              </Button>
            </CardContent>
          </Card>

          {/* Password Change Dialog */}
          <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Ubah Password
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Old Password */}
                <div className="space-y-2">
                  <Label>Password Lama</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.old ? "text" : "password"}
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                      placeholder="Masukkan password lama"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPasswords({...showPasswords, old: !showPasswords.old})}
                    >
                      {showPasswords.old ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {/* New Password */}
                <div className="space-y-2">
                  <Label>Password Baru</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      placeholder="Masukkan password baru"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                    >
                      {showPasswords.new ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label>Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      placeholder="Ulangi password baru"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                    >
                      {showPasswords.confirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {/* Send to Email Checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="sendToEmail" 
                    checked={sendToEmail}
                    onCheckedChange={(checked) => setSendToEmail(checked === true)}
                  />
                  <Label htmlFor="sendToEmail" className="text-sm cursor-pointer">
                    Kirim password baru ke email terdaftar
                  </Label>
                </div>
                
                {/* Email Verification Warning */}
                {sendToEmail && (!profile?.email_verified || profile?.temp_email) && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                    <span className="text-yellow-700 dark:text-yellow-400">
                      Email belum diverifikasi. 
                      <a href="/vip/verify-email" className="underline ml-1 font-medium">
                        Verifikasi sekarang
                      </a>
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleChangePassword} disabled={changingPassword}>
                  {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Password
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Email Change Dialog */}
          <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {emailChangeStep === 'input' ? 'Ubah Email' : 'Verifikasi Kode OTP'}
                </DialogTitle>
              </DialogHeader>
              
              {emailChangeStep === 'input' ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Email Saat Ini</Label>
                    <Input value={user?.email || ""} disabled className="bg-muted" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email Baru</Label>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="emailbaru@example.com"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-400">
                      Kode verifikasi akan dikirim ke email LAMA Anda untuk konfirmasi perubahan.
                    </span>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEmailDialogOpen(false);
                        setNewEmail("");
                      }}
                    >
                      Batal
                    </Button>
                    <Button onClick={handleRequestEmailChange} disabled={changingEmail}>
                      {changingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kirim Kode OTP
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="text-sm text-muted-foreground text-center">
                    <p>Kode verifikasi telah dikirim ke:</p>
                    <p className="font-semibold text-foreground mt-1">{user?.email}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Masukkan Kode OTP (6 digit)</Label>
                    <Input
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="text-center text-2xl tracking-widest"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-700 dark:text-yellow-400">
                      Kode berlaku selama 1 jam
                    </span>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEmailChangeStep('input');
                        setEmailOtp("");
                      }}
                    >
                      Kembali
                    </Button>
                    <Button onClick={handleVerifyEmailChange} disabled={changingEmail}>
                      {changingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Verifikasi
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Username Change Dialog */}
          <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Ubah Username
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Username Saat Ini</Label>
                  <Input value={profile?.username || "-"} disabled className="bg-muted" />
                </div>
                
                <div className="space-y-2">
                  <Label>Username Baru</Label>
                  <Input
                    type="text"
                    value={usernameForm.newUsername}
                    onChange={(e) => setUsernameForm({...usernameForm, newUsername: e.target.value})}
                    placeholder="usernameanda"
                  />
                  <p className="text-xs text-muted-foreground">
                    ℹ️ Huruf, angka, underscore. Min 3 karakter.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Konfirmasi Password</Label>
                  <div className="relative">
                    <Input
                      type={showUsernamePassword ? "text" : "password"}
                      value={usernameForm.password}
                      onChange={(e) => setUsernameForm({...usernameForm, password: e.target.value})}
                      placeholder="Masukkan password Anda"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowUsernamePassword(!showUsernamePassword)}
                    >
                      {showUsernamePassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700 dark:text-blue-400">
                    ⚠️ Username dapat digunakan untuk login
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsUsernameDialogOpen(false);
                    setUsernameForm({ newUsername: "", password: "" });
                  }}
                >
                  Batal
                </Button>
                <Button onClick={handleChangeUsername} disabled={changingUsername}>
                  {changingUsername && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Username
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </AnimatedBackground>
    </div>
  );
}
