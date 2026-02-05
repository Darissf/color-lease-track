

## Tampilkan "Belum diketahui" untuk Kontrak Durasi Fleksibel

### Perubahan yang Diminta

Pada kolom Periode, jika kontrak memiliki durasi fleksibel (`is_flexible_duration = true`), maka tanggal akhir akan ditampilkan sebagai "Belum diketahui" bukan tanggal sebenarnya.

### Ilustrasi

**Sebelum:**
```
Periode
06 Feb 2026 - 08 Mar 2026 (30 hari)
```

**Sesudah (jika fleksibel):**
```
Periode
06 Feb 2026 - Belum diketahui
```

### Perubahan Teknis

**File:** `src/pages/RentalContracts.tsx`  
**Lokasi:** Baris ~1393-1400

**Kode sebelum:**
```tsx
<TableCell className={cn("text-sm whitespace-nowrap", isCompactMode && "py-1 px-2 text-xs")}>
  {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}
  {/* Sembunyikan info hari jika status Closed */}
  {!(contract.status === "selesai" && contract.tagihan_belum_bayar <= 0) && (
    <span className={cn("text-xs font-medium ml-1", remainingDays > 0 ? "text-green-600" : "text-red-600", isCompactMode && "text-[10px]")}>
      {" "}({remainingDays > 0 ? `${remainingDays} hari` : "Berakhir"})
    </span>
  )}
</TableCell>
```

**Kode sesudah:**
```tsx
<TableCell className={cn("text-sm whitespace-nowrap", isCompactMode && "py-1 px-2 text-xs")}>
  {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {(contract as any).is_flexible_duration 
    ? <span className="text-muted-foreground italic">Belum diketahui</span>
    : format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })
  }
  {/* Sembunyikan info hari jika status Closed atau durasi fleksibel */}
  {!(contract.status === "selesai" && contract.tagihan_belum_bayar <= 0) && !(contract as any).is_flexible_duration && (
    <span className={cn("text-xs font-medium ml-1", remainingDays > 0 ? "text-green-600" : "text-red-600", isCompactMode && "text-[10px]")}>
      {" "}({remainingDays > 0 ? `${remainingDays} hari` : "Berakhir"})
    </span>
  )}
</TableCell>
```

### Logika

| Kondisi | Tampilan Periode |
|---------|------------------|
| `is_flexible_duration = true` | "06 Feb 2026 - Belum diketahui" (tanpa info hari) |
| `is_flexible_duration = false` | "06 Feb 2026 - 08 Mar 2026 (30 hari)" |
| Closed + tidak fleksibel | "06 Feb 2026 - 08 Mar 2026" (tanpa info hari) |

### Styling

- Teks "Belum diketahui" menggunakan warna `text-muted-foreground` dan style `italic` agar terlihat berbeda
- Info hari (X hari / Berakhir) disembunyikan untuk kontrak fleksibel karena tidak relevan

