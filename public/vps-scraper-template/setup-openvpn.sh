#!/bin/bash
#
# BCA Scraper + OpenVPN Setup Script
# Untuk VPS Eropa dengan koneksi VPN Indonesia
#
# Usage: chmod +x setup-openvpn.sh && sudo ./setup-openvpn.sh
#

set -e

echo "=============================================="
echo "  BCA Scraper + OpenVPN Setup Script"
echo "  Untuk VPS Eropa dengan VPN Indonesia"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Script harus dijalankan sebagai root"
    echo "Gunakan: sudo ./setup-openvpn.sh"
    exit 1
fi

# Detect OS
if [ -f /etc/debian_version ]; then
    OS="debian"
elif [ -f /etc/redhat-release ]; then
    OS="redhat"
else
    log_error "OS tidak didukung. Gunakan Debian/Ubuntu atau CentOS/RHEL"
    exit 1
fi

echo "Detected OS: $OS"
echo ""

# Step 1: Install System Dependencies
log_info "Step 1: Installing system dependencies..."

if [ "$OS" = "debian" ]; then
    apt update
    apt install -y \
        openvpn \
        resolvconf \
        curl \
        wget \
        jq \
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
else
    yum install -y epel-release
    yum install -y \
        openvpn \
        curl \
        wget \
        jq
fi

log_info "System dependencies installed ✓"

# Step 2: Install Node.js
log_info "Step 2: Installing Node.js 18..."

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

NODE_VERSION=$(node --version)
log_info "Node.js $NODE_VERSION installed ✓"

# Step 3: Create directories
log_info "Step 3: Creating directories..."

mkdir -p /etc/openvpn/client
mkdir -p /root/bca-scraper
mkdir -p /var/log

log_info "Directories created ✓"

# Step 4: Check for OpenVPN config
log_info "Step 4: Checking OpenVPN configuration..."

OVPN_CONFIG="/etc/openvpn/client/indonesia.conf"

if [ ! -f "$OVPN_CONFIG" ]; then
    log_warn "OpenVPN config tidak ditemukan di $OVPN_CONFIG"
    echo ""
    echo "Anda perlu upload file .ovpn dari provider VPN Indonesia."
    echo ""
    echo "Pilihan:"
    echo "1. Upload via SCP:"
    echo "   scp your-vpn.ovpn root@YOUR_VPS_IP:/etc/openvpn/client/indonesia.conf"
    echo ""
    echo "2. Copy-paste manual:"
    echo "   nano /etc/openvpn/client/indonesia.conf"
    echo ""
    
    read -p "Apakah Anda ingin input OpenVPN config sekarang? (y/n): " input_now
    
    if [ "$input_now" = "y" ] || [ "$input_now" = "Y" ]; then
        echo ""
        echo "Paste OpenVPN config Anda (akhiri dengan Ctrl+D pada baris baru):"
        echo ""
        cat > "$OVPN_CONFIG"
        log_info "OpenVPN config saved ✓"
    else
        log_warn "Silakan upload OpenVPN config nanti dan jalankan ulang script ini"
    fi
fi

# Step 5: Setup VPN auth file if needed
log_info "Step 5: Setting up VPN authentication..."

AUTH_FILE="/etc/openvpn/client/auth.txt"

if [ -f "$OVPN_CONFIG" ] && grep -q "auth-user-pass" "$OVPN_CONFIG"; then
    if [ ! -f "$AUTH_FILE" ]; then
        echo ""
        read -p "VPN username: " vpn_user
        read -s -p "VPN password: " vpn_pass
        echo ""
        
        echo "$vpn_user" > "$AUTH_FILE"
        echo "$vpn_pass" >> "$AUTH_FILE"
        chmod 600 "$AUTH_FILE"
        
        # Update config to use auth file
        if ! grep -q "auth-user-pass /etc/openvpn/client/auth.txt" "$OVPN_CONFIG"; then
            sed -i 's|auth-user-pass.*|auth-user-pass /etc/openvpn/client/auth.txt|g' "$OVPN_CONFIG"
        fi
        
        log_info "VPN auth configured ✓"
    fi
fi

# Step 6: Create VPN monitor script
log_info "Step 6: Creating VPN monitor script..."

cat > /usr/local/bin/vpn-monitor.sh << 'EOF'
#!/bin/bash
# VPN Monitor - Auto reconnect if disconnected

LOG_FILE="/var/log/vpn-monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Check if VPN interface exists
if ! ip link show tun0 &> /dev/null; then
    log "VPN disconnected (tun0 not found), restarting..."
    systemctl restart openvpn-client@indonesia
    sleep 15
fi

# Check if we can reach the internet
if ! ping -c 1 -W 5 8.8.8.8 &> /dev/null; then
    log "Network unreachable, restarting VPN..."
    systemctl restart openvpn-client@indonesia
    sleep 15
fi
EOF

chmod +x /usr/local/bin/vpn-monitor.sh
log_info "VPN monitor script created ✓"

# Step 7: Create scraper wrapper script
log_info "Step 7: Creating scraper wrapper script..."

cat > /root/bca-scraper/run-with-vpn.sh << 'EOF'
#!/bin/bash
# BCA Scraper with VPN check wrapper

LOG_FILE="/var/log/bca-scraper.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Check VPN interface
if ! ip link show tun0 &> /dev/null; then
    log "ERROR: VPN tidak aktif (tun0 tidak ada)"
    exit 1
fi

# Get current IP
CURRENT_IP=$(curl -s --max-time 10 https://api.ipify.org)
if [ -z "$CURRENT_IP" ]; then
    log "ERROR: Tidak bisa mendapatkan IP publik"
    exit 1
fi

# Check IP country
IP_INFO=$(curl -s --max-time 10 "http://ip-api.com/json/$CURRENT_IP?fields=countryCode,country")
IP_COUNTRY=$(echo "$IP_INFO" | jq -r '.countryCode' 2>/dev/null || echo "Unknown")
COUNTRY_NAME=$(echo "$IP_INFO" | jq -r '.country' 2>/dev/null || echo "Unknown")

if [ "$IP_COUNTRY" != "ID" ]; then
    log "WARNING: IP $CURRENT_IP bukan Indonesia (country: $COUNTRY_NAME)"
    # Uncomment line below to block non-ID IPs
    # exit 1
fi

log "VPN OK - IP: $CURRENT_IP ($COUNTRY_NAME)"

# Run scraper
cd /root/bca-scraper
node bca-scraper.js >> $LOG_FILE 2>&1
EOF

chmod +x /root/bca-scraper/run-with-vpn.sh
log_info "Scraper wrapper created ✓"

# Step 8: Download BCA scraper script
log_info "Step 8: Setting up BCA scraper..."

cd /root/bca-scraper

if [ ! -f "package.json" ]; then
    npm init -y
fi

if [ ! -d "node_modules/puppeteer" ]; then
    npm install puppeteer
fi

# Create a placeholder bca-scraper.js if not exists
if [ ! -f "bca-scraper.js" ]; then
    log_warn "bca-scraper.js tidak ditemukan"
    echo "Download dari aplikasi Lovable atau copy manual ke /root/bca-scraper/bca-scraper.js"
fi

log_info "BCA scraper setup ✓"

# Step 9: Setup crontabs
log_info "Step 9: Setting up cron jobs..."

# VPN monitor cron (every 2 minutes)
(crontab -l 2>/dev/null | grep -v "vpn-monitor.sh"; echo "*/2 * * * * /usr/local/bin/vpn-monitor.sh") | crontab -

# Scraper cron (every 5 minutes)
(crontab -l 2>/dev/null | grep -v "run-with-vpn.sh"; echo "*/5 * * * * /root/bca-scraper/run-with-vpn.sh") | crontab -

log_info "Cron jobs configured ✓"

# Step 10: Start OpenVPN if config exists
if [ -f "$OVPN_CONFIG" ]; then
    log_info "Step 10: Starting OpenVPN service..."
    
    systemctl enable openvpn-client@indonesia
    systemctl restart openvpn-client@indonesia
    
    sleep 5
    
    if systemctl is-active --quiet openvpn-client@indonesia; then
        log_info "OpenVPN service started ✓"
        
        # Check current IP
        sleep 3
        CURRENT_IP=$(curl -s --max-time 10 https://api.ipify.org)
        IP_INFO=$(curl -s --max-time 10 "http://ip-api.com/json/$CURRENT_IP?fields=countryCode,country")
        IP_COUNTRY=$(echo "$IP_INFO" | jq -r '.countryCode' 2>/dev/null || echo "Unknown")
        COUNTRY_NAME=$(echo "$IP_INFO" | jq -r '.country' 2>/dev/null || echo "Unknown")
        
        echo ""
        echo "=============================================="
        echo "  Current IP: $CURRENT_IP"
        echo "  Country: $COUNTRY_NAME ($IP_COUNTRY)"
        echo "=============================================="
        
        if [ "$IP_COUNTRY" = "ID" ]; then
            log_info "✓ VPN berhasil terhubung ke Indonesia!"
        else
            log_warn "VPN terhubung tapi IP bukan Indonesia"
        fi
    else
        log_error "OpenVPN service gagal start. Cek: journalctl -u openvpn-client@indonesia"
    fi
else
    log_warn "Skipping VPN start - config tidak ada"
fi

# Summary
echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
echo "Yang perlu dilakukan selanjutnya:"
echo ""

if [ ! -f "$OVPN_CONFIG" ]; then
    echo "1. Upload OpenVPN config ke /etc/openvpn/client/indonesia.conf"
    echo "2. Jalankan: systemctl start openvpn-client@indonesia"
fi

if [ ! -f "/root/bca-scraper/bca-scraper.js" ]; then
    echo "3. Download bca-scraper.js ke /root/bca-scraper/"
    echo "4. Edit konfigurasi BCA di bca-scraper.js"
fi

echo ""
echo "Commands berguna:"
echo "  - Cek status VPN: systemctl status openvpn-client@indonesia"
echo "  - Cek IP publik: curl https://api.ipify.org"
echo "  - Test scraper: node /root/bca-scraper/bca-scraper.js"
echo "  - Lihat log: tail -f /var/log/bca-scraper.log"
echo ""
echo "=============================================="
