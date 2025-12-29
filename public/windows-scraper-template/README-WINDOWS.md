# BCA Scraper - Windows RDP Version v4.1.5

Versi Windows dari BCA Bank Scraper untuk dijalankan di Windows RDP (Remote Desktop).

## Keunggulan Windows RDP

1. **Visual Debugging** - Bisa lihat browser langsung (HEADLESS=false)
2. **Lebih Mudah Debug** - Tidak perlu SSH, langsung RDP
3. **Parallel Testing** - Cross-check dengan VPS Linux
4. **Backup** - Jika VPS Linux down, Windows tetap jalan

## Requirements

- Windows 10/11 atau Windows Server
- Node.js 18+ (Download: https://nodejs.org)
- Google Chrome atau Microsoft Edge

## Instalasi Cepat

### 1. Download & Extract

Download file ZIP dari Bank Scraper Settings, extract ke folder (contoh: `C:\bca-scraper\`)

### 2. Jalankan Installer

Double-click `install-windows.bat`

Installer akan:
- Cek Node.js installation
- Install Puppeteer
- Buat file config.env

### 3. Edit Konfigurasi

Edit file `config.env` dengan Notepad:

```
notepad config.env
```

Isi kredensial:
```
BCA_USER_ID=your_klikbca_user_id
BCA_PIN=your_klikbca_pin
BCA_ACCOUNT_NUMBER=1234567890
SECRET_KEY=vps_xxxxxxxxxxxxx  <- Dari Bank Scraper Settings
```

### 4. Test Scraper

Double-click `run-windows.bat`

Browser Chrome akan terbuka dan mulai scraping.

### 5. Setup Auto-Start (Opsional)

Jalankan `setup-autostart.bat` untuk auto-start saat login Windows.

## VPN Setup (Indonesia IP)

Karena BCA harus diakses dari IP Indonesia:

1. Install OpenVPN GUI: https://openvpn.net/client/
2. Download file .ovpn dari VPN provider (VPNJantit, Surfshark, dll)
3. Pilih server Indonesia
4. Connect VPN sebelum menjalankan scraper

## Troubleshooting

### Error: Node.js not found
- Download & install dari https://nodejs.org
- Restart Command Prompt setelah install

### Error: Puppeteer gagal install
- Pastikan internet stabil
- Jalankan: `npm install puppeteer`

### Error: Chrome not found
- Install Google Chrome
- Atau set CHROMIUM_PATH di config.env:
  ```
  CHROMIUM_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
  ```

### Browser tidak muncul
- Set HEADLESS=false di config.env
- Restart scraper

### Login BCA gagal
- Cek User ID dan PIN di config.env
- Pastikan VPN Indonesia aktif
- Coba akses manual ke https://ibank.klikbca.com

## File Structure

```
C:\bca-scraper\
├── bca-scraper-windows.js  <- Main scraper script
├── config.env              <- Konfigurasi (WAJIB edit!)
├── config.env.template     <- Template konfigurasi
├── install-windows.bat     <- Installer
├── run-windows.bat         <- Runner script
├── setup-autostart.bat     <- Auto-start setup
├── README-WINDOWS.md       <- Dokumentasi ini
├── debug\                  <- Folder screenshot debug
└── node_modules\           <- Dependencies (auto-created)
```

## Logs & Debug

Screenshot debug disimpan di folder `debug\`:
- `debug-login-page.png` - Halaman login
- `debug-login-success.png` - Setelah login berhasil
- `debug-scrape-error.png` - Jika ada error

Untuk melihat log real-time, jalankan dari Command Prompt:
```
cd C:\bca-scraper
node bca-scraper-windows.js
```

## Update Script

Untuk update ke versi terbaru:

1. Download file `bca-scraper-windows.js` baru
2. Replace file lama
3. Restart scraper

## Support

- Cek Bank Scraper Settings di app untuk konfigurasi
- Bandingkan hasil dengan VPS Linux untuk cross-check
- Hubungi admin jika ada masalah

---
Version: 4.1.5-windows
Build Date: 2025-12-29
