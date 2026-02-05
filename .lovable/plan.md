

## Hapus Tulisan "Berakhir" untuk Status Closed

### Perubahan yang Diminta

Pada kolom Periode, tulisan "(Berakhir)" akan disembunyikan jika kontrak berstatus **Closed** (yaitu status "selesai" DAN tagihan_belum_bayar <= 0).

### Ilustrasi

**Sebelum:**
```
Periode                           Status
25 Jan 2026 - 29 Jan 2026 (Berakhir)   [Closed]
```

**Sesudah:**
```
Periode                           Status
25 Jan 2026 - 29 Jan 2026              [Closed]
```

### Perubahan Teknis

**File:** `src/pages/RentalContracts.tsx`  
**Lokasi:** Baris ~1371-1375

**Kode sebelum:**
```tsx
<TableCell className={cn("text-sm whitespace-nowrap", isCompactMode && "py-1 px-2 text-xs")}>
  {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}{" "}
  <span className={cn("text-xs font-medium ml-1", remainingDays > 0 ? "text-green-600" : "text-red-600", isCompactMode && "text-[10px]")}>
    ({remainingDays > 0 ? `${remainingDays} hari` : "Berakhir"})
  </span>
</TableCell>
```

**Kode sesudah:**
```tsx
<TableCell className={cn("text-sm whitespace-nowrap", isCompactMode && "py-1 px-2 text-xs")}>
  {format(new Date(contract.start_date), "dd MMM yyyy", { locale: localeId })} - {format(new Date(contract.end_date), "dd MMM yyyy", { locale: localeId })}
  {/* Sembunyikan info hari jika status Closed */}
  {!(contract.status === "selesai" && contract.tagihan_belum_bayar <= 0) && (
    <span className={cn("text-xs font-medium ml-1", remainingDays > 0 ? "text-green-600" : "text-red-600", isCompactMode && "text-[10px]")}>
      ({remainingDays > 0 ? `${remainingDays} hari` : "Berakhir"})
    </span>
  )}
</TableCell>
```

### Logika

| Status | Kondisi | Tampilan |
|--------|---------|----------|
| Closed | status="selesai" && tagihan_belum_bayar <= 0 | Hanya tanggal, tanpa "(Berakhir)" |
| Lainnya | Semua kondisi lain | Tampilkan "(X hari)" atau "(Berakhir)" |

