

## Fix: Kolom "Tanggal" di List Kontrak Otomatis Terisi Saat Tambah Kontrak

### Masalah

Saat kontrak baru dibuat, kolom **"Tanggal"** di tabel list kontrak selalu kosong (menampilkan "Pilih"). Ini karena field `tanggal` tidak dimasukkan ke data yang disimpan ke database.

Field `tanggal` adalah kolom terpisah dari `start_date` — ini adalah kolom yang tampil di tabel list kontrak.

### Solusi

Tambahkan field `tanggal` ke data kontrak saat menyimpan, diisi otomatis dengan tanggal hari ini berdasarkan zona waktu Denpasar/Bali (WITA).

### Detail Teknis

**File: `src/pages/RentalContracts.tsx`**

Pada objek `baseContractData` (sekitar line 356-370), tambahkan field `tanggal`:

```
SEBELUM:
const baseContractData = {
  user_id: user?.id as string,
  client_group_id: contractForm.client_group_id,
  start_date: format(contractForm.start_date, "yyyy-MM-dd"),
  ...
  is_flexible_duration: durationMode === 'flexible',
};

SESUDAH:
const baseContractData = {
  user_id: user?.id as string,
  client_group_id: contractForm.client_group_id,
  start_date: format(contractForm.start_date, "yyyy-MM-dd"),
  ...
  is_flexible_duration: durationMode === 'flexible',
  tanggal: format(getNowInJakarta(), "yyyy-MM-dd"),  // Auto-fill tanggal input (WITA)
};
```

Ini akan mengisi kolom "Tanggal" dengan tanggal saat kontrak dibuat, menggunakan zona waktu WITA. Untuk kontrak yang diedit, tanggal juga akan diperbarui (jika diinginkan, bisa dibatasi hanya untuk kontrak baru).

### Hasil

- Tambah kontrak baru: kolom "Tanggal" langsung terisi tanggal hari ini (WITA)
- Tidak perlu lagi klik manual untuk mengisi tanggal di tabel list
