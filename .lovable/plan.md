

## Hapus Label "Berakhir" untuk Kontrak Berstatus Perpanjangan

### Masalah

Di halaman list kontrak, kontrak berstatus **perpanjangan** masih menampilkan tulisan merah berkedip **(Berakhir)** di kolom tanggal. Ini tidak relevan karena kontrak tersebut memang sudah diperpanjang ke invoice baru.

### Solusi

**File: `src/pages/RentalContracts.tsx`** (baris 1539)

Tambahkan pengecekan `contract.status === "perpanjangan"` ke kondisi yang sudah ada, sehingga label hari sisa (termasuk "Berakhir") disembunyikan untuk kontrak perpanjangan.

```text
Sebelum:
{!(contract.status === "selesai" && contract.tagihan_belum_bayar <= 0) && ...}

Sesudah:
{!(contract.status === "selesai" && contract.tagihan_belum_bayar <= 0) && contract.status !== "perpanjangan" && ...}
```

Perubahan hanya 1 baris, menambahkan `&& contract.status !== "perpanjangan"`.

