
## Perbaikan Input Durasi Kontrak

### Perubahan yang Diminta

1. **Form input disederhanakan**: Hanya isi Tanggal Mulai + pilih mode durasi
2. **Mode Durasi**: Toggle antara "Fleksibel" atau "Fix"
3. **Mode Fix**: Input jumlah hari, otomatis hitung tanggal selesai
4. **Perhitungan**: `endDate = startDate + (durasi - 1)` karena hari pertama sudah dihitung

### Ilustrasi UI

**Mode Durasi Fix (default):**
```
Tanggal Mulai *
[📅 1 Februari 2026]

Mode Durasi
( ) Fleksibel - Client belum tahu kapan selesai
(●) Durasi Tetap

Durasi (hari) *          Tanggal Selesai
[    7    ]    ──►      📅 7 Februari 2026
```

**Mode Durasi Fleksibel:**
```
Tanggal Mulai *
[📅 1 Februari 2026]

Mode Durasi
(●) Fleksibel - Client belum tahu kapan selesai
( ) Durasi Tetap

(Field durasi dan tanggal selesai disembunyikan)
```

### Perubahan File

| File | Perubahan |
|------|-----------|
| `src/pages/RentalContracts.tsx` | Update form: tambah state durasi, toggle mode, auto-calculate end date |
| `src/components/contracts/ExtendContractDialog.tsx` | Update: sembunyikan end date picker jika fleksibel, tambah input durasi untuk mode fix |

### Detail Teknis - RentalContracts.tsx

**State baru:**
```typescript
const [durationMode, setDurationMode] = useState<'flexible' | 'fixed'>('fixed');
const [durationDays, setDurationDays] = useState<number>(30); // Default 30 hari
```

**Perhitungan otomatis end_date:**
```typescript
// Ketika start_date atau durationDays berubah
useEffect(() => {
  if (durationMode === 'fixed' && contractForm.start_date && durationDays > 0) {
    // endDate = startDate + (durasi - 1)
    // Contoh: 1 Feb + (7-1) = 7 Feb
    const calculatedEndDate = addDays(contractForm.start_date, durationDays - 1);
    setContractForm(prev => ({ ...prev, end_date: calculatedEndDate }));
  }
}, [contractForm.start_date, durationDays, durationMode]);
```

**Logika save dengan durasi fleksibel:**
```typescript
const handleSaveContract = async () => {
  // Validasi
  if (!contractForm.start_date) {
    toast.error("Mohon pilih tanggal mulai");
    return;
  }
  
  if (durationMode === 'fixed' && (!durationDays || durationDays < 1)) {
    toast.error("Mohon masukkan durasi minimal 1 hari");
    return;
  }
  
  // Hitung end_date
  let endDate: Date;
  if (durationMode === 'flexible') {
    // Placeholder: 1 tahun dari start sebagai placeholder
    endDate = addYears(contractForm.start_date, 1);
  } else {
    endDate = addDays(contractForm.start_date, durationDays - 1);
  }
  
  const baseContractData = {
    // ...existing fields
    end_date: format(endDate, "yyyy-MM-dd"),
    is_flexible_duration: durationMode === 'flexible',
  };
  // ...
};
```

**UI Form baru:**
```tsx
{/* Tanggal Mulai */}
<div>
  <Label>Tanggal Mulai *</Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className={cn("w-full justify-start", !contractForm.start_date && "text-muted-foreground")}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {contractForm.start_date ? format(contractForm.start_date, "PPP", { locale: localeId }) : "Pilih tanggal"}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <Calendar
        mode="single"
        selected={contractForm.start_date}
        onSelect={(date) => setContractForm({ ...contractForm, start_date: date })}
        initialFocus
        className="pointer-events-auto"
      />
    </PopoverContent>
  </Popover>
</div>

{/* Mode Durasi */}
<div className="space-y-3">
  <Label>Mode Durasi</Label>
  <RadioGroup value={durationMode} onValueChange={(v) => setDurationMode(v as 'flexible' | 'fixed')}>
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
      <RadioGroupItem value="flexible" id="flexible" />
      <div>
        <Label htmlFor="flexible" className="flex items-center gap-2 cursor-pointer">
          <Clock className="h-4 w-4 text-blue-600" />
          Fleksibel
        </Label>
        <p className="text-xs text-muted-foreground">
          Client belum tahu kapan selesai, tagihan dihitung saat closing
        </p>
      </div>
    </div>
    
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <RadioGroupItem value="fixed" id="fixed" />
      <Label htmlFor="fixed" className="cursor-pointer">Durasi Tetap</Label>
    </div>
  </RadioGroup>
</div>

{/* Durasi & Preview Tanggal Selesai - hanya tampil jika mode fixed */}
{durationMode === 'fixed' && (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <Label>Durasi (hari) *</Label>
      <Input
        type="number"
        min={1}
        value={durationDays}
        onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
        placeholder="Contoh: 30"
      />
    </div>
    
    <div>
      <Label>Tanggal Selesai</Label>
      <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        {contractForm.start_date && durationDays > 0 ? (
          <span className="font-medium">
            {format(addDays(contractForm.start_date, durationDays - 1), "PPP", { locale: localeId })}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
    </div>
  </div>
)}
```

### Detail Teknis - ExtendContractDialog.tsx

Perubahan serupa:
1. Tambah state `durationMode` dan `durationDays`
2. Sembunyikan field end_date jika `durationMode === 'flexible'`
3. Tampilkan input durasi + preview tanggal selesai jika `durationMode === 'fixed'`
4. Gunakan perhitungan yang sama: `endDate = startDate + (durasi - 1)`

### Reset Form

```typescript
const resetContractForm = () => {
  setDurationMode('fixed');
  setDurationDays(30); // Default 30 hari
  // ...existing reset logic
};
```

### Edit Kontrak

Ketika edit kontrak yang sudah ada:
```typescript
const handleEditContract = (contract: RentalContract) => {
  // Hitung durasi dari start_date dan end_date
  const calculatedDuration = differenceInDays(new Date(contract.end_date), new Date(contract.start_date)) + 1;
  setDurationDays(calculatedDuration);
  setDurationMode(contract.is_flexible_duration ? 'flexible' : 'fixed');
  // ...existing logic
};
```

### Ringkasan

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| Input tanggal | 2 date picker (Mulai + Selesai) | 1 date picker (Mulai) + input durasi |
| Mode durasi | Toggle Switch (kurang jelas) | Radio Button (Fleksibel/Fix) |
| Perhitungan | Manual pilih end date | Otomatis: start + (durasi - 1) |
| Preview | Tidak ada | Tampil tanggal selesai hasil perhitungan |
| Validasi | Cek 2 tanggal | Cek start date + durasi (jika fix) |
