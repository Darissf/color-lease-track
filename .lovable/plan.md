

## Dashboard Kontrak Sewa dengan Navigasi Status

### Deskripsi
Membuat halaman dashboard baru yang muncul ketika user mengklik "List Kontrak Sewa" di sidebar. Dashboard ini menampilkan statistik ringkasan kontrak dan opsi navigasi ke berbagai filter status.

### Struktur Baru

```
/vip/rental-contracts → Dashboard Kontrak (Halaman Baru)
  ├── Statistik Cards (atas)
  │   ├── Total Invoice
  │   ├── Masa Sewa (Aktif)
  │   ├── Closed (Selesai & Lunas)
  │   ├── Perpanjangan
  │   ├── Pending
  │   └── Selesai (Belum Lunas)
  │
  └── Pilihan Navigasi (bawah)
      ├── Semua Kontrak → /vip/rental-contracts/all
      ├── Masa Sewa → /vip/rental-contracts/masa-sewa
      ├── Closed → /vip/rental-contracts/closed
      ├── Perpanjangan → /vip/rental-contracts/perpanjangan
      ├── Pending → /vip/rental-contracts/pending
      └── Selesai → /vip/rental-contracts/selesai

/vip/rental-contracts/all → Halaman list kontrak (yang sudah ada, tanpa filter)
/vip/rental-contracts/:status → Halaman list kontrak dengan filter status
```

### File yang Akan Dibuat

| File | Deskripsi |
|------|-----------|
| `src/pages/RentalContractsDashboard.tsx` | Dashboard baru dengan statistik dan navigasi status |

### File yang Akan Diubah

| File | Perubahan |
|------|-----------|
| `src/App.tsx` | Tambah route baru untuk dashboard dan sub-routes dengan filter status |
| `src/pages/RentalContracts.tsx` | Tambah dukungan untuk menerima parameter filter status dari URL |
| `src/components/Layout.tsx` | Update link sidebar ke dashboard baru |

### Detail UI Dashboard

**Statistik Cards (Grid 2x3 atau 3x2):**
1. **Total Invoice** - Jumlah semua kontrak
2. **Masa Sewa** - Kontrak dengan status "masa sewa" (warna biru)
3. **Closed** - Status "selesai" DAN tagihan_belum_bayar = 0 (warna merah)
4. **Perpanjangan** - Status "perpanjangan" (warna ungu)
5. **Pending** - Status "pending" (warna kuning)
6. **Selesai** - Status "selesai" tapi masih ada sisa tagihan (warna hijau)

**Pilihan Navigasi (Cards/Buttons di bawah):**
- Grid cards dengan icon dan jumlah
- Klik langsung menuju list dengan filter yang sudah diterapkan
- Opsi "Semua" untuk melihat semua kontrak tanpa filter

### Detail Teknis

**1. RentalContractsDashboard.tsx**
```typescript
// Fetch count untuk setiap status
const { data } = await supabase
  .from("rental_contracts")
  .select("status, tagihan_belum_bayar")
  .eq("user_id", user?.id);

// Hitung statistik
const stats = {
  total: data.length,
  masaSewa: data.filter(c => c.status === "masa sewa").length,
  closed: data.filter(c => c.status === "selesai" && c.tagihan_belum_bayar <= 0).length,
  perpanjangan: data.filter(c => c.status === "perpanjangan").length,
  pending: data.filter(c => c.status === "pending").length,
  selesai: data.filter(c => c.status === "selesai" && c.tagihan_belum_bayar > 0).length,
};
```

**2. RentalContracts.tsx - Perubahan**
```typescript
// Terima parameter status dari URL
const { status } = useParams<{ status?: string }>();

// Filter berdasarkan status
const filteredByStatus = useMemo(() => {
  if (!status || status === "all") return rentalContracts;
  
  if (status === "closed") {
    return rentalContracts.filter(c => 
      c.status === "selesai" && c.tagihan_belum_bayar <= 0
    );
  }
  
  // Convert URL param ke status database
  const statusMap = {
    "masa-sewa": "masa sewa",
    "perpanjangan": "perpanjangan",
    "pending": "pending",
    "selesai": "selesai"
  };
  
  return rentalContracts.filter(c => c.status === statusMap[status]);
}, [rentalContracts, status]);
```

**3. App.tsx - Routes Baru**
```typescript
<Route path="/rental-contracts" element={<RentalContractsDashboard />} />
<Route path="/rental-contracts/:status" element={<RentalContracts />} />
```

### Flow Pengguna
1. User klik "List Kontrak Sewa" di sidebar
2. Muncul dashboard dengan statistik (jumlah per kategori)
3. User memilih kategori yang diinginkan (misal "Masa Sewa")
4. Langsung diarahkan ke list kontrak yang sudah terfilter
5. Ada tombol "Kembali ke Dashboard" di halaman list

