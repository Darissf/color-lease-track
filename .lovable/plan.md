

## Perbaikan Fitur Perpanjangan Kontrak: Copy Data & Skip Gudang

### Masalah yang Ditemukan

#### 1. Line Items & Stock Items Tidak Tercopy
Berdasarkan data database:
- **INV-000284** (kontrak asal): 7 line items + 1 group, 0 stock items
- **INV-000301** (perpanjangan): 0 line items, 0 stock items

Meskipun checkbox default-nya ON (`copyLineItems: true` dan `copyStockItems: true`), data tidak tercopy. Kemungkinan checkbox tidak dicentang saat user membuat perpanjangan.

#### 2. Stock Items Perpanjangan Tidak Boleh Kurangi Gudang
Logika saat ini:
```text
Kontrak Asal (000284) → Barang diambil dari gudang → Movement: rental -10 pcs
                         ↓
Perpanjangan (000301) → Copy stock items → TIDAK boleh kurangi gudang lagi
                         (barang masih di lokasi client)
```

Masalah: Editor stok saat ini akan membuat movement baru saat user save, karena sistem melihat items sebagai "baru" (tidak ada movement history).

### Solusi

#### 1. Force Copy Data saat Perpanjangan
Ubah default menjadi **checked dan tidak bisa diubah** untuk memastikan data selalu tercopy:

```tsx
// Di ExtendContractDialog.tsx
const [copyLineItems, setCopyLineItems] = useState(true); // sudah default true
const [copyStockItems, setCopyStockItems] = useState(true); // sudah default true

// Opsi: Sembunyikan checkbox dan jadikan otomatis
```

Atau tampilkan sebagai informasi saja, bukan sebagai pilihan.

#### 2. Tandai Stock Items dari Perpanjangan
Tambahkan kolom `is_from_extension` atau manfaatkan field yang ada untuk menandai bahwa stock item ini berasal dari kontrak sebelumnya sehingga tidak perlu mengurangi gudang.

**Pendekatan yang direkomendasikan**: Gunakan kolom `notes` untuk menandai bahwa item ini dari perpanjangan:

```sql
-- Saat copy stock items ke perpanjangan
INSERT INTO contract_stock_items (
  ..., 
  notes: 'Lanjutan dari [INVOICE_ASAL] - tidak mengurangi gudang'
)
```

#### 3. Skip Movement untuk Items dari Perpanjangan
Di `ContractStockItemsEditor`, saat save, jangan buat movement jika item sudah ada di database (bukan item baru):

```tsx
// Di handleSave()
// Saat ini: membuat movement untuk SEMUA item baru
// Perbaikan: hanya buat movement jika item BENAR-BENAR baru 
//            (bukan dari copy perpanjangan)
```

### Perubahan Kode

#### File 1: `src/components/contracts/ExtendContractDialog.tsx`

**A. Copy stock items DENGAN marker khusus:**
```tsx
// Baris ~295-317: Copy stock items
if (copyStockItems && newContract) {
  const { data: stockItems } = await supabase
    .from('contract_stock_items')
    .select('*')
    .eq('contract_id', contract.id)
    .is('returned_at', null);

  if (stockItems && stockItems.length > 0) {
    const newStockItems = stockItems.map(item => ({
      user_id: user.id,
      contract_id: newContract.id,
      inventory_item_id: item.inventory_item_id,
      quantity: item.quantity,
      unit_mode: item.unit_mode,
      notes: `Lanjutan dari ${contract.invoice}`, // ← MARKER
      added_at: format(startDate, "yyyy-MM-dd"),
      // TIDAK membuat inventory_movement di sini
      // karena barang sudah keluar dari gudang di kontrak asal
    }));

    await supabase
      .from('contract_stock_items')
      .insert(newStockItems);
  }
}
```

**B. Jadikan opsi copy sebagai default tanpa opsi uncheck:**

