

## Auto-fill Tanggal Mulai dengan Tanggal Hari Ini (WITA)

### Masalah Saat Ini

Saat membuka form "Tambah Kontrak", kolom tanggal mulai (start_date) kosong (`undefined`). User harus memilih tanggal secara manual setiap kali.

### Solusi

Otomatis isi `start_date` dengan tanggal hari ini berdasarkan zona waktu Denpasar/Bali (WITA) menggunakan fungsi `getNowInWITA()` yang sudah tersedia.

### Detail Teknis

Perubahan hanya di **1 file**: `src/pages/RentalContracts.tsx`

**2 tempat yang diubah:**

1. **State awal form** (line 133) -- saat halaman pertama kali dimuat:
```
SEBELUM: start_date: undefined as Date | undefined,
SESUDAH: start_date: getNowInWITA(),
```

2. **Reset form** (line 493) -- saat user klik "Tambah Kontrak" setelah sebelumnya edit kontrak lain:
```
SEBELUM: start_date: undefined,
SESUDAH: start_date: getNowInWITA(),
```

Import `getNowInWITA` (atau alias `getNowInJakarta`) sudah tersedia di file ini, jadi tidak perlu tambah import baru.

### Hasil

- Buka form tambah kontrak: tanggal mulai langsung terisi tanggal hari ini (WITA)
- User tetap bisa mengubah tanggal jika diperlukan
- Durasi dan tanggal selesai juga akan otomatis terhitung setelah tanggal mulai terisi

