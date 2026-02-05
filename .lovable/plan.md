

## Perbaikan Tampilan Rantai Kontrak & Disable Perpanjang

### Masalah yang Ditemukan

1. **Kontrak induk tidak menampilkan visualisasi rantai**: Invoice `0000000` tidak menunjukkan koneksi ke `000299` karena kondisi hanya memeriksa `parent_contract_id` atau `extension_number > 0`, tapi kontrak induk punya nilai `extension_number = 0` dan tidak punya parent.

2. **Button Perpanjang masih bisa diklik**: Kontrak yang sudah diperpanjang seharusnya tidak bisa diperpanjang lagi.

### Solusi

#### 1. Deteksi Apakah Kontrak Sudah Punya Child Extension

**File:** `src/pages/ContractDetail.tsx`

Tambahkan state dan fungsi untuk cek apakah kontrak ini sudah punya perpanjangan:

```typescript
const [hasChildExtension, setHasChildExtension] = useState(false);
const [childContractInvoice, setChildContractInvoice] = useState<string | null>(null);
```

Tambahkan fungsi fetch:

```typescript
const fetchChildExtension = async () => {
  if (!id) return;
  
  const { data } = await supabase
    .from('rental_contracts')
    .select('id, invoice')
    .eq('parent_contract_id', id)
    .maybeSingle();
  
  if (data) {
    setHasChildExtension(true);
    setChildContractInvoice(data.invoice);
  } else {
    setHasChildExtension(false);
    setChildContractInvoice(null);
  }
};
```

#### 2. Update Kondisi Tampil ContractChainVisualization

Ubah kondisi agar juga menampilkan visualisasi jika kontrak punya child:

```tsx
{/* Contract Chain Visualization - tampilkan jika ada parent ATAU ada child */}
{(contract.parent_contract_id || (contract.extension_number ?? 0) > 0 || hasChildExtension) && (
  <ContractChainVisualization 
    contractId={contract.id} 
    currentContractId={contract.id} 
  />
)}
```

#### 3. Disable Button Perpanjang + Popup Alasan

Ubah button Perpanjang:

```tsx
{(isSuperAdmin || isAdmin) && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button 
        variant="outline"
        disabled={hasChildExtension}
        className={hasChildExtension ? "opacity-50 cursor-not-allowed" : ""}
        onClick={hasChildExtension ? undefined : () => setIsExtendDialogOpen(true)}
      >
        <Copy className="h-4 w-4 mr-2" />
        Perpanjang
      </Button>
    </AlertDialogTrigger>
    {hasChildExtension && (
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kontrak Sudah Diperpanjang</AlertDialogTitle>
          <AlertDialogDescription>
            Kontrak ini sudah diperpanjang ke invoice <strong>{childContractInvoice}</strong>. 
            Setiap kontrak hanya bisa memiliki satu perpanjangan langsung.
            <br /><br />
            Jika ingin memperpanjang lagi, silakan perpanjang dari kontrak <strong>{childContractInvoice}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Mengerti</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    )}
  </AlertDialog>
)}
```

### Ringkasan Perubahan

| Aspek | Detail |
|-------|--------|
| File | `src/pages/ContractDetail.tsx` |
| State baru | `hasChildExtension`, `childContractInvoice` |
| Fungsi baru | `fetchChildExtension()` - cek apakah ada kontrak dengan `parent_contract_id = id ini` |
| UI Chain | Tampilkan juga jika punya child extension |
| UI Button | Disabled + popup penjelasan jika sudah diperpanjang |

### Ilustrasi

**Sebelum (pada invoice 0000000):**
- Tidak ada visualisasi rantai
- Button Perpanjang bisa diklik

**Sesudah (pada invoice 0000000):**
- Tampil: "Riwayat Kontrak (2 kontrak): 0000000 → 000299"
- Button Perpanjang disabled dengan popup: "Kontrak ini sudah diperpanjang ke invoice 000299"

