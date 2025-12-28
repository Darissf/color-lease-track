# VPS BCA Scraper dengan OpenVPN Indonesia (Split Tunnel)

Setup guide untuk menjalankan BCA scraper dari VPS Eropa menggunakan OpenVPN koneksi Indonesia dengan **split tunneling**.

## ⭐ Fitur Split Tunneling

Dengan split tunneling:
- ✅ **SSH tetap bisa diakses** via IP VPS langsung (tidak melalui VPN)
- ✅ **Traffic BCA** otomatis melalui VPN Indonesia
- ✅ **Tidak kehilangan akses** ke VPS saat VPN aktif

## Arsitektur Split Tunnel

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS Eropa                               │
│                                                                 │
│   ┌─────────────┐                      ┌─────────────┐         │
│   │    SSH      │──────────────────────│  Direct IP  │◀── YOU  │
│   │  (Port 22)  │     (langsung)       │  194.x.x.x  │         │
│   └─────────────┘                      └─────────────┘         │
│                                                                 │
│   ┌─────────────┐     ┌──────────────┐ ┌─────────────┐         │
│   │ BCA Traffic │────▶│   OpenVPN    │─│ IP Indonesia│────▶ BCA│
│   │             │     │   Tunnel     │ │ (dari VPN)  │         │
│   └─────────────┘     └──────────────┘ └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Requirements

- VPS Eropa (DigitalOcean, Vultr, Hetzner, Contabo, dll)
- **File .ovpn** dari provider VPN Indonesia (Surfshark, NordVPN, dll)
- Node.js 18+
- Puppeteer dependencies

## Cara Mendapatkan File .ovpn

### Opsi 1: Surfshark (Recommended)
1. Login ke https://my.surfshark.com
2. Pergi ke **VPN** → **Manual Setup** → **Router/Other**
3. Pilih lokasi **Indonesia**
4. Download file **.ovpn**

### Opsi 2: NordVPN
1. Login ke https://my.nordaccount.com
2. Pergi ke **NordVPN** → **Manual Setup**
3. Download config untuk server Indonesia (id-xxx.nordvpn.com)

### Opsi 3: ExpressVPN
1. Login ke https://www.expressvpn.com/setup
2. Pilih **Manual Configuration** → **OpenVPN**
3. Download config Indonesia

### Opsi 4: VPN Server Sendiri
Jika punya VPS di Indonesia (IDCloudHost, Dewaweb, dll):
```bash
# Di VPS Indonesia, install OpenVPN server
curl -O https://raw.githubusercontent.com/angristan/openvpn-install/master/openvpn-install.sh
chmod +x openvpn-install.sh
./openvpn-install.sh
# Download file .ovpn yang dihasilkan
```

---

## Quick Setup (Split Tunnel)

### Langkah 1: Upload File .ovpn ke VPS

```bash
# Dari komputer lokal, upload file .ovpn ke VPS
scp indonesia.ovpn root@YOUR_VPS_IP:/root/bca-scraper/

# Atau jika sudah di VPS, download dari provider
# wget https://...your-vpn-provider.../indonesia.ovpn
```

### Langkah 2: Download Template Scraper

```bash
# SSH ke VPS
ssh root@YOUR_VPS_IP

# Buat direktori
mkdir -p ~/bca-scraper
cd ~/bca-scraper

# Download semua file template
# (Ganti URL dengan URL aplikasi Anda)
curl -O https://YOUR_APP_URL/vps-scraper-template/bca-scraper.js
curl -O https://YOUR_APP_URL/vps-scraper-template/scheduler.js
curl -O https://YOUR_APP_URL/vps-scraper-template/config.env.template
curl -O https://YOUR_APP_URL/vps-scraper-template/vpn-up.sh
curl -O https://YOUR_APP_URL/vps-scraper-template/vpn-down.sh
curl -O https://YOUR_APP_URL/vps-scraper-template/setup-split-tunnel.sh
curl -O https://YOUR_APP_URL/vps-scraper-template/run.sh

# Copy template config
cp config.env.template config.env
```

### Langkah 3: Jalankan Setup Script

```bash
# Pastikan file .ovpn ada di direktori yang sama
ls *.ovpn  # harus menunjukkan file .ovpn Anda

# Jalankan setup dengan split tunnel
chmod +x setup-split-tunnel.sh
sudo ./setup-split-tunnel.sh
```

