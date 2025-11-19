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
import { Loader2, User, Bell, Shield, Mail, Phone } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useNotificationContext } from "@/contexts/NotificationContext";

export default function Profile() {
  const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-torii-red via-sakura-pink to-matcha-green bg-clip-text text-transparent">
            Profile 👤
          </h1>
          <p className="text-muted-foreground mt-2">Kelola informasi pribadi dan preferensi Anda</p>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <Card className="profile-card">
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
          <Card className="profile-card">
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
                  value={editing ? formData.nomor_telepon : profile?.nomor_telepon || "-"}
                  onChange={(e) => setFormData({ ...formData, nomor_telepon: e.target.value })}
                  disabled={!editing}
                  placeholder="081234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
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
          <Card className="profile-card">
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
          <Card className="profile-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Aksi Akun
              </CardTitle>
              <CardDescription>Kelola keamanan dan data akun Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Ubah Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Export Data Saya
              </Button>
              <Button variant="destructive" className="w-full justify-start">
                Hapus Akun
              </Button>
            </CardContent>
          </Card>
        </div>
        </div>
      </AnimatedBackground>
    </div>
  );
}
