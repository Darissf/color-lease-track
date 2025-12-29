import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to build scraper files dynamically
function getScraperFiles(): Record<string, string> {
  const VERSION = '4.1.5';
  const BUILD_DATE = '2025-12-29';
  
  // Common config template
  const CONFIG_TEMPLATE = `# ============================================================
# BCA Scraper Configuration
# ============================================================
# Isi file ini dengan kredensial Anda, lalu rename ke config.env
# ============================================================

# ------ BCA Credentials (WAJIB) ------
BCA_USER_ID=your_bca_user_id
BCA_PIN=your_bca_pin
BCA_ACCOUNT_NUMBER=your_account_number

# ------ Webhook Configuration (auto-filled dari UI) ------
WEBHOOK_URL=https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook
SECRET_KEY=YOUR_SECRET_KEY_HERE

# ------ Optional Settings ------
SCRAPE_INTERVAL=5
HEADLESS=true
DEBUG_MODE=true
`;

  // Linux install script
  const INSTALL_SH = `#!/bin/bash
# ============================================
# BCA Scraper - Linux Installer v${VERSION}
# ============================================

set -e
echo ""
echo "============================================"
echo "   BCA Scraper Linux - Installer v${VERSION}"
echo "============================================"
echo ""

# Check Node.js
echo "[1/4] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not installed!"
    echo "Install with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
echo "[OK] Node.js: $(node -v)"

# Check npm
echo "[2/4] Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm not installed!"
    exit 1
fi
echo "[OK] npm: v$(npm -v)"

# Install Puppeteer
echo "[3/4] Installing Puppeteer..."
npm install puppeteer
echo "[OK] Puppeteer installed"

# Create config
echo "[4/4] Setting up configuration..."
if [ ! -f config.env ]; then
    if [ -f config.env.template ]; then
        cp config.env.template config.env
        echo "[OK] config.env created from template"
    fi
fi

# Create debug folder
mkdir -p debug
echo "[OK] Created debug folder"

echo ""
echo "============================================"
echo "   Installation Complete!"
echo "============================================"
echo ""
echo "NEXT STEPS:"
echo "1. Edit config.env with your credentials"
echo "2. Run: ./run.sh"
echo ""
`;

  // Linux run script
  const RUN_SH = `#!/bin/bash
# ============================================
# BCA Scraper - Run Script
# ============================================

echo ""
echo "============================================"
echo "   BCA Scraper v${VERSION}"
echo "============================================"
echo ""
echo "Starting scraper..."
echo "Press Ctrl+C to stop."
echo ""

cd "$(dirname "$0")"
node bca-scraper.js
`;

  // Windows install script
  const INSTALL_WINDOWS_BAT = `@echo off
REM ============================================
REM BCA Scraper Windows - Installer v${VERSION}
REM ============================================

echo.
echo ============================================
echo    BCA Scraper Windows - Installer v${VERSION}
echo ============================================
echo.

REM Check Node.js
echo [1/4] Checking Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Node.js is NOT installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check npm
echo.
echo [2/4] Checking npm...
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is NOT installed!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm found: v%NPM_VERSION%

REM Install Puppeteer
echo.
echo [3/4] Installing Puppeteer (this may take a few minutes)...
npm install puppeteer
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Puppeteer!
    pause
    exit /b 1
)
echo [OK] Puppeteer installed successfully!

REM Create config.env
echo.
echo [4/4] Setting up configuration...
if not exist config.env (
    if exist config.env.template (
        copy config.env.template config.env >nul
        echo [OK] config.env created from template
    )
)

if not exist debug (
    mkdir debug
    echo [OK] Created debug folder
)

echo.
echo ============================================
echo    Installation Complete!
echo ============================================
echo.
echo NEXT STEPS:
echo 1. Edit config.env with Notepad
echo 2. Fill in your BCA credentials
echo 3. Run: run-windows.bat
echo.
pause
`;

  // Windows run script
  const RUN_WINDOWS_BAT = `@echo off
REM ============================================
REM BCA Scraper Windows - Run Script
REM ============================================

echo.
echo ============================================
echo    BCA Scraper Windows v${VERSION}
echo ============================================
echo.
echo Starting scraper...
echo Press Ctrl+C to stop.
echo.

cd /d "%~dp0"
node bca-scraper-windows.js

echo.
echo Scraper stopped.
pause
`;

  // Windows autostart setup
  const SETUP_AUTOSTART_BAT = `@echo off
REM ============================================
REM BCA Scraper Windows - Setup Auto-Start
REM ============================================

echo.
echo ============================================
echo    Setup Auto-Start (Task Scheduler)
echo ============================================
echo.

set SCRAPER_DIR=%~dp0
set SCRAPER_DIR=%SCRAPER_DIR:~0,-1%

if not exist "%SCRAPER_DIR%\\config.env" (
    echo [ERROR] config.env not found!
    echo Please run install-windows.bat first
    pause
    exit /b 1
)

echo This will create a Windows Task Scheduler task that:
echo - Runs the scraper automatically when you log in
echo - Restarts the scraper if it crashes
echo.
echo Scraper location: %SCRAPER_DIR%
echo.

set /p CONFIRM="Do you want to continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Creating scheduled task...

schtasks /delete /tn "BCA-Scraper" /f >nul 2>&1
schtasks /create /tn "BCA-Scraper" /tr "cmd /c cd /d \\"%SCRAPER_DIR%\\" && node bca-scraper-windows.js" /sc onlogon /rl highest /f

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to create scheduled task!
    echo You may need to run this script as Administrator.
    pause
    exit /b 1
)

echo.
echo ============================================
echo    Auto-Start Setup Complete!
echo ============================================
echo.
echo Task "BCA-Scraper" created successfully.
echo The scraper will now start automatically when you log in.
echo.
echo To remove: schtasks /delete /tn "BCA-Scraper" /f
echo.
pause
`;

  // Windows README
  const README_WINDOWS = `# BCA Bank Scraper - Windows RDP Version

## Versi: ${VERSION}

Versi Windows dari BCA Scraper untuk dijalankan di Windows RDP/VPS.

## Keuntungan Windows RDP

1. **Visual Debugging**: Bisa lihat browser langsung
2. **Easier Setup**: Familiar Windows environment
3. **Parallel Testing**: Bisa test manual sambil scraper jalan
4. **Backup Option**: Alternatif jika Linux VPS bermasalah

## Requirements

- Windows 10/11 atau Windows Server
- Node.js 18+ (download dari https://nodejs.org/)
- Google Chrome atau Microsoft Edge (sudah terinstall)

## Quick Install

1. Download semua file ke folder (misal: C:\\bca-scraper)
2. Jalankan: install-windows.bat
3. Edit config.env dengan Notepad
4. Test: run-windows.bat

## File Structure

- bca-scraper-windows.js - Main scraper script
- config.env.template - Template konfigurasi
- config.env - Konfigurasi Anda (buat dari template)
- install-windows.bat - Script instalasi
- run-windows.bat - Script untuk menjalankan
- setup-autostart.bat - Setup auto-start on login

## Troubleshooting

### Node.js not found
Download dan install dari https://nodejs.org/

### Puppeteer installation failed
Pastikan koneksi internet stabil, coba lagi

### Browser not appearing
Set HEADLESS=false di config.env untuk debug

### Login failed
1. Pastikan credentials benar
2. Cek koneksi internet
3. Lihat screenshot di folder debug/

## Support

Lihat logs di console untuk debugging.
Screenshots tersimpan di folder debug/ jika DEBUG_MODE=true
`;

  // Linux README
  const README_LINUX = `# BCA Bank Scraper - Linux VPS Version

## Versi: ${VERSION}

Script scraper untuk BCA iBanking yang berjalan di Linux VPS.

## Requirements

- Linux (Ubuntu/Debian recommended)
- Node.js 18+
- Chromium browser

## Quick Install

\`\`\`bash
chmod +x install.sh
./install.sh
\`\`\`

## Configuration

Edit config.env:
- BCA_USER_ID: KlikBCA User ID
- BCA_PIN: KlikBCA PIN
- BCA_ACCOUNT_NUMBER: Nomor rekening
- SECRET_KEY: Dari Bank Scraper Settings

## Running

\`\`\`bash
./run.sh
\`\`\`

## As Systemd Service

\`\`\`bash
chmod +x install-service.sh
sudo ./install-service.sh
\`\`\`

## Features v${VERSION}

- Session Reuse: Login 1x, scrape berkali-kali
- Burst Mode: Scraping cepat saat payment request
- Auto Recovery: Restart otomatis jika error
- Login Cooldown: Respects BCA 5-minute limit
`;

  // Linux service installer
  const INSTALL_SERVICE_SH = `#!/bin/bash
# ============================================
# BCA Scraper - Systemd Service Installer
# ============================================

set -e
SCRAPER_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="bca-scraper"
SERVICE_FILE="/etc/systemd/system/\${SERVICE_NAME}.service"

echo ""
echo "============================================"
echo "   Installing BCA Scraper as Systemd Service"
echo "============================================"
echo ""

if [ ! -f "\${SCRAPER_DIR}/config.env" ]; then
    echo "[ERROR] config.env not found!"
    echo "Please create config.env first"
    exit 1
fi

cat > \${SERVICE_FILE} << EOF
[Unit]
Description=BCA iBanking Scraper
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=\${SCRAPER_DIR}
ExecStart=/usr/bin/node \${SCRAPER_DIR}/bca-scraper.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable \${SERVICE_NAME}
systemctl start \${SERVICE_NAME}

echo ""
echo "[OK] Service installed and started!"
echo ""
echo "Commands:"
echo "  Status:  systemctl status \${SERVICE_NAME}"
echo "  Logs:    journalctl -u \${SERVICE_NAME} -f"
echo "  Stop:    systemctl stop \${SERVICE_NAME}"
echo "  Restart: systemctl restart \${SERVICE_NAME}"
echo ""
`;

  // Placeholder for main scraper scripts (very large files)
  // These will be minimal placeholders - actual content is in public/vps-scraper-template
  const SCRAPER_PLACEHOLDER = `/**
 * BCA iBanking Scraper v${VERSION}
 * 
 * This is a placeholder. The full scraper code is embedded at build time.
 * For the latest version, download from the admin panel.
 * 
 * Build Date: ${BUILD_DATE}
 */

console.log('BCA Scraper v${VERSION}');
console.log('Please download the full version from admin panel.');
`;

  return {
    'config.env.template': CONFIG_TEMPLATE,
    'install.sh': INSTALL_SH,
    'run.sh': RUN_SH,
    'install-service.sh': INSTALL_SERVICE_SH,
    'README.md': README_LINUX,
    'install-windows.bat': INSTALL_WINDOWS_BAT,
    'run-windows.bat': RUN_WINDOWS_BAT,
    'setup-autostart.bat': SETUP_AUTOSTART_BAT,
    'README-WINDOWS.md': README_WINDOWS,
    'bca-scraper.js': SCRAPER_PLACEHOLDER,
    'bca-scraper-windows.js': SCRAPER_PLACEHOLDER,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const SCRAPER_FILES = getScraperFiles();
    const results: { file: string; status: string; error?: string }[] = [];
    
    for (const [filename, content] of Object.entries(SCRAPER_FILES)) {
      try {
        const contentType = filename.endsWith('.js') 
          ? 'application/javascript' 
          : filename.endsWith('.bat') 
            ? 'application/x-bat'
            : filename.endsWith('.sh')
              ? 'application/x-sh'
              : 'text/plain';
        
        const { error } = await supabase.storage
          .from('scraper-files')
          .upload(filename, new Blob([content], { type: 'text/plain' }), {
            upsert: true,
            contentType,
          });
        
        if (error) throw error;
        
        results.push({ file: filename, status: 'success' });
        console.log('[SYNC] Uploaded:', filename);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({ file: filename, status: 'error', error: errorMsg });
        console.error('[SYNC] Failed:', filename, '-', errorMsg);
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return new Response(JSON.stringify({
      success: errorCount === 0,
      message: `Synced ${successCount}/${results.length} files (v4.1.5)`,
      version: '4.1.5',
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    console.error('[SYNC] Error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
