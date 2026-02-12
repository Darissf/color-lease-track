

## Drag-and-Drop Reorder untuk Rincian Stok Barang dan Rincian Item Sewa

### Pendekatan

Menggunakan `framer-motion` `Reorder` yang sudah terinstall di project. Komponen ini mendukung touch (sentuh, tahan, pindah) dan mouse drag secara native -- tidak perlu tombol panah atas/bawah.

### Perubahan

#### 1. Buat Hook Reusable: `src/hooks/useDragReorder.ts`

Hook kecil untuk menangani logic reorder yang dipakai di kedua editor.

#### 2. File: `src/components/contracts/ContractStockItemsEditor.tsx`

- Import `Reorder` dari `framer-motion`
- Wrap list `stockItems` dengan `<Reorder.Group>`
- Wrap setiap item card dengan `<Reorder.Item>`
- Tambah drag handle icon (GripVertical) di setiap item agar user tahu bisa di-drag
- Saat reorder, update state `stockItems` langsung
- Nomor "Item #N" akan otomatis berubah sesuai urutan baru

#### 3. File: `src/components/contracts/ContractLineItemsEditor.tsx`

- Import `Reorder` dari `framer-motion`
- Wrap list non-grouped items dengan `<Reorder.Group>`
- Wrap setiap item card dengan `<Reorder.Item>`
- Tambah drag handle icon (GripVertical)
- Saat reorder, update state `lineItems` (hanya non-grouped items yang bisa di-drag)
- `sort_order` otomatis terupdate saat save karena menggunakan `index` dari array

#### 4. Tampilan Drag Handle

Setiap item card akan mendapat icon `GripVertical` (6 titik) di sebelah kiri header. Visual cue:
- Cursor berubah jadi `grab` saat hover
- Cursor jadi `grabbing` saat ditarik
- Item yang sedang di-drag mendapat shadow dan sedikit scale up
- Animasi smooth saat item berpindah posisi

### Detail Teknis

**Reorder.Group + Reorder.Item (framer-motion)**:
```text
<Reorder.Group values={items} onReorder={setItems}>
  {items.map(item => (
    <Reorder.Item key={item.id} value={item}>
      <GripVertical /> <!-- drag handle -->
      ... item content ...
    </Reorder.Item>
  ))}
</Reorder.Group>
```

**Penting untuk StockItems**: Setiap item perlu key yang stabil. Saat ini menggunakan `index` -- akan diubah ke `id` atau generate temporary key untuk item baru.

**Penting untuk LineItems**: Non-grouped items perlu di-filter dulu sebelum di-render dalam Reorder.Group, lalu saat reorder, mapping kembali ke array `lineItems` penuh.

### Hasil

- Sentuh/klik tahan icon GripVertical, lalu geser ke atas/bawah untuk memindahkan urutan
- Smooth animation saat item berpindah
- Berfungsi di mobile (touch) dan desktop (mouse)
- Urutan tersimpan otomatis saat klik "Simpan"
