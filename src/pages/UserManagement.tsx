import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  ArrowLeft, 
  Users, 
  Ban, 
  CheckCircle, 
  Trash2, 
  Pencil,
  Mail,
  MailCheck,
  Shield
} from "lucide-react";
import { UserRegistrationForm } from "@/components/UserRegistrationForm";
import { UserEditForm } from "@/components/UserEditForm";
import { DeleteUserDialog } from "@/components/DeleteUserDialog";

interface UserWithRole {
  id: string;
  full_name: string | null;
  username: string | null;
  nomor_telepon: string | null;
  created_at: string;
  email_verified: boolean;
  temp_email: boolean;
  is_suspended: boolean;
  role: string | null;
  role_id: string | null;
  email?: string;
  last_sign_in_at?: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/vip");
      return;
    }
    fetchUsers();
  }, [isSuperAdmin, navigate]);

  const fetchUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('get-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Gagal memuat data pengguna");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string, existingRoleId: string | null) => {
    try {
      if (existingRoleId) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("id", existingRoleId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
      toast.success("Role berhasil diubah");
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Gagal mengubah role");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
      toast.success("Role berhasil dihapus");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Gagal menghapus role");
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

  const handleToggleSuspend = async (user: UserWithRole) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: user.id,
          is_suspended: !user.is_suspended
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      toast.success(user.is_suspended ? "User berhasil diaktifkan" : "User berhasil disuspend");
      fetchUsers();
    } catch (error) {
      console.error("Error toggling suspend:", error);
      toast.error("Gagal mengubah status user");
    }
  };

  const formatLastSignIn = (dateString?: string) => {
    if (!dateString) return "Belum pernah login";
    return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: id });
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/vip/settings/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Manajemen User & Role
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola pengguna, role, dan hak akses sistem
            </p>
          </div>
        </div>

        {/* User Registration Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tambah User Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserRegistrationForm onSuccess={fetchUsers} />
          </CardContent>
        </Card>

        {/* User Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Daftar Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat data pengguna...
              </div>
            ) : (
              <>
                {/* Desktop Table */}
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
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name || "-"}
                          </TableCell>
                          <TableCell>{user.email || "-"}</TableCell>
                          <TableCell>
                            {user.email_verified && !user.temp_email ? (
                              <Badge variant="default" className="bg-green-600 gap-1">
                                <MailCheck className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Mail className="h-3 w-3" />
                                Unverified
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{user.username || "-"}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role || "user"}
                              onValueChange={(value) => handleRoleChange(user.id, value, user.role_id)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatLastSignIn(user.last_sign_in_at)}
                          </TableCell>
                          <TableCell>
                            {user.is_suspended ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-600">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser(user)}
                                title="Edit User"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleSuspend(user)}
                                title={user.is_suspended ? "Aktifkan" : "Suspend"}
                              >
                                {user.is_suspended ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Ban className="h-4 w-4 text-orange-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(user)}
                                title="Hapus User"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {users.map((user) => (
                    <Card key={user.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{user.full_name || "-"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex gap-1">
                            {user.is_suspended ? (
                              <Badge variant="destructive" className="text-xs">Suspended</Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-600 text-xs">Active</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Username:</span>
                            <p>{user.username || "-"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email Status:</span>
                            <p>{user.email_verified && !user.temp_email ? "Verified" : "Unverified"}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Select
                            value={user.role || "user"}
                            onValueChange={(value) => handleRoleChange(user.id, value, user.role_id)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleToggleSuspend(user)}>
                              {user.is_suspended ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Ban className="h-4 w-4 text-orange-600" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        {editingUser && (
          <UserEditForm
            userId={editingUser.id}
            currentData={{
              full_name: editingUser.full_name,
              username: editingUser.username,
              email: editingUser.email || "",
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
            userEmail={deletingUser.email || ""}
            userRole={deletingUser.role || "user"}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onSuccess={fetchUsers}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagement;
