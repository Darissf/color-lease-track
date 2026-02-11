

## Rencana: Fix Error Tanggal Selesai pada Durasi Tetap

### Masalah yang Ditemukan

Setelah menganalisis kode di `src/pages/RentalContracts.tsx`, ditemukan **race condition** antara Calendar onSelect dan useEffect:

```
1. User pilih tanggal selesai di Calendar
   → onSelect: setDurationDays(newDuration) + setContractForm(end_date: newEndDate)

2. useEffect LANGSUNG TERPICU karena durationDays berubah
   → Recalculate: end_date = addDays(start_date, durationDays - 1)
   → MENIMPA end_date yang baru saja di-set user
```

Ini menyebabkan tanggal selesai "berkedip" atau menampilkan error karena state berubah dua kali secara cepat.

### Solusi

Tambahkan flag untuk mencegah useEffect menimpa end_date yang dipilih manual via Calendar.

### Perubahan di `src/pages/RentalContracts.tsx`

#### 1. Tambah ref untuk tracking sumber perubahan

```tsx
// Tambah state/ref baru
const [endDateManuallySet, setEndDateManuallySet] = useState(false);
```

#### 2. Update useEffect agar skip jika end_date baru saja di-set manual

```tsx
// SEBELUM:
useEffect(() => {
  if (durationMode === 'fixed' && contractForm.start_date && durationDays > 0) {
    const calculatedEndDate = addDays(contractForm.start_date, durationDays - 1);
    setContractForm(prev => ({ ...prev, end_date: calculatedEndDate }));
  }
}, [contractForm.start_date, durationDays, durationMode]);

// SESUDAH:
useEffect(() => {
  if (endDateManuallySet) {
    setEndDateManuallySet(false);
    return; // Skip - end_date sudah di-set oleh Calendar onSelect
  }
  if (durationMode === 'fixed' && contractForm.start_date && durationDays > 0) {
    const calculatedEndDate = addDays(contractForm.start_date, durationDays - 1);
    setContractForm(prev => ({ ...prev, end_date: calculatedEndDate }));
  }
}, [contractForm.start_date, durationDays, durationMode]);
```

#### 3. Update Calendar onSelect agar set flag

```tsx
// SEBELUM:
onSelect={(newEndDate) => {
  if (!newEndDate || !contractForm.start_date) return;
  const newDuration = differenceInDays(newEndDate, contractForm.start_date) + 1;
  if (newDuration > 0) {
    setDurationDays(newDuration);
    setContractForm(prev => ({ ...prev, end_date: newEndDate }));
  }
}}

// SESUDAH:
onSelect={(newEndDate) => {
  if (!newEndDate || !contractForm.start_date) return;
  const newDuration = differenceInDays(newEndDate, contractForm.start_date) + 1;
  if (newDuration > 0) {
    setEndDateManuallySet(true); // Cegah useEffect menimpa
    setDurationDays(newDuration);
    setContractForm(prev => ({ ...prev, end_date: newEndDate }));
  }
}}
```

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/RentalContracts.tsx` | Tambah flag `endDateManuallySet`, update useEffect dan Calendar onSelect |

### Hasil Setelah Fix

1. Mengubah durasi (hari) → Tanggal selesai otomatis dihitung (seperti biasa)
2. Memilih tanggal di Calendar → Durasi otomatis dihitung, tanggal TIDAK ditimpa oleh useEffect
3. Tidak ada lagi error atau "kedip" pada tanggal selesai

