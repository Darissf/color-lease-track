

## Menandai Email sebagai Read Setelah Auto-Click Selesai

### Masalah Saat Ini

Setelah proses auto-click selesai (semua link diklik + delay 10 detik), email tetap dalam status `is_read = false`. Ini bisa membingungkan karena:
- User mungkin berpikir email belum diproses
- Jika ada proses auto-click ulang di masa depan, email yang sama bisa diproses lagi

### Solusi

Tambahkan update `is_read = true` setelah semua link selesai diklik di fungsi `autoClickLinks`.

### Perubahan Kode

**File:** `supabase/functions/inbound-mail-webhook/index.ts`

**Lokasi:** Setelah loop selesai (baris 117, sebelum catch terakhir)

**Perubahan:**

```typescript
// Di akhir fungsi autoClickLinks, setelah loop for selesai:

    // ... existing loop code ...
    }

    // ⭐ BARU: Tandai email sebagai sudah dibaca setelah semua link diklik
    console.log(`All links clicked for inbox ${mailInboxId}. Marking as read...`);
    const { error: updateError } = await supabase
      .from('mail_inbox')
      .update({ is_read: true })
      .eq('id', mailInboxId);
    
    if (updateError) {
      console.error(`Failed to mark email as read:`, updateError);
    } else {
      console.log(`Email ${mailInboxId} marked as read after auto-click`);
    }

  } catch (error) {
    console.error('Error in autoClickLinks:', error);
  }
}
```

### Flow Lengkap (Updated)

```text
Email masuk (webhook)
    ↓
Simpan ke database (is_read = false)
    ↓
Cek auto_click_links = true?
    ↓ Ya
Extract links dari email (max 10)
    ↓
Untuk setiap link:
    1. Klik link (HTTP GET, timeout 10 detik)
    2. Simpan hasil ke mail_auto_clicked_links
    3. Tunggu 10 detik (delay)
    4. Lanjut ke link berikutnya
    ↓
⭐ BARU: Update is_read = true
    ↓
Selesai
```

### Ringkasan

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| Status email setelah auto-click | `is_read = false` | `is_read = true` |
| Kapan di-mark read | Tidak pernah (oleh auto-click) | Setelah semua link diklik + delay |

### Catatan

- Jika auto-click disabled atau tidak ada link, email tetap unread (sesuai behavior normal)
- Jika ada error di tengah proses, email mungkin tidak di-mark read (safety measure)
- User masih bisa membaca email secara manual kapan saja

