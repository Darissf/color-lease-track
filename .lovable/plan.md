
## Sinkronisasi Perpanjangan Kontrak: Status, Stok, dan Riwayat Gudang

### Analisis Kondisi Saat Ini

Setelah memeriksa kode, berikut yang **sudah** dan **belum** dilakukan:

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Invoice lama di-update saat perpanjangan | Sudah ada | Tapi selalu jadi `selesai`, tidak mempertimbangkan hutang |
| Stok barang di-copy ke invoice baru | Sudah ada | `source_stock_item_id` dan `extended_to_contract_id` sudah di-set |
| Movement "extension" di inventory | Sudah ada | Tercatat dengan warna ungu di timeline |
| Status kontrak lama "closed" vs "selesai" | **Belum** | Selalu `selesai`, belum cek saldo hutang |
| Badge "Dipindahkan ke perpanjangan" di riwayat | **Belum** | Sidebar stok gudang belum menampilkan info transfer |
| Fetch `extended_to_contract_id` di riwayat | **Belum** | Data transfer belum di-query |

### Rencana Perubahan

#### 1. Status Kontrak Lama Berdasarkan Hutang

**File: `src/components/contracts/ExtendContractDialog.tsx`**

Saat ini (baris 259-272):
```text
status selalu = 'selesai'
```

Akan diubah menjadi:
- Jika `tagihan_belum_bayar` = 0 (atau hutang ditransfer) --> status = `'selesai'` (yang otomatis menjadi "Closed" karena balance = 0)
- Jika ada hutang yang belum dibayar dan tidak ditransfer --> status tetap `'selesai'` tapi balance tetap ada (jadi belum "Closed")

Catatan: Berdasarkan aturan sistem yang ada, "Closed" = status `selesai` + `tagihan_belum_bayar` = 0. Jadi logika ini sudah benar secara konsep. Yang perlu ditambahkan adalah mengubah status menjadi `'perpanjangan'` agar di riwayat terlihat jelas bahwa kontrak ini sudah diperpanjang (bukan sekadar selesai biasa).

Perubahan:
- Jika tidak ada hutang (balance = 0) atau hutang ditransfer --> status = `'perpanjangan'`
- Jika ada hutang belum dibayar dan tidak ditransfer --> status = `'selesai'`

#### 2. Badge "Diperpanjang" di Riwayat Kontrak Sidebar

**File: `src/components/inventory/ItemContractHistory.tsx`**

Tambahkan penanganan status `perpanjangan` di fungsi `getStatusBadge`:
```text
perpanjangan --> badge ungu "Diperpanjang"
```

Dan tambahkan info invoice perpanjangan di bawah status, misalnya: "Dipindahkan ke invoice 000105"

#### 3. Fetch Data Transfer di Query Riwayat

**File: `src/components/inventory/InventoryItemHistory.tsx`**

- Tambahkan `extended_to_contract_id` ke query `contract_stock_items`
- Jika ada `extended_to_contract_id`, fetch invoice perpanjangan untuk ditampilkan
- Tambahkan field `extended_to_invoice` ke `ContractRecord` interface
- Pass data ini ke komponen `ItemContractHistory`

#### 4. Tampilan Info Transfer di ItemContractHistory

**File: `src/components/inventory/ItemContractHistory.tsx`**

- Tambah prop `extended_to_invoice` di `ContractRecord` interface
- Tampilkan teks "Dipindahkan ke invoice [XXX]" di bawah info kontrak jika ada data transfer
- Gunakan warna ungu konsisten dengan tema perpanjangan

### Detail Teknis

**ExtendContractDialog.tsx** - Ubah logika status (baris 259-272):
```text
Sebelum:  status selalu 'selesai'
Sesudah:  
  - Jika balance = 0 atau transferUnpaidBalance = true --> 'perpanjangan'
  - Jika ada sisa hutang dan tidak ditransfer --> 'selesai'
```

**InventoryItemHistory.tsx** - Tambah field di query dan interface:
```text
- Query: tambah extended_to_contract_id
- Jika ada extended_to_contract_id, fetch invoice tujuan dari rental_contracts
- ContractRecord: tambah extended_to_invoice?: string
```

**ItemContractHistory.tsx** - Tambah badge dan info:
```text
- getStatusBadge: handle 'perpanjangan' --> badge ungu
- Tampilkan "Dipindahkan ke [invoice]" di bawah status
```

### Hasil yang Diharapkan

- Kontrak yang diperpanjang tanpa hutang --> status "Diperpanjang" (ungu)
- Kontrak yang diperpanjang dengan hutang belum lunas --> status "Selesai" (hijau)
- Di sidebar stok gudang, riwayat kontrak menampilkan info transfer: "Dipindahkan ke invoice 000105"
- Timeline tetap menampilkan movement "extension" dengan warna ungu
