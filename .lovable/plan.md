

## Perbaikan Fitur Perpanjangan - Copy Data Gagal

### Hasil Investigasi

**Database Evidence:**
| Kontrak | Line Items | Stock Items | Groups |
|---------|------------|-------------|--------|
| 000284 (Parent) | 7 ✅ | 7 ✅ | 1 ✅ |
| 000301 (Extension) | 0 ❌ | 0 ❌ | 1 ✅ |

**Database Error Log:**
```
Timestamp: 2026-02-09 01:15:42.584 UTC (saat perpanjangan dibuat)
Error: cannot insert a non-DEFAULT value into column "subtotal"
```

**Root Cause:**
Error terjadi karena kode mencoba insert nilai ke kolom `subtotal` yang merupakan **generated column**. Groups berhasil tercopy (tidak ada kolom generated), tapi line items gagal karena error subtotal.

### Masalah Teridentifikasi

Setelah memeriksa kode terbaru di `ExtendContractDialog.tsx`, ternyata **kode sudah benar** - `subtotal` sudah tidak ada dalam mapping. Namun error terjadi pada 01:15:42 UTC, yang berarti:

- **Browser user menggunakan versi JavaScript yang ter-cache (lama)** saat membuat perpanjangan
- Versi lama masih mengirimkan `subtotal` ke database

### Solusi

**Langkah 1: Verifikasi Kode (Sudah Benar)**

Kode saat ini (baris 327-344) sudah benar:
```typescript
const newLineItems = lineItems.map(item => ({
  user_id: user.id,
  contract_id: newContract.id,
  item_name: item.item_name,
  quantity: item.quantity,
  unit_price_per_day: item.unit_price_per_day,
  duration_days: item.duration_days,
  // subtotal TIDAK disertakan
  unit_mode: item.unit_mode || 'pcs',
  pcs_per_set: item.pcs_per_set || 1,
  inventory_item_id: item.inventory_item_id || null,
  group_id: item.group_id ? groupIdMap[item.group_id] : null,
  sort_order: item.sort_order || 0,
}));
```

**Langkah 2: Hard Refresh Browser**

User perlu melakukan hard refresh untuk mendapatkan kode terbaru:
- **Windows/Linux**: Ctrl + Shift + R
- **Mac**: Cmd + Shift + R
- Atau klik kanan pada tombol Refresh → "Hard Reload"

**Langkah 3: Hapus Perpanjangan Lama & Buat Ulang**

1. Hapus kontrak 000301 yang gagal
2. Buat perpanjangan baru dari 000284
3. Verifikasi bahwa line items dan stock items tercopy

### Peningkatan Tambahan (Opsional)

Untuk mencegah masalah serupa di masa depan, saya rekomendasikan:

**1. Tambahkan Error Toast yang Lebih Jelas**

Saat ini jika error terjadi, pesan generik ditampilkan. Bisa diperbaiki untuk menunjukkan apa yang gagal.

**2. Cleanup Orphan Groups**

Jika line items gagal tercopy tapi groups berhasil, bersihkan groups yang orphan.

### File yang Sudah Diperbaiki

| File | Status |
|------|--------|
| `ExtendContractDialog.tsx` | ✅ Sudah benar - `subtotal` tidak ada dalam insert mapping |

### Yang Perlu User Lakukan

1. **Hard refresh browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Hapus kontrak 000301** dari database atau UI
3. **Buat ulang perpanjangan** dari kontrak 000284
4. **Verifikasi** bahwa toast menampilkan jumlah item tercopy (misal: "7 rincian item dan 7 stok tercopy")

### Catatan Teknis

Kode terbaru yang sudah di-deploy akan:
- Menampilkan log console `[Extension] Successfully copied X line items`
- Menampilkan toast dengan jumlah item yang berhasil tercopy
- Throw error dengan pesan jelas jika insert gagal

