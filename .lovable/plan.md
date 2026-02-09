

## Perbaikan Copy Data pada Perpanjangan Kontrak

### Masalah yang Ditemukan

Berdasarkan investigasi database, ditemukan 2 masalah utama:

#### 1. Error Insert Line Items: `subtotal` adalah Generated Column
Database log menunjukkan error:
```
cannot insert a non-DEFAULT value into column "subtotal"
```

Kolom `subtotal` adalah computed/generated column dengan formula:
```sql
(quantity * unit_price_per_day * duration_days)
```

Kode saat ini mencoba insert nilai `subtotal` secara manual (baris 307), yang menyebabkan insert gagal.

#### 2. Stock Items Tidak Tercopy: Filter `returned_at` Terlalu Ketat
Semua 7 stock items di kontrak 000284 sudah ditandai `returned_at`:
```
returned_at: 2026-02-09 00:55:31
```

Padahal perpanjangan dibuat setelahnya:
```
000301 created: 2026-02-09 01:06:04
```

Filter `.is('returned_at', null)` mengexclude semua items!

**Logika seharusnya**: Untuk perpanjangan, copy SEMUA stock items dari parent (tidak peduli status returned), karena:
- Jika client mau perpanjang, berarti barang masih di lokasi client
- Status `returned_at` di parent hanya menandai kontrak lama selesai

### Solusi

#### 1. Hapus `subtotal` dari Insert Line Items
```typescript
// SEBELUM (error)
const newLineItems = lineItems.map(item => ({
  ...
  subtotal: item.subtotal,  // ❌ Generated column
  ...
}));

// SESUDAH (benar)
const newLineItems = lineItems.map(item => ({
  ...
  // subtotal dihapus - akan dihitung otomatis
  ...
}));
```

#### 2. Hapus Filter `returned_at` untuk Stock Items
```typescript
// SEBELUM (terlalu ketat)
.is('returned_at', null); // Exclude returned items

// SESUDAH (copy semua)
// Tidak perlu filter returned_at
// Karena perpanjangan = barang tetap di lokasi client
```

#### 3. Tambah Error Handling untuk Semua Insert

```typescript
// Insert dengan error handling
const { error: lineItemsError } = await supabase
  .from('contract_line_items')
  .insert(newLineItems);

if (lineItemsError) {
  console.error('Error copying line items:', lineItemsError);
  throw new Error('Gagal copy rincian item sewa');
}
```

### Perubahan Kode

#### File: `src/components/contracts/ExtendContractDialog.tsx`

**1. Baris 300-318: Hapus `subtotal` dan tambah error handling untuk line items**

```tsx
// Copy line items
const { data: lineItems } = await supabase
  .from('contract_line_items')
  .select('*')
  .eq('contract_id', contract.id);

if (lineItems && lineItems.length > 0) {
  const newLineItems = lineItems.map(item => ({
    user_id: user.id,
    contract_id: newContract.id,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price_per_day: item.unit_price_per_day,
    duration_days: item.duration_days,
    // subtotal DIHAPUS - generated column
    unit_mode: item.unit_mode,
    pcs_per_set: item.pcs_per_set,
    inventory_item_id: item.inventory_item_id,
    group_id: item.group_id ? groupIdMap[item.group_id] : null,
    sort_order: item.sort_order,
  }));

  const { error: lineItemsError } = await supabase
    .from('contract_line_items')
    .insert(newLineItems);
    
  if (lineItemsError) {
    console.error('Error copying line items:', lineItemsError);
    throw new Error(`Gagal copy rincian item sewa: ${lineItemsError.message}`);
  }
}
```

**2. Baris 322-345: Hapus filter returned_at dan tambah error handling untuk stock items**

```tsx
// Copy stock items - TANPA filter returned_at
// Karena perpanjangan = barang masih di lokasi client
if (copyStockItems && newContract) {
  const { data: stockItems } = await supabase
    .from('contract_stock_items')
    .select('*')
    .eq('contract_id', contract.id);
    // HAPUS: .is('returned_at', null)

  if (stockItems && stockItems.length > 0) {
    const newStockItems = stockItems.map(item => ({
      user_id: user.id,
      contract_id: newContract.id,
      inventory_item_id: item.inventory_item_id,
      quantity: item.quantity,
      unit_mode: item.unit_mode,
      notes: `Lanjutan dari ${contract.invoice}`,
      added_at: format(startDate, "yyyy-MM-dd"),
      // returned_at: null (default) - barang belum dikembalikan di kontrak baru
    }));

    const { error: stockError } = await supabase
      .from('contract_stock_items')
      .insert(newStockItems);
      
    if (stockError) {
      console.error('Error copying stock items:', stockError);
      throw new Error(`Gagal copy rincian stok barang: ${stockError.message}`);
    }
  }
}
```

**3. Update fetch count untuk tidak filter returned_at**

```tsx
// Baris 101-106
const { count: stockCount } = await supabase
  .from('contract_stock_items')
  .select('*', { count: 'exact', head: true })
  .eq('contract_id', contract.id);
  // HAPUS: .is('returned_at', null)
```

### Ringkasan Perubahan

| File | Perubahan |
|------|-----------|
| `ExtendContractDialog.tsx` | 1. Hapus `subtotal` dari insert line items (generated column)<br>2. Hapus filter `.is('returned_at', null)` dari stock items<br>3. Tambah error handling untuk semua insert operations<br>4. Update count query untuk menghitung semua stock items |

### Expected Result

Setelah perbaikan, saat perpanjangan kontrak:

```text
Kontrak 000284 (7 line items, 7 stock items, 1 group)
       ↓ PERPANJANGAN
Kontrak 000301 (7 line items, 7 stock items, 1 group)
                  ↑
                  Notes: "Lanjutan dari 000284"
                  Tidak mengurangi gudang
```

