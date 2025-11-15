import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Pencil } from "lucide-react";
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
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          username,
          nomor_telepon,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch roles and emails for each user
      const usersWithRoles = await Promise.all(
        (data || []).map(async (user) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("id, role")
            .eq("user_id", user.id)
            .single();

          // Get email from auth
          const { data: authData } = await supabase.auth.admin.getUserById(user.id);

          return {
            ...user,
            email: authData.user?.email || "",
            role: roleData?.role || null,
            role_id: roleData?.id || null,
          };
        })
      );

      setUsers(usersWithRoles);
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
    <div className="min-h-screen p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Pengaturan Admin
          </h1>
          <p className="text-muted-foreground">Kelola role dan hak akses pengguna</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
            <div>
              <h2 className="text-xl font-bold">Manajemen User & Role</h2>
              <p className="text-sm text-muted-foreground">Kelola hak akses pengguna</p>
            </div>
          </div>
          <UserRegistrationForm onSuccess={fetchUsers} />
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
                      <SelectTrigger className="w-[180px]">
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
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
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
