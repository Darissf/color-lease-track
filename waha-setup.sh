#!/bin/bash

# WAHA Setup Script for VPS
# Automated installation and configuration of WAHA (WhatsApp HTTP API)
# Compatible with: Ubuntu 20.04+, Debian 10+, CentOS 8+

set -e

echo "======================================"
echo "   WAHA Setup Script"
echo "   WhatsApp HTTP API Installer"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root${NC}" 
   exit 1
fi

echo -e "${GREEN}Step 1: Checking system requirements...${NC}"

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo -e "${RED}Error: Cannot determine OS version${NC}"
    exit 1
fi

echo "OS: $OS $VER"

# Update system
echo -e "${GREEN}Step 2: Updating system packages...${NC}"
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y curl wget git
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
    yum update -y
    yum install -y curl wget git
fi

# Install Docker if not present
echo -e "${GREEN}Step 3: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo "Docker already installed"
fi

# Install Docker Compose if not present
echo -e "${GREEN}Step 4: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose not found. Installing..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
else
    echo "Docker Compose already installed"
fi

# Configuration
echo -e "${GREEN}Step 5: Configuring WAHA...${NC}"
echo ""
echo "Enter configuration details:"
read -p "WAHA Port (default: 3000): " WAHA_PORT
WAHA_PORT=${WAHA_PORT:-3000}

read -p "Session Name (default: default): " SESSION_NAME
SESSION_NAME=${SESSION_NAME:-default}

read -p "Enable API Key? (y/n, default: y): " ENABLE_API_KEY
ENABLE_API_KEY=${ENABLE_API_KEY:-y}

if [[ "$ENABLE_API_KEY" == "y" ]]; then
    # Generate random API key
    API_KEY=$(openssl rand -hex 32)
    echo -e "${YELLOW}Generated API Key: $API_KEY${NC}"
    echo "IMPORTANT: Save this API key, you'll need it for Lovable!"
else
    API_KEY=""
fi

# Create WAHA directory
WAHA_DIR="/opt/waha"
mkdir -p $WAHA_DIR
cd $WAHA_DIR

# Create docker-compose.yml
echo -e "${GREEN}Step 6: Creating Docker Compose configuration...${NC}"

cat > docker-compose.yml <<EOF
version: '3'
services:
  waha:
    image: devlikeapro/waha
    container_name: waha
    restart: always
    ports:
      - "${WAHA_PORT}:3000"
    environment:
      - WHATSAPP_HOOK_URL=
      - WHATSAPP_HOOK_EVENTS=*
      - WHATSAPP_DEFAULT_ENGINE=WEBJS
      - WAHA_PRINT_QR=true
EOF

if [[ "$ENABLE_API_KEY" == "y" ]]; then
    cat >> docker-compose.yml <<EOF
      - WHATSAPP_API_KEY=$API_KEY
      - WHATSAPP_API_KEY_ENABLED=true
EOF
fi

cat >> docker-compose.yml <<EOF
    volumes:
      - ./sessions:/app/sessions
      - ./files:/app/files
EOF

# Create directories
mkdir -p sessions files

# Start WAHA
echo -e "${GREEN}Step 7: Starting WAHA...${NC}"
docker-compose up -d

# Wait for WAHA to start
echo "Waiting for WAHA to start..."
sleep 10

# Check if WAHA is running
if docker ps | grep -q waha; then
    echo -e "${GREEN}WAHA is running successfully!${NC}"
else
    echo -e "${RED}Error: WAHA failed to start${NC}"
    docker-compose logs
    exit 1
fi

# Create session
echo -e "${GREEN}Step 8: Creating WhatsApp session...${NC}"

if [[ "$ENABLE_API_KEY" == "y" ]]; then
    CURL_HEADERS="-H 'X-Api-Key: $API_KEY'"
else
    CURL_HEADERS=""
fi

