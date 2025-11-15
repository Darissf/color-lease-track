import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

const AdminSettings = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserRoles(data || []);
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

  const handleAddRole = async () => {
    if (!newUserEmail || !newUserRole) {
      toast({
        title: "Error",
        description: "User ID dan role harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      // Use the newUserEmail field as user_id input
      const { error } = await supabase.from("user_roles").insert({
        user_id: newUserEmail,
        role: newUserRole,
        created_by: currentUser?.user?.id,
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Role berhasil ditambahkan",
      });

      setNewUserEmail("");
      setNewUserRole("user");
      setIsOpen(false);
      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm("Yakin ingin menghapus role ini?")) return;

    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Role berhasil dihapus",
      });

      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
              <h2 className="text-xl font-bold">Daftar User Role</h2>
              <p className="text-sm text-muted-foreground">Kelola hak akses pengguna</p>
            </div>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <UserPlus className="mr-2 h-4 w-4" />
                Tambah Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah User Role</DialogTitle>
                <DialogDescription>
                  Berikan hak akses kepada pengguna
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">User ID</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="UUID pengguna"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Masukkan UUID dari tabel user_roles atau auth.users
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAddRole} className="w-full">
                  Tambah Role
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        ) : userRoles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Belum ada role yang ditambahkan</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tanggal Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles.map((userRole) => (
                <TableRow key={userRole.id}>
                  <TableCell className="font-medium">
                    User
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {userRole.user_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                      {userRole.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(userRole.created_at).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRole(userRole.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default AdminSettings;
