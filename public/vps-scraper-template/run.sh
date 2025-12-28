#!/bin/bash
# ============================================================
# BCA Scraper Runner
# Script ini menjalankan scraper dengan config dari config.env
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load config
if [ -f "config.env" ]; then
    export $(grep -v '^#' config.env | xargs)
else
    echo "ERROR: config.env tidak ditemukan!"
    echo "Copy config.env.template ke config.env dan isi dengan kredensial Anda"
    exit 1
fi

# Validate required config
if [ -z "$BCA_USER_ID" ] || [ "$BCA_USER_ID" = "your_bca_user_id" ]; then
    echo "ERROR: BCA_USER_ID belum dikonfigurasi di config.env"
    exit 1
fi

if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "YOUR_SECRET_KEY_HERE" ]; then
    echo "ERROR: SECRET_KEY belum dikonfigurasi di config.env"
    exit 1
fi

# Check if VPN is connected (optional)
if command -v curl &> /dev/null; then
    echo "Checking IP address..."
    IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
    echo "Current IP: $IP"
fi

# Run scraper
echo "Starting BCA Scraper..."
node bca-scraper.js