Script akan otomatis:
1. Install OpenVPN dan dependencies
2. Konfigurasi split tunneling
3. Setup routing rules agar SSH tetap accessible
4. Start VPN service
5. Verifikasi koneksi

### Langkah 4: Verifikasi Split Tunnel

```bash
# Cek SSH masih bisa (dari terminal lain)
ssh root@YOUR_VPS_IP  # harus berhasil!

# Di VPS, cek IP langsung (untuk SSH)
curl ifconfig.me
# Output: IP VPS Eropa Anda (194.x.x.x, dll)

# Cek IP via VPN (untuk BCA)
curl --interface tun0 ifconfig.me
# Output: IP Indonesia dari VPN

# Cek log split tunnel
tail -f /var/log/vpn-split-tunnel.log
```

### Langkah 5: Konfigurasi BCA Credentials

```bash
cd ~/bca-scraper
nano config.env
```

Isi dengan kredensial Anda:
```env
# BCA Credentials
BCA_USER_ID=your_klikbca_userid
BCA_PIN=your_klikbca_pin
BCA_ACCOUNT_NUMBER=1234567890

# Webhook Configuration
WEBHOOK_URL=https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook
SECRET_KEY=your_secret_key_from_settings

# Scraping Settings
INTERVAL_MINUTES=5
TIMEOUT=60000
HEADLESS=true
```

### Langkah 6: Start Scraper Service

```bash
# Start service
sudo systemctl start bca-scraper
sudo systemctl enable bca-scraper

# Cek status
sudo systemctl status bca-scraper

# Lihat logs
sudo journalctl -u bca-scraper -f
```

---

## Troubleshooting

### SSH Tidak Bisa Diakses Setelah VPN Start

```bash
# Jika terjebak, akses via VNC console dari provider VPS
# Lalu stop VPN:
sudo systemctl stop openvpn-client@indonesia

# Cek log
cat /var/log/vpn-split-tunnel.log

# Restart dengan debug
sudo openvpn --config /etc/openvpn/client/indonesia.conf --verb 5
```

### VPN Tidak Connect

```bash
# Cek log OpenVPN
sudo journalctl -u openvpn-client@indonesia -n 100

# Common issues:
# 1. Auth failed - cek username/password VPN
# 2. Certificate expired - download ulang .ovpn
# 3. Server penuh - pilih server Indonesia lain
```

### IP VPN Bukan Indonesia

```bash
# Cek IP country
curl --interface tun0 http://ip-api.com/json

# Jika bukan ID:
# 1. Download .ovpn dari server Indonesia yang lain
# 2. Update config:
sudo cp new-indonesia.ovpn /etc/openvpn/client/indonesia.conf
sudo systemctl restart openvpn-client@indonesia
```

### BCA Scraper Error

```bash
# Cek log scraper
tail -100 /var/log/bca-scraper.log

# Test manual
cd ~/bca-scraper
node bca-scraper.js

# Jika timeout, naikkan TIMEOUT di config.env
```

---

## Useful Commands

```bash
# Status VPN
sudo systemctl status openvpn-client@indonesia

# Status Scraper
sudo systemctl status bca-scraper

# Restart VPN
sudo systemctl restart openvpn-client@indonesia

# Restart Scraper
sudo systemctl restart bca-scraper

# View VPN logs
sudo journalctl -u openvpn-client@indonesia -f

# View Scraper logs
sudo journalctl -u bca-scraper -f

# View Split Tunnel logs
tail -f /var/log/vpn-split-tunnel.log

# Check both IPs
echo "Direct IP: $(curl -s ifconfig.me)"
echo "VPN IP: $(curl -s --interface tun0 ifconfig.me)"
```

---

## Provider VPN Indonesia yang Recommended

| Provider | Harga | Catatan |
|----------|-------|---------|
| Surfshark | ~$2.5/bln | Unlimited devices, server ID bagus |
| NordVPN | ~$3.5/bln | Stabil, banyak server ID |
| ExpressVPN | ~$8/bln | Premium, sangat reliable |
| VPN Sendiri | ~$5/bln | Full control, dedicated IP |

**💡 Tips**: Gunakan Surfshark atau buat VPN server sendiri di VPS Indonesia untuk hasil terbaik.

---

## Support

Jika ada masalah:
1. Cek log: `tail -100 /var/log/bca-scraper.log`
2. Cek VPN: `sudo journalctl -u openvpn-client@indonesia -n 50`
3. Cek split tunnel: `cat /var/log/vpn-split-tunnel.log`
