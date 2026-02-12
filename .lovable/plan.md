

## Fix: Drag-and-Drop Tidak Berfungsi di Kedua Editor

### Masalah yang Ditemukan

**1. Touch/iPad tidak berfungsi:**
Saat ini seluruh `Reorder.Item` bisa di-drag, tapi karena di dalamnya ada banyak elemen interaktif (Input, Select, Checkbox), event touch/pointer di iPad tertangkap oleh elemen-elemen tersebut, bukan oleh drag handler. Ini menyebabkan drag sama sekali tidak bisa dimulai di perangkat sentuh.

**2. Rincian Item Sewa - value reference salah:**
Di `ContractLineItemsEditor.tsx`, `nonGroupedItems` dibuat ulang setiap render dengan `.map().filter()`. Lalu `Reorder.Item` mendapat `value={{ item, index }}` yang membuat object BARU setiap render. Framer-motion membandingkan value by reference, sehingga reorder gagal karena object selalu berbeda.

### Solusi

Menggunakan `useDragControls` dari framer-motion agar hanya icon GripVertical yang menjadi drag trigger. Ini adalah pola resmi yang direkomendasikan framer-motion.

---

#### 1. File: `src/components/contracts/ContractStockItemsEditor.tsx`

Ekstrak setiap item menjadi komponen terpisah (`StockReorderItem`) yang menggunakan `useDragControls`:

```text
Sebelum:
- Reorder.Item langsung di dalam .map()
- Seluruh card bisa di-drag (cursor-grab)

Sesudah:
- Komponen StockReorderItem terpisah dengan useDragControls
- dragListener={false} pada Reorder.Item
- onPointerDown pada GripVertical untuk memulai drag
- touch-action: none pada drag handle agar iPad/mobile berfungsi
```

Pola kode:

```text
function StockReorderItem({ item, index, ... }) {
  const controls = useDragControls();
  return (
    <Reorder.Item 
      value={item} 
      dragListener={false} 
      dragControls={controls}
    >
      <GripVertical 
        onPointerDown={(e) => controls.start(e)}
        style={{ touchAction: 'none' }}
        className="cursor-grab active:cursor-grabbing"
      />
      ... rest of item content ...
    </Reorder.Item>
  );
}
```

#### 2. File: `src/components/contracts/ContractLineItemsEditor.tsx`

Dua perbaikan:

**a. Fix value reference:**
Gunakan `useMemo` untuk `nonGroupedItems` agar referensi stabil antara render, atau lebih baik lagi -- pass item langsung sebagai value (bukan `{ item, index }` object baru).

**b. Komponen terpisah dengan useDragControls:**
Sama seperti stock editor, ekstrak menjadi `LineReorderItem` component.

```text
Sebelum:
- nonGroupedItems dibuat ulang setiap render
- value={{ item, index }} membuat object baru
- Seluruh card bisa di-drag

Sesudah:
- nonGroupedItems di-memoize
- value={stableObject} dari memoized array
- Komponen LineReorderItem dengan useDragControls
- Hanya GripVertical yang menjadi drag trigger
- touch-action: none untuk iPad/mobile support
```

### Detail Teknis Penting

| Aspek | Detail |
|---|---|
| `dragListener={false}` | Mencegah seluruh card menjadi drag target |
| `dragControls={controls}` | Menghubungkan kontrol drag ke handle |
| `onPointerDown={(e) => controls.start(e)}` | Memulai drag dari GripVertical saja |
| `style={{ touchAction: 'none' }}` | Kritis untuk iPad/mobile -- mencegah browser intercept gesture |
| Komponen terpisah | Diperlukan karena `useDragControls` adalah hook (harus di component level) |

### Hasil

- Drag hanya bisa dimulai dari icon GripVertical (6 titik)
- Input, Select, dan elemen form lainnya tetap berfungsi normal
- Berfungsi di iPad dan perangkat sentuh lainnya
- Smooth animation saat item berpindah posisi

