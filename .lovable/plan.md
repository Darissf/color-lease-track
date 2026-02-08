

## Fitur: Reuse Nomor Invoice yang Dihapus

### Konsep

Saat kontrak dengan auto-invoice dihapus, nomor invoice tersebut akan disimpan ke "pool" untuk digunakan kembali pada kontrak baru berikutnya.

```text
Flow Baru:
┌─────────────────────────────────────────────────────────────────┐
│ 1. Buat Kontrak Baru                                            │
│    ├─ Cek: Ada nomor di pool deleted_invoice_numbers?           │
│    │   ├─ YA  → Ambil nomor terkecil dari pool (000301)         │
│    │   │        Hapus dari pool, gunakan untuk kontrak baru     │
│    │   └─ TIDAK → Generate nomor baru (current + 1)             │
├─────────────────────────────────────────────────────────────────┤
│ 2. Hapus Kontrak                                                │
│    └─ Simpan nomor invoice ke pool deleted_invoice_numbers      │
└─────────────────────────────────────────────────────────────────┘
```

### Contoh Skenario

| Aksi | Pool | Counter | Hasil |
|------|------|---------|-------|
| Buat kontrak → 000301 | [] | 301 | - |
| Hapus kontrak 000301 | [301] | 301 | - |
| Buat kontrak baru | [] | 301 | Dapat 000301 (dari pool) |
| Buat kontrak baru | [] | 302 | Dapat 000302 (counter naik) |

### Perubahan Database

Buat tabel baru untuk menyimpan nomor invoice yang dihapus:

```sql
CREATE TABLE deleted_invoice_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_sequence INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, invoice_sequence)
);

-- RLS Policy
ALTER TABLE deleted_invoice_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own deleted invoice numbers"
  ON deleted_invoice_numbers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Perubahan Kode

#### 1. Saat Hapus Kontrak (`handleDeleteContract`)

```typescript
const handleDeleteContract = async (id: string) => {
  if (!confirm("Yakin ingin menghapus kontrak ini?")) return;

  try {
    // Ambil data kontrak dulu untuk dapat nomor invoice
    const { data: contract } = await supabase
      .from("rental_contracts")
      .select("invoice")
      .eq("id", id)
      .single();

    // Hapus income sources
    await supabase
      .from("income_sources")
      .delete()
      .eq("contract_id", id);

    // Hapus kontrak
    const { error } = await supabase
      .from("rental_contracts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // Simpan nomor invoice ke pool jika ada dan sesuai format auto-invoice
    if (contract?.invoice && autoInvoiceSettings?.enabled) {
      const prefix = autoInvoiceSettings.prefix;
      if (contract.invoice.startsWith(prefix)) {
        const numberPart = contract.invoice.substring(prefix.length);
        const sequence = parseInt(numberPart, 10);
        if (!isNaN(sequence)) {
          await supabase
            .from("deleted_invoice_numbers")
            .insert({
              user_id: user?.id,
              invoice_number: contract.invoice,
              invoice_sequence: sequence,
            });
        }
      }
    }

    toast.success("Kontrak berhasil dihapus");
    fetchData();
  } catch (error: any) {
    toast.error("Gagal menghapus: " + error.message);
  }
};
```

#### 2. Saat Buat Kontrak Baru (`handleSaveContract`)

```typescript
// Sebelum generate nomor invoice baru, cek pool dulu
if (!editingContractId && autoInvoiceSettings?.enabled) {
  // Cek apakah ada nomor yang bisa di-reuse
  const { data: reusableNumber } = await supabase
    .from("deleted_invoice_numbers")
    .select("id, invoice_number, invoice_sequence")
    .eq("user_id", user?.id)
    .order("invoice_sequence", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (reusableNumber) {
    // Gunakan nomor dari pool
    invoiceNumber = reusableNumber.invoice_number;
    
    // Hapus dari pool setelah digunakan
    await supabase
      .from("deleted_invoice_numbers")
      .delete()
      .eq("id", reusableNumber.id);
  } else {
    // Generate nomor baru seperti biasa
    const nextNumber = autoInvoiceSettings.current + 1;
    const paddedNumber = String(nextNumber).padStart(autoInvoiceSettings.padding, '0');
    invoiceNumber = `${autoInvoiceSettings.prefix}${paddedNumber}`;
  }
}
```

### File yang Diubah

| File | Perubahan |
|------|-----------|
| **Database Migration** | Buat tabel `deleted_invoice_numbers` dengan RLS |
| `src/pages/RentalContracts.tsx` | Update `handleDeleteContract` untuk simpan nomor ke pool |
| `src/pages/RentalContracts.tsx` | Update `handleSaveContract` untuk cek pool sebelum generate nomor baru |
| `src/components/contracts/ExtendContractDialog.tsx` | Update logika auto-invoice untuk cek pool juga |

### Bagian Teknis

**Tabel baru:** `deleted_invoice_numbers`
- `invoice_number`: Nomor lengkap (contoh: "000301")
- `invoice_sequence`: Angka saja untuk sorting (contoh: 301)
- Unique constraint pada `(user_id, invoice_sequence)` mencegah duplikasi

**Logika prioritas:**
1. Selalu ambil nomor terkecil dari pool terlebih dahulu
2. Jika pool kosong, baru increment counter
3. Counter tidak perlu di-rollback saat hapus kontrak

