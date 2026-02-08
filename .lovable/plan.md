

## Fitur: Set Hari Sesuai Periode Kontrak

### Deskripsi

Menambahkan tombol baru di bagian "Pengaturan Cepat" pada Rincian Item Sewa yang ketika diklik akan mengubah semua durasi (hari) pada item sewa menjadi sesuai dengan durasi periode kontrak yang sudah dihitung dari tanggal mulai dan tanggal selesai.

### Cara Kerja

```text
┌─────────────────────────────────────────────────────────────────┐
│ Periode Kontrak:  12 Jan 2025 - 30 Jan 2025 = 19 hari           │
├─────────────────────────────────────────────────────────────────┤
│ Klik "Set Hari Sesuai Periode" ↓                                │
├─────────────────────────────────────────────────────────────────┤
│ Semua item (grouped & non-grouped) durasi → 19 hari             │
└─────────────────────────────────────────────────────────────────┘
```

### Kalkulasi Durasi

Berdasarkan memory "duration-input-calculation-day-one-inclusive", durasi dihitung dengan rumus:

```
durasi = endDate - startDate + 1 (Day 1 Inclusive)
```

Contoh: 12 Jan - 30 Jan = 19 hari (12, 13, ..., 30)

### UI/UX

Tombol baru akan ditambahkan di sebelah tombol "Terapkan (X)" pada bagian Pengaturan Cepat:

```text
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ Pengaturan Cepat (Opsional)                                  │
│                                                                 │
│ 💰 Harga per Hari (Rp)   📅 Durasi (hari)                      │
│ ┌─────────┐ ┌──────┐     ┌────────┐                            │
│ │  8500   │ │Per Set│     │   14   │                            │
│ └─────────┘ └──────┘     └────────┘                            │
│                                                                 │
│ ┌────────────────────┐ ┌─────────────────────────┐             │
│ │📅 Set Sesuai Periode│ │  🔄 Terapkan (7)        │             │
│ │     (19 hari)       │ │                         │             │
│ └────────────────────┘ └─────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Logika Implementasi

1. **Hitung durasi periode** dari `startDate` dan `endDate` yang sudah ada di state
2. **Update semua line items** dengan durasi baru
3. **Update semua groups** dengan durasi baru (billing_duration_days)
4. **Update input Durasi** di Pengaturan Cepat (defaultDurationDays)
5. **Tampilkan notifikasi** sukses dengan jumlah hari yang diterapkan

### Perubahan Kode

#### File: `src/components/contracts/ContractLineItemsEditor.tsx`

**1. Import `differenceInDays` dari date-fns** (jika belum ada)

```tsx
import { differenceInDays, parseISO } from 'date-fns';
```

**2. Tambah fungsi untuk menghitung durasi periode**

```tsx
// Calculate contract period duration (Day 1 Inclusive)
const calculatePeriodDuration = (): number => {
  if (!startDate || !endDate) return 0;
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return differenceInDays(end, start) + 1; // +1 for Day 1 Inclusive
};
```

**3. Tambah fungsi untuk set durasi sesuai periode**

```tsx
// Set all items and groups duration to match contract period
const setDurationFromPeriod = () => {
  const periodDuration = calculatePeriodDuration();
  if (periodDuration <= 0) {
    toast.error('Periode kontrak tidak valid');
    return;
  }

  // Update all line items
  const updatedItems = lineItems.map(item => ({
    ...item,
    duration_days: periodDuration,
  }));
  setLineItems(updatedItems);

  // Update all groups
  const updatedGroups = groups.map(group => ({
    ...group,
    billing_duration_days: periodDuration,
  }));
  setGroups(updatedGroups);

  // Also update the Pengaturan Cepat duration input
  setDefaultDurationDays(periodDuration);

  toast.success(`Durasi semua item diset ke ${periodDuration} hari (sesuai periode)`);
};
```

**4. Tambah tombol di bagian Pengaturan Cepat** (sebelum tombol "Terapkan")

```tsx
<div className="flex items-end gap-2">
  {/* Tombol Set Sesuai Periode */}
  <Button 
    variant="outline" 
    onClick={setDurationFromPeriod}
    disabled={!startDate || !endDate}
    className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-100"
  >
    📅 Set Sesuai Periode
    {startDate && endDate && (
      <span className="ml-1 text-xs">({calculatePeriodDuration()} hari)</span>
    )}
  </Button>
  
  {/* Tombol Terapkan yang sudah ada */}
  <Button 
    variant="secondary" 
    onClick={applyDefaultsToAll}
    disabled={lineItems.length === 0 || (defaultPricePerDay === '' && defaultDurationDays === '')}
    className="flex-1"
  >
    🔄 Terapkan ({lineItems.length})
  </Button>
</div>
```

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/contracts/ContractLineItemsEditor.tsx` | Tambah import date-fns, fungsi calculatePeriodDuration, fungsi setDurationFromPeriod, dan tombol baru |

### Bagian Teknis

**State yang digunakan:**
- `startDate` dan `endDate` sudah ada di state (diambil dari kontrak saat load)
- `lineItems` untuk update individual items
- `groups` dan `setGroups` dari hook `useLineItemGroups` untuk update billing groups

**Kalkulasi:**
- Menggunakan `differenceInDays(endDate, startDate) + 1` sesuai dengan standar "Day 1 Inclusive"

**Edge cases:**
- Jika periode tidak valid (tanggal kosong atau durasi <= 0), tampilkan error
- Tombol disabled jika startDate atau endDate kosong

