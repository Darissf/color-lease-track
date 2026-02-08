

## Fitur: Bi-Directional Sync Durasi & Tanggal Selesai

### Konsep

Saat ini:
- **Durasi (hari)** → dapat diedit → otomatis mengubah Tanggal Selesai
- **Tanggal Selesai** → hanya tampilan statis (tidak bisa diedit)

Yang diminta:
- **Durasi (hari)** → dapat diedit → otomatis mengubah Tanggal Selesai ✅
- **Tanggal Selesai** → dapat diedit → otomatis mengubah Durasi ✅

### Perubahan yang Akan Dilakukan

#### File: `src/pages/RentalContracts.tsx`

| Bagian | Sebelum | Sesudah |
|--------|---------|---------|
| UI "Tanggal Selesai" | Teks statis dalam `<div>` dengan background `bg-muted` | DatePicker dengan Popover + Calendar yang interaktif |
| Handler end_date | Tidak ada | Tambahkan fungsi untuk menghitung ulang durasi saat tanggal selesai diubah |

#### Logika Bi-Directional

```text
SKENARIO 1: User ubah durasi
─────────────────────────────
Durasi: 7 → 11 hari
Tanggal Mulai: 26 Januari 2026
↓
Tanggal Selesai = 26 Jan + (11 - 1) = 5 Februari 2026

SKENARIO 2: User ubah tanggal selesai  
────────────────────────────────────
Tanggal Selesai: 1 Feb → 5 Feb
Tanggal Mulai: 26 Januari 2026
↓
Durasi = (5 Feb - 26 Jan) + 1 = 11 hari
```

#### Implementasi UI

Ubah bagian "Tanggal Selesai" (baris ~936-948) dari tampilan statis:

```tsx
// SEBELUM - Teks statis
<div>
  <Label>Tanggal Selesai</Label>
  <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center gap-2">
    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
    <span className="font-medium">
      {format(addDays(contractForm.start_date, durationDays - 1), "PPP")}
    </span>
  </div>
</div>
```

Menjadi DatePicker interaktif:

```tsx
// SESUDAH - DatePicker interaktif
<div>
  <Label>Tanggal Selesai</Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !contractForm.end_date && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {contractForm.end_date ? format(contractForm.end_date, "PPP", { locale: localeId }) : "Pilih tanggal"}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <Calendar
        mode="single"
        selected={contractForm.end_date}
        onSelect={handleEndDateChange}
        disabled={(date) => contractForm.start_date ? date < contractForm.start_date : false}
        initialFocus
        className="pointer-events-auto"
      />
    </PopoverContent>
  </Popover>
</div>
```

#### Handler untuk End Date

```tsx
const handleEndDateChange = (newEndDate: Date | undefined) => {
  if (!newEndDate || !contractForm.start_date) return;
  
  // Hitung durasi baru = (endDate - startDate) + 1
  const newDuration = differenceInDays(newEndDate, contractForm.start_date) + 1;
  
  if (newDuration > 0) {
    setDurationDays(newDuration);
    setContractForm(prev => ({ ...prev, end_date: newEndDate }));
  }
};
```

#### Modifikasi useEffect yang Sudah Ada

Tambahkan flag untuk mencegah infinite loop saat update bi-directional:

```tsx
// useEffect yang sudah ada (baris 143-150) tetap sama
// Karena handleEndDateChange langsung set durationDays,
// tidak perlu modifikasi useEffect
```

### Validasi

| Validasi | Implementasi |
|----------|--------------|
| Tanggal selesai harus >= tanggal mulai | DatePicker Calendar dengan prop `disabled` |
| Durasi harus > 0 | Cek dalam handler sebelum update |
| Sinkronisasi 2 arah | Handler update keduanya secara atomik |

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/RentalContracts.tsx` | Ubah UI "Tanggal Selesai" dari statis ke DatePicker interaktif + handler bi-directional |

