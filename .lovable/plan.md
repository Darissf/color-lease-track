
## Fitur Mass Delete Inbox berdasarkan Sender

### Deskripsi
Menambahkan fitur untuk menghapus semua email sekaligus berdasarkan alamat pengirim (from_address). User cukup memasukkan email seperti `noreply@lovable.dev` dan semua email dari pengirim tersebut akan dihapus.

### Cara Kerja
1. Tombol "Mass Delete" di header (hanya untuk Super Admin)
2. Klik tombol membuka dialog dengan input field untuk alamat email pengirim
3. Preview jumlah email yang akan dihapus sebelum konfirmasi
4. Konfirmasi dan hapus semua email yang cocok

### Komponen yang Akan Dibuat

| File | Deskripsi |
|------|-----------|
| `src/components/mail/MassDeleteDialog.tsx` | Dialog baru dengan input email dan konfirmasi |

### Perubahan pada File yang Ada

| File | Perubahan |
|------|-----------|
| `src/pages/Mail.tsx` | Tambah state, handler, dan tombol Mass Delete di header |

### Detail Teknis

**1. MassDeleteDialog.tsx**
- Input field untuk memasukkan alamat email pengirim
- Tombol "Check" untuk preview jumlah email yang akan dihapus
- Menampilkan jumlah email yang ditemukan
- Tombol konfirmasi dengan warna merah (destructive)
- Loading state saat proses penghapusan

**2. Mail.tsx - State Baru**
```typescript
const [massDeleteOpen, setMassDeleteOpen] = useState(false);
```

**3. Mail.tsx - Handler Mass Delete**
```typescript
const handleMassDelete = async (fromAddress: string) => {
  // Query: count emails from sender
  // Update: set is_deleted = true untuk semua email dari sender
  // Refresh email list
};
```

**4. UI - Tombol Mass Delete**
- Posisi: Di header, sebelum tombol Compose
- Icon: Trash2 dengan teks "Mass Delete"
- Warna: Destructive (merah)
- Hanya terlihat untuk Super Admin

### Flow UI
1. Super Admin klik tombol "Mass Delete"
2. Dialog muncul dengan input email
3. User ketik alamat email pengirim (contoh: `noreply@lovable.dev`)
4. Klik "Check" untuk melihat jumlah email
5. Tampil: "Ditemukan 15 email dari noreply@lovable.dev"
6. Klik "Hapus Semua" untuk konfirmasi
7. Semua email dari pengirim tersebut di-soft delete (is_deleted = true)
8. Dialog tertutup, list email di-refresh
