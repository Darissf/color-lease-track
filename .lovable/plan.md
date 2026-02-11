

## Fix: Tanggal Movement Harus Sesuai Tanggal Kontrak

### Masalah

Saat stok barang ditambahkan ke kontrak yang sudah "selesai", semua movement (rental & return) menggunakan timestamp saat ini (`now()`) sebagai `movement_date`. Akibatnya:
- "Stok disewa" tercatat 12 Feb 2026 (padahal harusnya sesuai `start_date` kontrak)
- "Stok dikembalikan" juga tercatat 12 Feb 2026 (padahal harusnya sesuai `tanggal_ambil`)

### Solusi

**File: `src/components/contracts/ContractStockItemsEditor.tsx`**

1. **Fetch juga `start_date` kontrak** - ubah query dari `'status, tanggal_ambil'` menjadi `'status, tanggal_ambil, start_date'` dan simpan di state baru `contractStartDate`.

2. **Set `movement_date` pada movement rental** menggunakan `start_date` kontrak (jika tersedia):
```tsx
await supabase.from('inventory_movements').insert({
  ...
  movement_type: 'rental',
  movement_date: contractStartDate || new Date().toISOString(),
  ...
});
```

3. **Set `movement_date` pada movement return** menggunakan `tanggal_ambil` kontrak:
```tsx
await supabase.from('inventory_movements').insert({
  ...
  movement_type: 'return',
  movement_date: contractReturnDate || new Date().toISOString(),
  ...
});
```

### Detail Perubahan

- Tambah state: `contractStartDate`
- Ubah fetch query: tambah `start_date`
- Movement "rental": gunakan `contractStartDate` sebagai `movement_date`
- Movement "return": gunakan `contractReturnDate` sebagai `movement_date`

### Hasil

- Timeline akan menampilkan tanggal sewa sesuai tanggal mulai kontrak
- Tanggal pengembalian sesuai tanggal pengambilan yang di-set user
- Urutan timeline menjadi logis (sewa dulu, baru dikembalikan)
