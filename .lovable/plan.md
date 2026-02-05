
## Fix Bug: Rincian Stok Barang Tidak Tersimpan

### Masalah yang Ditemukan

**Root Cause:** Bug **referensi objek yang sama** antara `stockItems` dan `originalItems`.

Saat data di-fetch di `fetchData()`:
```typescript
const mapped = existingItems.map(...);
setStockItems(mapped);      // State 1: menggunakan 'mapped'
setOriginalItems(mapped);   // State 2: juga menggunakan 'mapped' (SAMA!)
```

Kedua state menyimpan referensi ke **array dan objek yang sama**. Ketika user mengubah quantity:
```typescript
const updated = [...stockItems];     // Shallow copy array
updated[index].quantity = newValue;  // Mutasi objek di dalam array
setStockItems(updated);
```

Karena objek di dalam array adalah referensi yang sama, perubahan di `stockItems[i].quantity` juga mengubah `originalItems[i].quantity`!

**Akibatnya:**
- `orig.quantity` selalu = `s.quantity` 
- `itemsToUpdate` selalu kosong
- Tidak ada yang di-update ke database

### Solusi

**Deep clone `originalItems`** saat fetch agar terpisah sepenuhnya dari `stockItems`:

**File yang diubah:** `src/components/contracts/ContractStockItemsEditor.tsx`

| Lokasi | Perubahan |
|--------|-----------|
| Line 121-122 | Deep clone untuk `originalItems` menggunakan `JSON.parse(JSON.stringify(...))` atau spread nested |

### Kode yang Akan Diubah

**Sebelum (Line 120-122):**
```typescript
setStockItems(mapped);
setOriginalItems(mapped);
```

**Sesudah:**
```typescript
setStockItems(mapped);
// Deep clone untuk originalItems agar tidak ter-mutasi saat edit stockItems
setOriginalItems(JSON.parse(JSON.stringify(mapped)));
```

### Alternatif Solusi (Lebih Baik)

Bisa juga dengan membuat deep clone saat mapping:

```typescript
if (existingItems) {
  const mapped = existingItems.map((item: any) => ({
    id: item.id,
    inventory_item_id: item.inventory_item_id,
    quantity: item.quantity,
    unit_mode: (item.unit_mode || 'pcs') as 'pcs' | 'set',
    item_name: item.inventory_items?.item_name,
    item_code: item.inventory_items?.item_code,
    unit_type: item.inventory_items?.unit_type,
    pcs_per_set: item.inventory_items?.pcs_per_set || 1,
  }));
  
  // Clone untuk originalItems
  const original = existingItems.map((item: any) => ({
    id: item.id,
    inventory_item_id: item.inventory_item_id,
    quantity: item.quantity,
    unit_mode: (item.unit_mode || 'pcs') as 'pcs' | 'set',
    item_name: item.inventory_items?.item_name,
    item_code: item.inventory_items?.item_code,
    unit_type: item.inventory_items?.unit_type,
    pcs_per_set: item.inventory_items?.pcs_per_set || 1,
  }));
  
  setStockItems(mapped);
  setOriginalItems(original);
}
```

### Ringkasan
- **Masalah:** `stockItems` dan `originalItems` menggunakan referensi objek yang sama
- **Dampak:** Perubahan di stockItems juga mengubah originalItems, sehingga perbandingan selalu false
- **Solusi:** Deep clone originalItems saat fetch data
