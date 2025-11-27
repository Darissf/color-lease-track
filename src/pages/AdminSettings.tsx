import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Pencil, MessageSquare, ChevronRight, FileText, Mail, BarChart3, Palette, LayoutDashboard, Edit3, Ban, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import { UserRegistrationForm } from "@/components/UserRegistrationForm";
import { UserEditForm } from "@/components/UserEditForm";
import { DeleteUserDialog } from "@/components/DeleteUserDialog";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserWithRole {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string;
  nomor_telepon: string | null;
  role: string | null;
  role_id: string | null;
  created_at: string;
  email_verified: boolean;
  temp_email: boolean;
  is_suspended: boolean;
  last_sign_in_at: string | null;
}

const AdminSettings = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const { activeTheme } = useAppTheme();
  const navigate = useNavigate();
  const { isSuperAdmin, user: currentUser } = useAuth();

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchUsers();
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const response = await supabase.functions.invoke("get-users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;

      setUsers(response.data.users);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string, roleId: string | null) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();

      if (roleId) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("id", roleId);

        if (error) throw error;
      } else {
        // Create new role
        const { error } = await supabase.from("user_roles").insert({
          user_id: userId,
          role: newRole,
          created_by: currentUser?.user?.id,
        });

        if (error) throw error;
      }

      toast({
        title: "Berhasil",
        description: "Role berhasil diperbarui",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Yakin ingin menghapus role ini?")) return;

    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Role berhasil dihapus",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: UserWithRole) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleToggleSuspend = async (userId: string, currentStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      // Prevent suspending yourself
      if (userId === currentUser?.id) {
        toast({
          title: "Error",
          description: "Tidak dapat suspend akun Anda sendiri",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke("update-user", {
        body: {
          user_id: userId,
          is_suspended: !currentStatus,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Berhasil",
        description: `User berhasil ${!currentStatus ? 'dinonaktifkan' : 'diaktifkan'}`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatLastSignIn = (lastSignIn: string | null) => {
    if (!lastSignIn) return "Belum pernah login";
    
    try {
      return formatDistanceToNow(new Date(lastSignIn), { 
        addSuffix: true,
        locale: localeId 
      });
    } catch {
      return "Tidak valid";
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 w-full min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
            Pengaturan Admin
          </h1>
          <p className="text-sm text-muted-foreground">Kelola role dan hak akses pengguna</p>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/design")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Setting Design VIP
              </h3>
              <p className="text-xs text-muted-foreground">
                Customize brand text, fonts, colors & effects
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/whatsapp")}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              activeTheme === 'japanese' ? "gradient-success" : "bg-emerald-600"
            )}>
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                WhatsApp Settings
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola notifikasi WhatsApp otomatis
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/smtp")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                SMTP Email Settings
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola pengiriman email otomatis
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/audit-logs")}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              activeTheme === 'japanese' ? "gradient-primary" : "bg-primary"
            )}>
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Audit Logs
              </h3>
              <p className="text-xs text-muted-foreground">
                Lihat riwayat aktivitas sistem
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/cloud-usage")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Cloud Usage Dashboard
              </h3>
              <p className="text-xs text-muted-foreground">
                Monitor semua resource cloud & biaya
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/landing")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Setting Landing Page
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola blog, portfolio, content & meta ads
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>

        <Card 
          className="p-4 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
          onClick={() => navigate("/vip/settings/content-editor")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <Edit3 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Edit Page
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola konten dengan versi simpel atau pro
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>
      </div>

      <Card className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={cn(
              "h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center shrink-0",
              activeTheme === 'japanese' ? "gradient-primary" : "bg-primary"
            )}>
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold truncate">Manajemen User & Role</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Kelola hak akses pengguna</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <UserRegistrationForm onSuccess={fetchUsers} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Belum ada pengguna terdaftar</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Login Terakhir</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isEmailVerified = user.email_verified && !user.temp_email;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || "Nama tidak tersedia"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          {isEmailVerified ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Belum
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.username || "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role || "none"}
                            onValueChange={(value) => handleRoleChange(user.id, value, user.role_id)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Tidak ada role</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatLastSignIn(user.last_sign_in_at)}
                        </TableCell>
                        <TableCell>
                          {user.is_suspended ? (
                            <Badge variant="destructive" className="gap-1">
                              <Ban className="h-3 w-3" />
                              Suspended
                            </Badge>
                          ) : (
                            <Badge variant="default" className="gap-1 bg-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Aktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleSuspend(user.id, user.is_suspended)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {users.map((user) => {
                const isEmailVerified = user.email_verified && !user.temp_email;
                return (
                  <Card key={user.id} className="p-3 overflow-hidden">
                    <div className="space-y-3">
                      <div className="min-w-0">
                        <p className="font-medium text-base sm:text-lg truncate">{user.full_name || "Nama tidak tersedia"}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words overflow-wrap-anywhere">{user.email}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {isEmailVerified ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Email Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Email Belum Verified
                          </Badge>
                        )}
                        {user.is_suspended ? (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="h-3 w-3" />
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="default" className="gap-1 bg-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Aktif
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                        <div className="min-w-0">
                          <span className="text-muted-foreground block mb-0.5">Username:</span>
                          <p className="font-medium truncate">{user.username || "-"}</p>
                        </div>
                        <div className="min-w-0">
                          <span className="text-muted-foreground block mb-0.5">Login Terakhir:</span>
                          <p className="font-medium truncate text-xs">{formatLastSignIn(user.last_sign_in_at)}</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs sm:text-sm text-muted-foreground mb-1.5 block">Role:</label>
                        <Select
                          value={user.role || "none"}
                          onValueChange={(value) => handleRoleChange(user.id, value, user.role_id)}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="none">Tidak ada role</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9 text-xs sm:text-sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            variant={user.is_suspended ? "default" : "secondary"}
                            size="sm"
                            className="flex-1 h-9 text-xs sm:text-sm"
                            onClick={() => handleToggleSuspend(user.id, user.is_suspended)}
                            disabled={user.id === currentUser?.id}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1.5" />
                            {user.is_suspended ? "Aktifkan" : "Suspend"}
                          </Button>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full h-9 text-xs sm:text-sm"
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Hapus User
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {editingUser && (
        <UserEditForm
          userId={editingUser.id}
          currentData={{
            full_name: editingUser.full_name,
            username: editingUser.username,
            email: editingUser.email,
            nomor_telepon: editingUser.nomor_telepon,
            role: editingUser.role,
            email_verified: editingUser.email_verified,
            temp_email: editingUser.temp_email,
          }}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchUsers}
        />
      )}

      {deletingUser && (
        <DeleteUserDialog
          userId={deletingUser.id}
          userName={deletingUser.full_name || "Nama tidak tersedia"}
          userEmail={deletingUser.email}
          userRole={deletingUser.role || "user"}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
};

export default AdminSettings;
