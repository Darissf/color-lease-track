
## Fix: Stok Barang yang Ditambahkan ke Kontrak "Selesai" Harus Otomatis Terisi `returned_at`

### Masalah

Saat kontrak sudah berstatus "selesai" dengan tanggal pengambilan (misalnya 11 Februari 2026), lalu user menambahkan rincian stok barang dan klik simpan, item stok yang baru disimpan **tidak memiliki `returned_at`**. Akibatnya, item tersebut masih terlihat sebagai "sedang disewa" padahal kontrak sudah selesai.

### Penyebab

Di file `ContractStockItemsEditor.tsx`, saat menyimpan item stok baru (line 284-294), data yang di-insert tidak menyertakan field `returned_at`:

```tsx
.insert({
  user_id: user.id,
  contract_id: contractId,
  inventory_item_id: item.inventory_item_id,
  quantity: item.quantity,
  unit_mode: item.unit_mode,
  // returned_at TIDAK DISERTAKAN
})
```

Komponen ini juga tidak mengetahui status kontrak atau tanggal pengambilan (`tanggal_ambil`) karena props yang diterima hanya `contractId`, `onSave`, dan `onCancel`.

### Solusi

1. **Fetch status dan tanggal_ambil kontrak** di dalam `ContractStockItemsEditor` saat data dimuat
2. **Jika kontrak berstatus "selesai"**, otomatis set `returned_at` pada setiap item stok baru yang disimpan menggunakan nilai `tanggal_ambil` dari kontrak
3. **Tambahkan juga inventory movement bertipe "return"** untuk item tersebut, agar stok gudang kembali bertambah

### Detail Teknis

**File: `src/components/contracts/ContractStockItemsEditor.tsx`**

1. **Tambah state untuk data kontrak** (status dan tanggal_ambil):
```tsx
const [contractStatus, setContractStatus] = useState<string | null>(null);
const [contractReturnDate, setContractReturnDate] = useState<string | null>(null);
```

2. **Fetch data kontrak saat load** (di dalam fungsi fetchData yang sudah ada):
```tsx
const { data: contractData } = await supabase
  .from('rental_contracts')
  .select('status, tanggal_ambil')
  .eq('id', contractId)
  .single();

if (contractData) {
  setContractStatus(contractData.status);
  setContractReturnDate(contractData.tanggal_ambil);
}
```

3. **Saat menyimpan item baru**, jika kontrak sudah "selesai", sertakan `returned_at`:
```tsx
const insertData: any = {
  user_id: user.id,
  contract_id: contractId,
  inventory_item_id: item.inventory_item_id,
  quantity: item.quantity,
  unit_mode: item.unit_mode,
};

// Jika kontrak selesai, otomatis set returned_at
if (contractStatus === 'selesai' && contractReturnDate) {
  insertData.returned_at = contractReturnDate;
}

const { data: inserted } = await supabase
  .from('contract_stock_items')
  .insert(insertData)
  .select()
  .single();
```

4. **Tambah movement "return"** setelah movement "rental" jika kontrak selesai, agar stok gudang tidak berkurang:
```tsx
if (inserted && contractStatus === 'selesai' && contractReturnDate) {
  await supabase.from('inventory_movements').insert({
    user_id: user.id,
    inventory_item_id: item.inventory_item_id,
    contract_id: contractId,
    movement_type: 'return',
    quantity: item.quantity,
    notes: 'Stok dikembalikan - kontrak sudah selesai'
  });
}
```

### Hasil

- Tambah stok barang ke kontrak "selesai": item otomatis memiliki tanggal pengembalian sesuai `tanggal_ambil`
- Tampilan di detail kontrak akan menunjukkan "Dikembalikan: 11 Feb 2026" (bukan masih tersewa)
- Stok gudang tidak berkurang karena movement "return" langsung dibuat
- Tidak ada perubahan pada kontrak yang belum selesai (perilaku tetap sama)
