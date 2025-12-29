# BCA Balance Checker - Linux VPS v1.0.0

Scraper khusus untuk verifikasi pembayaran berbasis saldo (bukan mutasi).

## Perbedaan dengan BCA Scraper (Mutasi)

| Aspek | Mutation Scraper | Balance Checker |
|-------|------------------|-----------------|
| Metode | Parsing mutasi rekening | Perbandingan saldo |
| Kecepatan | 15-30 detik per cycle | 8-12 detik initial |
| Use Case | Histori transaksi | Verifikasi real-time |
| Akurasi | Per transaksi | Per nominal |

## Cara Kerja

1. **GRAB_INITIAL**: Login → Navigate ke Info Saldo → Ambil saldo awal
2. **CHECK_BALANCE**: Loop refresh saldo → Bandingkan dengan target → Report match

## Instalasi

```bash
# Download folder linuxsaldo
cd /root
mkdir -p bca-saldo && cd bca-saldo
# Copy semua file ke folder ini

# Install dependencies
chmod +x install.sh
./install.sh

# Edit config
nano config.env

# Test manual
./run.sh

# Install as service
sudo ./install-service.sh
```

## Konfigurasi

Edit `config.env`:

```bash
BCA_USER_ID=your_user_id
BCA_PIN=your_pin
SECRET_KEY=your_secret_key  # Dari UI web
```

## Troubleshooting

### Login Gagal
- Pastikan credentials benar
- Cek apakah ada session aktif di browser lain

### Saldo Tidak Terbaca
- Pastikan navigasi ke "Informasi Saldo" berhasil
- Cek format saldo di BCA (IDR vs Rp)

### Service Tidak Jalan
```bash
journalctl -u bca-saldo -f
```

## Flow Diagram

```
[Web] Click Generate
    ↓
[Web] Insert payment_confirmation_requests
    ↓
[Web] Insert windows_balance_check_sessions (command: GRAB_INITIAL)
    ↓
[Script] Poll → Receive GRAB_INITIAL
    ↓
[Script] Login → Navigate → Grab Initial Balance
    ↓
[Script] Report initial_balance via webhook
    ↓
[Web] Show unique amount to user
    ↓
[User] Transfer money
    ↓
[Web] User clicks "Saya Sudah Transfer"
    ↓
[Web] Update session (command: CHECK_BALANCE)
    ↓
[Script] Poll → Receive CHECK_BALANCE
    ↓
[Script] Loop: Refresh → Grab → Compare
    ↓
[Script] Match detected → Report matched
    ↓
[Web] Confetti! Payment verified!
```
