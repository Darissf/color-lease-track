

## Fitur Baru: Edit Link, Adjust Durasi, dan Pilihan Metode Pembayaran

### Ringkasan Permintaan

1. **Public Link Manager** (untuk Admin) - Tambah menu:
   - Edit Link / Custom Link 
   - Tambah/Kurangi Durasi

2. **Ringkasan Pembayaran** - Ubah "Bayar Cash" menjadi "Bayar Cash / Transfer" dengan pilihan metode

---

## Bagian 1: Edit Link & Durasi pada Public Link Manager

### File: `src/components/contracts/ContractPublicLinkManager.tsx`

#### A. Tambah State Baru

```typescript
// Edit Link Dialog
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
const [editingLink, setEditingLink] = useState<PublicLink | null>(null);
const [customAccessCode, setCustomAccessCode] = useState('');
const [isUpdating, setIsUpdating] = useState(false);

// Adjust Duration Dialog
const [isDurationDialogOpen, setIsDurationDialogOpen] = useState(false);
const [durationLink, setDurationLink] = useState<PublicLink | null>(null);
const [durationAdjustment, setDurationAdjustment] = useState<number>(1);
const [adjustmentUnit, setAdjustmentUnit] = useState<'hours' | 'days'>('days');
const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'subtract'>('add');
```

#### B. Tambah Import Icon

```typescript
import { Pencil, TimerReset } from 'lucide-react';
```

#### C. Tambah Fungsi Update

```typescript
// Update access code (custom link)
const updateAccessCode = async () => {
  if (!editingLink || !customAccessCode.trim()) return;
  
  // Validasi: 4-30 karakter, alphanumeric + dash + underscore
  const isValid = /^[a-zA-Z0-9_-]{4,30}$/.test(customAccessCode);
  if (!isValid) {
    toast.error("Kode harus 4-30 karakter (huruf, angka, dash, underscore)");
    return;
  }
  
  setIsUpdating(true);
  try {
    const { error } = await supabase
      .from('contract_public_links')
      .update({ access_code: customAccessCode })
      .eq('id', editingLink.id);
    
    if (error) {
      if (error.code === '23505') {
        toast.error("Kode sudah digunakan, pilih kode lain");
      } else {
        throw error;
      }
      return;
    }
    
    toast.success("Link berhasil diubah");
    setIsEditDialogOpen(false);
    fetchLinks();
  } catch (error) {
    console.error('Error updating link:', error);
    toast.error("Gagal mengubah link");
  } finally {
    setIsUpdating(false);
  }
};

// Adjust expiration
const adjustExpiration = async () => {
  if (!durationLink) return;
  
  const currentExpires = new Date(durationLink.expires_at);
  let newExpires: Date;
  
  const adjustment = adjustmentUnit === 'days' 
    ? durationAdjustment * 24 * 60 * 60 * 1000 
    : durationAdjustment * 60 * 60 * 1000;
  
  if (adjustmentMode === 'add') {
    newExpires = new Date(currentExpires.getTime() + adjustment);
  } else {
    newExpires = new Date(currentExpires.getTime() - adjustment);
    // Validasi tidak boleh kurang dari sekarang
    if (newExpires < new Date()) {
      toast.error("Durasi tidak boleh kurang dari waktu sekarang");
      return;
    }
  }
  
  setIsUpdating(true);
  try {
    const { error } = await supabase
      .from('contract_public_links')
      .update({ expires_at: newExpires.toISOString() })
      .eq('id', durationLink.id);
    
    if (error) throw error;
    
    toast.success("Durasi berhasil diubah");
    setIsDurationDialogOpen(false);
    fetchLinks();
  } catch (error) {
    console.error('Error adjusting duration:', error);
    toast.error("Gagal mengubah durasi");
  } finally {
    setIsUpdating(false);
  }
};
```

#### D. Tambah Tombol Edit & Durasi pada UI Link Aktif

