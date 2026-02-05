

## Tambah Indikator "Diperpanjang" pada Kontrak Awal

### Masalah
Saat ini hanya kontrak perpanjangan (extension) yang menampilkan badge "P1", "P2", dll. Kontrak awal (original) yang sudah diperpanjang tidak memiliki indikator apapun.

### Solusi
Menambahkan logika untuk mengecek apakah suatu kontrak memiliki kontrak anak (diperpanjang), dan menampilkan badge khusus jika ya.

### Ilustrasi

**Sebelum:**
```
Invoice       Status
0000000       [Selesai]           ← Tidak ada indikator
000299        [Masa Sewa] [P1]    ← Ada indikator P1
```

**Sesudah:**
```
Invoice       Status
0000000       [Selesai] [Diperpanjang]    ← Ada indikator baru!
000299        [Masa Sewa] [P1]            ← Tetap sama
```

---

### Detail Teknis

#### 1. Membuat Set/Map untuk Kontrak yang Diperpanjang

Di dalam komponen, buat useMemo untuk menghitung kontrak mana yang punya child:

```typescript
// Set berisi ID kontrak yang memiliki perpanjangan (child)
const contractsWithExtensions = useMemo(() => {
  const parentIds = new Set<string>();
  rentalContracts.forEach(contract => {
    if (contract.parent_contract_id) {
      parentIds.add(contract.parent_contract_id);
    }
  });
  return parentIds;
}, [rentalContracts]);
```

#### 2. Update Tampilan Badge di Table Row

Di bagian status cell (baris ~1403-1409), tambah kondisi baru:

```tsx
{/* Badge untuk kontrak yang sudah diperpanjang (punya child) */}
{contractsWithExtensions.has(contract.id) && (
  <Badge variant="outline" className={cn(
    "text-orange-600 border-orange-300 whitespace-nowrap", 
    isCompactMode && "text-[10px] px-1 py-0"
  )}>
    <Link2 className={cn("mr-1", isCompactMode ? "h-2 w-2" : "h-3 w-3")} />
    Perpanjangan
  </Badge>
)}

{/* Existing Extension Badge (P1, P2, dll) */}
{((contract as any).extension_number ?? 0) > 0 && (
  <Badge variant="outline" className={cn(
    "text-purple-600 border-purple-300 whitespace-nowrap", 
    isCompactMode && "text-[10px] px-1 py-0"
  )}>
    <Link2 className={cn("mr-1", isCompactMode ? "h-2 w-2" : "h-3 w-3")} />
    P{(contract as any).extension_number}
  </Badge>
)}
```

---

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/RentalContracts.tsx` | Tambah useMemo untuk track parent contracts, tambah badge "Perpanjangan" |

### Styling Badge

| Kontrak | Badge | Warna |
|---------|-------|-------|
| Original yang diperpanjang | "Perpanjangan" | Orange (text-orange-600, border-orange-300) |
| Extension level 1 | "P1" | Purple (tetap sama) |
| Extension level 2+ | "P2", "P3", ... | Purple (tetap sama) |

