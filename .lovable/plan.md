

## Tampilkan Kalender Tanggal Pengambilan Saat Status "Selesai" Dipilih di Form Tambah Kontrak

### Masalah

Di form tambah/edit kontrak, saat status dipilih "Selesai", field `tanggal_ambil` otomatis diisi `new Date()` tapi **tidak ada kalender** yang muncul untuk memilih tanggal pengambilan. Padahal di fitur unlock table (list kontrak), saat status diubah ke "Selesai" langsung muncul dialog kalender.

### Solusi

Tambahkan kalender tanggal pengambilan yang muncul **tepat di bawah dropdown status** ketika status = "selesai" dipilih di form tambah/edit kontrak.

### Detail Teknis

**File: `src/pages/RentalContracts.tsx`**

Setelah penutup `</Select>` dan `</div>` dari field Status (sekitar line 1083-1084), tambahkan blok kondisional:

```tsx
{contractForm.status === "selesai" && (
  <div className="space-y-2">
    <Label>Tanggal Pengambilan</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !contractForm.tanggal_ambil && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {contractForm.tanggal_ambil
            ? format(contractForm.tanggal_ambil, "PPP", { locale: localeId })
            : "Pilih tanggal pengambilan"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={contractForm.tanggal_ambil}
          onSelect={(date) =>
            setContractForm({ ...contractForm, tanggal_ambil: date || undefined })
          }
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  </div>
)}
```

Semua komponen yang dibutuhkan (Popover, Calendar, CalendarIcon, cn, format, localeId) sudah di-import di file ini. Tidak perlu import tambahan.

### Hasil

- Pilih status "Selesai" di form: langsung muncul date picker tanggal pengambilan
- Tanggal pengambilan default sudah terisi hari ini (dari logika existing di line 1067-1068)
- User bisa klik untuk ubah tanggal via kalender
- Pilih status lain: date picker otomatis hilang
