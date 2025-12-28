#!/bin/bash
# ============================================================
# BCA VPS Scraper - All-in-One Installer
# ============================================================
# Script ini akan:
# 1. Install semua dependencies (Node.js, OpenVPN, Puppeteer)
# 2. Setup OpenVPN dengan file .ovpn yang tersedia
# 3. Setup systemd service untuk scheduler daemon
# ============================================================

set -e

echo "============================================================"
echo "    BCA VPS Scraper - All-in-One Installer"
echo "============================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

# ============================================================
# STEP 1: Check for .ovpn file
# ============================================================
echo ""
echo "STEP 1: Checking for OpenVPN config file..."

OVPN_FILE=$(ls *.ovpn 2>/dev/null | head -1)

if [ -z "$OVPN_FILE" ]; then
    print_warning "File .ovpn tidak ditemukan di folder ini"
    echo ""
    echo "Untuk menggunakan VPN Indonesia:"
    echo "1. Download file .ovpn dari VPNJantit (atau provider VPN lain)"
    echo "2. Upload file .ovpn ke folder ini"
    echo "3. Jalankan ulang script ini"
    echo ""
    echo "Atau lanjutkan tanpa VPN (tidak disarankan untuk BCA)?"
    read -p "Lanjutkan tanpa VPN? (y/N): " SKIP_VPN
    if [ "$SKIP_VPN" != "y" ] && [ "$SKIP_VPN" != "Y" ]; then
        echo "Installer dibatalkan. Upload file .ovpn dan jalankan ulang."
        exit 1
    fi
else
    print_success "Found OpenVPN config: $OVPN_FILE"
fi

# ============================================================
# STEP 2: Check for config.env
# ============================================================
echo ""
echo "STEP 2: Checking configuration..."

if [ ! -f "config.env" ]; then
    if [ -f "config.env.template" ]; then
        cp config.env.template config.env
        print_warning "config.env dibuat dari template"
        echo "PENTING: Edit config.env dengan kredensial BCA Anda!"
    else
        print_error "config.env.template tidak ditemukan!"
        exit 1
    fi
else
    print_success "config.env found"
fi

# Load config
source config.env 2>/dev/null || true

# ============================================================
# STEP 3: Install system dependencies
# ============================================================
echo ""
echo "STEP 3: Installing system dependencies..."

# Detect package manager
if command -v apt &> /dev/null; then
    PKG_MANAGER="apt"
    PKG_INSTALL="apt install -y"
    sudo apt update
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    PKG_INSTALL="yum install -y"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    PKG_INSTALL="dnf install -y"
else
    print_error "Package manager not found (apt/yum/dnf)"
    exit 1
fi

# Install OpenVPN
if ! command -v openvpn &> /dev/null; then
    echo "Installing OpenVPN..."
    sudo $PKG_INSTALL openvpn
    print_success "OpenVPN installed"
