#!/bin/bash
# ============================================================
# BCA Balance Checker - Linux VPS v1.0.0
# Installation Script
# ============================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     BCA Balance Checker - Linux VPS v1.0.0                 ║"
echo "║                   Installation Script                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}[WARN]${NC} Not running as root. Some commands may require sudo."
fi

# Check and install Node.js
echo "[INFO] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}[INFO]${NC} Node.js not found. Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}[OK]${NC} Node.js found: $(node --version)"
fi

# Check and install Chromium
echo ""
echo "[INFO] Checking Chromium..."
if ! command -v chromium-browser &> /dev/null && ! command -v chromium &> /dev/null && ! command -v google-chrome &> /dev/null; then
    echo -e "${YELLOW}[INFO]${NC} Chromium not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium
else
    CHROME_PATH=$(which chromium-browser || which chromium || which google-chrome)
    echo -e "${GREEN}[OK]${NC} Chromium found: $CHROME_PATH"
fi

# Install npm dependencies
echo ""
echo "[INFO] Installing npm dependencies..."
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth

# Create config.env if not exists
echo ""
if [ ! -f config.env ]; then
    cp config.env.template config.env
    echo -e "${GREEN}[OK]${NC} Created config.env from template"
    echo -e "${YELLOW}[IMPORTANT]${NC} Edit config.env with your BCA credentials!"
else
    echo -e "${GREEN}[OK]${NC} config.env already exists"
fi

# Make scripts executable
chmod +x run.sh install-service.sh 2>/dev/null || true

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              INSTALLATION COMPLETE!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Edit config.env with your BCA credentials"
echo "  2. Run manually: ./run.sh"
echo "  3. Or install as service: ./install-service.sh"
echo ""
