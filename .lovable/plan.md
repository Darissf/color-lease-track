

## Perbaikan UI Pengaturan Cepat & Konfirmasi Default Toggle

### Masalah yang Ditemukan

#### 1. UI Pengaturan Cepat Berantakan
Layout saat ini menggunakan grid 3 kolom:
- Kolom 1: Harga per Hari + Select mode
- Kolom 2: Durasi (hari)
- Kolom 3: 2 Tombol (Set Sesuai Periode + Terapkan)

Masalah: Tombol-tombol tidak sejajar karena berada di kolom tersendiri tapi kolom 1 dan 2 punya label di atas sedangkan kolom 3 tidak.

#### 2. Default Toggle "Invoice & Kwitansi Full Rincian"
Dari foto yang Anda berikan, toggle dalam posisi **OFF** (disabled). 

Kabar baiknya: **Default sudah benar** di kode:
```typescript
const [invoiceFullRincian, setInvoiceFullRincian] = useState(false);
```

Nilai `false` = toggle OFF = Halaman 2 menampilkan "Hanya No, Nama Item, Qty" (versi sederhana).

### Solusi Perbaikan UI

Ubah layout menjadi:
- Baris 1: Harga per Hari (Rp) | Durasi (hari)
- Baris 2: Set Sesuai Periode | Terapkan

```text
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ Pengaturan Cepat (Opsional)                                  │
│ Isi di bawah ini untuk menerapkan ke semua item sekaligus      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 💰 Harga per Hari (Rp)              📅 Durasi (hari)           │
│ ┌──────────────┐ ┌───────┐          ┌──────────────┐           │
│ │     8500     │ │Per Set│          │      30      │           │
│ └──────────────┘ └───────┘          └──────────────┘           │
│ Harga dihitung per set. Item pcs akan dikonversi ke set.       │
│                                                                 │
│ ┌─────────────────────────┐ ┌─────────────────────────┐        │
│ │📅 Set Sesuai Periode    │ │  🔄 Terapkan (7)        │        │
│ │     (19 hari)           │ │                         │        │
│ └─────────────────────────┘ └─────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Perubahan Kode

#### File: `src/components/contracts/ContractLineItemsEditor.tsx`

**Ubah grid layout dari 3 kolom menjadi 2 baris:**

```tsx
// SEBELUM (baris 865)
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

// SESUDAH
<div className="space-y-4">
  {/* Row 1: Input fields */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Harga per Hari */}
    <div className="space-y-2">...</div>
    {/* Durasi */}
    <div className="space-y-2">...</div>
  </div>
  
  {/* Row 2: Action buttons */}
  <div className="flex flex-col sm:flex-row gap-2">
    <Button ... className="flex-1">📅 Set Sesuai Periode</Button>
    <Button ... className="flex-1">🔄 Terapkan</Button>
  </div>
</div>
```

### Ringkasan Perubahan

| Item | Status |
|------|--------|
| Layout UI Pengaturan Cepat | Perbaiki jadi 2 baris: inputs di atas, tombol di bawah |
| Default Toggle Full Rincian | ✅ Sudah benar (OFF by default) |

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/contracts/ContractLineItemsEditor.tsx` | Ubah layout grid 3 kolom menjadi 2 baris (inputs + buttons) |

