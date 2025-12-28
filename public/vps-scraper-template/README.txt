============================================================
    BCA VPS Scraper - Quick Start Guide
============================================================

PERSIAPAN:
1. VPS Eropa (Contabo, Hetzner, DigitalOcean) - ~$5-10/bulan
2. File .ovpn dari VPNJantit atau provider VPN Indonesia lainnya
3. Kredensial KlikBCA (User ID & PIN)

============================================================
CARA SETUP (3 LANGKAH MUDAH):
============================================================

LANGKAH 1: Upload semua file ke VPS
--------------------------------------
Upload folder ini ke VPS Anda, contoh ke /root/bca-scraper/

Pastikan file-file berikut ada:
- install.sh
- config.env.template (atau config.env)
- bca-scraper.js
- run.sh
- [file].ovpn (dari VPNJantit)


LANGKAH 2: Jalankan installer
--------------------------------------
Di VPS, jalankan:

  cd /root/bca-scraper
  chmod +x install.sh
  sudo ./install.sh

Installer akan:
- Install Node.js, OpenVPN, Puppeteer
- Setup VPN Indonesia (dari file .ovpn)
- Setup cron job otomatis


LANGKAH 3: Edit config.env
--------------------------------------
Edit file config.env dengan kredensial Anda:

  nano config.env

Isi yang WAJIB:
- BCA_USER_ID (User ID KlikBCA)
- BCA_PIN (PIN KlikBCA)
- BCA_ACCOUNT_NUMBER (Nomor Rekening)
- SECRET_KEY (dari UI Bank Scraper Settings)

CATATAN tentang VPN:
- File .ovpn biasanya sudah berisi credentials lengkap
- VPN_USERNAME dan VPN_PASSWORD TIDAK PERLU diisi
- Cukup upload file .ovpn saja


============================================================
TESTING:
============================================================

1. Start VPN Indonesia:
   sudo systemctl start openvpn-client@indonesia

2. Cek IP (harus Indonesia):
   curl https://api.ipify.org

3. Test scraper manual:
   ./run.sh

4. Monitor log:
   tail -f /var/log/bca-scraper.log


============================================================
TROUBLESHOOTING:
============================================================

VPN tidak konek:
- Cek status: sudo systemctl status openvpn-client@indonesia
- Cek log: sudo journalctl -u openvpn-client@indonesia

Browser error:
- Pastikan dependencies terinstall: sudo apt install -y chromium-browser

Webhook error:
- Pastikan SECRET_KEY di config.env sama dengan di UI
- Cek koneksi internet: curl https://api.ipify.org


============================================================
SUPPORT:
============================================================
Jika ada masalah, cek halaman Bank Scraper Settings di aplikasi
untuk melihat status webhook dan error terakhir.
