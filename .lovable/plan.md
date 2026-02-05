

## Tambah Checkbox "Hide Closed" pada List Kontrak Sewa

### Perubahan yang Diminta

Menambahkan checkbox dengan label "Hide Closed" di area filter. Ketika dicentang, semua kontrak dengan status **Closed** (status "selesai" DAN tagihan_belum_bayar <= 0) akan disembunyikan dari daftar.

### Ilustrasi

**Area Filter (setelah perubahan):**
```
Sort By: [Tidak Ada ▼] [↑]   Cari Invoice: [________]   Filter Tanggal: [Semua ▼]   ☑ Hide Closed
```

### Perubahan Teknis

**File:** `src/pages/RentalContracts.tsx`

#### 1. Tambah State Baru (sekitar baris 102)

```typescript
const [hideClosedContracts, setHideClosedContracts] = useState(false);
```

#### 2. Update Filter Logic di `sortedContracts` useMemo (sekitar baris 534-581)

Tambahkan filter untuk hide closed contracts:

```typescript
let filtered = rentalContracts.filter(contract => {
  // NEW: Hide closed contracts if checkbox is checked
  if (hideClosedContracts) {
    const isClosed = contract.status === "selesai" && (contract.tagihan_belum_bayar ?? 0) <= 0;
    if (isClosed) return false;
  }
  
  // ...existing filters...
});
```

Dan tambahkan ke dependency array:
```typescript
}, [rentalContracts, sortBy, sortOrder, clientGroups, startDateFilter, endDateFilter, invoiceSearch, statusFilter, hideClosedContracts]);
```

#### 3. Tambah UI Checkbox (sekitar baris 1138, setelah Invoice Search)

```tsx
{/* Hide Closed Checkbox - hanya tampil jika filter status adalah "all" */}
{(!statusFilter || statusFilter === "all") && (
  <div className="flex items-center gap-2">
    <Checkbox
      id="hide-closed"
      checked={hideClosedContracts}
      onCheckedChange={(checked) => setHideClosedContracts(checked === true)}
    />
    <Label htmlFor="hide-closed" className="cursor-pointer text-sm">
      Hide Closed
    </Label>
  </div>
)}
```

#### 4. Import Checkbox Component

```typescript
import { Checkbox } from "@/components/ui/checkbox";
```

### Catatan

- Checkbox hanya ditampilkan saat filter status adalah "all" (halaman semua kontrak)
- Jika user sudah di halaman filter khusus (misal: /closed atau /masa-sewa), checkbox tidak perlu muncul karena sudah difilter berdasarkan status
- State `hideClosedContracts` default `false` (tidak dicentang)

### Ringkasan

| Aspek | Detail |
|-------|--------|
| Lokasi UI | Setelah input "Cari Invoice" di baris filter pertama |
| Kondisi tampil | Hanya saat `statusFilter === "all"` atau tidak ada filter status |
| Logika filter | Hide jika `status === "selesai" && tagihan_belum_bayar <= 0` |
| Default value | Tidak dicentang (false) |

