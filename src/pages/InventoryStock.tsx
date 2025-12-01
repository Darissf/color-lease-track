import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, AlertCircle, Edit, Trash2, History, RefreshCw } from "lucide-react";
import { InventorySummaryCards } from "@/components/inventory/InventorySummaryCards";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { InventoryMovementHistory } from "@/components/inventory/InventoryMovementHistory";
import { RelatedContracts } from "@/components/inventory/RelatedContracts";
import { RelatedIncome } from "@/components/inventory/RelatedIncome";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  total_quantity: number;
  minimum_stock: number;
  unit_price: number;
  unit_type: string;
  description: string;
  is_active: boolean;
  rented_quantity?: number;
}

export default function InventoryStock() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (user?.id) {
      console.log("🔄 Fetching inventory items for user:", user.id);
      fetchItems();
    }
  }, [user?.id]);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, categoryFilter]);

  const fetchItems = async () => {
    if (!user?.id) {
      console.log("⚠️ No user ID available");
      return;
    }

    try {
      setLoading(true);
      console.log("📦 Fetching inventory items...");

      // Fetch inventory items
      const { data: itemsData, error: itemsError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("item_code");

      if (itemsError) throw itemsError;
      console.log("✅ Fetched inventory items:", itemsData?.length || 0, "items");

      // Fetch rental quantities (sudah_kirim but not sudah_diambil)
      const { data: contractsData, error: contractsError } = await supabase
        .from("rental_contracts")
        .select("jenis_scaffolding, jumlah_unit")
        .eq("user_id", user.id)
        .eq("status_pengiriman", "sudah_kirim")
        .neq("status_pengambilan", "sudah_diambil");

      if (contractsError) throw contractsError;

      // Calculate rented quantities
      const rentedMap = new Map<string, number>();
      contractsData?.forEach((contract) => {
        const current = rentedMap.get(contract.jenis_scaffolding) || 0;
        rentedMap.set(contract.jenis_scaffolding, current + contract.jumlah_unit);
      });

      // Merge data
      const itemsWithRented = itemsData?.map((item) => ({
        ...item,
        rented_quantity: rentedMap.get(item.item_name) || 0,
      })) || [];

      console.log("✅ Final items with rented quantities:", itemsWithRented);
      setItems(itemsWithRented);
    } catch (error) {
      console.error("❌ Error fetching inventory:", error);
      toast.error("Gagal memuat data stok barang");
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.item_code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Barang berhasil dihapus");
      fetchItems();
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast.error("Gagal menghapus barang");
    }
  };

  const getAvailableQuantity = (item: InventoryItem) => {
    return item.total_quantity - (item.rented_quantity || 0);
  };

  const isLowStock = (item: InventoryItem) => {
    return getAvailableQuantity(item) <= item.minimum_stock;
  };

  // Calculate summary stats
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.total_quantity, 0);
  const rentedQuantity = items.reduce((sum, item) => sum + (item.rented_quantity || 0), 0);
  const availableQuantity = totalQuantity - rentedQuantity;
  const lowStockCount = items.filter((item) => isLowStock(item)).length;

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const categories = [...new Set(items.map((item) => item.category))];

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Stok Barang
              </h1>
              <p className="text-sm text-muted-foreground">
                Kelola persediaan scaffolding dan aksesoris
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchItems} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => { setEditData(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Barang
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="shrink-0">
        <InventorySummaryCards
          totalItems={totalItems}
          totalQuantity={totalQuantity}
          availableQuantity={availableQuantity}
          rentedQuantity={rentedQuantity}
          lowStockCount={lowStockCount}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="shrink-0">
          <TabsTrigger value="items">Daftar Barang</TabsTrigger>
          <TabsTrigger value="contracts">Kontrak Terkait</TabsTrigger>
          <TabsTrigger value="income">Pemasukan</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="flex-1 flex flex-col overflow-hidden mt-4">
          {/* Filters */}
          <div className="shrink-0 flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Total Stok</TableHead>
                  <TableHead className="text-right">Tersedia</TableHead>
                  <TableHead className="text-right">Disewa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        {searchQuery || categoryFilter !== "all"
                          ? "Tidak ada barang yang sesuai dengan filter"
                          : "Belum ada barang. Tambahkan barang pertama Anda!"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((item) => {
                    const available = getAvailableQuantity(item);
                    const lowStock = isLowStock(item);

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          {item.item_code}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.item_name}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground">
                              {item.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.total_quantity} {item.unit_type}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={lowStock ? "text-destructive font-medium" : ""}>
                            {available} {item.unit_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {item.rented_quantity || 0} {item.unit_type}
                        </TableCell>
                        <TableCell>
                          {lowStock && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Stok Rendah
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditData(item);
                                setShowForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredItems.length > 0 && (
            <div className="shrink-0 mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredItems.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                storageKey="inventory-items-per-page"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="flex-1 overflow-auto mt-4">
          <RelatedContracts items={items} />
        </TabsContent>

        <TabsContent value="income" className="flex-1 overflow-auto mt-4">
          <RelatedIncome items={items} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-auto mt-4">
          <InventoryMovementHistory />
        </TabsContent>
      </Tabs>

      {/* Forms & Dialogs */}
      <InventoryForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={fetchItems}
        editData={editData}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Barang?</AlertDialogTitle>
            <AlertDialogDescription>
              Barang akan dinonaktifkan dan tidak muncul dalam daftar. Data historis tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
