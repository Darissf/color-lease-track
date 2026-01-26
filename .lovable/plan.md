
## Mengubah Default Toggle "Invoice & Kwitansi Full Rincian" ke OFF

### Masalah
Saat ini toggle "Invoice & Kwitansi Full Rincian" memiliki default **ON (true)**, padahal seharusnya default **OFF (false)**.

---

### Lokasi yang Perlu Diubah

#### 1. `src/pages/ContractDetail.tsx`

**Baris 192 - State initialization:**
```typescript
// SEBELUM:
const [invoiceFullRincian, setInvoiceFullRincian] = useState(true);

// SESUDAH:
const [invoiceFullRincian, setInvoiceFullRincian] = useState(false);
```

**Baris 317 - Data fetching default:**
```typescript
// SEBELUM:
setInvoiceFullRincian(contractData.invoice_full_rincian !== false); // Default to true

// SESUDAH:
setInvoiceFullRincian(contractData.invoice_full_rincian === true); // Default to false
```

#### 2. `src/components/documents/DocumentPreviewModal.tsx`

**Baris 83 - Fallback default:**
```typescript
// SEBELUM:
const fullRincian = documentData?.fullRincian !== false; // Default to true

// SESUDAH:
const fullRincian = documentData?.fullRincian === true; // Default to false
```

---

### File yang Akan Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/ContractDetail.tsx` | Ubah useState default dari `true` ke `false`, ubah logic pembacaan dari database |
| `src/components/documents/DocumentPreviewModal.tsx` | Ubah fallback default dari `!== false` ke `=== true` |

---

### Hasil yang Diharapkan

- Toggle "Invoice & Kwitansi Full Rincian" akan default **OFF**
- Halaman 2 dokumen akan default menampilkan "Hanya No, Nama Item, Qty"
- Contract yang sudah disimpan dengan `invoice_full_rincian = true` di database tetap akan tampil ON
- Contract baru atau yang belum pernah di-set akan default OFF
