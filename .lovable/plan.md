

## Fix: Perhitungan Durasi Salah saat Pilih Tanggal Selesai

### Penyebab

Bug timezone pada `differenceInDays`:
- `start_date` dari database: `new Date("2026-02-11")` = **11 Feb 00:00 UTC** = 11 Feb 07:00 WIB
- `end_date` dari Calendar: **17 Feb 00:00 WIB** = 16 Feb 17:00 UTC

`differenceInDays` menghitung selisih timestamp, bukan selisih hari kalender. Hasilnya: `(16 Feb 17:00 - 11 Feb 00:00) / 86400` = 5.7 hari, dibulatkan ke bawah = **5**, lalu +1 = **6** (seharusnya 7).

### Solusi

Ganti `differenceInDays` dengan `differenceInCalendarDays` dari date-fns. Fungsi ini menghitung selisih **hari kalender** tanpa terpengaruh timezone.

### Perubahan di `src/pages/RentalContracts.tsx`

#### 1. Update import

```tsx
// SEBELUM:
import { format, differenceInDays, ... } from "date-fns";

// SESUDAH:
import { format, differenceInDays, differenceInCalendarDays, ... } from "date-fns";
```

#### 2. Fix Calendar onSelect (line 1023)

```tsx
// SEBELUM:
const newDuration = differenceInDays(newEndDate, contractForm.start_date) + 1;

// SESUDAH:
const newDuration = differenceInCalendarDays(newEndDate, contractForm.start_date) + 1;
```

#### 3. Fix handleEditContract (line 419)

```tsx
// SEBELUM:
const calculatedDuration = differenceInDays(new Date(contract.end_date), new Date(contract.start_date)) + 1;

// SESUDAH:
const calculatedDuration = differenceInCalendarDays(new Date(contract.end_date), new Date(contract.start_date)) + 1;
```

#### 4. Juga fix fungsi getRemainingDays jika ada (line 509)

Ini untuk display "X Hari Lagi" yang juga bisa terpengaruh timezone.

### Contoh Hasil

| Start Date | End Date | Sebelum (salah) | Sesudah (benar) |
|-----------|----------|-----------------|-----------------|
| 11 Feb | 17 Feb | 6 hari | 7 hari |
| 11 Feb | 11 Feb | 0 atau 1 hari | 1 hari |
| 1 Feb | 28 Feb | 27 hari | 28 hari |

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/RentalContracts.tsx` | Ganti `differenceInDays` dengan `differenceInCalendarDays` di 3 tempat |