Pada bagian active links (sekitar baris 306-346), tambahkan tombol baru:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Aktif] CL-A7X9B2    [📋] [🔗] [QR] [✏️ Edit] [⏱️ Durasi] [🗑️]  │
│ Berlaku hingga 28 Jan 2026 14:00   | 5 views                        │
└─────────────────────────────────────────────────────────────────────┘
```

#### E. Tambah Dialog Edit Link

```text
┌─────────────────────────────────────────┐
│ Edit Link                               │
├─────────────────────────────────────────┤
│ Kode saat ini: CL-A7X9B2                │
│                                         │
│ Kode Baru:                              │
│ [INV-000251-BUDI_______________]        │
│                                         │
│ * 4-30 karakter (huruf, angka, -, _)    │
│                                         │
│                    [Batal] [Simpan]     │
└─────────────────────────────────────────┘
```

#### F. Tambah Dialog Adjust Duration

```text
┌─────────────────────────────────────────┐
│ Ubah Durasi                             │
├─────────────────────────────────────────┤
│ Berlaku saat ini: 28 Jan 2026 14:00     │
│                                         │
│ [Tambah ▼] [+7_] [Hari ▼]               │
│                                         │
│ Hasil baru: 04 Feb 2026 14:00           │
│                                         │
│                    [Batal] [Simpan]     │
└─────────────────────────────────────────┘
```

---

## Bagian 2: Ubah "Bayar Cash" menjadi "Bayar Cash / Transfer"

### File: `src/pages/ContractDetail.tsx`

#### A. Tambah State untuk Metode Pembayaran

```typescript
// Payment method selection
const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
```

#### B. Ubah Teks Tombol

```typescript
// SEBELUM:
<Banknote className="h-4 w-4 mr-2" />
Bayar Cash

// SESUDAH:
<Banknote className="h-4 w-4 mr-2" />
Bayar Cash / Transfer
```

#### C. Tambah Pilihan Metode di Dialog

Di dalam `AlertDialogContent`, sebelum input jumlah, tambahkan pilihan:

```text
┌─────────────────────────────────────────┐
│ Catat Pembayaran Cash / Transfer        │
├─────────────────────────────────────────┤
│                                         │
│ Metode Pembayaran:                      │
│ ┌─────────────┐  ┌─────────────────┐    │
│ │ 💵 Cash     │  │ 🏦 Transfer     │    │
│ │   (terpilih)│  │    Manual       │    │
│ └─────────────┘  └─────────────────┘    │
│                                         │
│ Jumlah Pembayaran:                      │
│ [500000________________________]        │
│ = Rp 500.000                            │
│                                         │
│ Sisa Tagihan: Rp 2.150.000              │
│                                         │
│                    [Batal] [Simpan]     │
└─────────────────────────────────────────┘
```

#### D. Update handleCashPayment Function

Modifikasi logic untuk menghandle kedua metode:

```typescript
const handleCashPayment = async () => {
  // ... existing validation ...
  
  // Tentukan source berdasarkan metode
  const paymentSource = paymentMethod; // 'cash' atau 'transfer'
  const bankName = paymentMethod === 'cash' ? 'Cash' : 'Transfer Manual';
  const notesText = paymentMethod === 'cash' 
    ? 'Pembayaran Cash' 
    : 'Transfer Manual';
  const sourceSuffix = paymentMethod === 'cash' ? '(Cash)' : '(Transfer)';
  
  // Update sourceName
  const sourceName = `${contract.invoice || "Sewa"} ${contract.keterangan || contract.client_groups?.nama || ""} #${paymentNumber} ${sourceSuffix}`.trim();
  
  // Insert ke income_sources dengan bank_name yang sesuai
  // ...
  
  // Insert ke contract_payments dengan payment_source yang sesuai
  // ...
};
```

---

## Rangkuman File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/contracts/ContractPublicLinkManager.tsx` | Tambah fitur Edit Link & Adjust Duration dengan dialog dan fungsi update |
| `src/pages/ContractDetail.tsx` | Ubah tombol "Bayar Cash" → "Bayar Cash / Transfer", tambah pilihan metode pembayaran |

---

## Hasil yang Diharapkan

### 1. Public Link Manager (Admin)
- Tombol ✏️ untuk edit access code menjadi custom
- Tombol ⏱️ untuk tambah/kurangi durasi link
- Dialog dengan preview hasil perubahan

### 2. Ringkasan Pembayaran
- Tombol berubah menjadi "Bayar Cash / Transfer"  
- Saat diklik, muncul pilihan metode: Cash atau Transfer Manual
- Pembayaran tercatat dengan metode yang dipilih di database

