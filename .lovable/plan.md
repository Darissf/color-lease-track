

## Perbaikan: User ID Salah pada Pool Invoice

### Masalah yang Ditemukan

Nomor invoice 000301 dimasukkan ke pool dengan **user_id yang salah**:

| Seharusnya | Saat Ini |
|------------|----------|
| `0ecfa70e-1fbe-48ae-a80c-f9f734918f2f` (admin@admin.com) | `bc36a01b-00c6-4374-812a-fe2382e982c9` (nabilatsabinaa89) |

Karena RLS policy membatasi akses berdasarkan `auth.uid() = user_id`, saat Anda (admin@admin.com) membuat kontrak baru, query ke `deleted_invoice_numbers` tidak menemukan nomor 000301 karena user_id-nya berbeda.

### Solusi

1. Hapus data 000301 yang salah user_id
2. Masukkan ulang dengan user_id yang benar

```sql
-- Hapus data lama yang salah
DELETE FROM deleted_invoice_numbers 
WHERE invoice_number = '000301';

-- Masukkan dengan user_id yang benar
INSERT INTO deleted_invoice_numbers (user_id, invoice_number, invoice_sequence)
VALUES ('0ecfa70e-1fbe-48ae-a80c-f9f734918f2f', '000301', 301);
```

### Hasil Setelah Perbaikan

Saat Anda membuat kontrak baru:
- Sistem akan cek pool → menemukan 000301
- Invoice baru akan menggunakan 000301
- Nomor 000301 dihapus dari pool setelah digunakan

### Perubahan

| Tipe | Detail |
|------|--------|
| Database | Fix user_id untuk invoice 000301 di pool |

