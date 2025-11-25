import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Pencil, MessageSquare, ChevronRight, FileText, Mail, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRegistrationForm } from "@/components/UserRegistrationForm";
import { UserEditForm } from "@/components/UserEditForm";
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
}

const AdminSettings = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

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
          onClick={() => navigate("/vip/settings/whatsapp")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gradient-success flex items-center justify-center">
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
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
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
          onClick={() => navigate("/vip/ai-usage")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                AI Usage Analytics
              </h3>
              <p className="text-xs text-muted-foreground">
                Monitor penggunaan & biaya AI
              </p>
            </div>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
          </div>
        </Card>
      </div>

      <Card className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg gradient-primary flex items-center justify-center shrink-0">
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
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Tanggal Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || "Nama tidak tersedia"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.username || "-"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role || "none"}
                          onValueChange={(value) => handleRoleChange(user.id, value, user.role_id)}
                        >
                          <SelectTrigger className="w-full sm:w-[180px]">
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
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          {user.role_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(user.role_id!)}
                            >
                              Hapus Role
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="p-3 overflow-hidden">
                  <div className="space-y-3">
                    <div className="min-w-0">
                      <p className="font-medium text-base sm:text-lg truncate">{user.full_name || "Nama tidak tersedia"}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words overflow-wrap-anywhere">{user.email}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div className="min-w-0">
                        <span className="text-muted-foreground block mb-0.5">Username:</span>
                        <p className="font-medium truncate">{user.username || "-"}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground block mb-0.5">Dibuat:</span>
                        <p className="font-medium truncate">{new Date(user.created_at).toLocaleDateString("id-ID")}</p>
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

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:flex-1 h-9 text-xs sm:text-sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      {user.role_id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full sm:flex-1 h-9 text-xs sm:text-sm"
                          onClick={() => handleDeleteRole(user.role_id!)}
                        >
                          Hapus Role
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
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
          }}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
};

export default AdminSettings;
