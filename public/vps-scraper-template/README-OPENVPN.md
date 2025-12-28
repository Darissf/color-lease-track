# VPS BCA Scraper dengan OpenVPN Indonesia

Setup guide untuk menjalankan BCA scraper dari VPS Eropa menggunakan OpenVPN koneksi Indonesia.

## Arsitektur

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   VPS Eropa     │────▶│  OpenVPN Server  │────▶│   KlikBCA.com   │
│   (Scraper)     │     │   (Indonesia)    │     │   (Indonesia)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                                                 │
        │                                                 │
        ▼                                                 ▼
┌─────────────────┐                              ┌─────────────────┐
│  IP Publik ID   │◀─────────────────────────────│  Akses Lokal    │
│  dari VPN       │                              │  (IP Indonesia) │
└─────────────────┘                              └─────────────────┘
```

## Requirements

- VPS Eropa (DigitalOcean, Vultr, Hetzner, dll)
- OpenVPN config file (.ovpn) dari provider VPN Indonesia
- Node.js 18+
- Puppeteer dependencies

## Quick Setup (5 Langkah)

### Langkah 1: Install Dependencies di VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install OpenVPN client
sudo apt install -y openvpn resolvconf

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
```

### Langkah 2: Setup OpenVPN

```bash
# Buat direktori untuk VPN config
sudo mkdir -p /etc/openvpn/client

# Upload file .ovpn dari provider VPN Indonesia
# Bisa via SCP atau copy-paste isinya
sudo nano /etc/openvpn/client/indonesia.conf

# Jika VPN memerlukan username/password, buat auth file
sudo nano /etc/openvpn/client/auth.txt
# Isi dengan 2 baris:
# username_vpn
# password_vpn

# Edit config untuk auto-login (opsional)
# Tambahkan baris ini di indonesia.conf:
# auth-user-pass /etc/openvpn/client/auth.txt

# Set permission
sudo chmod 600 /etc/openvpn/client/auth.txt
```

### Langkah 3: Test Koneksi VPN Manual

```bash
# Test koneksi VPN (foreground untuk debug)
sudo openvpn --config /etc/openvpn/client/indonesia.conf

# Di terminal lain, cek IP publik
curl -s https://api.ipify.org
# Harus menunjukkan IP Indonesia

# Jika berhasil, Ctrl+C untuk stop
```

### Langkah 4: Setup VPN sebagai Service

```bash
# Enable OpenVPN service
sudo systemctl enable openvpn-client@indonesia
sudo systemctl start openvpn-client@indonesia

# Cek status
sudo systemctl status openvpn-client@indonesia

# Verifikasi IP sudah Indonesia
curl -s https://api.ipify.org
```

### Langkah 5: Setup BCA Scraper

```bash
# Buat direktori project
mkdir -p ~/bca-scraper
cd ~/bca-scraper

# Download script
curl -O https://YOUR_APP_URL/vps-scraper-template/bca-scraper.js

# Install dependencies
npm init -y
npm install puppeteer

# Edit konfigurasi
nano bca-scraper.js
# Ubah CONFIG dengan kredensial BCA dan Secret Key

# Test manual
node bca-scraper.js

# Setup cron job (jalan setiap 5 menit)
crontab -e
# Tambahkan:
# */5 * * * * cd /root/bca-scraper && /usr/bin/node bca-scraper.js >> /var/log/bca-scraper.log 2>&1
```

## Contoh OpenVPN Config

Jika Anda punya OpenVPN server sendiri di Indonesia, config biasanya seperti ini:

```conf
client
dev tun
proto udp
remote YOUR_VPN_SERVER_IP 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
auth SHA256
cipher AES-256-CBC
auth-user-pass /etc/openvpn/client/auth.txt
verb 3

<ca>
-----BEGIN CERTIFICATE-----
... (CA certificate) ...
-----END CERTIFICATE-----
</ca>

<cert>
-----BEGIN CERTIFICATE-----
... (client certificate) ...
-----END CERTIFICATE-----
</cert>

<key>
-----BEGIN PRIVATE KEY-----
... (client private key) ...
-----END PRIVATE KEY-----
</key>
```

## Auto-Reconnect VPN

Buat script untuk auto-reconnect jika VPN terputus:

```bash
# Buat script monitoring
sudo nano /usr/local/bin/vpn-monitor.sh
```