Alternatif: Tampilkan sebagai info saja bukan checkbox:
```tsx
<div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
  <p className="font-medium">Data yang akan dicopy:</p>
  <ul className="mt-1 list-disc list-inside">
    <li>Rincian Item Sewa (Line Items) - {lineItemCount} item</li>
    <li>Rincian Stok Barang - {stockItemCount} item (tidak mengurangi gudang)</li>
  </ul>
</div>
```

#### File 2: `src/components/contracts/ContractStockItemsEditor.tsx`

**Modifikasi handleSave untuk tidak membuat movement pada items yang sudah ada dari awal (sudah punya ID):**

```tsx
// Di handleSave(), baris ~281-306
// itemsToAdd hanya untuk items yang BENAR-BENAR baru ditambahkan oleh user
// bukan items yang sudah ada dari database (hasil copy perpanjangan)

for (const item of itemsToAdd) {
  // Cek apakah item ini dari perpanjangan (ada notes yang mengindikasikan)
  const isFromExtension = item.notes?.includes('Lanjutan dari');
  
  const { data: inserted } = await supabase
    .from('contract_stock_items')
    .insert({
      user_id: user.id,
      contract_id: contractId,
      inventory_item_id: item.inventory_item_id,
      quantity: item.quantity,
      unit_mode: item.unit_mode,
      notes: item.notes,
    })
    .select()
    .single();
  
  // HANYA buat movement jika BUKAN dari perpanjangan
  if (inserted && !isFromExtension) {
    await supabase.from('inventory_movements').insert({
      user_id: user.id,
      inventory_item_id: item.inventory_item_id,
      contract_id: contractId,
      movement_type: 'rental',
      quantity: item.quantity,
      notes: 'Stok disewa - ditambahkan ke kontrak'
    });
  }
}
```

Tapi masalah: items yang di-copy sudah masuk database dengan ID, jadi tidak masuk `itemsToAdd`. 

**Solusi lebih baik**: Saat copy di perpanjangan, langsung handle dengan benar (tidak buat movement sama sekali karena barang sudah keluar). Editor tidak perlu diubah.

### Pendekatan Final

```text
┌─────────────────────────────────────────────────────────────────┐
│ PERPANJANGAN KONTRAK                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Copy Stock Items:                                               │
│ ✓ Salin data dari contract_stock_items asal                     │
│ ✓ Tambahkan notes "Lanjutan dari [INVOICE]"                     │
│ ✓ JANGAN buat inventory_movement (barang sudah di lokasi)       │
│                                                                 │
│ Copy Line Items:                                                │
│ ✓ Salin data dari contract_line_items asal                      │
│ ✓ Salin data dari contract_line_item_groups asal                │
│ ✓ Mapping group_id ke group baru                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ UI:                                                             │
│ - Tampilkan info "Data akan dicopy otomatis"                    │
│ - Tambahkan counter berapa item yang akan dicopy                │
│ - Tetap berikan opsi toggle jika user tidak mau copy            │
└─────────────────────────────────────────────────────────────────┘
```

### Ringkasan Perubahan

| File | Perubahan |
|------|-----------|
| `ExtendContractDialog.tsx` | 1. Tambah marker notes pada stock items yang dicopy<br>2. Fetch count item sebelum copy untuk ditampilkan di UI<br>3. Tidak membuat inventory_movement saat copy |
| `ContractStockItemsEditor.tsx` | Tidak perlu diubah - items yang sudah ada di database (dari copy) tidak akan dianggap "baru" |

### Catatan Penting

Kode saat ini sebenarnya sudah **tidak membuat movement** saat copy perpanjangan - hanya insert ke `contract_stock_items`. Masalahnya mungkin di saat perpanjangan dibuat, user tidak mencentang opsi copy.

Perbaikan utama:
1. **Default checkbox tetap ON** dan beri penjelasan yang jelas
2. **Tampilkan preview** berapa item yang akan dicopy
3. **Tambahkan notes** pada stock items bahwa ini lanjutan dari kontrak sebelumnya

