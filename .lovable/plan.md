

## Investigasi Mendalam & Perbaikan Definitif Copy Data Perpanjangan

### Hasil Investigasi

Berdasarkan pengecekan database:

| Item | Kontrak 000284 (Parent) | Kontrak 000301 (Extension) |
|------|-------------------------|---------------------------|
| Line Items | 7 | **0** ❌ |
| Stock Items | 7 | **0** ❌ |
| Groups | 1 | **1** ✅ |

**Temuan Kritis:**
- Group **BERHASIL** tercopy (1 → 1)
- Line items dan Stock items **GAGAL** tercopy (7 → 0)

Ini mengindikasikan bahwa:
1. Kode untuk copy groups berjalan
2. Kode untuk copy line items dan stock items **TIDAK berjalan** atau **GAGAL SILENT**

### Root Cause Analysis

Setelah memeriksa kode terbaru, ditemukan:

1. **Kode sudah benar** - `subtotal` sudah dihapus dari mapping
2. **Error handling sudah ada** - throw error jika insert gagal

**Kemungkinan penyebab:**
- Perubahan kode **BELUM ter-deploy** saat user membuat perpanjangan
- Atau ada issue lain yang tidak terlihat

### Solusi: Perbaikan Definitif dengan Logging Lengkap

Untuk memastikan tidak ada lagi kegagalan silent, saya akan menambahkan:

1. **Logging yang lebih detail** di setiap langkah
2. **Error handling yang lebih comprehensive**
3. **Validasi data sebelum insert**

### Perubahan Kode

#### File: `src/components/contracts/ExtendContractDialog.tsx`

**1. Tambah logging di setiap langkah copy**

```tsx
// Copy line items
console.log(`[Extension] Copying line items from ${contract.id}...`);
const { data: lineItems, error: lineItemsFetchError } = await supabase
  .from('contract_line_items')
  .select('*')
  .eq('contract_id', contract.id);

if (lineItemsFetchError) {
  console.error('[Extension] Error fetching line items:', lineItemsFetchError);
  throw new Error(`Gagal mengambil data line items: ${lineItemsFetchError.message}`);
}

console.log(`[Extension] Found ${lineItems?.length || 0} line items to copy`);
```

**2. Pastikan tidak ada field undefined yang terkirim**

```tsx
const newLineItems = lineItems.map(item => {
  const mappedItem = {
    user_id: user.id,
    contract_id: newContract.id,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price_per_day: item.unit_price_per_day,
    duration_days: item.duration_days,
    unit_mode: item.unit_mode || 'pcs',
    pcs_per_set: item.pcs_per_set || 1,
    inventory_item_id: item.inventory_item_id || null,
    group_id: item.group_id ? groupIdMap[item.group_id] : null,
    sort_order: item.sort_order || 0,
  };
  console.log(`[Extension] Mapping line item: ${item.item_name}`);
  return mappedItem;
});
```

**3. Logging setelah insert berhasil**

```tsx
const { data: insertedLineItems, error: lineItemsError } = await supabase
  .from('contract_line_items')
  .insert(newLineItems)
  .select(); // Tambahkan .select() untuk mendapatkan data yang diinsert

if (lineItemsError) {
  console.error('[Extension] Error copying line items:', lineItemsError);
  throw new Error(`Gagal copy rincian item sewa: ${lineItemsError.message}`);
}

console.log(`[Extension] Successfully copied ${insertedLineItems?.length || 0} line items`);
```

**4. Sama untuk stock items**

```tsx
console.log(`[Extension] Copying stock items from ${contract.id}...`);
const { data: stockItems, error: stockFetchError } = await supabase
  .from('contract_stock_items')
  .select('*')
  .eq('contract_id', contract.id);

if (stockFetchError) {
  console.error('[Extension] Error fetching stock items:', stockFetchError);
  throw new Error(`Gagal mengambil data stok: ${stockFetchError.message}`);
}

console.log(`[Extension] Found ${stockItems?.length || 0} stock items to copy`);

// ... insert ...

const { data: insertedStockItems, error: stockError } = await supabase
  .from('contract_stock_items')
  .insert(newStockItems)
  .select();

if (stockError) {
  console.error('[Extension] Error copying stock items:', stockError);
  throw new Error(`Gagal copy rincian stok barang: ${stockError.message}`);
}

console.log(`[Extension] Successfully copied ${insertedStockItems?.length || 0} stock items`);
```

**5. Toast notifikasi dengan jumlah item tercopy**

```tsx
toast.success(
  `Kontrak berhasil diperpanjang dengan invoice ${invoiceNumber}. ` +
  `${insertedLineItems?.length || 0} rincian item dan ${insertedStockItems?.length || 0} stok tercopy.`
);
```

### Ringkasan Perubahan

| Perubahan | Tujuan |
|-----------|--------|
| Logging di setiap langkah | Debug visibility jika gagal lagi |
| Error handling untuk fetch | Tangkap error saat mengambil data asal |
| Default values untuk nullable fields | Hindari undefined/null yang bisa menyebabkan error |
| `.select()` setelah insert | Konfirmasi data berhasil diinsert |
| Toast dengan jumlah item | User bisa langsung tahu berapa yang tercopy |

### Expected Result

Setelah perbaikan:

```text
Console logs:
[Extension] Copying line items from b6728b9d-...
[Extension] Found 7 line items to copy
[Extension] Mapping line item: Scaffolding 1.7M Galvanis Las
[Extension] Mapping line item: Scaffolding 1.7M Galvanis
...
[Extension] Successfully copied 7 line items

[Extension] Copying stock items from b6728b9d-...
[Extension] Found 7 stock items to copy
[Extension] Successfully copied 7 stock items

Toast: "Kontrak berhasil diperpanjang dengan invoice 000302. 7 rincian item dan 7 stok tercopy."
```

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `ExtendContractDialog.tsx` | 1. Tambah comprehensive logging<br>2. Error handling untuk fetch operations<br>3. Default values untuk nullable fields<br>4. `.select()` untuk konfirmasi insert<br>5. Toast dengan informasi jumlah item tercopy |

