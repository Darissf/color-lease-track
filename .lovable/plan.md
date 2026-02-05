

## Fitur Perpanjang Kontrak - Rencana Lengkap (Updated)

### Ringkasan Perubahan dari Plan Sebelumnya

| Aspek | Sebelumnya | Sekarang |
|-------|------------|----------|
| Invoice Number | Manual atau format `INV-XXX-P1` | **Otomatis dari Auto Invoice Settings** (INV-000126, dst) |
| Durasi | Fix start/end date | **Opsi "Durasi Fleksibel"** untuk client yang belum tahu berapa lama |

---

### Fase 1: Database Schema

**Perubahan pada tabel `rental_contracts`:**

| Kolom Baru | Tipe | Keterangan |
|------------|------|------------|
| `parent_contract_id` | UUID (nullable) | Referensi ke kontrak asal yang diperpanjang |
| `extension_number` | INTEGER (default 0) | Nomor urut perpanjangan (0 = kontrak asli) |
| `is_flexible_duration` | BOOLEAN (default false) | Mode durasi fleksibel (end_date bisa diubah saat closing) |

```sql
ALTER TABLE rental_contracts 
  ADD COLUMN parent_contract_id UUID REFERENCES rental_contracts(id) ON DELETE SET NULL,
  ADD COLUMN extension_number INTEGER DEFAULT 0,
  ADD COLUMN is_flexible_duration BOOLEAN DEFAULT false;

CREATE INDEX idx_rental_contracts_parent ON rental_contracts(parent_contract_id);
```

---

### Fase 2: Komponen ExtendContractDialog

#### Form Fields

| Field | Deskripsi |
|-------|-----------|
| Info Kontrak Asal | Invoice, client, periode lama (read-only) |
| Validasi Sisa Tagihan | Warning + opsi transfer ke kontrak baru |
| Tanggal Mulai | Default = end_date lama + 1 hari |
| Toggle Durasi Fleksibel | ON = client belum pasti berapa lama |
| Tanggal Selesai | Jika fleksibel: "Perkiraan" label, bisa diubah nanti |
| Invoice Baru | **Auto-generate dari Auto Invoice Settings** (read-only jika enabled) |
| Opsi Copy | Toggle untuk copy stock items dan line items |

#### Alur Dialog

```text
+--------------------------------------------------+
|  Perpanjang Kontrak                              |
|--------------------------------------------------|
|  [!] Kontrak ini memiliki sisa tagihan           |
|      Rp 5.000.000                                |
|      [ ] Pindahkan sisa ke kontrak baru          |
|--------------------------------------------------|
|  Kontrak Asal: INV-000125                        |
|  Client: PT ABC                                  |
|  Periode Lama: 1 Jan - 31 Mar 2025               |
|--------------------------------------------------|
|  PERIODE BARU                                    |
|  Mulai: [01/04/2025]                             |
|                                                  |
|  [x] Durasi Fleksibel                            |
|      (Client belum tahu akan perpanjang berapa   |
|       lama, tagihan dihitung saat closing)       |
|                                                  |
|  Selesai (Perkiraan): [30/04/2025]               |
|--------------------------------------------------|
|  INVOICE BARU                                    |
|  [Auto Invoice ON]                               |
|  Nomor: INV-000126 (otomatis)                    |
|--------------------------------------------------|
|  OPSI COPY DATA                                  |
|  [x] Copy Rincian Stok Barang                    |
|  [x] Copy Rincian Item Sewa                      |
|--------------------------------------------------|
|  [Batal]              [Buat Perpanjangan]        |
+--------------------------------------------------+
```

---

### Fase 3: Logic Perpanjangan dengan Auto Invoice

