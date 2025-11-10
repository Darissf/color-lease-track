import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Library, Plus, Trash2, Edit, ArrowLeft, Wallet, TrendingUp, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BankLogo from "@/components/BankLogo";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/currency";
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
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  account_type: string;
  balance: number;
  is_active: boolean;
  notes: string;
}

const AccountSettings = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    bank_name: "",
    account_number: "",
    account_holder_name: "",
    account_type: "checking",
    balance: 0,
    is_active: true,
    notes: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
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

  const handleSubmit = async () => {
    // Validasi form
    if (!formData.bank_name.trim()) {
      toast({
        title: "Error",
        description: "Nama bank harus diisi",
        variant: "destructive",
      });
      return;
    }

    if (!formData.account_number.trim()) {
      toast({
        title: "Error",
        description: "Nomor rekening harus diisi",
        variant: "destructive",
      });
      return;
    }

    if (!formData.account_holder_name.trim()) {
      toast({
        title: "Error",
        description: "Atas nama harus diisi",
        variant: "destructive",
      });
      return;
    }

    if (formData.balance < 0) {
      toast({
        title: "Error",
        description: "Saldo tidak boleh negatif",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingAccount) {
        const { error } = await supabase
          .from("bank_accounts")
          .update(formData)
          .eq("id", editingAccount.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Akun rekening berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from("bank_accounts")
          .insert({ ...formData, user_id: user.id });

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Akun rekening berhasil ditambahkan",
        });
      }

      resetForm();
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_holder_name: account.account_holder_name || "",
      account_type: account.account_type,
      balance: account.balance,
      is_active: account.is_active,
      notes: account.notes || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus akun rekening ini?")) return;

    try {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Akun rekening berhasil dihapus",
      });

      fetchAccounts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      bank_name: "",
      account_number: "",
      account_holder_name: "",
      account_type: "checking",
      balance: 0,
      is_active: true,
      notes: "",
    });
    setEditingAccount(null);
    setIsOpen(false);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const activeAccounts = accounts.filter(acc => acc.is_active).length;
  const inactiveAccounts = accounts.length - activeAccounts;

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Pengaturan Akun Rekening
          </h1>
          <p className="text-muted-foreground">Kelola akun dan rekening bank Anda</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="gradient-card border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Saldo</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rekening Aktif</p>
                <p className="text-2xl font-bold text-foreground">{activeAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-gray-500/10 flex items-center justify-center">
                <EyeOff className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rekening Nonaktif</p>
                <p className="text-2xl font-bold text-foreground">{inactiveAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center">
              <Library className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Daftar Akun Rekening</h2>
              <p className="text-sm text-muted-foreground">Kelola rekening bank Anda</p>
            </div>
          </div>

          <Button onClick={() => setIsOpen(true)} className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Rekening
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Belum ada rekening yang ditambahkan</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Atas Nama</TableHead>
                <TableHead>Nomor Rekening</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <BankLogo bankName={account.bank_name} size="sm" />
                      <span className="font-medium">{account.bank_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{account.account_holder_name}</span>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{account.account_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {account.account_type === 'checking' ? 'Tabungan' : 
                       account.account_type === 'savings' ? 'Giro' :
                       account.account_type === 'investment' ? 'Investasi' : 'Lainnya'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(account.balance)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={account.is_active ? "default" : "secondary"}
                      className={account.is_active ? "bg-green-500" : ""}
                    >
                      {account.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Akun Rekening" : "Tambah Akun Rekening"}
            </DialogTitle>
            <DialogDescription>
              Masukkan informasi rekening bank Anda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama Bank</Label>
              <Input
                id="bank_name"
                placeholder="BCA, Mandiri, BNI, dll"
                value={formData.bank_name}
                onChange={(e) =>
                  setFormData({ ...formData, bank_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_holder_name">Atas Nama</Label>
              <Input
                id="account_holder_name"
                placeholder="Nama pemilik rekening"
                value={formData.account_holder_name}
                onChange={(e) =>
                  setFormData({ ...formData, account_holder_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Nomor Rekening</Label>
              <Input
                id="account_number"
                placeholder="1234567890"
                value={formData.account_number}
                onChange={(e) =>
                  setFormData({ ...formData, account_number: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_type">Tipe Rekening</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, account_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Tabungan</SelectItem>
                  <SelectItem value="savings">Giro</SelectItem>
                  <SelectItem value="investment">Investasi</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Saldo Awal</Label>
              <Input
                id="balance"
                type="number"
                placeholder="0"
                min="0"
                step="1000"
                value={formData.balance}
                onChange={(e) =>
                  setFormData({ ...formData, balance: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Masukkan saldo awal rekening ini
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Aktif</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan tambahan (opsional)"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Batal
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingAccount ? "Perbarui" : "Tambah"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountSettings;
