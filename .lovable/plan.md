

## Rencana: Support Decimal untuk Billing Quantity

### Masalah

1. **Kolom `billing_quantity` bertipe INTEGER** - tidak bisa menyimpan nilai desimal (3.5, 14.5)
2. **Fix sebelumnya (Math.round)** - membulatkan 3.5 menjadi 4, yang bukan yang Anda inginkan
3. **Template tidak menampilkan format breakdown** - karena `pricePerUnit = 0` dan tidak ada groups yang berhasil disimpan

### Perubahan yang Akan Dilakukan

#### 1. Database Migration - Ubah Tipe Kolom

Mengubah `billing_quantity` dari INTEGER ke NUMERIC untuk mendukung desimal:

```sql
ALTER TABLE contract_line_item_groups 
ALTER COLUMN billing_quantity TYPE NUMERIC(10,2);
```

**Catatan**: `billing_duration_days` tetap INTEGER karena durasi hari biasanya bilangan bulat (14 hari, 7 hari). Jika Anda juga butuh desimal untuk durasi, beri tahu saya.

#### 2. Rollback Math.round() di useLineItemGroups.ts

Menghapus pembulatan yang salah untuk `billing_quantity`:

```tsx
// SEBELUM (salah):
if (field === 'billing_quantity' || field === 'billing_duration_days') {
  updated[groupIndex] = { ...updated[groupIndex], [field]: Math.round(Number(value)) };
}

// SESUDAH (benar):
if (field === 'billing_duration_days') {
  // Hanya durasi yang perlu integer
  updated[groupIndex] = { ...updated[groupIndex], [field]: Math.round(Number(value)) };
} else if (field === 'billing_unit_mode') {
  updated[groupIndex] = { ...updated[groupIndex], [field]: value as 'pcs' | 'set' };
} else {
  // billing_quantity dan billing_unit_price_per_day bisa desimal
  updated[groupIndex] = { ...updated[groupIndex], [field]: Number(value) };
}
```

Dan di `saveGroups`:

```tsx
// SEBELUM (salah):
billing_quantity: Math.round(group.billing_quantity),

// SESUDAH (benar):
billing_quantity: group.billing_quantity, // Biarkan desimal
```

#### 3. Update Input Field di ContractLineItemsEditor.tsx

Menghapus `step="1"` dari input quantity agar bisa menerima desimal:

```tsx
// SEBELUM:
<Input type="number" step="1" value={group.billing_quantity} ... />

// SESUDAH:
<Input type="number" step="0.5" value={group.billing_quantity} ... />
```

**Catatan**: `step="0.5"` memungkinkan increment 0.5 (3.0, 3.5, 4.0, dst.)

#### 4. Fix Template Generator - Auto-Calculate Price Per Unit

Jika tidak ada groups dan `pricePerUnit` tidak di-set, hitung otomatis dari line items:

```tsx
// Di generateRincianTemplateNormal dan generateRincianTemplateWhatsApp
// Tambahkan auto-calculate jika tidak ada pricePerUnit

// Hitung rata-rata harga dari line items
function calculateEffectivePricePerUnit(lineItems: LineItem[]): number {
  const totalQuantity = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity === 0) return 0;
  const totalDailyValue = lineItems.reduce((sum, item) => 
    sum + (item.quantity * item.unit_price_per_day), 0);
  return totalDailyValue / totalQuantity;
}

// Update kondisi
const effectivePricePerUnit = pricePerUnit || calculateEffectivePricePerUnit(lineItems);
if (hasGroups || effectivePricePerUnit > 0) {
  // Tampilkan format "Per set per hari = ..."
}
```

### File yang Akan Diubah

| File | Perubahan |
|------|-----------|
| **Database Migration** | Ubah `billing_quantity` dari INTEGER ke NUMERIC(10,2) |
| `src/hooks/useLineItemGroups.ts` | Hapus Math.round() untuk billing_quantity |
| `src/components/contracts/ContractLineItemsEditor.tsx` | Ubah `step="1"` menjadi `step="0.5"` untuk input quantity |
| `src/lib/contractTemplateGenerator.ts` | Tambah auto-calculate pricePerUnit dari line items |

### Hasil Setelah Fix

1. **Input 3.5 set** → Tersimpan dengan benar ke database
2. **Input 3,5 (koma)** → Browser auto-convert ke 3.5 (titik) untuk tipe number
3. **Template** → Menampilkan format breakdown "Per set per hari = Rp X.XXX" dengan nilai 3.5 set
4. **Tidak ada lagi error** "invalid input syntax for type integer"

### Contoh Output Template Setelah Fix

```
📦 Rincian Sewa Proyek ABC
----------
Item Sewa:
    - 2 Set Scaffolding 1.7M Galvanis
    - 1 Set Scaffolding 0.9M
    - 10 Pcs Cross Brace 1.7m
----------
Per set per hari = Rp 4.500
Total : 3.5 set x Rp 4.500 = Rp 15.750

📅 Periode Sewa:
    Mulai   : 07 Feb 2026
    Selesai : 20 Feb 2026
    Durasi  : 14 Hari

Total : Rp 15.750 x 14 hari = Rp 220.500
----------
```

