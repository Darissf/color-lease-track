#!/bin/bash
# =============================================================================
# VPN Up Script - Split Tunneling for BCA Scraper
# This script runs when OpenVPN connects successfully
# It ensures SSH remains accessible via direct internet while BCA traffic
# goes through the Indonesian VPN
# =============================================================================

set -e

LOG_FILE="/var/log/vpn-split-tunnel.log"
STATE_DIR="/var/run/vpn-state"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create state directory
mkdir -p "$STATE_DIR"

log "=========================================="
log "VPN UP Script Starting"
log "TUN Device: ${dev:-unknown}"
log "VPN Gateway: ${route_vpn_gateway:-unknown}"
log "=========================================="

# Get the original default gateway before VPN modified routes
# We need to save this for SSH traffic
ORIGINAL_GW=$(cat /tmp/original_gateway 2>/dev/null || ip route show default | head -1 | awk '{print $3}')
ORIGINAL_DEV=$(cat /tmp/original_device 2>/dev/null || ip route show default | head -1 | awk '{print $5}')

if [ -z "$ORIGINAL_GW" ]; then
    log "ERROR: Could not determine original gateway"
    exit 1
fi

log "Original Gateway: $ORIGINAL_GW via $ORIGINAL_DEV"

# Save state for vpn-down.sh
echo "$ORIGINAL_GW" > "$STATE_DIR/original_gateway"
echo "$ORIGINAL_DEV" > "$STATE_DIR/original_device"

# Create routing table for direct internet (SSH)
# Table 100 = direct internet traffic
if ! grep -q "100 direct" /etc/iproute2/rt_tables 2>/dev/null; then
    echo "100 direct" >> /etc/iproute2/rt_tables
    log "Added 'direct' routing table (100)"
fi

# Add default route via original gateway to table 'direct'
ip route add default via "$ORIGINAL_GW" dev "$ORIGINAL_DEV" table direct 2>/dev/null || \
    ip route replace default via "$ORIGINAL_GW" dev "$ORIGINAL_DEV" table direct
log "Added default route to 'direct' table"

# Mark SSH traffic (sport 22) to use direct table
# This ensures incoming SSH connections can respond
iptables -t mangle -C OUTPUT -p tcp --sport 22 -j MARK --set-mark 0x100 2>/dev/null || \
    iptables -t mangle -A OUTPUT -p tcp --sport 22 -j MARK --set-mark 0x100
log "Marked outgoing SSH traffic (sport 22)"

# Also mark established SSH connections
iptables -t mangle -C OUTPUT -p tcp --dport 22 -m state --state ESTABLISHED,RELATED -j MARK --set-mark 0x100 2>/dev/null || \
    iptables -t mangle -A OUTPUT -p tcp --dport 22 -m state --state ESTABLISHED,RELATED -j MARK --set-mark 0x100
log "Marked established SSH traffic"

# Add rule to use direct table for marked packets
ip rule add fwmark 0x100 table direct priority 100 2>/dev/null || true
log "Added routing rule for marked packets"

# Add explicit route for the VPS's own public IP via original gateway
# This ensures SSH to the VPS IP always works
VPS_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "")
if [ -n "$VPS_IP" ]; then
    # Get the client's IP from SSH connection
    SSH_CLIENT_IP=$(echo $SSH_CLIENT | awk '{print $1}')
    if [ -n "$SSH_CLIENT_IP" ]; then
        ip route add "$SSH_CLIENT_IP" via "$ORIGINAL_GW" dev "$ORIGINAL_DEV" 2>/dev/null || true
        log "Added route for SSH client: $SSH_CLIENT_IP"
    fi
fi

# Route BCA/KlikBCA IP ranges through VPN
# These are known IP ranges for BCA services
BCA_RANGES=(
    "203.125.0.0/16"   # BCA Primary
    "202.74.0.0/16"    # BCA Secondary  
    "103.10.66.0/24"   # KlikBCA
    "103.10.67.0/24"   # KlikBCA
    "202.6.207.0/24"   # BCA API
    "202.6.233.0/24"   # BCA API
)

VPN_GW="${route_vpn_gateway:-}"
VPN_DEV="${dev:-tun0}"

if [ -n "$VPN_GW" ]; then
    for range in "${BCA_RANGES[@]}"; do
        ip route add "$range" via "$VPN_GW" dev "$VPN_DEV" 2>/dev/null || \
            ip route replace "$range" via "$VPN_GW" dev "$VPN_DEV"
        log "Added BCA route: $range via VPN"
    done
else
    log "WARNING: VPN gateway not available, BCA routes not added"
fi

# Verify connectivity
log "Verifying connectivity..."

# Test direct internet (should be VPS IP)
DIRECT_IP=$(curl -s --max-time 10 --interface "$ORIGINAL_DEV" ifconfig.me 2>/dev/null || echo "FAILED")
log "Direct IP (for SSH): $DIRECT_IP"

# Test VPN connection (should be Indonesian IP)
VPN_IP=$(curl -s --max-time 10 --interface "$VPN_DEV" ifconfig.me 2>/dev/null || echo "FAILED")
log "VPN IP (for BCA): $VPN_IP"

log "VPN UP Script Completed Successfully"
log "=========================================="

exit 0