else
    print_success "OpenVPN already installed"
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    if [ "$PKG_MANAGER" = "apt" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo $PKG_INSTALL nodejs
    fi
    print_success "Node.js installed"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js already installed ($NODE_VERSION)"
fi

# Install Puppeteer dependencies
echo "Installing Puppeteer/Chromium dependencies..."
if [ "$PKG_MANAGER" = "apt" ]; then
    sudo apt install -y \
        ca-certificates \
        fonts-liberation \
        libappindicator3-1 \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libx11-xcb1 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        xdg-utils \
        libxss1 \
        libgconf-2-4 \
        libxshmfence1 2>/dev/null || true
fi
print_success "Chromium dependencies installed"

# ============================================================
# STEP 4: Install npm dependencies
# ============================================================
echo ""
echo "STEP 4: Installing npm packages..."

if [ ! -f "package.json" ]; then
    npm init -y
fi

npm install puppeteer dotenv
print_success "npm packages installed"

# ============================================================
# STEP 5: Setup OpenVPN (if .ovpn file exists)
# ============================================================
if [ -n "$OVPN_FILE" ]; then
    echo ""
    echo "STEP 5: Setting up OpenVPN..."
    
    # Create OpenVPN client config directory
    sudo mkdir -p /etc/openvpn/client
    
    # Copy .ovpn file
    sudo cp "$OVPN_FILE" /etc/openvpn/client/indonesia.conf
    
    # Create auth file ONLY if VPN credentials are provided and not empty/placeholder
    if [ -n "$VPN_USERNAME" ] && [ "$VPN_USERNAME" != "your_vpn_username" ] && [ "$VPN_USERNAME" != "" ]; then
        echo "$VPN_USERNAME" | sudo tee /etc/openvpn/client/auth.txt > /dev/null
        echo "$VPN_PASSWORD" | sudo tee -a /etc/openvpn/client/auth.txt > /dev/null
        sudo chmod 600 /etc/openvpn/client/auth.txt
        
        # Add auth-user-pass to config if not present
        if ! grep -q "auth-user-pass" /etc/openvpn/client/indonesia.conf; then
            echo "auth-user-pass /etc/openvpn/client/auth.txt" | sudo tee -a /etc/openvpn/client/indonesia.conf > /dev/null
        else
            sudo sed -i 's|auth-user-pass.*|auth-user-pass /etc/openvpn/client/auth.txt|g' /etc/openvpn/client/indonesia.conf
        fi
        
        print_success "VPN credentials configured (dari config.env)"
    else
        # No separate credentials needed - .ovpn file will be used as-is
        print_success "Using .ovpn file directly (no separate auth needed)"
        echo "  File .ovpn akan digunakan apa adanya"
    fi
    
    # Enable and start OpenVPN service
    sudo systemctl enable openvpn-client@indonesia 2>/dev/null || true
    
    print_success "OpenVPN configured"
    echo ""
    echo "Untuk start VPN manual: sudo systemctl start openvpn-client@indonesia"
    echo "Untuk cek status VPN: sudo systemctl status openvpn-client@indonesia"
fi

# ============================================================
# STEP 6: Make scripts executable
# ============================================================
echo ""
echo "STEP 6: Setting permissions..."

chmod +x run.sh 2>/dev/null || true
chmod +x bca-scraper.js 2>/dev/null || true
chmod +x scheduler.js 2>/dev/null || true
print_success "Scripts are executable"

# ============================================================
# STEP 7: Setup systemd service for scheduler
# ============================================================
echo ""
echo "STEP 7: Setting up systemd service..."

read -p "Setup systemd service untuk scheduler daemon? (Y/n): " SETUP_SERVICE
if [ "$SETUP_SERVICE" != "n" ] && [ "$SETUP_SERVICE" != "N" ]; then
    # Create systemd service file
    cat > /tmp/bca-scraper.service << EOF
[Unit]
Description=BCA Scraper Scheduler
After=network.target openvpn-client@indonesia.service
Wants=openvpn-client@indonesia.service

[Service]
Type=simple
User=root
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/bin/node $SCRIPT_DIR/scheduler.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Environment
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    sudo mv /tmp/bca-scraper.service /etc/systemd/system/bca-scraper.service
    sudo systemctl daemon-reload
    sudo systemctl enable bca-scraper
    
    print_success "Systemd service created"
    echo ""
    echo "Service commands:"
    echo "  Start:   sudo systemctl start bca-scraper"
    echo "  Stop:    sudo systemctl stop bca-scraper"
    echo "  Status:  sudo systemctl status bca-scraper"
    echo "  Logs:    sudo journalctl -u bca-scraper -f"
else
    echo ""
    echo "Untuk menjalankan scheduler manual:"
    echo "  ./run.sh --daemon"
fi

# Create log files
sudo touch /var/log/bca-scraper.log 2>/dev/null || touch bca-scraper.log
sudo chmod 666 /var/log/bca-scraper.log 2>/dev/null || true

# ============================================================
# DONE!
# ============================================================
echo ""
echo "============================================================"
echo -e "${GREEN}    INSTALASI SELESAI!${NC}"
echo "============================================================"
echo ""
echo "LANGKAH SELANJUTNYA:"
echo ""
echo "1. Edit config.env dengan kredensial BCA Anda:"
echo "   nano config.env"
echo ""
echo "   Isi yang WAJIB:"
echo "   - BCA_USER_ID (User ID KlikBCA)"
echo "   - BCA_PIN (PIN KlikBCA)"
echo "   - BCA_ACCOUNT_NUMBER (Nomor Rekening)"
echo "   - SECRET_KEY (dari UI Bank Scraper Settings)"
echo ""
echo "2. Start VPN Indonesia:"
echo "   sudo systemctl start openvpn-client@indonesia"
echo ""
echo "3. Cek IP (harus Indonesia):"
echo "   curl https://api.ipify.org"
echo ""
echo "4. Start scheduler daemon:"
echo "   sudo systemctl start bca-scraper"
echo ""
echo "5. Cek log scheduler:"
echo "   sudo journalctl -u bca-scraper -f"
echo ""
echo "============================================================"
echo ""
echo "MODE OPERASI:"
echo ""
echo "Scheduler daemon akan:"
echo "- Poll server setiap 60 detik untuk mengambil konfigurasi"
echo "- Scrape sesuai interval yang diset di website (5m, 10m, dst)"
echo "- Otomatis switch ke burst mode jika di-trigger dari website"
echo ""
echo "Anda bisa mengubah interval scraping dari:"
echo "  Website > Bank Scraper Settings > Normal Mode"
echo ""
echo "============================================================"
