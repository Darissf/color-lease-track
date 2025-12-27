import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface InventoryFormData {
  item_code: string;
  item_name: string;
  category: string;
  total_quantity: number;
  minimum_stock: number;
  unit_type: string;
  description: string;
}

interface InventoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: any;
}

const CATEGORIES = [
  "Scaffolding",
  "Aksesoris",
  "Alat Bantu",
  "Spare Parts",
  "Lainnya",
];

const UNIT_TYPES = [
  "unit",
  "set",
  "pcs",
  "meter",
  "kg",
];

export function InventoryForm({ open, onOpenChange, onSuccess, editData }: InventoryFormProps) {
  const { user } = useAuth();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<InventoryFormData>({
    defaultValues: editData || {
      item_code: "",
      item_name: "",
      category: "Scaffolding",
      total_quantity: 0,
      minimum_stock: 0,
      unit_type: "unit",
      description: "",
    },
  });

  const selectedCategory = watch("category");
  const selectedUnitType = watch("unit_type");

  // Sync form values with editData when dialog opens or editData changes
  useEffect(() => {
    if (open && editData) {
      reset({
        item_code: editData.item_code || "",
        item_name: editData.item_name || "",
        category: editData.category || "Scaffolding",
        total_quantity: editData.total_quantity || 0,
        minimum_stock: editData.minimum_stock || 0,
        unit_type: editData.unit_type || "unit",
        description: editData.description || "",
      });
    } else if (open && !editData) {
      reset({
        item_code: "",
        item_name: "",
        category: "Scaffolding",
        total_quantity: 0,
        minimum_stock: 0,
        unit_type: "unit",
        description: "",
      });
    }
  }, [open, editData, reset]);

  const onSubmit = async (data: InventoryFormData) => {
    if (!user) return;

    try {
      if (editData) {
        const { error } = await supabase
          .from("inventory_items")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editData.id);

        if (error) throw error;
        toast.success("Barang berhasil diperbarui!");
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert({
            ...data,
            user_id: user.id,
          });

        if (error) throw error;
        toast.success("Barang berhasil ditambahkan!");
      }

      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving inventory item:", error);
      toast.error(error.message || "Gagal menyimpan barang");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_code">Kode Barang *</Label>
              <Input
                id="item_code"
                {...register("item_code", { required: "Kode barang wajib diisi" })}
                placeholder="SCF-001"
              />
              {errors.item_code && (
                <p className="text-sm text-destructive mt-1">{errors.item_code.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="item_name">Nama Barang *</Label>
              <Input
                id="item_name"
                {...register("item_name", { required: "Nama barang wajib diisi" })}
                placeholder="Scaffolding 2x1.5m"
              />
              {errors.item_name && (
                <p className="text-sm text-destructive mt-1">{errors.item_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Kategori *</Label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit_type">Satuan *</Label>
              <Select
                value={selectedUnitType}
                onValueChange={(value) => setValue("unit_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih satuan" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_quantity">Total Stok *</Label>
              <Input
                id="total_quantity"
                type="number"
                {...register("total_quantity", { 
                  required: "Total stok wajib diisi",
                  valueAsNumber: true,
                  min: { value: 0, message: "Minimal 0" }
                })}
                placeholder="100"
              />
              {errors.total_quantity && (
                <p className="text-sm text-destructive mt-1">{errors.total_quantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="minimum_stock">Stok Minimum *</Label>
              <Input
                id="minimum_stock"
                type="number"
                {...register("minimum_stock", { 
                  required: "Stok minimum wajib diisi",
                  valueAsNumber: true,
                  min: { value: 0, message: "Minimal 0" }
                })}
                placeholder="10"
              />
              {errors.minimum_stock && (
                <p className="text-sm text-destructive mt-1">{errors.minimum_stock.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Deskripsi atau catatan tambahan..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Batal
            </Button>
            <Button type="submit">
              {editData ? "Perbarui" : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
