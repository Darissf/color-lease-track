import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Embedded scraper files content
const SCRAPER_FILES: Record<string, string> = {
  'bca-scraper.js': `/**
 * BCA iBanking Scraper with Enhanced Frame/Iframe Handling
 * 
 * Features:
 * - Proper iframe detection and handling
 * - Multiple fallback strategies for login
 * - Debug screenshots at each step
 * - Burst mode support
 * 
 * Usage:
 * - Normal mode: node bca-scraper.js
 * - Burst check: node bca-scraper.js --burst-check
 */

// ============ SCRAPER VERSION ============
const SCRAPER_VERSION = "2.0.0";
const SCRAPER_BUILD_DATE = "2025-12-28";
// v2.0.0: Optimized burst mode - login 1x, loop Kembali+Lihat
// =========================================

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Load config from config.env
const configPath = path.join(__dirname, 'config.env');
if (fs.existsSync(configPath)) {
  const envConfig = fs.readFileSync(configPath, 'utf-8');
  envConfig.split('\\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// Find Chromium path
function findChromiumPath() {
  const paths = [
    '/snap/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const CONFIG = {
  BCA_USER_ID: process.env.BCA_USER_ID || 'YOUR_KLIKBCA_USER_ID',
  BCA_PIN: process.env.BCA_PIN || 'YOUR_KLIKBCA_PIN',
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook',
  SECRET_KEY: process.env.SECRET_KEY || 'YOUR_SECRET_KEY_HERE',
  ACCOUNT_NUMBER: process.env.BCA_ACCOUNT_NUMBER || '1234567890',
  HEADLESS: process.env.HEADLESS !== 'false',
  SLOW_MO: parseInt(process.env.SLOW_MO) || 0,
  TIMEOUT: parseInt(process.env.TIMEOUT) || 90000,
  LOGIN_TIMEOUT: parseInt(process.env.LOGIN_TIMEOUT) || 30000,
  SCRAPE_TIMEOUT: parseInt(process.env.SCRAPE_TIMEOUT) || 120000,
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY) || 15000,
  STUCK_TIMEOUT: parseInt(process.env.STUCK_TIMEOUT) || 180000,
  CHROMIUM_PATH: process.env.CHROMIUM_PATH || findChromiumPath(),
  DEBUG_MODE: process.env.DEBUG_MODE !== 'false',
  BURST_CHECK_URL: process.env.BURST_CHECK_URL || (process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL.replace('/bank-scraper-webhook', '/check-burst-command') : ''),
};

// ... rest of bca-scraper.js content will be fetched from public folder during build
// This is a placeholder - the actual sync will embed the full file content

console.log('BCA Scraper loaded via sync-scraper-files');
`,

  'scheduler.js': `/**
 * BCA Scraper Scheduler
 * 
 * Daemon script yang:
 * 1. Poll server setiap 60 detik untuk mengambil konfigurasi
 * 2. Jalankan scrape sesuai interval dari server
 * 3. Otomatis switch ke burst mode jika aktif
 * 
 * Usage: node scheduler.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load config from config.env with improved parsing
const configPath = path.join(__dirname, 'config.env');
if (fs.existsSync(configPath)) {
  const envConfig = fs.readFileSync(configPath, 'utf-8');
  envConfig.split('\\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
  
  const configKeys = ['BCA_USER_ID', 'BCA_PIN', 'SECRET_KEY', 'WEBHOOK_URL', 'ACCOUNT_NUMBER', 'HEADLESS', 'DEBUG_MODE'];
  console.log('[SCHEDULER] Loaded config.env:');
  configKeys.forEach(k => {
    if (process.env[k]) {
      const val = k.includes('PIN') || k.includes('SECRET') ? '***' : process.env[k].substring(0, 30);
      console.log(\`  \${k}=\${val}\${process.env[k].length > 30 ? '...' : ''}\`);
    }
  });
}

const CONFIG = {
  SECRET_KEY: process.env.SECRET_KEY || 'YOUR_SECRET_KEY_HERE',
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook',
  CONFIG_POLL_INTERVAL: 60000,
};

const CONFIG_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/get-scraper-config');

let lastScrapeTime = 0;
let currentIntervalMs = 600000;
let isScraperRunning = false;
let isBurstMode = false;
let burstEndTime = 0;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (msg, level = 'INFO') => console.log(\`[\${new Date().toISOString()}] [SCHEDULER] [\${level}] \${msg}\`);

async function fetchServerConfig() {
  try {
    const response = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_key: CONFIG.SECRET_KEY }),
    });
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    return await response.json();
  } catch (error) {
    log(\`Failed to fetch config: \${error.message}\`, 'ERROR');
    return null;
  }
}

function runScraper(mode = 'normal') {
  return new Promise((resolve, reject) => {
    if (isScraperRunning) {
      log('Scraper already running, skipping...', 'WARN');
      resolve(false);
      return;
    }
    isScraperRunning = true;
    const startTime = Date.now();
    log(\`Starting scraper (\${mode} mode)...\`);
    const args = ['bca-scraper.js'];
    const child = spawn('node', args, {
      cwd: __dirname,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });
    if (child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (data) => process.stdout.write(data));
    }
    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (data) => process.stderr.write(data));
    }
    child.on('close', (code) => {
      isScraperRunning = false;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      if (code === 0) {
        log(\`Scraper completed in \${duration}s\`);
        lastScrapeTime = Date.now();
        resolve(true);
      } else {
        log(\`Scraper exited with code \${code} after \${duration}s\`, 'ERROR');
        resolve(false);
      }
    });
    child.on('error', (err) => {
      isScraperRunning = false;
      log(\`Scraper spawn error: \${err.message}\`, 'ERROR');
      reject(err);
    });
  });
}

async function mainLoop() {
  log('=== SCHEDULER STARTED ===');
  log(\`Config URL: \${CONFIG_URL}\`);
  log(\`Poll interval: \${CONFIG.CONFIG_POLL_INTERVAL / 1000}s\`);
  if (CONFIG.SECRET_KEY === 'YOUR_SECRET_KEY_HERE') {
    log('ERROR: SECRET_KEY belum dikonfigurasi!', 'ERROR');
    process.exit(1);
  }
  while (true) {
    try {
      const config = await fetchServerConfig();
      if (!config || !config.success) {
        log(\`Config fetch failed or inactive: \${config?.error || 'Unknown'}\`, 'WARN');
        await delay(CONFIG.CONFIG_POLL_INTERVAL);
        continue;
      }
      const serverIntervalMs = (config.scrape_interval_minutes || 10) * 60 * 1000;
      if (serverIntervalMs !== currentIntervalMs) {
        log(\`Interval changed: \${currentIntervalMs / 60000}m -> \${serverIntervalMs / 60000}m\`);
        currentIntervalMs = serverIntervalMs;
      }
      if (config.burst_in_progress && config.burst_enabled) {
        if (!isBurstMode) {
          log('=== ENTERING BURST MODE ===');
          isBurstMode = true;
          burstEndTime = Date.now() + (config.burst_remaining_seconds * 1000);
        }
        await runBurstLoop(config);
        const updatedConfig = await fetchServerConfig();
        if (!updatedConfig?.burst_in_progress) {
          log('=== BURST MODE ENDED ===');
          isBurstMode = false;
        }
        continue;
      } else {
        if (isBurstMode) {
          log('=== BURST MODE ENDED ===');
          isBurstMode = false;
        }
      }
      if (config.is_active) {
        const timeSinceLastScrape = Date.now() - lastScrapeTime;
        if (timeSinceLastScrape >= currentIntervalMs) {
          log(\`Time to scrape (\${(timeSinceLastScrape / 60000).toFixed(1)}m since last)\`);
          await runScraper('normal');
        } else {
          const nextScrapeIn = ((currentIntervalMs - timeSinceLastScrape) / 60000).toFixed(1);
          log(\`Next scrape in \${nextScrapeIn}m\`);
        }
      } else {
        log('Scraper inactive (disabled in settings)');
      }
    } catch (error) {
      log(\`Loop error: \${error.message}\`, 'ERROR');
    }
    await delay(CONFIG.CONFIG_POLL_INTERVAL);
  }
}

async function runBurstLoop(config) {
  const burstIntervalMs = (config.burst_interval_seconds || 10) * 1000;
  let burstScrapeCount = 0;
  log(\`Burst mode: interval=\${burstIntervalMs / 1000}s, remaining=\${config.burst_remaining_seconds}s\`);
  while (Date.now() < burstEndTime) {
    burstScrapeCount++;
    log(\`--- Burst scrape #\${burstScrapeCount} ---\`);
    await runScraper('burst');
    const checkConfig = await fetchServerConfig();
    if (!checkConfig?.burst_in_progress) {
      log('Burst stopped by server');
      break;
    }
    if (checkConfig.burst_remaining_seconds) {
      burstEndTime = Date.now() + (checkConfig.burst_remaining_seconds * 1000);
    }
    log(\`Waiting \${burstIntervalMs / 1000}s...\`);
    await delay(burstIntervalMs);
  }
  log(\`Burst completed: \${burstScrapeCount} scrapes\`);
}

process.on('SIGINT', () => { log('Received SIGINT, shutting down...'); process.exit(0); });
process.on('SIGTERM', () => { log('Received SIGTERM, shutting down...'); process.exit(0); });

mainLoop().catch(err => { log(\`Fatal error: \${err.message}\`, 'ERROR'); process.exit(1); });
`,

  'config.env.template': `# ============================================================
# BCA VPS Scraper Configuration
# ============================================================
# Isi file ini dengan kredensial Anda, lalu rename ke config.env
# ============================================================

# ------ VPN Credentials (OPSIONAL) ------
# Hanya isi jika file .ovpn Anda memerlukan username/password TERPISAH
# Kebanyakan provider (VPNJantit, dll) sudah embed credentials di .ovpn
# Jika tidak yakin, biarkan kosong dan coba dulu dengan .ovpn saja
# VPN_USERNAME=
# VPN_PASSWORD=

# ------ BCA Credentials (WAJIB) ------
BCA_USER_ID=your_bca_user_id
BCA_PIN=your_bca_pin
BCA_ACCOUNT_NUMBER=your_account_number

# ------ Webhook Configuration (auto-filled dari UI) ------
WEBHOOK_URL=https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook
SECRET_KEY=YOUR_SECRET_KEY_HERE

# ------ Optional Settings ------
# Interval scraping dalam menit (default: 5)
SCRAPE_INTERVAL=5

# Mode headless browser (true = tanpa GUI, false = dengan GUI untuk debug)
HEADLESS=true
`,

  'run.sh': `#!/bin/bash
# ============================================================
# BCA Scraper Runner
# 
# Usage:
#   ./run.sh              - Normal mode (single scrape)
#   ./run.sh --burst-check - Check for burst command and run if active
#   ./run.sh --daemon      - Run scheduler daemon (recommended)
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load config
if [ -f "config.env" ]; then
    export $(grep -v '^#' config.env | xargs)
else
    echo "ERROR: config.env tidak ditemukan!"
    echo "Copy config.env.template ke config.env dan isi dengan kredensial Anda"
    exit 1
fi

# Validate required config
if [ -z "$BCA_USER_ID" ] || [ "$BCA_USER_ID" = "your_bca_user_id" ]; then
    echo "ERROR: BCA_USER_ID belum dikonfigurasi di config.env"
    exit 1
fi

if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "YOUR_SECRET_KEY_HERE" ]; then
    echo "ERROR: SECRET_KEY belum dikonfigurasi di config.env"
    exit 1
fi

# Check if VPN is connected (optional)
if command -v curl &> /dev/null; then
    echo "[$(date)] Checking IP address..."
    IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "unknown")
    echo "[$(date)] Current IP: $IP"
fi

# Check mode
if [ "$1" = "--daemon" ]; then
    echo "[$(date)] Running in DAEMON mode (scheduler)..."
    echo "[$(date)] Scheduler will poll server for config every 60 seconds"
    echo "[$(date)] Press Ctrl+C to stop"
    echo ""
    node scheduler.js
elif [ "$1" = "--burst-check" ]; then
    echo "[$(date)] Running in BURST CHECK mode..."
    node bca-scraper.js --burst-check
else
    echo "[$(date)] Running in NORMAL mode (single scrape)..."
    node bca-scraper.js
fi
`,

  'install.sh': `#!/bin/bash
# BCA VPS Scraper - All-in-One Installer
set -e

echo "============================================================"
echo "    BCA VPS Scraper - All-in-One Installer"
echo "============================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

print_success() { echo -e "\${GREEN}✓ $1\${NC}"; }
print_warning() { echo -e "\${YELLOW}⚠ $1\${NC}"; }
print_error() { echo -e "\${RED}✗ $1\${NC}"; }

echo ""
echo "STEP 1: Checking for OpenVPN config file..."
OVPN_FILE=$(ls *.ovpn 2>/dev/null | head -1)
if [ -z "$OVPN_FILE" ]; then
    print_warning "File .ovpn tidak ditemukan di folder ini"
else
    print_success "Found OpenVPN config: $OVPN_FILE"
fi

echo ""
echo "STEP 2: Checking configuration..."
if [ ! -f "config.env" ]; then
    if [ -f "config.env.template" ]; then
        cp config.env.template config.env
        print_warning "config.env dibuat dari template"
    else
        print_error "config.env.template tidak ditemukan!"
        exit 1
    fi
else
    print_success "config.env already exists"
fi
source config.env 2>/dev/null || true

echo ""
echo "STEP 3: Installing system dependencies..."
if command -v apt &> /dev/null; then
    sudo apt update -qq
    sudo apt install -y openvpn
fi
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
print_success "Dependencies installed"

echo ""
echo "STEP 4: Installing npm packages..."
if [ ! -f "package.json" ]; then
    npm init -y
fi
npm install puppeteer dotenv
print_success "npm packages installed"

echo ""
echo "STEP 5: Setting permissions..."
chmod +x run.sh 2>/dev/null || true
chmod +x install-service.sh 2>/dev/null || true
print_success "Scripts are executable"

echo ""
echo "STEP 6: Setting up systemd service..."
if [ -f "install-service.sh" ]; then
    sudo ./install-service.sh
fi

echo ""
echo "============================================================"
echo -e "\${GREEN}    INSTALASI SELESAI!\${NC}"
echo "============================================================"
echo ""
echo "LANGKAH SELANJUTNYA:"
echo "1. Edit config.env dengan kredensial BCA Anda"
echo "2. Start VPN: sudo systemctl start openvpn-client@indonesia"
echo "3. Start scraper: sudo systemctl start bca-scraper"
echo ""
`,

  'install-service.sh': `#!/bin/bash
# BCA Scraper - Systemd Service Installer
set -e

SERVICE_NAME="bca-scraper"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="/var/log/bca-scraper.log"
ERROR_LOG_FILE="/var/log/bca-scraper-error.log"
SERVICE_FILE="/etc/systemd/system/\${SERVICE_NAME}.service"

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

if [ "$1" == "--uninstall" ]; then
    systemctl stop \${SERVICE_NAME} 2>/dev/null || true
    systemctl disable \${SERVICE_NAME} 2>/dev/null || true
    rm -f "\${SERVICE_FILE}"
    systemctl daemon-reload
    echo "Service uninstalled"
    exit 0
fi

touch "\${LOG_FILE}" "\${ERROR_LOG_FILE}"
chmod 644 "\${LOG_FILE}" "\${ERROR_LOG_FILE}"

cat > "\${SERVICE_FILE}" << EOF
[Unit]
Description=BCA Scraper Scheduler Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=\${SCRIPT_DIR}
ExecStart=/usr/bin/node \${SCRIPT_DIR}/scheduler.js
Restart=always
RestartSec=30
StandardOutput=append:\${LOG_FILE}
StandardError=append:\${ERROR_LOG_FILE}
Environment=NODE_ENV=production
EnvironmentFile=-\${SCRIPT_DIR}/config.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable \${SERVICE_NAME}
echo "Service installed and enabled"
`,

  'vpn-up.sh': `#!/bin/bash
# VPN Up Script - Split Tunneling for BCA Scraper
set -e

LOG_FILE="/var/log/vpn-split-tunnel.log"
STATE_DIR="/var/run/vpn-state"

log() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" | tee -a "\$LOG_FILE"
}

mkdir -p "\$STATE_DIR"
log "VPN UP Script Starting"

ORIGINAL_GW=\$(cat /tmp/original_gateway 2>/dev/null || ip route show default | head -1 | awk '{print \$3}')
ORIGINAL_DEV=\$(cat /tmp/original_device 2>/dev/null || ip route show default | head -1 | awk '{print \$5}')

if [ -z "\$ORIGINAL_GW" ]; then
    log "ERROR: Could not determine original gateway"
    exit 1
fi

log "Original Gateway: \$ORIGINAL_GW via \$ORIGINAL_DEV"

echo "\$ORIGINAL_GW" > "\$STATE_DIR/original_gateway"
echo "\$ORIGINAL_DEV" > "\$STATE_DIR/original_device"

if ! grep -q "100 direct" /etc/iproute2/rt_tables 2>/dev/null; then
    echo "100 direct" >> /etc/iproute2/rt_tables
fi

ip route add default via "\$ORIGINAL_GW" dev "\$ORIGINAL_DEV" table direct 2>/dev/null || \\
    ip route replace default via "\$ORIGINAL_GW" dev "\$ORIGINAL_DEV" table direct

iptables -t mangle -C OUTPUT -p tcp --sport 22 -j MARK --set-mark 0x100 2>/dev/null || \\
    iptables -t mangle -A OUTPUT -p tcp --sport 22 -j MARK --set-mark 0x100

ip rule add fwmark 0x100 table direct priority 100 2>/dev/null || true

log "VPN UP Script Completed"
exit 0
`,

  'vpn-down.sh': `#!/bin/bash
# VPN Down Script - Cleanup Split Tunneling Rules
set -e

LOG_FILE="/var/log/vpn-split-tunnel.log"

log() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" | tee -a "\$LOG_FILE"
}

log "VPN DOWN Script Starting"

iptables -t mangle -D OUTPUT -p tcp --sport 22 -j MARK --set-mark 0x100 2>/dev/null || true
ip rule del fwmark 0x100 table direct 2>/dev/null || true
ip route flush table direct 2>/dev/null || true

log "VPN DOWN Script Completed"
exit 0
`,

  'README.md': `# VPS BCA Scraper Template

Script untuk scraping mutasi BCA dari VPS sendiri dan mengirim ke webhook.

## Quick Setup

1. Upload semua file ke VPS
2. Jalankan: \`chmod +x install.sh && sudo ./install.sh\`
3. Edit config.env dengan kredensial BCA Anda
4. Start service: \`sudo systemctl start bca-scraper\`

## Files

- \`bca-scraper.js\` - Main scraper script
- \`scheduler.js\` - Scheduler daemon
- \`config.env.template\` - Configuration template
- \`install.sh\` - All-in-one installer
- \`run.sh\` - Manual run script

## Support

Jika ada masalah, hubungi admin atau buka issue di GitHub.
`,

  'README.txt': `============================================================
    BCA VPS Scraper - Quick Start Guide
============================================================

CARA SETUP:

1. Upload semua file ke VPS (contoh: /root/bca-scraper/)
2. Jalankan installer:
   cd /root/bca-scraper
   chmod +x install.sh
   sudo ./install.sh

3. Edit config.env dengan kredensial BCA Anda:
   nano config.env

4. Start service:
   sudo systemctl start bca-scraper

5. Cek log:
   tail -f /var/log/bca-scraper.log

============================================================
`,
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: { file: string; status: 'success' | 'error'; message?: string }[] = [];

    // Upload each file to storage
    for (const [fileName, content] of Object.entries(SCRAPER_FILES)) {
      try {
        // Convert string content to Uint8Array
        const encoder = new TextEncoder();
        const data = encoder.encode(content);

        // Delete existing file first (upsert)
        await supabase.storage
          .from('scraper-files')
          .remove([fileName]);

        // Upload new file
        const { error } = await supabase.storage
          .from('scraper-files')
          .upload(fileName, data, {
            contentType: fileName.endsWith('.js') ? 'application/javascript' :
                        fileName.endsWith('.sh') ? 'application/x-sh' :
                        fileName.endsWith('.md') ? 'text/markdown' :
                        'text/plain',
            cacheControl: '300',
            upsert: true,
          });

        if (error) {
          results.push({ file: fileName, status: 'error', message: error.message });
        } else {
          results.push({ file: fileName, status: 'success' });
        }
      } catch (err) {
        results.push({ file: fileName, status: 'error', message: String(err) });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`[Sync Scraper Files] Synced ${successCount} files, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${successCount} files successfully`,
        total: Object.keys(SCRAPER_FILES).length,
        successCount,
        errorCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Sync Scraper Files] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
