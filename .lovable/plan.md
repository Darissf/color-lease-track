
## Fix: Riwayat Kontrak Kosong di Sidebar Stok Barang

### Masalah

Saat membuka riwayat barang (misalnya Catwalk) di sidebar stok, tab "Riwayat Kontrak" dan "Timeline" selalu kosong padahal data ada di database.

### Penyebab

Tabel `contract_stock_items` memiliki **2 foreign key** ke `rental_contracts`:
- `contract_id` (FK utama)
- `extended_to_contract_id` (FK untuk perpanjangan)

Akibatnya, query Supabase `.select('..., rental_contracts(...)')` gagal karena PostgREST tidak bisa menentukan FK mana yang dimaksud (ambiguity error). Query gagal, error ditangkap oleh catch block, dan data tetap kosong.

### Solusi

Tambahkan hint FK eksplisit pada query di `InventoryItemHistory.tsx` agar PostgREST tahu FK mana yang digunakan.

### Detail Teknis

**File: `src/components/inventory/InventoryItemHistory.tsx`**

Ubah embedded select dari:
```
rental_contracts (
  id, invoice, start_date, end_date, status, lokasi_detail,
  client_groups ( nama )
)
```

Menjadi:
```
rental_contracts!contract_stock_items_contract_id_fkey (
  id, invoice, start_date, end_date, status, lokasi_detail,
  client_groups ( nama )
)
```

Ini memberitahu PostgREST untuk menggunakan FK `contract_id` (bukan `extended_to_contract_id`) saat melakukan join.

### Hasil

- Tab "Riwayat Kontrak" akan menampilkan semua kontrak yang menggunakan barang tersebut
- Tab "Timeline" akan menampilkan semua pergerakan barang
- Tidak ada perubahan di bagian lain aplikasi
