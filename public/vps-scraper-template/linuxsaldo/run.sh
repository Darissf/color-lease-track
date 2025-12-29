#!/bin/bash
# ============================================================
# BCA Balance Checker - Linux VPS v1.0.0
# Manual Run Script
# ============================================================

cd "$(dirname "$0")"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     BCA Balance Checker - Linux VPS v1.0.0                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check config
if [ ! -f config.env ]; then
    echo "[ERROR] config.env not found!"
    echo "Run: cp config.env.template config.env"
    echo "Then edit config.env with your credentials"
    exit 1
fi

# Check node_modules
if [ ! -d node_modules ]; then
    echo "[WARN] node_modules not found. Running install first..."
    ./install.sh
fi

echo "[INFO] Starting BCA Balance Checker..."
echo "[INFO] Press Ctrl+C to stop"
echo ""

node bca-balance-linux.js