```bash
#!/bin/bash
# /usr/local/bin/vpn-monitor.sh

# Cek apakah VPN interface aktif
if ! ip link show tun0 &> /dev/null; then
    echo "[$(date)] VPN disconnected, restarting..."
    sudo systemctl restart openvpn-client@indonesia
    sleep 10
fi

# Cek apakah bisa akses internet via VPN
if ! ping -c 1 8.8.8.8 &> /dev/null; then
    echo "[$(date)] Network unreachable, restarting VPN..."
    sudo systemctl restart openvpn-client@indonesia
    sleep 10
fi
```

```bash
# Set permission
sudo chmod +x /usr/local/bin/vpn-monitor.sh

# Tambah ke crontab (cek setiap 2 menit)
sudo crontab -e
# Tambahkan:
# */2 * * * * /usr/local/bin/vpn-monitor.sh >> /var/log/vpn-monitor.log 2>&1
```

## VPN + Scraper Wrapper Script

Untuk memastikan scraper hanya jalan jika VPN aktif:

```bash
# Buat wrapper script
nano ~/bca-scraper/run-with-vpn.sh
```

```bash
#!/bin/bash
# run-with-vpn.sh - Wrapper untuk memastikan VPN aktif sebelum scraping

LOG_FILE="/var/log/bca-scraper.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Cek VPN interface
if ! ip link show tun0 &> /dev/null; then
    log "ERROR: VPN tidak aktif (tun0 tidak ada)"
    exit 1
fi

# Cek IP Indonesia
CURRENT_IP=$(curl -s --max-time 10 https://api.ipify.org)
if [ -z "$CURRENT_IP" ]; then
    log "ERROR: Tidak bisa mendapatkan IP publik"
    exit 1
fi

# Verifikasi IP Indonesia (optional - bisa di-comment jika tidak perlu)
# Cek dengan ip-api.com
IP_COUNTRY=$(curl -s --max-time 10 "http://ip-api.com/json/$CURRENT_IP" | grep -o '"countryCode":"[^"]*"' | cut -d'"' -f4)
if [ "$IP_COUNTRY" != "ID" ]; then
    log "WARNING: IP $CURRENT_IP bukan Indonesia (country: $IP_COUNTRY)"
    # Uncomment baris di bawah jika ingin block jika bukan IP Indonesia
    # exit 1
fi

log "VPN OK - IP: $CURRENT_IP ($IP_COUNTRY)"

# Jalankan scraper
cd /root/bca-scraper
node bca-scraper.js >> $LOG_FILE 2>&1
```

```bash
# Set permission
chmod +x ~/bca-scraper/run-with-vpn.sh

# Update crontab untuk pakai wrapper
crontab -e
# Ubah menjadi:
# */5 * * * * /root/bca-scraper/run-with-vpn.sh
```

## Troubleshooting

### VPN tidak connect

```bash
# Cek log OpenVPN
sudo journalctl -u openvpn-client@indonesia -f

# Common issues:
# 1. Auth failed - cek username/password
# 2. TLS error - cek certificate
# 3. Timeout - cek firewall VPS
```

### DNS tidak resolve

```bash
# Pastikan resolvconf terinstall
sudo apt install resolvconf

# Restart OpenVPN
sudo systemctl restart openvpn-client@indonesia

# Atau set DNS manual
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```

### Scraper timeout

```bash
# Tingkatkan timeout di bca-scraper.js
TIMEOUT: 120000,  # 2 menit

# Atau jalankan browser dengan mode visible untuk debug
HEADLESS: false,
```

### Cek routing table

```bash
# Pastikan semua traffic ke BCA lewat VPN
ip route show

# Default gateway harus lewat tun0
# 0.0.0.0/1 via X.X.X.X dev tun0
```

## Provider VPN Indonesia yang Recommended

| Provider | Harga | Catatan |
|----------|-------|---------|
| VPN sendiri | $5/bln (VPS) | Paling reliable, full control |
| Surfshark | $2.5/bln | Unlimited devices, ada server ID |
| NordVPN | $3.5/bln | Server ID tersedia |
| ExpressVPN | $8/bln | Kualitas bagus, ada ID |

**Rekomendasi**: Buat VPN server sendiri di VPS Indonesia (IDCloudHost, Dewaweb, CloudKilat) dengan biaya ~$5/bulan. Ini memberikan:
- Dedicated IP Indonesia
- Full control
- Tidak ada batasan bandwidth
- Stabil untuk scraping

## Support

Jika ada masalah, cek log:
```bash
# Log VPN
sudo journalctl -u openvpn-client@indonesia --since "1 hour ago"

# Log scraper
tail -100 /var/log/bca-scraper.log
```
