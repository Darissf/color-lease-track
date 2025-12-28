#!/bin/bash
# =============================================================================
# VPN Down Script - Cleanup Split Tunneling Rules
# This script runs when OpenVPN disconnects
# =============================================================================

set -e

LOG_FILE="/var/log/vpn-split-tunnel.log"
STATE_DIR="/var/run/vpn-state"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "VPN DOWN Script Starting"
log "=========================================="

# Remove iptables rules for SSH
iptables -t mangle -D OUTPUT -p tcp --sport 22 -j MARK --set-mark 0x100 2>/dev/null || true
iptables -t mangle -D OUTPUT -p tcp --dport 22 -m state --state ESTABLISHED,RELATED -j MARK --set-mark 0x100 2>/dev/null || true
log "Removed iptables marking rules"

# Remove routing rule
ip rule del fwmark 0x100 table direct 2>/dev/null || true
log "Removed routing rule for marked packets"

# Flush the direct routing table
ip route flush table direct 2>/dev/null || true
log "Flushed direct routing table"

# Remove BCA routes (they'll be gone anyway when tun0 goes down)
BCA_RANGES=(
    "203.125.0.0/16"
    "202.74.0.0/16"
    "103.10.66.0/24"
    "103.10.67.0/24"
    "202.6.207.0/24"
    "202.6.233.0/24"
)

for range in "${BCA_RANGES[@]}"; do
    ip route del "$range" 2>/dev/null || true
done
log "Removed BCA routes"

# Clean up state files
rm -f "$STATE_DIR/original_gateway" "$STATE_DIR/original_device" 2>/dev/null || true

log "VPN DOWN Script Completed"
log "=========================================="

exit 0
