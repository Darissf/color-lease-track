#!/bin/bash
# ============================================================
# BCA VPS Scraper - All-in-One Installer
# ============================================================
# Script ini akan:
# 1. Install semua dependencies (Node.js, OpenVPN, Puppeteer)
# 2. Setup OpenVPN dengan file .ovpn yang tersedia
# 3. Setup cron job untuk scraping otomatis (normal + burst check)
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
        echo "PENTING: Edit config.env dengan kredensial Anda!"
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
    
    # Create auth file if credentials are in config.env
    if [ -n "$VPN_USERNAME" ] && [ "$VPN_USERNAME" != "your_vpn_username" ]; then
        echo "$VPN_USERNAME" | sudo tee /etc/openvpn/client/auth.txt > /dev/null
        echo "$VPN_PASSWORD" | sudo tee -a /etc/openvpn/client/auth.txt > /dev/null
        sudo chmod 600 /etc/openvpn/client/auth.txt
        
        # Add auth-user-pass to config if not present
        if ! grep -q "auth-user-pass" /etc/openvpn/client/indonesia.conf; then
            echo "auth-user-pass /etc/openvpn/client/auth.txt" | sudo tee -a /etc/openvpn/client/indonesia.conf > /dev/null
        else
            sudo sed -i 's|auth-user-pass.*|auth-user-pass /etc/openvpn/client/auth.txt|g' /etc/openvpn/client/indonesia.conf
        fi
        
        print_success "VPN credentials configured"
    else
        print_warning "VPN credentials not set in config.env"
        echo "Edit config.env dan isi VPN_USERNAME dan VPN_PASSWORD"
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
print_success "Scripts are executable"

# ============================================================
# STEP 7: Setup cron jobs (normal + burst check)
# ============================================================
echo ""
echo "STEP 7: Setting up cron jobs..."

# Normal scrape every 5 minutes
CRON_NORMAL="*/5 * * * * cd $SCRIPT_DIR && ./run.sh >> /var/log/bca-scraper.log 2>&1"

# Burst check every 30 seconds (via wrapper script)
CRON_BURST="* * * * * cd $SCRIPT_DIR && ./burst-check-loop.sh >> /var/log/bca-scraper-burst.log 2>&1"

# Create burst check loop script (runs twice per minute for 30-second polling)
cat > burst-check-loop.sh << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Run burst check
./run.sh --burst-check

# Wait 30 seconds
sleep 30

# Run again
./run.sh --burst-check
EOF

chmod +x burst-check-loop.sh
print_success "Burst check loop script created"

# Check if cron jobs already exist
if crontab -l 2>/dev/null | grep -q "bca-scraper"; then
    print_warning "Cron job sudah ada, akan di-update"
    # Remove old cron jobs
    crontab -l 2>/dev/null | grep -v "bca-scraper" | crontab -
fi

read -p "Setup cron jobs untuk scraping otomatis? (Y/n): " SETUP_CRON
if [ "$SETUP_CRON" != "n" ] && [ "$SETUP_CRON" != "N" ]; then
    (crontab -l 2>/dev/null; echo "$CRON_NORMAL") | crontab -
    (crontab -l 2>/dev/null; echo "$CRON_BURST") | crontab -
    print_success "Cron jobs berhasil ditambahkan:"
    echo "  - Normal scrape: setiap 5 menit"
    echo "  - Burst check: setiap 30 detik"
else
    echo "Cron jobs tidak ditambahkan. Untuk menambahkan manual:"
    echo "crontab -e"
    echo ""
    echo "Tambahkan baris:"
    echo "$CRON_NORMAL"
    echo "$CRON_BURST"
fi

# Create log files
sudo touch /var/log/bca-scraper.log 2>/dev/null || touch bca-scraper.log
sudo touch /var/log/bca-scraper-burst.log 2>/dev/null || touch bca-scraper-burst.log
sudo chmod 666 /var/log/bca-scraper.log 2>/dev/null || true
sudo chmod 666 /var/log/bca-scraper-burst.log 2>/dev/null || true

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
echo "1. Edit config.env dengan kredensial Anda:"
echo "   nano config.env"
echo ""
echo "2. Start VPN Indonesia (jika ada .ovpn):"
echo "   sudo systemctl start openvpn-client@indonesia"
echo ""
echo "3. Test scraper manual:"
echo "   ./run.sh"
echo ""
echo "4. Test burst check manual:"
echo "   ./run.sh --burst-check"
echo ""
echo "5. Cek log:"
echo "   tail -f /var/log/bca-scraper.log"
echo "   tail -f /var/log/bca-scraper-burst.log"
echo ""
echo "============================================================"
echo ""
echo "BURST MODE:"
echo "Scraper akan otomatis polling server setiap 30 detik."
echo "Ketika ada payment request pending, admin bisa trigger burst mode"
echo "dari UI dan VPS akan scrape setiap 10 detik untuk verifikasi cepat."
echo ""
echo "============================================================"
