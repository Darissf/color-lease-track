

## Perbaikan Hyperlink pada Tampilan Collapsed Chain

### Masalah

Di tampilan collapsed (tidak di-expand), invoice number "0000000" ditampilkan sebagai teks biasa tanpa hyperlink, sementara yang diharapkan adalah semua invoice (kecuali yang sedang dilihat) bisa diklik untuk navigasi.

### Solusi

Ubah elemen `<span>` yang menampilkan invoice number menjadi elemen yang bisa diklik (button/link) dengan styling hyperlink biru + underline.

### Perubahan Kode

**File:** `src/components/contracts/ContractChainVisualization.tsx`

**Lokasi:** Baris 230-248 (tampilan collapsed)

**Sebelum:**
```tsx
{!isExpanded && (
  <div className="flex items-center gap-1 text-sm text-muted-foreground">
    {chain.map((contract, index) => (
      <span key={contract.id} className="flex items-center gap-1">
        <span className={cn(
          "font-mono",
          contract.id === currentContractId && "text-primary font-medium"
        )}>
          {contract.invoice || `#${index + 1}`}
        </span>
        {contract.id === currentContractId && (
          <Badge variant="outline" className="text-[10px] h-4">Ini</Badge>
        )}
        {index < chain.length - 1 && (
          <ArrowRight className="h-3 w-3 mx-1" />
        )}
      </span>
    ))}
  </div>
)}
```

**Sesudah:**
```tsx
{!isExpanded && (
  <div className="flex items-center gap-1 text-sm text-muted-foreground">
    {chain.map((contract, index) => {
      const isCurrent = contract.id === currentContractId;
      
      return (
        <span key={contract.id} className="flex items-center gap-1">
          {isCurrent ? (
            <span className="font-mono text-primary font-medium">
              {contract.invoice || `#${index + 1}`}
            </span>
          ) : (
            <button
              onClick={() => navigate(`/vip/contracts/${contract.id}`)}
              className="font-mono text-blue-600 underline hover:text-blue-800 cursor-pointer"
            >
              {contract.invoice || `#${index + 1}`}
            </button>
          )}
          {isCurrent && (
            <Badge variant="outline" className="text-[10px] h-4">Ini</Badge>
          )}
          {index < chain.length - 1 && (
            <ArrowRight className="h-3 w-3 mx-1" />
          )}
        </span>
      );
    })}
  </div>
)}
```

### Hasil

| Invoice | Tampilan |
|---------|----------|
| 0000000 | Teks biru + underline, bisa diklik → navigasi ke detail |
| 000299 (sedang dilihat) | Teks hijau (primary), tidak bisa diklik + badge "Ini" |

### Ilustrasi

**Sebelum:** `0000000 → 000299 [Ini]` (semua teks biasa)

**Sesudah:** `0000000 → 000299 [Ini]` (0000000 = hyperlink biru + underline)

