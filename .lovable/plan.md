

## Bug: Tanggal Selesai Selalu Mundur 1 Hari

### Analisis Root Cause

**Masalahnya ada di baris 296 pada `handleSaveContract`:**

```typescript
// Baris 296 - MASALAH: Selalu menghitung ulang dari durationDays
endDate = addDays(contractForm.start_date, durationDays - 1);
```

**Flow masalah:**

```text
1. User pilih end_date = 8 Februari
2. onSelect di Calendar menghitung: durationDays = differenceInDays(8 Feb, 26 Jan) + 1 = 14 hari
3. Tapi SEBELUM save selesai, useEffect (baris 144-150) BERJALAN:
   - calculatedEndDate = addDays(26 Jan, 14 - 1) = addDays(26 Jan, 13) = 8 Februari ✓
   
4. User klik "Update Kontrak"
5. handleSaveContract TIDAK menggunakan contractForm.end_date yang sudah di-set
6. handleSaveContract MENGHITUNG ULANG: endDate = addDays(26 Jan, durationDays - 1)
   - Jika ada race condition atau durationDays belum terupdate dengan benar = 13
   - endDate = addDays(26 Jan, 13 - 1) = addDays(26 Jan, 12) = 7 Februari ✗
```

**Masalah sebenarnya:**
- `handleSaveContract` mengabaikan `contractForm.end_date` yang sudah di-set user
- Selalu menghitung ulang dari `durationDays`
- Jika ada timing issue dengan state update, tanggal akan salah

### Solusi

Ubah logika di `handleSaveContract` untuk **menggunakan `contractForm.end_date`** yang sudah di-set, bukan menghitung ulang.

### Perubahan Kode

#### File: `src/pages/RentalContracts.tsx`

**Sebelum (baris 290-297):**
```typescript
// Hitung end_date
let endDate: Date;
if (durationMode === 'flexible') {
  // Placeholder: 1 tahun dari start
  endDate = addYears(contractForm.start_date, 1);
} else {
  endDate = addDays(contractForm.start_date, durationDays - 1);
}
```

**Sesudah:**
```typescript
// Tentukan end_date
let endDate: Date;
if (durationMode === 'flexible') {
  // Placeholder: 1 tahun dari start
  endDate = addYears(contractForm.start_date, 1);
} else {
  // Gunakan contractForm.end_date jika sudah di-set, 
  // jika belum baru hitung dari durasi
  endDate = contractForm.end_date || addDays(contractForm.start_date, durationDays - 1);
}
```

### Penjelasan Perubahan

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| Sumber end_date | Selalu dihitung dari `durationDays` | Prioritaskan `contractForm.end_date` yang sudah di-set user |
| Fallback | Tidak ada | Jika `end_date` belum di-set, baru hitung dari durasi |
| Race condition | Bisa terjadi jika state belum terupdate | Aman karena langsung mengambil nilai yang user pilih |

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/RentalContracts.tsx` | Ubah logika penentuan `endDate` untuk prioritaskan `contractForm.end_date` |

