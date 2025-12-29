#!/bin/bash
# ============================================
# BCA Scraper - Systemd Service Installer
# ============================================
# This script installs the BCA scraper as a systemd service
# with auto-restart, logging, and resource management.
#
# Usage: sudo ./install-service.sh [--uninstall]
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service configuration
SERVICE_NAME="bca-scraper"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="/var/log/bca-scraper.log"
ERROR_LOG_FILE="/var/log/bca-scraper-error.log"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
LOGROTATE_FILE="/etc/logrotate.d/${SERVICE_NAME}"

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  BCA Scraper - Systemd Service Installer${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
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
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Uninstall function
uninstall_service() {
    print_header
    print_info "Uninstalling ${SERVICE_NAME} service..."
    
    # Stop service if running
    if systemctl is-active --quiet ${SERVICE_NAME} 2>/dev/null; then
        print_info "Stopping ${SERVICE_NAME}..."
        systemctl stop ${SERVICE_NAME}
        print_success "Service stopped"
    fi
    
    # Disable service
    if systemctl is-enabled --quiet ${SERVICE_NAME} 2>/dev/null; then
        print_info "Disabling ${SERVICE_NAME}..."
        systemctl disable ${SERVICE_NAME}
        print_success "Service disabled"
    fi
    
    # Remove service file
    if [ -f "${SERVICE_FILE}" ]; then
        rm -f "${SERVICE_FILE}"
        print_success "Service file removed"
    fi
    
    # Remove logrotate config
    if [ -f "${LOGROTATE_FILE}" ]; then
        rm -f "${LOGROTATE_FILE}"
        print_success "Logrotate config removed"
    fi
    
    # Reload systemd
    systemctl daemon-reload
    
    echo ""
    print_success "Service uninstalled successfully!"
    print_warning "Log files at ${LOG_FILE} and ${ERROR_LOG_FILE} were NOT removed."
    echo ""
    exit 0
}

# Check for uninstall flag
if [ "$1" == "--uninstall" ] || [ "$1" == "-u" ]; then
    check_root
    uninstall_service
fi

# Main installation
install_service() {
    print_header
    check_root
    
    # Verify required files exist
    print_info "Checking required files..."
    
    if [ ! -f "${SCRIPT_DIR}/bca-scraper.js" ]; then
        print_error "bca-scraper.js not found in ${SCRIPT_DIR}"
        exit 1
    fi
    print_success "Found bca-scraper.js"
    
    if [ ! -f "${SCRIPT_DIR}/config.env" ]; then
        if [ -f "${SCRIPT_DIR}/config.env.template" ]; then
            print_warning "config.env not found, copying from template..."
            cp "${SCRIPT_DIR}/config.env.template" "${SCRIPT_DIR}/config.env"
            print_warning "Please edit config.env with your credentials!"
        else
            print_error "Neither config.env nor config.env.template found"
            exit 1
        fi
    fi
    print_success "Found config.env"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please run install.sh first."
        exit 1
    fi
    NODE_VERSION=$(node --version)
    print_success "Found Node.js ${NODE_VERSION}"
    
    # Stop existing service if running
    if systemctl is-active --quiet ${SERVICE_NAME} 2>/dev/null; then
        print_info "Stopping existing ${SERVICE_NAME} service..."
        systemctl stop ${SERVICE_NAME}
        print_success "Existing service stopped"
    fi
    
    # Create log files with proper permissions
    print_info "Setting up log files..."
    touch "${LOG_FILE}" "${ERROR_LOG_FILE}"
    chmod 644 "${LOG_FILE}" "${ERROR_LOG_FILE}"
    print_success "Log files created"
    
    # Generate systemd service file with correct paths
    print_info "Generating systemd service file..."
    
    cat > "${SERVICE_FILE}" << EOF
[Unit]
Description=BCA Scraper - Persistent Browser Mode
Documentation=file://${SCRIPT_DIR}/README.md
After=network-online.target openvpn-client@indonesia.service
Wants=network-online.target
Requires=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=${SCRIPT_DIR}

# Pre-start checks
ExecStartPre=/bin/bash -c 'echo "[$(date +\"%%Y-%%m-%%d %%H:%%M:%%S\")] ========================================" >> ${LOG_FILE}'
ExecStartPre=/bin/bash -c 'echo "[$(date +\"%%Y-%%m-%%d %%H:%%M:%%S\")] Starting BCA Scraper v3.0.0 (Persistent Browser Mode)..." >> ${LOG_FILE}'
ExecStartPre=/bin/bash -c 'pkill -f "chromium.*puppeteer" 2>/dev/null || true'
ExecStartPre=/bin/sleep 5

# Main process - Persistent Browser Mode (single daemon)
ExecStart=/usr/bin/node ${SCRIPT_DIR}/bca-scraper.js

# Post-stop logging and cleanup
ExecStopPost=/bin/bash -c 'echo "[$(date +\"%%Y-%%m-%%d %%H:%%M:%%S\")] BCA Scraper stopped (exit: \$EXIT_STATUS)" >> ${LOG_FILE}'
ExecStopPost=/bin/bash -c 'pkill -f "chromium.*puppeteer" 2>/dev/null || true'

# Auto-restart configuration
Restart=always
RestartSec=30
RestartPreventExitStatus=0

# Watchdog - restart if hangs > 10 minutes
WatchdogSec=600
NotifyAccess=all

# No resource limits - high-spec VPS

# Logging
StandardOutput=append:${LOG_FILE}
StandardError=append:${ERROR_LOG_FILE}
SyslogIdentifier=${SERVICE_NAME}

# Environment
Environment=NODE_ENV=production
Environment=NODE_OPTIONS="--max-old-space-size=4096"
Environment=TZ=Asia/Jakarta
EnvironmentFile=-${SCRIPT_DIR}/config.env

# Security
NoNewPrivileges=false
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=${SCRIPT_DIR} /var/log /tmp

# Timeouts
TimeoutStartSec=120
TimeoutStopSec=60
KillMode=mixed
KillSignal=SIGTERM
FinalKillSignal=SIGKILL

[Install]
WantedBy=multi-user.target
EOF

    print_success "Service file created at ${SERVICE_FILE}"
    
    # Install logrotate configuration
    print_info "Setting up log rotation..."
    
    cat > "${LOGROTATE_FILE}" << EOF
# BCA Scraper Log Rotation
# Managed by install-service.sh

${LOG_FILE}
${ERROR_LOG_FILE}
{
    # Rotate daily
    daily
    
    # Keep 7 days of logs
    rotate 7
    
    # Compress old logs (skip most recent rotated)
    compress
    delaycompress
    
    # Don't error if log is missing
    missingok
    
    # Don't rotate empty logs
    notifempty
    
    # Truncate instead of move (safer for running process)
    copytruncate
    
    # Rotate if size exceeds 100MB regardless of time
    maxsize 100M
    
    # Create new log files with these permissions
    create 644 root root
}
EOF

    print_success "Logrotate config created at ${LOGROTATE_FILE}"
    
    # Reload systemd
    print_info "Reloading systemd daemon..."
    systemctl daemon-reload
    print_success "Systemd daemon reloaded"
    
    # Enable service
    print_info "Enabling service for auto-start on boot..."
    systemctl enable ${SERVICE_NAME}
    print_success "Service enabled"
    
    # Ask to start service now
    echo ""
    read -p "Start the service now? [Y/n]: " START_NOW
    START_NOW=${START_NOW:-Y}
    
    if [[ "${START_NOW}" =~ ^[Yy]$ ]]; then
        print_info "Starting ${SERVICE_NAME}..."
        systemctl start ${SERVICE_NAME}
        sleep 2
        
        if systemctl is-active --quiet ${SERVICE_NAME}; then
            print_success "Service started successfully!"
        else
            print_error "Service failed to start. Check logs with:"
            echo "  journalctl -u ${SERVICE_NAME} -n 50"
            exit 1
        fi
    fi
    
    # Print summary
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Installation Complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "Service Management Commands:"
    echo "  ${BLUE}sudo systemctl start ${SERVICE_NAME}${NC}     - Start service"
    echo "  ${BLUE}sudo systemctl stop ${SERVICE_NAME}${NC}      - Stop service"
    echo "  ${BLUE}sudo systemctl restart ${SERVICE_NAME}${NC}   - Restart service"
    echo "  ${BLUE}sudo systemctl status ${SERVICE_NAME}${NC}    - Check status"
    echo ""
    echo "Log Commands:"
    echo "  ${BLUE}tail -f ${LOG_FILE}${NC}         - Live logs"
    echo "  ${BLUE}tail -f ${ERROR_LOG_FILE}${NC}   - Error logs"
    echo "  ${BLUE}journalctl -u ${SERVICE_NAME} -f${NC}         - Journald logs"
    echo ""
    echo "Configuration:"
    echo "  Service file: ${SERVICE_FILE}"
    echo "  Working dir:  ${SCRIPT_DIR}"
    echo "  Log file:     ${LOG_FILE}"
    echo "  Error log:    ${ERROR_LOG_FILE}"
    echo ""
    echo "Features Enabled:"
    echo "  ✓ Persistent Browser Mode (24/7 standby)"
    echo "  ✓ Auto-restart on crash (30s delay)"
    echo "  ✓ Auto-start on system boot"
    echo "  ✓ No resource limits (high-spec VPS)"
    echo "  ✓ Node.js heap: 4GB max"
    echo "  ✓ Log rotation: daily, 7 days retention"
    echo "  ✓ Watchdog: restart if hung > 10 minutes"
    echo ""
    
    # Uninstall instructions
    echo "To uninstall:"
    echo "  ${YELLOW}sudo ${SCRIPT_DIR}/install-service.sh --uninstall${NC}"
    echo ""
}

# Run installation
install_service