```typescript
const extendContract = async (params: ExtendContractParams) => {
  // 1. Fetch Auto Invoice Settings
  const { data: docSettings } = await supabase
    .from("document_settings")
    .select("auto_invoice_enabled, auto_invoice_prefix, auto_invoice_current, auto_invoice_padding")
    .eq("user_id", user?.id)
    .maybeSingle();

  // 2. Generate invoice number
  let invoiceNumber: string;
  
  if (docSettings?.auto_invoice_enabled) {
    // Auto-generate dari settings
    const nextNumber = (docSettings.auto_invoice_current || 0) + 1;
    const paddedNumber = String(nextNumber).padStart(docSettings.auto_invoice_padding || 6, '0');
    invoiceNumber = `${docSettings.auto_invoice_prefix || ''}${paddedNumber}`;
  } else {
    // Fallback: format lama dengan suffix -P1, -P2
    const extensionNumber = (originalContract.extension_number || 0) + 1;
    invoiceNumber = `${originalContract.invoice}-P${extensionNumber}`;
  }

  // 3. Insert kontrak baru
  const { data: newContract } = await supabase
    .from('rental_contracts')
    .insert({
      user_id: originalContract.user_id,
      client_group_id: originalContract.client_group_id,
      start_date: newStartDate,
      end_date: newEndDate,
      status: 'masa sewa',
      invoice: invoiceNumber,
      parent_contract_id: originalContract.id,
      extension_number: (originalContract.extension_number || 0) + 1,
      is_flexible_duration: isFlexibleDuration,
      tagihan: transferUnpaidBalance ? originalContract.tagihan_belum_bayar : 0,
      tagihan_belum_bayar: transferUnpaidBalance ? originalContract.tagihan_belum_bayar : 0,
      notes: `Perpanjangan dari ${originalContract.invoice}`,
      // Copy other fields...
    })
    .select()
    .single();

  // 4. Update Auto Invoice counter (jika enabled)
  if (docSettings?.auto_invoice_enabled) {
    await supabase
      .from("document_settings")
      .update({
        auto_invoice_current: (docSettings.auto_invoice_current || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user?.id);
  }

  // 5. Update kontrak lama -> status selesai
  await supabase
    .from('rental_contracts')
    .update({
      status: 'selesai',
      tagihan_belum_bayar: transferUnpaidBalance ? 0 : originalContract.tagihan_belum_bayar,
    })
    .eq('id', originalContract.id);

  // 6. Copy stock items & line items (if selected)
  // ...

  return newContract;
};
```

---

### Fase 4: Mode Durasi Fleksibel

#### Bagaimana Cara Kerjanya

1. **Saat Perpanjangan:**
   - Admin toggle ON "Durasi Fleksibel"
   - End date diisi dengan perkiraan (default +30 hari dari start)
   - Kontrak ditandai dengan badge khusus

2. **Selama Masa Sewa:**
   - Badge "Durasi Fleksibel" muncul di list dan detail kontrak
   - Admin bisa ubah end_date kapan saja tanpa warning khusus
   - Tagihan = 0 (belum bisa dihitung)

3. **Saat Client Selesai (Closing):**
   - Admin klik tombol "Selesaikan & Hitung Tagihan"
   - Dialog muncul: pilih tanggal selesai aktual
   - Sistem hitung durasi: `actualEndDate - startDate`
   - Tagihan otomatis dihitung berdasarkan durasi × harga per hari/minggu/bulan
   - Status berubah ke "Selesai"

#### UI Badge untuk Durasi Fleksibel

```text
| Invoice      | Client | Status                          |
|--------------|--------|----------------------------------|
| INV-000126   | PT ABC | [Masa Sewa] [⏱ Durasi Fleksibel] |
```

---

### Fase 5: Contract Chain Visualization (Tetap)

Komponen untuk melihat riwayat kontrak dari invoice manapun:

