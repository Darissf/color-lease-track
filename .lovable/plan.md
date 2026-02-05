

## Menambahkan Filter Preset Tanggal (Minggu Ini, Bulan Ini, Tahun Ini)

### Kondisi Saat Ini
Halaman List Kontrak Sewa sudah memiliki filter tanggal dengan date picker "Dari" dan "Sampai", tetapi user harus memilih tanggal secara manual setiap kali.

### Solusi
Menambahkan dropdown/select dengan preset periode waktu yang populer untuk mempercepat filtering:
- **Minggu Ini** - Dari hari Senin hingga Minggu minggu ini
- **Bulan Ini** - Dari tanggal 1 hingga akhir bulan ini  
- **Tahun Ini** - Dari 1 Januari hingga 31 Desember tahun ini
- **Custom** - Menggunakan date picker manual yang sudah ada

### Perubahan pada File

| File | Perubahan |
|------|-----------|
| `src/pages/RentalContracts.tsx` | Tambah state untuk preset dan Select dropdown |

### Detail Teknis

**1. State Baru**
```typescript
const [datePreset, setDatePreset] = useState<string>("custom");
```

**2. Handler Preset**
```typescript
const handleDatePresetChange = (preset: string) => {
  setDatePreset(preset);
  const now = getNowInJakarta();
  
  switch(preset) {
    case "this-week":
      // Senin minggu ini
      const monday = startOfWeek(now, { weekStartsOn: 1 });
      const sunday = endOfWeek(now, { weekStartsOn: 1 });
      setStartDateFilter(monday);
      setEndDateFilter(sunday);
      break;
    case "this-month":
      setStartDateFilter(startOfMonth(now));
      setEndDateFilter(endOfMonth(now));
      break;
    case "this-year":
      setStartDateFilter(startOfYear(now));
      setEndDateFilter(endOfYear(now));
      break;
    case "custom":
      // Biarkan user pilih manual
      break;
    default:
      setStartDateFilter(undefined);
      setEndDateFilter(undefined);
  }
};
```

**3. UI - Dropdown Preset (sebelum date picker)**
```jsx
<Select value={datePreset} onValueChange={handleDatePresetChange}>
  <SelectTrigger className="w-[140px]">
    <SelectValue placeholder="Pilih periode" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Semua</SelectItem>
    <SelectItem value="this-week">Minggu Ini</SelectItem>
    <SelectItem value="this-month">Bulan Ini</SelectItem>
    <SelectItem value="this-year">Tahun Ini</SelectItem>
    <SelectItem value="custom">Custom</SelectItem>
  </SelectContent>
</Select>
```

**4. Import Tambahan**
```typescript
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
```

### Flow UI
1. User melihat dropdown "Pilih periode" di sebelah label "Filter Tanggal"
2. User memilih "Bulan Ini" 
3. Otomatis date picker "Dari" terisi 1 Februari 2026 dan "Sampai" terisi 28 Februari 2026
4. Jika user pilih "Custom", date picker tetap aktif untuk input manual
5. Jika user pilih "Semua", kedua filter tanggal di-reset

### Catatan
- Menggunakan `weekStartsOn: 1` agar minggu dimulai dari Senin (standar Indonesia)
- Tetap menggunakan timezone Jakarta yang sudah distandarisasi
- Date picker manual tetap tersedia untuk fleksibilitas

