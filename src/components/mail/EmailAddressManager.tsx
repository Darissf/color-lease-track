import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings, Trash2, Edit, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MonitoredAddress {
  id: string;
  email_address: string;
  display_name: string;
  badge_color: string;
  is_active: boolean;
  display_order: number;
}

const PRESET_COLORS = [
  { name: "Blue", value: "#0ea5e9" },
  { name: "Green", value: "#10b981" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "Yellow", value: "#eab308" },
  { name: "Pink", value: "#ec4899" },
];

export default function EmailAddressManager() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<MonitoredAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<MonitoredAddress | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<MonitoredAddress | null>(null);
  const [formData, setFormData] = useState({
    email_address: "",
    display_name: "",
    badge_color: "#0ea5e9",
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("monitored_email_addresses")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast({
        title: "Error",
        description: "Gagal memuat alamat email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email_address || !formData.display_name) {
      toast({
        title: "Error",
        description: "Email dan display name wajib diisi",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    if (!formData.email_address.includes("@sewascaffoldingbali.com")) {
      toast({
        title: "Error",
        description: "Email harus menggunakan domain @sewascaffoldingbali.com",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingAddress) {
        // Update existing
        const { error } = await supabase
          .from("monitored_email_addresses")
          .update({
            email_address: formData.email_address,
            display_name: formData.display_name,
            badge_color: formData.badge_color,
          })
          .eq("id", editingAddress.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Alamat email berhasil diperbarui",
        });
      } else {
        // Create new
        const maxOrder = addresses.length > 0 
          ? Math.max(...addresses.map(a => a.display_order))
          : 0;

        const { error } = await supabase
          .from("monitored_email_addresses")
          .insert({
            email_address: formData.email_address,
            display_name: formData.display_name,
            badge_color: formData.badge_color,
            created_by: user?.id,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Alamat email berhasil ditambahkan",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchAddresses();
    } catch (error: any) {
      console.error("Error saving address:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan alamat email",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (address: MonitoredAddress) => {
    setEditingAddress(address);
    setFormData({
      email_address: address.email_address,
      display_name: address.display_name,
      badge_color: address.badge_color,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAddress) return;

    try {
      const { error } = await supabase
        .from("monitored_email_addresses")
        .update({ is_active: false })
        .eq("id", deletingAddress.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Alamat email berhasil dihapus",
      });

      setDeletingAddress(null);
      fetchAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus alamat email",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (address: MonitoredAddress, direction: "up" | "down") => {
    const currentIndex = addresses.findIndex(a => a.id === address.id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === addresses.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const swapAddress = addresses[swapIndex];

    try {
      await supabase
        .from("monitored_email_addresses")
        .update({ display_order: swapAddress.display_order })
        .eq("id", address.id);

      await supabase
        .from("monitored_email_addresses")
        .update({ display_order: address.display_order })
        .eq("id", swapAddress.id);

      fetchAddresses();
    } catch (error) {
      console.error("Error reordering:", error);
      toast({
        title: "Error",
        description: "Gagal mengubah urutan",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email_address: "",
      display_name: "",
      badge_color: "#0ea5e9",
    });
    setEditingAddress(null);
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kelola Alamat Email Terpantau</CardTitle>
              <CardDescription>
                Daftarkan alamat email yang ingin dipantau di Mail Inbox
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Alamat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingAddress ? "Edit Alamat Email" : "Tambah Alamat Email Baru"}
                  </DialogTitle>
                  <DialogDescription>
                    Masukkan detail alamat email yang ingin dipantau
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="info@sewascaffoldingbali.com"
                      value={formData.email_address}
                      onChange={(e) =>
                        setFormData({ ...formData, email_address: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Display Name *</Label>
                    <Input
                      id="name"
                      placeholder="Customer Service"
                      value={formData.display_name}
                      onChange={(e) =>
                        setFormData({ ...formData, display_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Badge Color *</Label>
                    <div className="grid grid-cols-7 gap-2 mt-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, badge_color: color.value })
                          }
                          className={`h-10 rounded border-2 transition-all ${
                            formData.badge_color === color.value
                              ? "border-primary scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Batalkan
                    </Button>
                    <Button type="submit">Simpan</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {addresses.filter(a => a.is_active).map((address, index) => (
                <Card key={address.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: address.badge_color + "20" }}
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: address.badge_color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{address.email_address}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {address.display_name}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(address, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(address, "down")}
                          disabled={index === addresses.filter(a => a.is_active).length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(address)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingAddress(address)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {addresses.filter(a => a.is_active).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Belum ada alamat email terdaftar</p>
                  <p className="text-sm">Klik tombol "Tambah Alamat" untuk memulai</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingAddress} onOpenChange={(open) => !open && setDeletingAddress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Alamat Email?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus alamat{" "}
              <span className="font-semibold">{deletingAddress?.email_address}</span>?
              Filter ini akan hilang dari sidebar Mail Inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batalkan</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}