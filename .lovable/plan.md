

## Fix Bug: Rincian Stok Barang Tidak Update Setelah Simpan

### Masalah yang Ditemukan

Saya menemukan **2 bug** di `ContractStockItemsEditor.tsx`:

1. **Perubahan `unit_mode` tidak terdeteksi** - Jika user mengubah unit mode saja (misal dari pcs ke set), perubahan tidak masuk ke daftar `itemsToUpdate` karena kondisi filter hanya memeriksa `quantity` dan `inventory_item_id`

2. **Perubahan `unit_mode` pada item existing juga tidak dicek** - Ini menyebabkan jika user edit item dan hanya mengubah unit mode, data tidak tersimpan

### Solusi

**File yang perlu diubah:** `src/components/contracts/ContractStockItemsEditor.tsx`

**Perubahan pada logika `itemsToUpdate`:**

| Kondisi Lama | Kondisi Baru |
|--------------|--------------|
| `orig.quantity !== s.quantity \|\| orig.inventory_item_id !== s.inventory_item_id` | `orig.quantity !== s.quantity \|\| orig.inventory_item_id !== s.inventory_item_id \|\| orig.unit_mode !== s.unit_mode` |

### Kode yang Akan Diubah

**Sebelum (Line 251-255):**
```typescript
const itemsToUpdate = stockItems.filter(s => {
  if (!s.id) return false;
  const orig = originalItems.find(o => o.id === s.id);
  return orig && (orig.quantity !== s.quantity || orig.inventory_item_id !== s.inventory_item_id);
});
```

**Sesudah:**
```typescript
const itemsToUpdate = stockItems.filter(s => {
  if (!s.id) return false;
  const orig = originalItems.find(o => o.id === s.id);
  return orig && (
    orig.quantity !== s.quantity || 
    orig.inventory_item_id !== s.inventory_item_id ||
    orig.unit_mode !== s.unit_mode
  );
});
```

### Ringkasan
- Menambahkan pengecekan `unit_mode` pada kondisi filter `itemsToUpdate`
- Perubahan kecil tapi critical untuk memastikan semua perubahan tersimpan dengan benar

