import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, AlertCircle, Edit, Trash2, History, RefreshCw, ScrollText } from "lucide-react";
import { InventorySummaryCards } from "@/components/inventory/InventorySummaryCards";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { InventoryMovementHistory } from "@/components/inventory/InventoryMovementHistory";
import { InventoryItemHistory } from "@/components/inventory/InventoryItemHistory";
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
  pcs_per_set: number;
  description: string;
  is_active: boolean;
  rented_quantity?: number;
}

export default function InventoryStock() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
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
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (user?.id) {
      console.log("🔄 Fetching inventory items for user:", user.id);
      fetchItems();
    }
  }, [user?.id]);

  useEffect(() => {
    console.log("🔍 filterItems effect triggered, items:", items.length);
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
      let itemsQuery = supabase
        .from("inventory_items")
        .select("*")
        .eq("is_active", true)
        .order("item_code");

      // Only filter by user_id for regular users (not admin/super_admin)
      if (!isSuperAdmin && !isAdmin) {
        itemsQuery = itemsQuery.eq("user_id", user.id);
      }

      const { data: itemsData, error: itemsError } = await itemsQuery;

      if (itemsError) throw itemsError;
      console.log("✅ Fetched inventory items:", itemsData?.length || 0, "items");

      // Fetch active contracts (NOT closed)
      // Closed = status 'selesai' AND tagihan_belum_bayar = 0
      let contractsQuery = supabase
        .from("rental_contracts")
        .select("id, status, tagihan_belum_bayar");

      // Only filter by user_id for regular users (not admin/super_admin)
      if (!isSuperAdmin && !isAdmin) {
        contractsQuery = contractsQuery.eq("user_id", user.id);
      }

      const { data: contractsData, error: contractsError } = await contractsQuery;
      if (contractsError) throw contractsError;

      // Filter to get only active (not closed) contract IDs
      const activeContractIds = (contractsData || [])
        .filter(c => !(c.status === 'selesai' && (c.tagihan_belum_bayar || 0) === 0))
        .map(c => c.id);

      // Fetch stock items from active contracts that haven't been returned
      const rentedMap = new Map<string, number>();
      
      if (activeContractIds.length > 0) {
        const { data: stockItemsData, error: stockError } = await supabase
          .from("contract_stock_items")
          .select("inventory_item_id, quantity")
          .in("contract_id", activeContractIds)
          .is("returned_at", null);

        if (stockError) throw stockError;

        // Calculate rented quantities by inventory_item_id
        stockItemsData?.forEach((item) => {
          if (item.inventory_item_id) {
            const current = rentedMap.get(item.inventory_item_id) || 0;
            rentedMap.set(item.inventory_item_id, current + item.quantity);
          }
        });
      }

      // Merge data using item.id (UUID) for lookup
      const itemsWithRented = itemsData?.map((item) => ({
        ...item,
        rented_quantity: rentedMap.get(item.id) || 0,
      })) || [];

      console.log("✅ Final items with rented quantities:", itemsWithRented);
      setItems(itemsWithRented);
      
      // FIX: Set filteredItems directly to avoid race condition
      console.log("🎯 Setting filteredItems directly:", itemsWithRented.length);
      setFilteredItems(itemsWithRented);
    } catch (error) {
      console.error("❌ Error fetching inventory:", error);
      toast.error("Gagal memuat data stok barang");
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    console.log("🔍 filterItems called, items:", items.length, "searchQuery:", searchQuery, "categoryFilter:", categoryFilter);
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

    console.log("🔍 Setting filteredItems:", filtered.length);
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                Stok Barang
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Kelola persediaan scaffolding dan aksesoris
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={fetchItems} disabled={loading} size="sm" className="flex-1 sm:flex-none">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={() => { setEditData(null); setShowForm(true); }} size="sm" className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Tambah Barang</span>
              <span className="ml-2 sm:hidden">Tambah</span>
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
        <TabsList className="shrink-0 w-full h-auto flex flex-wrap gap-1 p-1">
          <TabsTrigger value="items" className="flex-1 sm:flex-none text-xs sm:text-sm">
            <span className="hidden sm:inline">Daftar Barang</span>
            <span className="sm:hidden">Barang</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex-1 sm:flex-none text-xs sm:text-sm">
            <span className="hidden sm:inline">Kontrak Terkait</span>
            <span className="sm:hidden">Kontrak</span>
          </TabsTrigger>
          <TabsTrigger value="income" className="flex-1 sm:flex-none text-xs sm:text-sm">Pemasukan</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none text-xs sm:text-sm">
            <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
                  <TableHead className="w-10 sm:w-16 text-xs sm:text-sm">No</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Kode</TableHead>
                  <TableHead className="text-xs sm:text-sm">Nama</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Tersedia</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">Total</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm hidden lg:table-cell">Konversi</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm w-20 sm:w-auto">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        {searchQuery || categoryFilter !== "all"
                          ? "Tidak ada barang yang sesuai dengan filter"
                          : "Belum ada barang. Tambahkan barang pertama Anda!"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((item, index) => {
                    const available = getAvailableQuantity(item);
                    const lowStock = isLowStock(item);
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const pcsPerSet = item.pcs_per_set || 1;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm">
                          {rowNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm hidden sm:table-cell">
                          {item.item_code}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-xs sm:text-sm">{item.item_name}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            {item.item_code}
                          </div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground hidden sm:block">
                              {item.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`text-xs sm:text-sm ${lowStock ? "text-destructive font-semibold" : ""}`}>
                            {available} pcs
                          </span>
                          {pcsPerSet > 1 && (
                            <div className="text-xs text-muted-foreground">
                              ({Math.floor(available / pcsPerSet)} set)
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs sm:text-sm hidden md:table-cell">
                          {item.total_quantity} pcs
                          {pcsPerSet > 1 && (
                            <div className="text-xs text-muted-foreground font-normal">
                              ({Math.floor(item.total_quantity / pcsPerSet)} set)
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell">
                          {pcsPerSet > 1 ? (
                            <Badge variant="secondary" className="text-xs">
                              {pcsPerSet} pcs/set
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5 sm:gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => setHistoryItem(item)}
                              title="Lihat History"
                            >
                              <ScrollText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => {
                                setEditData(item);
                                setShowForm(true);
                              }}
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => setDeleteConfirm(item.id)}
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
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

      <InventoryItemHistory
        open={!!historyItem}
        onOpenChange={(open) => !open && setHistoryItem(null)}
        item={historyItem}
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
