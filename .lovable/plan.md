

## Fix: Preview Nomor Invoice di Form Tambah Kontrak Tidak Memperhitungkan Reuse Pool

### Masalah

Saat membuka form "Tambah Kontrak", preview nomor invoice menampilkan `current + 1` (misalnya `000304`), padahal ada nomor yang sudah dihapus (`000303`) di reuse pool. Saat disimpan, nomor yang digunakan sudah benar (`000303`), tapi **tampilan preview-nya salah**.

### Penyebab

Di **line 905** file `RentalContracts.tsx`, preview dihitung langsung dari `autoInvoiceSettings.current + 1` tanpa mengecek tabel `deleted_invoice_numbers` (reuse pool):

```tsx
// Line 905 - hanya hitung current + 1, tidak cek reuse pool
value={`${autoInvoiceSettings.prefix}${String(autoInvoiceSettings.current + 1).padStart(autoInvoiceSettings.padding, '0')}`}
```

Sedangkan logika saat **menyimpan** (line 310-336) sudah benar: cek reuse pool dulu, baru fallback ke `current + 1`.

### Solusi

Tambahkan pengecekan `deleted_invoice_numbers` saat data di-fetch (di fungsi `fetchData`), simpan hasilnya di state, dan gunakan untuk preview.

### Detail Teknis

**File yang diubah: `src/pages/RentalContracts.tsx`**

1. **Tambah state baru** untuk menyimpan nomor invoice dari reuse pool:
```tsx
const [reusableInvoiceNumber, setReusableInvoiceNumber] = useState<string | null>(null);
```

2. **Di fungsi `fetchData`** (sekitar line 219-235), setelah fetch auto invoice settings, tambahkan query ke `deleted_invoice_numbers`:
```tsx
// Fetch reusable invoice number from pool
const { data: reusable } = await supabase
  .from("deleted_invoice_numbers")
  .select("invoice_number")
  .eq("user_id", user?.id)
  .order("invoice_sequence", { ascending: true })
  .limit(1)
  .maybeSingle();

setReusableInvoiceNumber(reusable?.invoice_number || null);
```

3. **Update preview di line 905** untuk menggunakan reusable number jika ada:
```tsx
value={reusableInvoiceNumber || `${autoInvoiceSettings.prefix}${String(autoInvoiceSettings.current + 1).padStart(autoInvoiceSettings.padding, '0')}`}
```

4. **Setelah save kontrak berhasil** (sekitar line 389-392), reset `reusableInvoiceNumber` agar preview berikutnya benar:
```tsx
setReusableInvoiceNumber(null);
// lalu re-fetch data untuk mendapatkan state terbaru
```

### Hasil

- Preview nomor invoice di form akan menampilkan nomor dari reuse pool (jika ada), bukan selalu `current + 1`
- Nomor yang ditampilkan akan sama persis dengan nomor yang benar-benar disimpan
- Tidak ada perubahan pada logika penyimpanan (sudah benar)
