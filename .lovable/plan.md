

## Laporan & Rencana: Migrasi Zona Waktu ke Denpasar/Bali (WITA, UTC+8)

### Ringkasan Temuan

Ditemukan **19 file** yang menggunakan zona waktu Jakarta (WIB, UTC+7) dan perlu diubah ke Denpasar/Bali (WITA, UTC+8, `Asia/Makassar`).

---

### A. File Inti Timezone (1 file)

| # | File | Fungsi yang Perlu Diubah |
|---|------|--------------------------|
| 1 | `src/lib/timezone.ts` | Ganti `JAKARTA_TIMEZONE = 'Asia/Jakarta'` menjadi `'Asia/Makassar'`. Rename semua fungsi (`getNowInJakarta` -> `getNowInWITA`, dst). Export alias lama agar backward-compatible. |

---

### B. Frontend - Halaman (10 file)

| # | File | Fungsi yang Dipakai |
|---|------|---------------------|
| 2 | `src/pages/Dashboard.tsx` | `getNowInJakarta`, `getJakartaYear`, `getJakartaMonth`, `getJakartaDay`, `formatInJakarta` |
| 3 | `src/pages/RentalContracts.tsx` | `getNowInJakarta` |
| 4 | `src/pages/TransactionHistory.tsx` | `getNowInJakarta`, `formatInJakarta` |
| 5 | `src/pages/ExpenseTracker.tsx` | `getNowInJakarta`, `formatInJakarta`, `getJakartaDateString` |
| 6 | `src/pages/IncomeManagement.tsx` | `getNowInJakarta`, `getJakartaDateString` |
| 7 | `src/pages/FixedExpenses.tsx` | `getNowInJakarta`, `getJakartaDateString`, `getJakartaMonth`, `getJakartaYear` |
| 8 | `src/pages/RecurringIncome.tsx` | `getNowInJakarta` |
| 9 | `src/pages/ContractScaffoldingInput.tsx` | `getNowInJakarta` |
| 10 | `src/pages/RecurringIncomeScaffoldingInput.tsx` | `getNowInJakarta` |

---

### C. Frontend - Komponen (4 file)

| # | File | Fungsi yang Dipakai |
|---|------|---------------------|
| 11 | `src/components/fixed-expenses/FixedExpenseCalendar.tsx` | `getNowInJakarta`, `getJakartaDay`, `getJakartaMonth`, `getJakartaYear`, `toJakartaTime` |
| 12 | `src/components/BankBalanceHistory.tsx` | `formatInJakarta` |
| 13 | `src/components/SessionManagement.tsx` | `formatInJakarta` |
| 14 | `src/components/budget/charts/BudgetForecastChart.tsx` | `getJakartaDay`, `toJakartaTime` |
| 15 | `src/components/budget/charts/DailyTrendChart.tsx` | `toJakartaTime` |

---

### D. Frontend - Utility (1 file)

| # | File | Fungsi yang Dipakai |
|---|------|---------------------|
| 16 | `src/utils/budgetCalculations.ts` | `getNowInJakarta`, `getJakartaDay`, `getJakartaMonth`, `getJakartaYear` |

---

### E. Backend - Edge Functions (3 file) - Hardcoded UTC+7

| # | File | Yang Perlu Diubah |
|---|------|-------------------|
| 17 | `supabase/functions/process-recurring-rentals/index.ts` | `JAKARTA_OFFSET_HOURS = 7` -> `8`, rename variabel |
| 18 | `supabase/functions/process-recurring-transactions/index.ts` | `JAKARTA_OFFSET_HOURS = 7` -> `8`, `JAKARTA_OFFSET_MS` -> `8 * 60 * 60 * 1000`, rename variabel |
| 19 | `supabase/functions/send-email/index.ts` | `JAKARTA_OFFSET_HOURS = 7` -> `8`, rename variabel |

---

### Rencana Perubahan

#### 1. `src/lib/timezone.ts` - Update Inti

```
SEBELUM: export const JAKARTA_TIMEZONE = 'Asia/Jakarta';
SESUDAH: export const WITA_TIMEZONE = 'Asia/Makassar';
```

Buat fungsi baru dengan nama WITA, lalu export alias nama lama agar semua 15 file frontend tetap berfungsi tanpa error:

```tsx
// Fungsi utama baru
export const getNowInWITA = () => toZonedTime(new Date(), WITA_TIMEZONE);
export const formatInWITA = (date, fmt) => formatInTimeZone(date, WITA_TIMEZONE, fmt, { locale: id });
// ... dst

// Alias backward-compatible (agar tidak perlu ubah 15 file sekaligus)
export const getNowInJakarta = getNowInWITA;
export const formatInJakarta = formatInWITA;
export const toJakartaTime = toWITATime;
export const fromJakartaToUTC = fromWITAToUTC;
export const getJakartaDateString = getWITADateString;
export const getJakartaDay = getWITADay;
export const getJakartaMonth = getWITAMonth;
export const getJakartaYear = getWITAYear;
export const JAKARTA_TIMEZONE = WITA_TIMEZONE;
```

Dengan pendekatan alias ini, **cukup ubah 1 file** (`timezone.ts`) untuk seluruh frontend. Semua 15 file lainnya otomatis menggunakan zona waktu baru tanpa perlu diedit.

#### 2. Edge Functions (3 file) - Ubah Offset dari 7 ke 8

Karena edge functions memiliki helper timezone sendiri (hardcoded), ketiga file ini harus diubah manual:

```
SEBELUM: const JAKARTA_OFFSET_HOURS = 7; // UTC+7
SESUDAH: const WITA_OFFSET_HOURS = 8; // UTC+8 (Denpasar/Bali)
```

Dan rename semua variabel/fungsi terkait di dalamnya.

### Total Perubahan

| Kategori | Jumlah File | Aksi |
|----------|-------------|------|
| File inti timezone | 1 | Edit timezone + tambah alias |
| Frontend (halaman, komponen, utility) | 15 | Tidak perlu diubah (pakai alias) |
| Edge Functions | 3 | Edit offset 7 -> 8, rename variabel |
| **Total** | **19** | **4 file yang perlu diedit** |

