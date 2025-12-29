#!/bin/bash
# ============================================================
# BCA Balance Checker - Linux VPS v1.0.0
# Systemd Service Installer
# ============================================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     BCA Balance Checker - Service Installer                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "[ERROR] Please run as root (sudo)"
    exit 1
fi

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="bca-saldo"

# Update service file with correct path
echo "[INFO] Configuring service..."
sed -i "s|WorkingDirectory=.*|WorkingDirectory=$SCRIPT_DIR|g" bca-saldo.service

# Stop existing service if running
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "[INFO] Stopping existing service..."
    systemctl stop $SERVICE_NAME
fi

# Copy service file
echo "[INFO] Installing systemd service..."
cp bca-saldo.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable service
echo "[INFO] Enabling service..."
systemctl enable $SERVICE_NAME

# Start service
echo "[INFO] Starting service..."
systemctl start $SERVICE_NAME

# Check status
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              SERVICE INSTALLED & RUNNING!                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Useful commands:"
    echo "  Status:  systemctl status $SERVICE_NAME"
    echo "  Logs:    journalctl -u $SERVICE_NAME -f"
    echo "  Stop:    systemctl stop $SERVICE_NAME"
    echo "  Start:   systemctl start $SERVICE_NAME"
    echo "  Restart: systemctl restart $SERVICE_NAME"
    echo ""
else
    echo ""
    echo "[ERROR] Service failed to start. Check logs:"
    echo "  journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi
