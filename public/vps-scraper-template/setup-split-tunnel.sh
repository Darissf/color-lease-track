#!/bin/bash
# =============================================================================
# BCA VPS Scraper - Split Tunnel OpenVPN Setup
# =============================================================================
# This script configures OpenVPN with split tunneling:
# - SSH traffic goes through direct internet (your VPS IP)
# - BCA traffic goes through Indonesian VPN
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}=========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (sudo)"
    exit 1
fi

print_header "BCA VPS Scraper - Split Tunnel Setup"

# =============================================================================
# Step 1: Check for .ovpn file
# =============================================================================
print_header "Step 1: Checking OpenVPN Configuration"

OVPN_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Look for .ovpn file in current directory or script directory
for file in *.ovpn "$SCRIPT_DIR"/*.ovpn; do
    if [ -f "$file" ]; then
        OVPN_FILE="$file"
        break
    fi
done

if [ -z "$OVPN_FILE" ]; then
    print_error "No .ovpn file found!"
    echo ""
    echo "Please obtain an Indonesian VPN configuration file from your VPN provider:"
    echo "  - Surfshark: https://my.surfshark.com/vpn/manual-setup/main"
    echo "  - NordVPN: https://nordvpn.com/ovpn/"
    echo "  - ExpressVPN: https://www.expressvpn.com/setup"
    echo "  - ProtonVPN: https://protonvpn.com/support/vpn-config-download/"
    echo ""
    echo "Download the Indonesia server configuration and place it in this directory."
    exit 1
fi

print_success "Found OpenVPN config: $OVPN_FILE"

# =============================================================================
# Step 2: Install dependencies
# =============================================================================
print_header "Step 2: Installing Dependencies"

# Detect package manager
if command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt-get"
    apt-get update -qq
    apt-get install -y -qq openvpn curl iptables iproute2
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    yum install -y -q openvpn curl iptables iproute
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    dnf install -y -q openvpn curl iptables iproute
else
    print_error "Unsupported package manager"
    exit 1
fi

print_success "Dependencies installed"

# =============================================================================
# Step 3: Save original gateway before any VPN changes
# =============================================================================
print_header "Step 3: Saving Original Network Configuration"

ORIGINAL_GW=$(ip route show default | head -1 | awk '{print $3}')
ORIGINAL_DEV=$(ip route show default | head -1 | awk '{print $5}')

echo "$ORIGINAL_GW" > /tmp/original_gateway
echo "$ORIGINAL_DEV" > /tmp/original_device

print_success "Original gateway: $ORIGINAL_GW via $ORIGINAL_DEV"

# =============================================================================
# Step 4: Configure OpenVPN with split tunneling
# =============================================================================
print_header "Step 4: Configuring OpenVPN with Split Tunneling"

# Create OpenVPN client directory
mkdir -p /etc/openvpn/client

# Copy the original .ovpn file
cp "$OVPN_FILE" /etc/openvpn/client/indonesia.conf

# Modify the config for split tunneling
# Remove any existing redirect-gateway or route directives we'll override
sed -i '/^redirect-gateway/d' /etc/openvpn/client/indonesia.conf
sed -i '/^route /d' /etc/openvpn/client/indonesia.conf

# Add split tunnel configuration
cat >> /etc/openvpn/client/indonesia.conf << 'EOF'

# =============================================================================
# Split Tunnel Configuration (Added by setup-split-tunnel.sh)
# =============================================================================

# Ignore server's redirect-gateway push
pull-filter ignore redirect-gateway
pull-filter ignore "route "

# Enable scripts
script-security 2

# Run scripts on connect/disconnect
up /etc/openvpn/client/vpn-up.sh
down /etc/openvpn/client/vpn-down.sh

# Keep trying to resolve DNS
resolv-retry infinite

# Persist tun device and key
persist-tun
persist-key

# Verbosity
verb 3
EOF

print_success "OpenVPN config modified for split tunneling"

# =============================================================================
# Step 5: Install VPN up/down scripts
# =============================================================================
print_header "Step 5: Installing VPN Scripts"

# Copy vpn-up.sh
if [ -f "$SCRIPT_DIR/vpn-up.sh" ]; then
    cp "$SCRIPT_DIR/vpn-up.sh" /etc/openvpn/client/vpn-up.sh
    chmod +x /etc/openvpn/client/vpn-up.sh
    print_success "Installed vpn-up.sh"
else
    print_error "vpn-up.sh not found in $SCRIPT_DIR"
    exit 1
fi

# Copy vpn-down.sh
if [ -f "$SCRIPT_DIR/vpn-down.sh" ]; then
    cp "$SCRIPT_DIR/vpn-down.sh" /etc/openvpn/client/vpn-down.sh
    chmod +x /etc/openvpn/client/vpn-down.sh
    print_success "Installed vpn-down.sh"
else
    print_error "vpn-down.sh not found in $SCRIPT_DIR"
    exit 1
fi

# Add routing table if not exists
if ! grep -q "100 direct" /etc/iproute2/rt_tables 2>/dev/null; then
    echo "100 direct" >> /etc/iproute2/rt_tables
    print_success "Added 'direct' routing table"
fi

# =============================================================================
# Step 6: Handle VPN credentials
# =============================================================================
print_header "Step 6: VPN Credentials"

# Check if config requires auth-user-pass
if grep -q "auth-user-pass" /etc/openvpn/client/indonesia.conf; then
    if [ ! -f /etc/openvpn/client/auth.txt ]; then
        echo ""
        print_info "Your VPN requires username/password authentication."
        echo ""
        read -p "Enter VPN username: " VPN_USER
        read -s -p "Enter VPN password: " VPN_PASS
        echo ""
        
        echo "$VPN_USER" > /etc/openvpn/client/auth.txt
        echo "$VPN_PASS" >> /etc/openvpn/client/auth.txt
        chmod 600 /etc/openvpn/client/auth.txt
        
        # Update config to use auth file
        sed -i 's|auth-user-pass.*|auth-user-pass /etc/openvpn/client/auth.txt|' /etc/openvpn/client/indonesia.conf
        
        print_success "VPN credentials saved"
    else
        print_success "VPN credentials already configured"
    fi
else
    print_success "VPN uses certificate authentication (no password needed)"
fi

# =============================================================================
# Step 7: Enable and start OpenVPN
# =============================================================================
print_header "Step 7: Starting OpenVPN Service"

# Stop any existing OpenVPN service
systemctl stop openvpn-client@indonesia 2>/dev/null || true
systemctl stop openvpn@indonesia 2>/dev/null || true

# Enable and start
systemctl enable openvpn-client@indonesia
systemctl start openvpn-client@indonesia

# Wait for connection
print_info "Waiting for VPN to connect..."
sleep 10

# Check status
if systemctl is-active --quiet openvpn-client@indonesia; then
    print_success "OpenVPN service is running"
else
    print_warning "OpenVPN service may have issues. Check logs:"
    echo "  journalctl -u openvpn-client@indonesia -n 50"
fi

# =============================================================================
# Step 8: Verify split tunnel is working
# =============================================================================
print_header "Step 8: Verifying Split Tunnel Configuration"

echo ""
print_info "Testing direct internet (for SSH)..."
DIRECT_IP=$(curl -s --max-time 10 ifconfig.me 2>/dev/null || echo "FAILED")
echo "  Direct IP: $DIRECT_IP"

print_info "Testing VPN connection (for BCA)..."
if ip link show tun0 &>/dev/null; then
    VPN_IP=$(curl -s --max-time 10 --interface tun0 ifconfig.me 2>/dev/null || echo "FAILED")
    echo "  VPN IP: $VPN_IP"
    
    # Check if VPN IP is Indonesian
    VPN_COUNTRY=$(curl -s --max-time 10 "http://ip-api.com/json/$VPN_IP" 2>/dev/null | grep -o '"countryCode":"[^"]*"' | cut -d'"' -f4)
    if [ "$VPN_COUNTRY" = "ID" ]; then
        print_success "VPN is connected to Indonesia!"
    else
        print_warning "VPN IP is from: $VPN_COUNTRY (should be ID)"
    fi
else
    print_warning "VPN tunnel (tun0) not found. VPN may still be connecting..."
fi

# =============================================================================
# Step 9: Summary
# =============================================================================
print_header "Setup Complete!"

echo ""
echo "Split tunnel configuration:"
echo "  ✓ SSH traffic: Uses direct internet ($DIRECT_IP)"
echo "  ✓ BCA traffic: Routes through VPN"
echo ""
echo "Useful commands:"
echo "  Check VPN status:   systemctl status openvpn-client@indonesia"
echo "  View VPN logs:      journalctl -u openvpn-client@indonesia -f"
echo "  View tunnel logs:   tail -f /var/log/vpn-split-tunnel.log"
echo "  Test VPN IP:        curl --interface tun0 ifconfig.me"
echo "  Test direct IP:     curl ifconfig.me"
echo ""
echo "Next steps:"
echo "  1. Configure config.env with your BCA credentials"
echo "  2. Start the BCA scraper service"
echo ""

print_success "Setup completed successfully!"