```text
+----------------------------------------------------------+
|  Riwayat Kontrak                                         |
|----------------------------------------------------------|
|  [INV-000100] ──> [INV-000115] ──> [INV-000126] (Ini)    |
|   3 bulan          3 bulan          Fleksibel            |
|   Rp 15jt          Rp 15jt          Belum dihitung       |
|   Selesai          Selesai          Aktif                |
|----------------------------------------------------------|
|  Total Durasi: 6+ bulan (ongoing)                        |
|  Total Value: Rp 30.000.000+                             |
+----------------------------------------------------------+
```

---

### Fase 6: Perubahan File

| File | Aksi | Deskripsi |
|------|------|-----------|
| **Database Migration** | CREATE | Tambah kolom `parent_contract_id`, `extension_number`, `is_flexible_duration` |
| `src/components/contracts/ExtendContractDialog.tsx` | CREATE | Dialog perpanjangan dengan integrasi Auto Invoice |
| `src/components/contracts/ContractChainVisualization.tsx` | CREATE | Visualisasi rantai kontrak |
| `src/components/contracts/FlexibleDurationClosingDialog.tsx` | CREATE | Dialog untuk closing kontrak durasi fleksibel |
| `src/pages/ContractDetail.tsx` | UPDATE | Tambah tombol perpanjang, chain visualization, badge fleksibel |
| `src/pages/RentalContracts.tsx` | UPDATE | Tambah badge extension dan fleksibel di list |

---

### Fase 7: Flow Diagram

```text
+------------------+     +---------------------+     +-------------------+
|  Kontrak Lama    | --> |  Klik "Perpanjang"  | --> |  Dialog Muncul    |
|  INV-000125      |     |  di ContractDetail  |     |                   |
+------------------+     +---------------------+     +-------------------+
                                                              |
                              +-------------------------------+
                              |
                              v
+--------------------------------------------------+
|  ExtendContractDialog                            |
|  - Cek sisa tagihan (warning/transfer option)    |
|  - Set tanggal mulai (default: end_date + 1)     |
|  - Toggle durasi fleksibel                       |
|  - Set tanggal selesai (perkiraan jika fleksibel)|
|  - Invoice = Auto Invoice (INV-000126)           |
|  - Pilih data yang mau di-copy                   |
+--------------------------------------------------+
          |
          v
+--------------------------------------------------+
|  Proses Backend                                  |
|  1. Generate invoice dari Auto Invoice Settings  |
|  2. Insert kontrak baru dengan parent_contract_id|
|  3. Update auto_invoice_current + 1              |
|  4. Set kontrak lama status = "selesai"          |
|  5. Copy stock items & line items (jika dipilih) |
+--------------------------------------------------+
          |
          v
+--------------------------------------------------+
|  Hasil                                           |
|  - Kontrak baru: INV-000126 (Aktif/Fleksibel)    |
|  - Kontrak lama: INV-000125 (Selesai)            |
|  - Chain: 000125 -> 000126                       |
+--------------------------------------------------+
```

---

### Ringkasan Fitur

| Fitur | Keterangan |
|-------|------------|
| Auto Invoice Integration | Invoice perpanjangan ikut urutan Auto Invoice (INV-000126, bukan INV-000125-P1) |
| Auto-Close Kontrak Lama | Kontrak lama otomatis jadi "Selesai" |
| Durasi Fleksibel | Untuk client yang belum tahu mau perpanjang berapa lama |
| Balance Transfer | Opsi transfer sisa tagihan ke kontrak baru |
| Contract Chain | Navigasi bidirectional dan visualisasi riwayat |
| Copy Data | Copy stock items dan line items ke kontrak baru |

---

### Estimasi Waktu

| Fase | Estimasi |
|------|----------|
| Database migration | 5 menit |
| ExtendContractDialog | 45 menit |
| FlexibleDurationClosingDialog | 20 menit |
| ContractChainVisualization | 30 menit |
| Update ContractDetail.tsx | 30 menit |
| Update RentalContracts.tsx | 15 menit |
| Testing | 30 menit |
| **Total** | **~3 jam** |

