# VPS BCA Scraper Template

Script untuk scraping mutasi BCA dari VPS sendiri dan mengirim ke webhook.

## Pilihan Setup

### Opsi 1: VPS Indonesia (Recommended)
VPS langsung di Indonesia - tidak perlu VPN/proxy.
- Ikuti panduan di bawah

### Opsi 2: VPS Eropa + OpenVPN Indonesia ⭐
VPS Eropa dengan koneksi VPN ke Indonesia.
- Lihat: [README-OPENVPN.md](./README-OPENVPN.md)
- Jalankan: `sudo ./setup-openvpn.sh`

---

## Requirements (VPS Indonesia)

- Ubuntu 20.04+ atau Debian 11+
- Node.js 18+
- Puppeteer dependencies
- IP Indonesia (native atau via VPN)

## Quick Setup

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Puppeteer dependencies
sudo apt install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libasound2 \
  libxshmfence1

# Create project directory
mkdir -p ~/bca-scraper
cd ~/bca-scraper

# Initialize npm project
npm init -y

# Install puppeteer
npm install puppeteer
```

### 2. Download Script

```bash
cd ~/bca-scraper

# Download scraper script
curl -O https://YOUR_LOVABLE_APP_URL/vps-scraper-template/bca-scraper.js
```

### 3. Configure Script

Edit `bca-scraper.js` dan ubah bagian CONFIG:

```javascript
const CONFIG = {
  BCA_USER_ID: 'YOUR_KLIKBCA_USER_ID',
  BCA_PIN: 'YOUR_KLIKBCA_PIN',
  SECRET_KEY: 'YOUR_SECRET_KEY_HERE',  // dari halaman settings
  ACCOUNT_NUMBER: '1234567890',
  // ... sisanya biarkan default
};
```

### 4. Test Manual

```bash
node bca-scraper.js
```

Jika berhasil, akan muncul output:
```
[2025-12-28T10:00:00.000Z] Starting BCA scraper...
Navigating to KlikBCA...
Logging in...
Checking login status...
Navigating to Mutasi Rekening...
Setting date range...
Parsing mutations...
Found 3 mutations
Sending to webhook...
Webhook response: { success: true, processed: 3, matched: 1 }
[2025-12-28T10:00:30.000Z] Scraper completed successfully
```

### 5. Setup Cron Job

```bash
# Edit crontab
crontab -e

# Tambahkan baris berikut (jalan setiap 5 menit)
*/5 * * * * cd /root/bca-scraper && /usr/bin/node bca-scraper.js >> /var/log/bca-scraper.log 2>&1
```

### 6. Monitor Logs

```bash
# Lihat log real-time
tail -f /var/log/bca-scraper.log
```

## Troubleshooting

### Error: Failed to launch browser

Pastikan semua dependencies terinstall:
```bash
sudo apt install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libasound2 libxshmfence1
```

### Error: Login failed

1. Cek username dan PIN sudah benar
2. Pastikan akun tidak di-suspend
3. Coba login manual di browser untuk verifikasi

### Error: Webhook failed - Invalid secret key

1. Buka halaman Payment Auto Settings
2. Copy secret key dari tab "VPS Scraper"
3. Paste di CONFIG.SECRET_KEY

### Error: Timeout

Jika VPS lambat, coba naikkan timeout:
```javascript
TIMEOUT: 120000,  // 2 menit
SLOW_MO: 200,     // lebih lambat
```

## Security Tips

1. **Jangan share script** yang sudah berisi kredensial
2. **Gunakan VPS dedicated** untuk keamanan
3. **Batasi akses SSH** hanya dari IP tertentu
4. **Update berkala** untuk patch keamanan

## Biaya Estimasi

| VPS Provider | Spec | Harga/bulan |
|--------------|------|-------------|
| DigitalOcean | 1GB RAM | $6 |
| Vultr | 1GB RAM | $5 |
| Linode | 1GB RAM | $5 |
| Contabo | 4GB RAM | €4.99 |

## Support

Jika ada masalah, hubungi admin atau buka issue di GitHub.
