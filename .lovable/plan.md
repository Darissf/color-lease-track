

## Auto-Refresh dengan Supabase Realtime

### Tujuan

Email baru akan langsung muncul di UI tanpa perlu klik tombol Refresh, menggunakan subscription ke perubahan database secara realtime.

### Langkah Implementasi

#### 1. Aktifkan Realtime pada Tabel `mail_inbox`

Jalankan migration SQL untuk mengaktifkan realtime:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.mail_inbox;
```

#### 2. Modifikasi `src/pages/Mail.tsx`

Tambahkan useEffect baru untuk subscribe ke perubahan realtime pada tabel `mail_inbox`.

**Lokasi:** Setelah useEffect fetchEmails (sekitar baris 98)

**Kode baru:**

```typescript
// Realtime subscription untuk auto-refresh
useEffect(() => {
  if (!user || (!isSuperAdmin && !isAdmin)) return;

  const channel = supabase
    .channel('mail_inbox_changes')
    .on(
      'postgres_changes',
      {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'mail_inbox',
      },
      (payload) => {
        console.log('Realtime email update:', payload);
        
        if (payload.eventType === 'INSERT') {
          const newEmail = payload.new as Email;
          // Cek apakah sesuai dengan filter saat ini
          if (newEmail.mail_type === mailType) {
            // Tambahkan ke awal list
            setEmails((prev) => [newEmail, ...prev]);
            
            // Tampilkan notifikasi
            toast({
              title: "📬 Email Baru",
              description: `Dari: ${newEmail.from_name || newEmail.from_address}`,
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedEmail = payload.new as Email;
          setEmails((prev) =>
            prev.map((email) =>
              email.id === updatedEmail.id ? updatedEmail : email
            )
          );
          // Update selectedEmail jika sedang dibuka
          if (selectedEmail?.id === updatedEmail.id) {
            setSelectedEmail(updatedEmail);
          }
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setEmails((prev) => prev.filter((email) => email.id !== deletedId));
          if (selectedEmail?.id === deletedId) {
            setSelectedEmail(null);
          }
        }
      }
    )
    .subscribe();

  // Cleanup saat unmount atau dependencies berubah
  return () => {
    supabase.removeChannel(channel);
  };
}, [user, isSuperAdmin, isAdmin, mailType, selectedEmail?.id]);
```

### Flow Lengkap

```text
User membuka halaman Mail
    ↓
fetchEmails() → Load data awal
    ↓
Subscribe ke channel 'mail_inbox_changes'
    ↓
Email baru masuk (webhook menyimpan ke DB)
    ↓
Supabase Realtime mengirim event INSERT
    ↓
Callback di frontend dipanggil
    ↓
setEmails() menambah email baru ke state
    ↓
UI otomatis update + toast notifikasi
    ↓
User melihat email baru langsung muncul ✨
```

### Fitur yang Didapat

| Event | Aksi di UI |
|-------|------------|
| INSERT | Email baru ditambahkan ke list + toast notifikasi |
| UPDATE | Email yang berubah (read/starred/deleted) langsung update |
| DELETE | Email yang dihapus langsung hilang dari list |

### File yang Diubah

| File | Perubahan |
|------|-----------|
| Database Migration | Aktifkan realtime untuk `mail_inbox` |
| `src/pages/Mail.tsx` | Tambahkan realtime subscription useEffect |

### Catatan Teknis

| Aspek | Detail |
|-------|--------|
| Channel name | `mail_inbox_changes` |
| Events | INSERT, UPDATE, DELETE |
| Filter | Berdasarkan `mailType` (inbound/outbound) |
| Cleanup | `supabase.removeChannel()` saat unmount |
| Notifikasi | Toast saat ada email baru |

