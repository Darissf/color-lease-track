#!/bin/bash
# ============================================================
# BCA Scraper Runner
# 
# Usage:
#   ./run.sh              - Normal mode (single scrape)
#   ./run.sh --burst-check - Check for burst command and run if active
#   ./run.sh --daemon      - Run scheduler daemon (recommended)
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
    echo "[$(date)] Checking IP address..."
    IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
    echo "[$(date)] Current IP: $IP"
fi

# Check mode
if [ "$1" = "--daemon" ]; then
    echo "[$(date)] Running in DAEMON mode (scheduler)..."
    echo "[$(date)] Scheduler will poll server for config every 60 seconds"
    echo "[$(date)] Press Ctrl+C to stop"
    echo ""
    node scheduler.js
elif [ "$1" = "--burst-check" ]; then
    echo "[$(date)] Running in BURST CHECK mode..."
    node bca-scraper.js --burst-check
else
    echo "[$(date)] Running in NORMAL mode (single scrape)..."
    node bca-scraper.js
fi
