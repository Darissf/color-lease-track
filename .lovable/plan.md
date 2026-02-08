

## Perbaikan: Perhitungan Sisa Hari dan Teks Status

### Masalah 1: Perhitungan Inklusif

**Sekarang (salah):**
```
Hari ini: 8 Feb
Berakhir: 10 Feb
differenceInDays(10 Feb, 8 Feb) = 2 hari ❌
```

**Seharusnya (inklusif - termasuk hari ini):**
```
Hari ini: 8 Feb
Berakhir: 10 Feb
Sisa = 8, 9, 10 = 3 hari lagi ✓
```

**Rumus baru:**
```typescript
remainingDays = differenceInDays(endDate, today) + 1
```

### Masalah 2: Teks Status

| Kondisi | Sekarang | Harus Jadi |
|---------|----------|------------|
| Masih aktif | "3 hari" | "3 Hari Lagi" |
| Hari terakhir | - | "Berakhir Hari Ini" |
| Sudah lewat | "Berakhir" | "Berakhir" (merah kedip) |

### Perubahan Kode

#### File: `src/pages/RentalContracts.tsx`

**1. Update fungsi `getRemainingDays` (baris 449-451):**

```typescript
// SEBELUM
const getRemainingDays = (endDate: string) => {
  return differenceInDays(new Date(endDate), new Date());
};

// SESUDAH - Inklusif (termasuk hari ini)
const getRemainingDays = (endDate: string) => {
  const now = getNowInJakarta();
  const end = new Date(endDate);
  // +1 karena hari ini juga dihitung
  return differenceInDays(end, now) + 1;
};
```

**Contoh perhitungan baru:**
| Hari Ini | Berakhir | Rumus | Hasil |
|----------|----------|-------|-------|
| 8 Feb | 10 Feb | (10-8) + 1 | 3 Hari Lagi |
| 8 Feb | 8 Feb | (8-8) + 1 | 1 (Berakhir Hari Ini) |
| 9 Feb | 8 Feb | (8-9) + 1 | 0 (Berakhir) |

**Catatan:** Dengan rumus baru:
- `remainingDays >= 2` → "X Hari Lagi" (hijau)
- `remainingDays === 1` → "Berakhir Hari Ini" (orange)
- `remainingDays <= 0` → "Berakhir" (merah kedip)

**2. Update tampilan status (baris ~1427-1431):**

```tsx
// SESUDAH
{!(contract.status === "selesai" && contract.tagihan_belum_bayar <= 0) && 
 !(contract as any).is_flexible_duration && (
  <span className={cn(
    "text-xs font-medium ml-1",
    remainingDays >= 2 ? "text-green-600" : 
    remainingDays === 1 ? "text-orange-500" :
    "text-red-600 animate-pulse",
    isCompactMode && "text-[10px]"
  )}>
    {" "}({remainingDays >= 2 
      ? `${remainingDays} Hari Lagi` 
      : remainingDays === 1 
        ? "Berakhir Hari Ini" 
        : "Berakhir"})
  </span>
)}
```

### Visualisasi Hasil

```text
┌────────────────────────────────────────────────────────────────────┐
│ Periode                                                            │
├────────────────────────────────────────────────────────────────────┤
│ 28 Jan 2026 - 10 Feb 2026 (3 Hari Lagi)    ← Hijau, masih aktif    │
│ 26 Jan 2026 - 08 Feb 2026 (Berakhir Hari Ini) ← Orange, hari ini   │
│ 26 Jan 2026 - 07 Feb 2026 (Berakhir)       ← Merah kedip, urgent   │
└────────────────────────────────────────────────────────────────────┘
```

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/RentalContracts.tsx` | Update `getRemainingDays` untuk perhitungan inklusif + update teks menjadi "X Hari Lagi" |

