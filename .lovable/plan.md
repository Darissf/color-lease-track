

## Fix: Sinkronisasi Data Lama dan Perbaikan Badge Logic

### Masalah yang Ditemukan

1. **Data lama belum terupdate** - Kontrak yang sudah diperpanjang sebelum perubahan kode masih berstatus `selesai`, bukan `perpanjangan`:
   - Invoice 000284 (diperpanjang ke 000301) - status: `selesai`
   - Invoice 0000000 (diperpanjang ke 000299) - status: `selesai`

2. **Badge logic salah urutan** - Di `getStatusBadge`, pengecekan `returnedAt` ada di baris setelah `perpanjangan`, tapi karena data lama statusnya `selesai`, badge tetap hijau. Lebih penting lagi: jika ada `extended_to_invoice`, seharusnya badge otomatis ungu tanpa bergantung pada field `status`.

### Rencana Perbaikan

#### 1. Update Data Lama (SQL Migration)

Update semua kontrak yang memiliki perpanjangan (ada di `parent_contract_id` kontrak lain) tapi masih berstatus `selesai`:

```sql
UPDATE rental_contracts 
SET status = 'perpanjangan'
WHERE id IN (
  SELECT DISTINCT parent_contract_id 
  FROM rental_contracts 
  WHERE parent_contract_id IS NOT NULL
)
AND status = 'selesai';
```

#### 2. Perbaikan Badge Logic

**File: `src/components/inventory/ItemContractHistory.tsx`**

Ubah `getStatusBadge` agar juga memperhitungkan `extended_to_invoice`:

```text
Sebelum: hanya cek status === 'perpanjangan'
Sesudah: cek status === 'perpanjangan' ATAU ada extended_to_invoice
```

Ini memastikan bahwa meskipun status di DB belum terupdate, keberadaan data transfer di `contract_stock_items` sudah cukup untuk menampilkan badge ungu.

Perubahan signature fungsi:
```text
getStatusBadge(status, returnedAt) 
  -> getStatusBadge(status, returnedAt, extendedToInvoice)
```

Logika baru:
```text
1. Jika status === 'perpanjangan' ATAU extendedToInvoice ada -> badge ungu "Diperpanjang"
2. Jika status === 'selesai' ATAU returnedAt ada -> badge hijau "Selesai"
3. Jika status === 'masa sewa' -> badge kuning "Sedang Disewa"
4. Default -> badge outline
```

### Hasil

- Kontrak lama yang sudah diperpanjang akan terupdate statusnya di database
- Sidebar stok gudang menampilkan badge ungu "Diperpanjang" + info "Dipindahkan ke invoice XXX"
- Logic badge lebih robust karena tidak hanya bergantung pada field `status`