# Start session
curl -X POST "http://localhost:$WAHA_PORT/api/sessions/start" \
     $CURL_HEADERS \
     -H "Content-Type: application/json" \
     -d "{\"name\": \"$SESSION_NAME\", \"config\": {\"webhooks\": []}}"

echo ""
echo "Waiting for QR code generation..."
sleep 5

# Get QR code
echo -e "${GREEN}Step 9: Getting QR Code...${NC}"
curl -X GET "http://localhost:$WAHA_PORT/api/sessions/$SESSION_NAME/auth/qr" \
     $CURL_HEADERS

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

# Create systemd service for auto-start
echo -e "${GREEN}Step 10: Creating systemd service...${NC}"

cat > /etc/systemd/system/waha.service <<EOF
[Unit]
Description=WAHA WhatsApp HTTP API
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$WAHA_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable waha.service

# Setup firewall (optional)
echo -e "${YELLOW}Do you want to configure firewall? (y/n)${NC}"
read -p "Answer: " SETUP_FIREWALL

if [[ "$SETUP_FIREWALL" == "y" ]]; then
    if command -v ufw &> /dev/null; then
        ufw allow $WAHA_PORT/tcp
        echo -e "${GREEN}Firewall configured for port $WAHA_PORT${NC}"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=$WAHA_PORT/tcp
        firewall-cmd --reload
        echo -e "${GREEN}Firewall configured for port $WAHA_PORT${NC}"
    fi
fi

# Create configuration file
cat > $WAHA_DIR/config.txt <<EOF
WAHA Configuration
==================
Installation Date: $(date)
Server IP: $SERVER_IP
Port: $WAHA_PORT
Session Name: $SESSION_NAME
API Key: $API_KEY

API URL: http://$SERVER_IP:$WAHA_PORT
API Documentation: http://$SERVER_IP:$WAHA_PORT/docs

Lovable Settings:
-----------------
WAHA API URL: http://$SERVER_IP:$WAHA_PORT
WAHA API Key: $API_KEY
Session Name: $SESSION_NAME

Commands:
---------
Start WAHA: docker-compose up -d
Stop WAHA: docker-compose down
View logs: docker-compose logs -f
Restart WAHA: docker-compose restart
View QR: curl -X GET "http://localhost:$WAHA_PORT/api/sessions/$SESSION_NAME/auth/qr" -H "X-Api-Key: $API_KEY"
Check status: curl -X GET "http://localhost:$WAHA_PORT/api/sessions/$SESSION_NAME" -H "X-Api-Key: $API_KEY"
EOF

echo ""
echo "======================================"
echo -e "${GREEN}   WAHA Setup Complete!${NC}"
echo "======================================"
echo ""
echo "📋 Configuration saved to: $WAHA_DIR/config.txt"
echo ""
echo "🔧 WAHA Details:"
echo "   API URL: http://$SERVER_IP:$WAHA_PORT"
echo "   Session: $SESSION_NAME"
if [[ "$ENABLE_API_KEY" == "y" ]]; then
    echo "   API Key: $API_KEY"
fi
echo ""
echo "📱 Next Steps:"
echo "   1. Scan the QR code with WhatsApp:"
echo "      curl http://localhost:$WAHA_PORT/api/sessions/$SESSION_NAME/auth/qr"
echo ""
echo "   2. Or visit: http://$SERVER_IP:$WAHA_PORT/api/sessions/$SESSION_NAME/auth/qr"
echo ""
echo "   3. Enter these details in Lovable WhatsApp Settings:"
echo "      - WAHA API URL: http://$SERVER_IP:$WAHA_PORT"
echo "      - WAHA API Key: $API_KEY"
echo "      - Session Name: $SESSION_NAME"
echo ""
echo "📚 API Documentation: http://$SERVER_IP:$WAHA_PORT/docs"
echo ""
echo "🔄 Useful Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Restart: docker-compose restart"
echo "   Stop: docker-compose down"
echo "   Start: docker-compose up -d"
echo ""
echo "======================================"
