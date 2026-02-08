

## Perbaikan: 2 Masalah yang Ditemukan

### Masalah 1: Invoice 000301 Tidak Dipakai Ulang

**Penyebab:**
Kontrak dengan invoice 000301 dihapus **SEBELUM** fitur reuse invoice diimplementasikan hari ini. Karena fitur baru saja ditambahkan, nomor 000301 tidak masuk ke pool `deleted_invoice_numbers`.

**Solusi:**
Masukkan nomor 000301 secara manual ke pool agar bisa digunakan kontrak berikutnya.

```sql
-- Masukkan 000301 ke pool reuse
INSERT INTO deleted_invoice_numbers (user_id, invoice_number, invoice_sequence)
VALUES (
  (SELECT id FROM auth.users WHERE id = 'USER_ID_ANDA'), 
  '000301', 
  301
);
```

Atau saya bisa melakukan migrasi otomatis yang mendeteksi "gap" di invoice sequence dan memasukkannya ke pool.

### Masalah 2: Pencarian Client Tidak Berfungsi dengan Partial Match

**Penyebab:**
Di baris 846, `CommandItem` menggunakan `value={group.id}` (UUID) untuk filtering:

```tsx
<CommandItem
  key={group.id}
  value={group.id}  // ❌ Menggunakan UUID, bukan nama
  onSelect={() => {...}}
>
```

Library `cmdk` mencari berdasarkan `value`. Jadi ketika Anda mengetik "fia", dia mencari di UUID seperti `a1b2c3d4-...`, bukan di "Nabila Arifiana".

**Solusi:**
Ubah `value` menjadi nama + nomor telepon agar pencarian partial berfungsi:

```tsx
<CommandItem
  key={group.id}
  value={`${group.nama} ${group.nomor_telepon}`}  // ✅ Sekarang "fia" akan match
  onSelect={() => {...}}
>
```

### Perubahan Kode

#### File: `src/pages/RentalContracts.tsx`

```tsx
// SEBELUM (baris 844-846)
<CommandItem
  key={group.id}
  value={group.id}

// SESUDAH
<CommandItem
  key={group.id}
  value={`${group.nama} ${group.nomor_telepon}`}
```

### Opsi untuk Invoice Gap

| Opsi | Deskripsi |
|------|-----------|
| **A. Manual** | Insert 000301 ke pool melalui SQL query |
| **B. Auto-detect gaps** | Buat script yang mendeteksi gap (000301 tidak ada) dan otomatis masukkan ke pool |

Untuk opsi B, logikanya:
1. Ambil semua invoice yang ada (000300, 000302, ...)
2. Cari gap (000301 tidak ada)
3. Masukkan gap ke pool `deleted_invoice_numbers`

### File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/RentalContracts.tsx` | Ubah `value` CommandItem dari `group.id` ke `group.nama + group.nomor_telepon` |
| **Database** | Insert 000301 ke pool (manual atau auto-detect) |

### Bagian Teknis

**Library cmdk:**
- `CommandItem` prop `value` digunakan untuk filtering internal
- Pencarian case-insensitive dan partial match bawaan dari cmdk
- Dengan `value={group.nama}`, pencarian "fia" akan otomatis match "Nabila Ari**fia**na"

