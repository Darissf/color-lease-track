import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Embedded scraper files content - v4.1.3 Burst Fix Mode
const SCRAPER_FILES: Record<string, string> = {
  'bca-scraper.js': `/**
 * BCA iBanking Scraper - SESSION REUSE MODE v4.1.3
 * 
 * Features:
 * - Browser standby 24/7, siap dipakai kapan saja
 * - LOGIN COOLDOWN: Respects BCA 5-minute login limit (skipped if logout successful)
 * - SESSION REUSE: Burst mode reuses active session (no re-login)
 * - NO LOGOUT DURING BURST: Session kept active between burst iterations
 * - POST-BURST COOLDOWN: 10s delay after burst ends to prevent restart loops
 * - BURST TIMING RESET: VPS gets full duration from first fetch
 * - Global scrape timeout (max 2 menit per scrape)
 * - Safe frame operations dengan timeout protection
 * - Session expired detection & auto-recovery
 * - Periodic browser restart (memory leak prevention)
 * - Retry with exponential backoff (3x retry)
 * - Force kill & restart jika browser unresponsive
 * - Page health check sebelum scrape
 * - Server heartbeat reporting with login status
 * - Error categorization
 * 
 * Usage: node bca-scraper.js
 */

// ============ SCRAPER VERSION ============
const SCRAPER_VERSION = "4.1.3";
const SCRAPER_BUILD_DATE = "2025-12-29";
// v4.1.3: Burst Fix - no logout during burst, post-burst cooldown, timing reset
// v4.1.2: Fix cooldown - skip 5-min wait if previous logout was successful
// v4.1.1: Fixed logout - uses correct BCA selector #gotohome and goToPage()
// v4.1.0: Login Cooldown & Session Reuse - respect BCA 5-minute login limit
// v4.0.0: Ultra-Robust Mode - comprehensive error handling, auto-recovery
// v3.0.0: Persistent Browser Mode - browser standby 24/7
// v2.1.2: Added forceLogout on error/stuck
// v2.1.1: Fixed button click stuck - using Promise.race
// v2.1.0: Fixed timezone bug - uses WIB (Asia/Jakarta)
// v2.0.0: Optimized burst mode - login 1x, loop Kembali+Lihat
// =========================================

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// ============ JAKARTA TIMEZONE HELPER ============
function getJakartaDate() {
  const now = new Date();
  const jakartaOffset = 7 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jakartaTime = new Date(utcTime + (jakartaOffset * 60000));
  return jakartaTime;
}

function getJakartaDateString() {
  const jakarta = getJakartaDate();
  const day = String(jakarta.getDate()).padStart(2, '0');
  const month = String(jakarta.getMonth() + 1).padStart(2, '0');
  const year = jakarta.getFullYear();
  const hours = String(jakarta.getHours()).padStart(2, '0');
  const minutes = String(jakarta.getMinutes()).padStart(2, '0');
  return \`\${year}-\${month}-\${day} \${hours}:\${minutes} WIB\`;
}
// =================================================

// Load config from config.env
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

// Find Chromium path with smart priority
function findChromiumPath() {
  const aptPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  for (const p of aptPaths) {
    if (fs.existsSync(p)) {
      console.log(\`[CHROMIUM] Found apt-installed: \${p}\`);
      return p;
    }
  }
  
  const snapPaths = ['/snap/bin/chromium'];
  for (const p of snapPaths) {
    if (fs.existsSync(p)) {
      console.log(\`[CHROMIUM] Found snap-installed: \${p} (may have issues in systemd)\`);
      return p;
    }
  }
  
  try {
    const puppeteerPath = require('puppeteer').executablePath();
    if (puppeteerPath && fs.existsSync(puppeteerPath)) {
      console.log(\`[CHROMIUM] Found Puppeteer bundled: \${puppeteerPath}\`);
      return puppeteerPath;
    }
  } catch (e) {}
  
  const puppeteerCachePaths = [
    \`\${process.env.HOME}/.cache/puppeteer/chrome\`,
    '/root/.cache/puppeteer/chrome'
  ];
  for (const basePath of puppeteerCachePaths) {
    if (fs.existsSync(basePath)) {
      try {
        const versions = fs.readdirSync(basePath);
        for (const version of versions.reverse()) {
          const chromePath = \`\${basePath}/\${version}/chrome-linux64/chrome\`;
          if (fs.existsSync(chromePath)) {
            console.log(\`[CHROMIUM] Found Puppeteer cache: \${chromePath}\`);
            return chromePath;
          }
        }
      } catch (e) {}
    }
  }
  
  return null;
}

// Fallback browser launch
async function launchBrowserWithFallback() {
  const chromiumPath = CONFIG.CHROMIUM_PATH;
  
  const browserArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--window-size=1366,768',
    '--disable-software-rasterizer',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--single-process'
  ];
  
  if (chromiumPath && fs.existsSync(chromiumPath)) {
    try {
      log(\`Launching browser with system Chromium: \${chromiumPath}\`);
      const browser = await puppeteer.launch({
        headless: CONFIG.HEADLESS,
        executablePath: chromiumPath,
        args: browserArgs,
        timeout: 60000,
        protocolTimeout: 120000
      });
      log('Browser launched successfully with system Chromium');
      return browser;
    } catch (err) {
      log(\`System Chromium failed: \${err.message}\`, 'WARN');
      log('Trying Puppeteer bundled Chromium as fallback...', 'WARN');
    }
  }
  
  try {
    log('Launching browser with Puppeteer bundled Chromium...');
    const browser = await puppeteer.launch({
      headless: CONFIG.HEADLESS,
      args: browserArgs,
      timeout: 60000,
      protocolTimeout: 120000
    });
    log('Browser launched successfully with Puppeteer bundled Chromium');
    return browser;
  } catch (err) {
    log(\`Puppeteer bundled Chromium also failed: \${err.message}\`, 'ERROR');
    throw new Error(\`All Chromium launch attempts failed. Last error: \${err.message}\`);
  }
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
  CHROMIUM_PATH: process.env.CHROMIUM_PATH || findChromiumPath(),
  DEBUG_MODE: process.env.DEBUG_MODE !== 'false',
  CONFIG_POLL_INTERVAL: 60000,
  WATCHDOG_INTERVAL: 300000,
  BURST_CHECK_URL: process.env.BURST_CHECK_URL || (process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL.replace('/bank-scraper-webhook', '/check-burst-command') : ''),
  GLOBAL_SCRAPE_TIMEOUT: parseInt(process.env.GLOBAL_SCRAPE_TIMEOUT) || 120000,
  MAX_SCRAPES_BEFORE_RESTART: parseInt(process.env.MAX_SCRAPES_BEFORE_RESTART) || 10,
  MAX_UPTIME_MS: parseInt(process.env.MAX_UPTIME_MS) || 7200000,
  FRAME_OPERATION_TIMEOUT: parseInt(process.env.FRAME_OPERATION_TIMEOUT) || 10000,
  HEARTBEAT_INTERVAL: parseInt(process.env.HEARTBEAT_INTERVAL) || 300000,
};

const CONFIG_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/get-scraper-config');
const HEARTBEAT_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/update-scraper-status');

if (CONFIG.BCA_USER_ID === 'YOUR_KLIKBCA_USER_ID' || CONFIG.BCA_USER_ID === 'your_bca_user_id') {
  console.error('ERROR: BCA_USER_ID belum dikonfigurasi!');
  process.exit(1);
}

if (CONFIG.SECRET_KEY === 'YOUR_SECRET_KEY_HERE') {
  console.error('ERROR: SECRET_KEY belum dikonfigurasi!');
  process.exit(1);
}

// === STARTUP BANNER ===
console.log('');
console.log('==========================================');
console.log('  BCA SCRAPER - SESSION REUSE v4.1.0');
console.log('==========================================');
console.log(\`  Version      : \${SCRAPER_VERSION} (\${SCRAPER_BUILD_DATE})\`);
console.log(\`  Timestamp    : \${new Date().toISOString()} (UTC)\`);
console.log(\`  Jakarta Time : \${getJakartaDateString()}\`);
console.log(\`  Chromium Path: \${CONFIG.CHROMIUM_PATH || 'NOT FOUND!'}\`);
console.log(\`  User ID      : \${CONFIG.BCA_USER_ID.substring(0, 3)}***\`);
console.log(\`  Account      : \${CONFIG.ACCOUNT_NUMBER}\`);
console.log(\`  Headless     : \${CONFIG.HEADLESS}\`);
console.log(\`  Debug Mode   : \${CONFIG.DEBUG_MODE}\`);
console.log(\`  Webhook URL  : \${CONFIG.WEBHOOK_URL.substring(0, 50)}...\`);
console.log(\`  Config URL   : \${CONFIG_URL.substring(0, 50)}...\`);
console.log('==========================================');
console.log('  v4.1.0 FEATURES:');
console.log(\`  - Login Cooldown    : 5 minutes (BCA limit)\`);
console.log(\`  - Session Reuse     : Burst mode reuses active session\`);
console.log(\`  - No Burst Restart  : Browser won't restart during burst\`);
console.log('  ULTRA-ROBUST FEATURES:');
console.log(\`  - Global Timeout    : \${CONFIG.GLOBAL_SCRAPE_TIMEOUT / 1000}s\`);
console.log(\`  - Browser Restart   : Every 50 logins or \${CONFIG.MAX_UPTIME_MS / 3600000}h\`);
console.log(\`  - Frame Timeout     : \${CONFIG.FRAME_OPERATION_TIMEOUT / 1000}s\`);
console.log(\`  - Heartbeat         : Every \${CONFIG.HEARTBEAT_INTERVAL / 60000}m\`);
console.log('==========================================');
console.log('');

if (!CONFIG.CHROMIUM_PATH) {
  console.log('[WARN] System Chromium not found - will try Puppeteer bundled at runtime');
  console.log('[INFO] To install system Chromium: apt install chromium-browser');
} else if (!fs.existsSync(CONFIG.CHROMIUM_PATH)) {
  console.log(\`[WARN] Chromium path invalid: \${CONFIG.CHROMIUM_PATH} - will try fallback\`);
} else {
  console.log(\`[OK] Primary Chromium: \${CONFIG.CHROMIUM_PATH}\`);
}
console.log('[OK] Fallback: Puppeteer bundled Chromium available');
console.log('');

// === GLOBAL STATE ===
let browser = null;
let page = null;
let isIdle = true;
let lastScrapeTime = 0;
let currentIntervalMs = 600000;
let isBurstMode = false;
let burstEndTime = 0;
let browserStartTime = null;
let scrapeCount = 0;
let lastError = null;
let errorCount = 0;
let successCount = 0;
let heartbeatInterval = null;

// v4.1.0: Login cooldown tracking - BCA limits login to once per 5 minutes
let lastLoginTime = 0;
let isLoggedIn = false;
const LOGIN_COOLDOWN_MS = 300000; // 5 minutes in milliseconds

// v4.1.2: Track logout success to skip cooldown after clean logout
let lastLogoutSuccess = false;

// === HELPERS ===
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min + 1)) + min);
const log = (msg, level = 'INFO') => console.log(\`[\${new Date().toISOString()}] [\${level}] \${msg}\`);

// === ERROR CATEGORIES ===
const ERROR_TYPES = {
  LOGIN_FAILED: 'LOGIN_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  FRAME_NOT_FOUND: 'FRAME_NOT_FOUND',
  NAVIGATION_TIMEOUT: 'NAVIGATION_TIMEOUT',
  OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
  BROWSER_CRASHED: 'BROWSER_CRASHED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
};

function categorizeError(error) {
  const msg = (error.message || '').toLowerCase();
  
  if (msg.includes('login') || msg.includes('credential') || msg.includes('still on login')) {
    return ERROR_TYPES.LOGIN_FAILED;
  }
  if (msg.includes('session') || msg.includes('expired') || msg.includes('timeout')) {
    return ERROR_TYPES.SESSION_EXPIRED;
  }
  if (msg.includes('frame') || msg.includes('not found')) {
    return ERROR_TYPES.FRAME_NOT_FOUND;
  }
  if (msg.includes('navigation') || msg.includes('goto')) {
    return ERROR_TYPES.NAVIGATION_TIMEOUT;
  }
  if (msg.includes('timeout')) {
    return ERROR_TYPES.OPERATION_TIMEOUT;
  }
  if (msg.includes('browser') || msg.includes('crash') || msg.includes('target closed')) {
    return ERROR_TYPES.BROWSER_CRASHED;
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
    return ERROR_TYPES.NETWORK_ERROR;
  }
  
  return ERROR_TYPES.UNKNOWN;
}

async function saveDebug(page, name, type = 'png') {
  if (!CONFIG.DEBUG_MODE) return;
  try {
    if (type === 'png') {
      await page.screenshot({ path: \`debug-\${name}.png\`, fullPage: true });
      log(\`Screenshot: debug-\${name}.png\`);
    } else {
      const html = await page.content();
      fs.writeFileSync(\`debug-\${name}.html\`, html);
      log(\`HTML saved: debug-\${name}.html\`);
    }
  } catch (e) {
    log(\`Debug save failed: \${e.message}\`, 'WARN');
  }
}

// ============ ULTRA-ROBUST HELPERS ============

async function safeFrameOperation(operation, timeoutMs = CONFIG.FRAME_OPERATION_TIMEOUT, operationName = 'operation') {
  try {
    const opPromise = operation();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(\`\${operationName}_TIMEOUT\`)), timeoutMs)
    );
    return await Promise.race([opPromise, timeoutPromise]);
  } catch (e) {
    log(\`\${operationName} failed: \${e.message}\`, 'WARN');
    throw e;
  }
}

async function retryWithBackoff(fn, maxRetries = 3, operationName = 'operation') {
  const delays = [5000, 15000, 45000];
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      log(\`\${operationName} failed (attempt \${attempt}/\${maxRetries}): \${e.message}\`, 'WARN');
      
      if (attempt < maxRetries) {
        const delayMs = delays[attempt - 1] || 30000;
        log(\`Retrying \${operationName} in \${delayMs / 1000}s...\`);
        await delay(delayMs);
      } else {
        throw e;
      }
    }
  }
}

async function isPageHealthy() {
  if (!page) return false;
  
  try {
    const result = await Promise.race([
      page.evaluate(() => document.readyState),
      new Promise((_, reject) => setTimeout(() => reject(new Error('health_check_timeout')), 5000))
    ]);
    return result === 'complete' || result === 'interactive';
  } catch (e) {
    log(\`Page health check failed: \${e.message}\`, 'WARN');
    return false;
  }
}

async function waitForFrames(targetCount, maxWait = 15000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    const frames = page.frames();
    if (frames.length >= targetCount) {
      log(\`Frames ready: \${frames.length}/\${targetCount}\`);
      return true;
    }
    await delay(500);
  }
  const finalCount = page.frames().length;
  log(\`Timeout waiting for \${targetCount} frames, got \${finalCount}\`, 'WARN');
  return false;
}

async function checkSessionExpired() {
  if (!page) return true;
  
  try {
    const content = await safeFrameOperation(
      () => page.content(), 
      5000, 
      'GET_PAGE_CONTENT'
    );
    
    const expiredIndicators = [
      'session expired', 'sesi berakhir', 'login again', 
      'silakan login', 'waktu habis', 'session timeout',
      'your session has expired', 'please login again'
    ];
    
    const contentLower = content.toLowerCase();
    for (const indicator of expiredIndicators) {
      if (contentLower.includes(indicator)) {
        log(\`Session expired detected: "\${indicator}"\`, 'WARN');
        return true;
      }
    }
    
    return false;
  } catch (e) {
    log(\`Session check failed: \${e.message}\`, 'WARN');
    return true;
  }
}

// v4.1.0: Skip restart during burst mode
function shouldRestartBrowser() {
  if (!browserStartTime) return true;
  
  // v4.1.0: NEVER restart during burst mode
  if (isBurstMode) {
    log('Skipping browser restart check - burst mode active');
    return false;
  }
  
  const uptime = Date.now() - browserStartTime;
  
  // v4.1.0: Increase limit to 50 for burst-heavy usage
  const effectiveLimit = 50;
  if (scrapeCount >= effectiveLimit) {
    log(\`Browser restart needed: \${scrapeCount} scrapes reached limit (\${effectiveLimit})\`);
    return true;
  }
  
  if (uptime >= CONFIG.MAX_UPTIME_MS) {
    log(\`Browser restart needed: \${(uptime / 3600000).toFixed(1)}h uptime exceeded limit (\${CONFIG.MAX_UPTIME_MS / 3600000}h)\`);
    return true;
  }
  
  return false;
}

async function forceKillAndRestart() {
  log('=== FORCE KILL & RESTART ===', 'WARN');
  
  if (browser) {
    try {
      await Promise.race([
        browser.close(),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      log('Browser closed gracefully');
    } catch (e) {
      log(\`Graceful close failed: \${e.message}\`, 'WARN');
    }
  }
  
  try {
    execSync('pkill -9 -f chromium 2>/dev/null || true', { stdio: 'ignore' });
    execSync('pkill -9 -f puppeteer 2>/dev/null || true', { stdio: 'ignore' });
    execSync('pkill -9 -f "chrome.*type=renderer" 2>/dev/null || true', { stdio: 'ignore' });
    log('Force killed all browser processes');
  } catch (e) {}
  
  browser = null;
  page = null;
  
  await delay(5000);
  
  await initBrowser();
  scrapeCount = 0;
  isLoggedIn = false; // Reset login state after restart
  
  log('=== FORCE KILL COMPLETE, BROWSER RESTARTED ===');
}

async function sendHeartbeat(status = 'running') {
  try {
    const uptimeMinutes = browserStartTime ? Math.round((Date.now() - browserStartTime) / 60000) : 0;
    const loginCooldownRemaining = Math.round(getLoginCooldownRemaining() / 1000);
    
    const payload = {
      secret_key: CONFIG.SECRET_KEY,
      version: SCRAPER_VERSION,
      status,
      uptime_minutes: uptimeMinutes,
      scrape_count: scrapeCount,
      success_count: successCount,
      error_count: errorCount,
      last_error: lastError,
      is_idle: isIdle,
      is_burst_mode: isBurstMode,
      is_logged_in: isLoggedIn,
      login_cooldown_remaining: loginCooldownRemaining,
      last_login_at: lastLoginTime > 0 ? new Date(lastLoginTime).toISOString() : null,
      timestamp: new Date().toISOString(),
    };
    
    await fetch(HEARTBEAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    log(\`Heartbeat sent: status=\${status}, uptime=\${uptimeMinutes}m, logins=\${scrapeCount}, cooldown=\${loginCooldownRemaining}s\`);
  } catch (e) {
    log(\`Heartbeat failed: \${e.message}\`, 'WARN');
  }
}

// === BROWSER MANAGEMENT ===

async function initBrowser() {
  log('Initializing browser...');
  
  if (browser) {
    try {
      await browser.close();
      log('Previous browser closed');
    } catch (e) {
      log(\`Error closing previous browser: \${e.message}\`, 'WARN');
    }
  }
  
  try {
    execSync('pkill -f "chromium.*puppeteer" 2>/dev/null || true', { stdio: 'ignore' });
    log('Cleaned up orphan Chromium processes');
  } catch (e) {}
  
  await delay(2000);
  
  browser = await launchBrowserWithFallback();
  
  page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  page.setDefaultTimeout(CONFIG.TIMEOUT);
  page.setDefaultNavigationTimeout(CONFIG.TIMEOUT);
  
  await page.goto('about:blank');
  
  browserStartTime = Date.now();
  isIdle = true;
  
  log('Browser initialized and ready (standby mode)');
  return true;
}

async function watchdog() {
  if (!browser || !page) {
    log('Watchdog: Browser not initialized, restarting...', 'WARN');
    await forceKillAndRestart();
    return;
  }
  
  try {
    const result = await Promise.race([
      page.evaluate(() => true),
      new Promise((_, reject) => setTimeout(() => reject(new Error('watchdog_timeout')), 10000))
    ]);
    
    if (result === true) {
      const uptime = Math.round((Date.now() - browserStartTime) / 60000);
      log(\`Watchdog: Browser healthy (uptime: \${uptime}m, scrapes: \${scrapeCount}, errors: \${errorCount})\`);
      
      if (shouldRestartBrowser()) {
        log('Watchdog: Scheduled browser restart...');
        await forceKillAndRestart();
      }
    }
  } catch (e) {
    log(\`Watchdog: Browser unresponsive (\${e.message}), force restarting...\`, 'WARN');
    await forceKillAndRestart();
  }
}

/**
 * Safe logout with multiple fallback methods
 * v4.1.1: Fixed logout using correct BCA selector and goToPage() function
 */
async function safeLogout() {
  if (!page) return;
  
  log('Attempting safe logout...');
  let loggedOut = false;
  isLoggedIn = false; // Mark as logged out
  
  // Method 1: Try clicking via Puppeteer frame API (most reliable)
  try {
    const frames = page.frames();
    
    for (const frame of frames) {
      try {
        // v4.1.1: Use exact BCA selector - #gotohome > font > b > a
        const logoutLink = await frame.$('#gotohome > font > b > a');
        if (logoutLink) {
          await logoutLink.click();
          log('Logout via #gotohome selector - SUCCESS');
          loggedOut = true;
          break;
        }
        
        // Fallback: Find by onclick attribute containing 'logout'
        const logoutByOnclick = await frame.$('a[onclick*="logout"]');
        if (logoutByOnclick) {
          await logoutByOnclick.click();
          log('Logout via onclick attribute - SUCCESS');
          loggedOut = true;
          break;
        }
        
        // Fallback: Find by text content containing LOGOUT
        const logoutByText = await frame.$('a:has-text("LOGOUT")');
        if (logoutByText) {
          await logoutByText.click();
          log('Logout via text content - SUCCESS');
          loggedOut = true;
          break;
        }
      } catch (frameErr) {
        // Continue to next frame
      }
    }
  } catch (e) {
    log(\`Frame-based logout failed: \${e.message}\`, 'WARN');
  }
  
  // Method 2: Execute goToPage() JavaScript function directly
  if (!loggedOut) {
    try {
      await safeFrameOperation(
        () => page.evaluate(() => {
          // v4.1.1: BCA uses goToPage function for logout
          if (typeof goToPage === 'function') {
            goToPage('authentication.do?value(actions)=logout');
            return true;
          }
          
          // Also try on all frames
          const frames = document.querySelectorAll('iframe');
          for (const frame of frames) {
            try {
              const frameWin = frame.contentWindow;
              if (frameWin && typeof frameWin.goToPage === 'function') {
                frameWin.goToPage('authentication.do?value(actions)=logout');
                return true;
              }
            } catch (e) {}
          }
          
          return false;
        }),
        5000,
        'LOGOUT_GOOTOPAGE'
      );
      log('Logout via goToPage() execution - SUCCESS');
      loggedOut = true;
    } catch (e) {
      log(\`goToPage() execution failed: \${e.message}\`, 'WARN');
    }
  }
  
  // Method 3: Click using page.evaluate with exact selector
  if (!loggedOut) {
    try {
      const clicked = await safeFrameOperation(
        () => page.evaluate(() => {
          // Try exact selector first
          const logoutEl = document.querySelector('#gotohome > font > b > a');
          if (logoutEl) {
            logoutEl.click();
            return 'gotohome_selector';
          }
          
          // Try any link with LOGOUT text
          const links = document.querySelectorAll('a');
          for (const link of links) {
            if (link.textContent && link.textContent.includes('LOGOUT')) {
              link.click();
              return 'logout_text';
            }
          }
          
          // Check iframes
          const frames = document.querySelectorAll('iframe');
          for (const frame of frames) {
            try {
              const frameDoc = frame.contentDocument || frame.contentWindow?.document;
              if (frameDoc) {
                const frameLogout = frameDoc.querySelector('#gotohome > font > b > a');
                if (frameLogout) {
                  frameLogout.click();
                  return 'iframe_gotohome';
                }
                
                const frameLinks = frameDoc.querySelectorAll('a');
                for (const link of frameLinks) {
                  if (link.textContent && link.textContent.includes('LOGOUT')) {
                    link.click();
                    return 'iframe_logout_text';
                  }
                }
              }
            } catch (e) {}
          }
          
          return null;
        }),
        5000,
        'LOGOUT_CLICK'
      );
      
      if (clicked) {
        log(\`Logout via evaluate click (\${clicked}) - SUCCESS\`);
        loggedOut = true;
      }
    } catch (e) {
      log(\`Evaluate click failed: \${e.message}\`, 'WARN');
    }
  }
  
  // Method 4: Direct URL with action parameter (last resort)
  if (!loggedOut) {
    try {
      await Promise.race([
        page.goto('https://ibank.klikbca.com/authentication.do?value(actions)=logout', { 
          timeout: 5000,
          waitUntil: 'domcontentloaded' 
        }),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      log('Logout via authentication.do URL - FALLBACK');
    } catch (e) {
      log('Direct logout URL failed, session may persist', 'WARN');
    }
  }
  
  await delay(2000);
  isLoggedIn = false;
  
  // v4.1.2: Track logout success to skip cooldown on next login
  if (loggedOut) {
    lastLogoutSuccess = true;
    lastLoginTime = 0; // Reset cooldown timer
    log('Safe logout completed - cooldown RESET (next login can proceed immediately)');
  } else {
    lastLogoutSuccess = false;
    log('Safe logout completed (no explicit logout clicked, keeping cooldown active)', 'WARN');
  }
}

async function refreshToCleanState() {
  log('Refreshing page to clear session...');
  
  try {
    await safeLogout();
    
    await retryWithBackoff(
      async () => {
        await page.goto('https://ibank.klikbca.com/', { 
          waitUntil: 'networkidle2', 
          timeout: CONFIG.TIMEOUT 
        });
      },
      3,
      'NAVIGATE_TO_LOGIN'
    );
    
    await delay(2000);
    log('Page refreshed - clean state ready');
    return true;
  } catch (e) {
    log(\`Refresh failed: \${e.message}\`, 'ERROR');
    await forceKillAndRestart();
    await page.goto('https://ibank.klikbca.com/', { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.TIMEOUT 
    });
    return true;
  }
}

// === LOGIN HELPERS ===

async function findLoginFrame() {
  const frames = page.frames();
  log(\`Total frames on page: \${frames.length}\`);
  
  const loginSelectors = [
    'input#txt_user_id',
    'input[name="txt_user_id"]',
    'input[name="value(user_id)"]',
    'input[name="user_id"]',
    'input#user_id'
  ];
  
  for (const selector of loginSelectors) {
    try {
      const mainInput = await page.\$(selector);
      if (mainInput) {
        log(\`Login form found in MAIN PAGE with "\${selector}"\`);
        return { frame: page, isMainPage: true };
      }
    } catch (e) {}
  }
  
  for (const selector of loginSelectors) {
    for (const frame of frames) {
      try {
        const input = await frame.\$(selector);
        if (input) {
          log(\`Login form found with "\${selector}" in FRAME: \${frame.url()}\`);
          return { frame, isMainPage: false };
        }
      } catch (e) {}
    }
  }
  
  return null;
}

async function enterCredentials(frame, userId, pin) {
  log('Entering credentials...');
  
  try {
    const userIdInput = await frame.\$('input#txt_user_id') || 
                        await frame.\$('input[name="txt_user_id"]') ||
                        await frame.\$('input[name="value(user_id)"]');
    
    const pinInput = await frame.\$('input#txt_pswd') || 
                     await frame.\$('input[name="txt_pswd"]') ||
                     await frame.\$('input[type="password"]') ||
                     await frame.\$('input[name="value(pswd)"]');
    
    if (userIdInput && pinInput) {
      await userIdInput.focus();
      await randomDelay(200, 400);
      await frame.evaluate(el => { el.value = ''; }, userIdInput);
      await userIdInput.type(userId, { delay: 80 });
      log('User ID entered');
      
      await randomDelay(300, 500);
      await pinInput.focus();
      await randomDelay(200, 400);
      await frame.evaluate(el => { el.value = ''; }, pinInput);
      await pinInput.type(pin, { delay: 80 });
      log('PIN entered');
      
      return true;
    }
  } catch (e) {
    log(\`Enter credentials failed: \${e.message}\`, 'WARN');
  }
  
  return false;
}

async function submitLogin(frame) {
  log('Submitting login...');
  
  try {
    const submitBtn = await frame.\$('input[value="LOGIN"]') ||
                      await frame.\$('input[type="submit"]') ||
                      await frame.\$('input[name="value(Submit)"]');
    
    if (submitBtn) {
      await submitBtn.click();
      log('LOGIN button clicked');
      await delay(3000);
      return true;
    }
  } catch (e) {
    log(\`Submit failed: \${e.message}\`, 'WARN');
  }
  
  return false;
}

// === v4.1.0: SESSION REUSE WITH LOGIN COOLDOWN ===

async function isCurrentlyLoggedIn() {
  if (!page) return false;
  
  try {
    const frameCount = page.frames().length;
    if (frameCount < 5) {
      log(\`Not logged in: only \${frameCount} frames (need 5)\`);
      return false;
    }
    
    const loginFrame = await findLoginFrame();
    if (loginFrame) {
      log('Not logged in: login form visible');
      return false;
    }
    
    if (await checkSessionExpired()) {
      log('Not logged in: session expired');
      return false;
    }
    
    log(\`Session active: \${frameCount} frames, no login form visible\`);
    return true;
  } catch (e) {
    log(\`Login check failed: \${e.message}\`, 'WARN');
    return false;
  }
}

function getLoginCooldownRemaining() {
  const timeSinceLastLogin = Date.now() - lastLoginTime;
  const remaining = LOGIN_COOLDOWN_MS - timeSinceLastLogin;
  return remaining > 0 ? remaining : 0;
}

async function ensureLoggedIn() {
  if (await isCurrentlyLoggedIn()) {
    log('Session still active, reusing existing session');
    isLoggedIn = true;
    return true;
  }
  
  // v4.1.2: Skip cooldown if last logout was successful
  const cooldownRemaining = getLoginCooldownRemaining();
  if (cooldownRemaining > 0) {
    if (lastLogoutSuccess) {
      log(\`Cooldown skipped - previous logout was successful (\${(cooldownRemaining / 1000).toFixed(0)}s remaining but ignored)\`);
    } else {
      log(\`Login cooldown active: waiting \${(cooldownRemaining / 1000).toFixed(0)}s (last logout may have failed)\`, 'WARN');
      await delay(cooldownRemaining);
    }
  }
  
  // Reset logout success flag before new login attempt
  lastLogoutSuccess = false;
  
  log('Performing fresh login...');
  
  try {
    await page.goto('https://ibank.klikbca.com/', { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.TIMEOUT 
    });
    await delay(2000);
  } catch (e) {
    log(\`Navigation to login failed: \${e.message}\`, 'ERROR');
    return false;
  }
  
  const frameResult = await retryWithBackoff(
    () => findLoginFrame(),
    3,
    'FIND_LOGIN_FRAME_ENSURE'
  );
  
  if (!frameResult) {
    if (await isCurrentlyLoggedIn()) {
      log('Already logged in after navigation');
      lastLoginTime = Date.now();
      isLoggedIn = true;
      scrapeCount++;
      return true;
    }
    throw new Error('Could not find login form');
  }
  
  await enterCredentials(frameResult.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
  await submitLogin(frameResult.frame);
  
  log('Waiting for page to fully load after login...');
  let framesLoaded = await waitForFrames(5, 15000);
  
  if (!framesLoaded) {
    const loginFrame = await findLoginFrame();
    if (loginFrame) {
      log('Still on login page, one more attempt...');
      await enterCredentials(loginFrame.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
      await submitLogin(loginFrame.frame);
      framesLoaded = await waitForFrames(5, 15000);
    }
  }
  
  const finalFrameCount = page.frames().length;
  if (finalFrameCount < 5) {
    const finalLoginCheck = await findLoginFrame();
    if (finalLoginCheck) {
      throw new Error('LOGIN_FAILED - still on login page after retry');
    }
  }
  
  if (await checkSessionExpired()) {
    throw new Error('SESSION_EXPIRED - detected after login');
  }
  
  lastLoginTime = Date.now();
  isLoggedIn = true;
  scrapeCount++;
  
  log(\`LOGIN SUCCESSFUL! (\${finalFrameCount} frames loaded, cooldown reset)\`);
  return true;
}

async function executeScrapeWithTimeout() {
  const scrapePromise = executeScrape();
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('GLOBAL_SCRAPE_TIMEOUT')), CONFIG.GLOBAL_SCRAPE_TIMEOUT)
  );
  
  try {
    return await Promise.race([scrapePromise, timeoutPromise]);
  } catch (e) {
    log(\`Global timeout exceeded (\${CONFIG.GLOBAL_SCRAPE_TIMEOUT / 1000}s)! Force restarting browser...\`, 'ERROR');
    lastError = 'GLOBAL_TIMEOUT';
    errorCount++;
    await forceKillAndRestart();
    return { success: false, error: 'GLOBAL_TIMEOUT' };
  }
}

async function executeScrape() {
  if (!isIdle) {
    log('Scraper busy, skipping...', 'WARN');
    return { success: false, reason: 'busy' };
  }
  
  isIdle = false;
  scrapeCount++;
  const startTime = Date.now();
  let mutations = [];
  
  log(\`=== STARTING SCRAPE #\${scrapeCount} (NORMAL MODE) ===\`);
  
  try {
    if (!await isPageHealthy()) {
      log('Page unhealthy before scrape, restarting browser...', 'WARN');
      await forceKillAndRestart();
    }
    
    await refreshToCleanState();
    await saveDebug(page, '01-login-page');
    
    const frameResult = await retryWithBackoff(
      () => findLoginFrame(),
      3,
      'FIND_LOGIN_FRAME'
    );
    
    if (!frameResult) {
      throw new Error('Could not find login form after 3 attempts');
    }
    
    const { frame, isMainPage } = frameResult;
    log(\`Using \${isMainPage ? 'main page' : 'iframe'} for login\`);
    
    const credentialsEntered = await retryWithBackoff(
      () => enterCredentials(frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN),
      2,
      'ENTER_CREDENTIALS'
    );
    
    if (!credentialsEntered) {
      throw new Error('Failed to enter credentials after retries');
    }
    
    await saveDebug(page, '02-credentials-entered');
    
    await submitLogin(frame);
    await delay(3000);
    
    let loginFrame = await findLoginFrame();
    if (loginFrame) {
      log('Still on login page, trying again...');
      await enterCredentials(loginFrame.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
      await submitLogin(loginFrame.frame);
      await delay(3000);
    }
    
    const finalLoginCheck = await findLoginFrame();
    if (finalLoginCheck) {
      throw new Error('LOGIN_FAILED - still on login page');
    }
    
    if (await checkSessionExpired()) {
      throw new Error('SESSION_EXPIRED - detected after login attempt');
    }
    
    log('LOGIN SUCCESSFUL!');
    await saveDebug(page, '03-logged-in');
    
    await delay(2000);
    
    const menuFrame = page.frames().find(f => f.name() === 'menu');
    if (!menuFrame) {
      throw new Error('FRAME_NOT_FOUND - Menu frame');
    }
    
    await safeFrameOperation(
      () => menuFrame.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          const text = (link.textContent || '').toLowerCase();
          if (text.includes('informasi rekening') || text.includes('account information')) {
            link.click();
            return true;
          }
        }
        return false;
      }),
      CONFIG.FRAME_OPERATION_TIMEOUT,
      'CLICK_INFORMASI_REKENING'
    );
    await delay(3000);
    
    const updatedMenuFrame = page.frames().find(f => f.name() === 'menu');
    await safeFrameOperation(
      () => updatedMenuFrame.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          const text = (link.textContent || '').toLowerCase();
          if (text.includes('mutasi rekening') || text.includes('account statement')) {
            link.click();
            return true;
          }
        }
        return false;
      }),
      CONFIG.FRAME_OPERATION_TIMEOUT,
      'CLICK_MUTASI_REKENING'
    );
    await delay(3000);
    
    let atmFrame = page.frames().find(f => f.name() === 'atm');
    if (!atmFrame) {
      throw new Error('FRAME_NOT_FOUND - ATM frame');
    }
    
    const today = getJakartaDate();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    const currentYear = today.getFullYear();
    
    log(\`Setting date: \${day}/\${month}/\${currentYear} (Jakarta: \${getJakartaDateString()})\`);
    
    await safeFrameOperation(
      () => atmFrame.evaluate((day, month) => {
        const selectors = [
          { start: 'select[name="value(startDt)"]', startMt: 'select[name="value(startMt)"]', end: 'select[name="value(endDt)"]', endMt: 'select[name="value(endMt)"]' },
          { start: 'select[name="startDt"]', startMt: 'select[name="startMt"]', end: 'select[name="endDt"]', endMt: 'select[name="endMt"]' }
        ];
        
        for (const sel of selectors) {
          const startDt = document.querySelector(sel.start);
          const startMt = document.querySelector(sel.startMt);
          const endDt = document.querySelector(sel.end);
          const endMt = document.querySelector(sel.endMt);
          
          if (startDt && startMt && endDt && endMt) {
            startDt.value = day;
            startMt.value = month;
            endDt.value = day;
            endMt.value = month;
            return true;
          }
        }
        return false;
      }, day, month),
      CONFIG.FRAME_OPERATION_TIMEOUT,
      'SET_DATE'
    );
    
    await safeFrameOperation(
      () => atmFrame.evaluate(() => {
        const buttons = document.querySelectorAll('input[type="submit"], input[value*="Lihat"], input[value*="View"]');
        for (const btn of buttons) {
          if (btn.value.toLowerCase().includes('lihat') || btn.value.toLowerCase().includes('view') || btn.type === 'submit') {
            btn.click();
            return { success: true };
          }
        }
        return { success: false };
      }),
      CONFIG.FRAME_OPERATION_TIMEOUT,
      'CLICK_LIHAT'
    );
    await delay(3000);
    
    atmFrame = page.frames().find(f => f.name() === 'atm');
    await saveDebug(page, '04-mutations-result');
    
    const parseResult = await safeFrameOperation(
      () => atmFrame.evaluate((year) => {
        const results = [];
        const seen = new Set();
        const tables = document.querySelectorAll('table');
        
        for (const table of tables) {
          const rows = table.querySelectorAll('tr');
          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length > 10) continue;
            
            if (cells.length >= 4) {
              const firstCell = (cells[0]?.innerText || '').trim();
              const firstCellUpper = firstCell.toUpperCase();
              
              const dateMatch = firstCell.match(/^(\\d{1,2})\\/(\\d{1,2})/);
              const isPending = firstCellUpper.includes('PEND');
              
              if (dateMatch || isPending) {
                let date;
                if (isPending) {
                  const now = new Date();
                  const day = String(now.getDate()).padStart(2, '0');
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  date = \`\${year}-\${month}-\${day}\`;
                } else {
                  const day = dateMatch[1].padStart(2, '0');
                  const month = dateMatch[2].padStart(2, '0');
                  date = \`\${year}-\${month}-\${day}\`;
                }
                
                const description = cells[1]?.innerText?.trim() || '';
                const mutasiCell = cells[3]?.innerText?.trim() || '';
                
                let type = 'credit';
                const descUpper = description.toUpperCase();
                if (descUpper.includes(' DB') || descUpper.includes('/DB') || mutasiCell.toUpperCase().includes('DB')) {
                  type = 'debit';
                }
                
                if (type === 'debit') continue;
                
                const cleanedAmount = mutasiCell.replace(/,/g, '').replace(/[^0-9.]/g, '');
                const amount = parseFloat(cleanedAmount);
                
                if (amount > 0) {
                  const dedupKey = \`\${date}-\${Math.round(amount)}-\${description.substring(0, 30)}\`;
                  if (seen.has(dedupKey)) continue;
                  seen.add(dedupKey);
                  
                  results.push({ date, amount: Math.round(amount), type, description });
                }
              }
            }
          }
        }
        
        return results;
      }, currentYear),
      CONFIG.FRAME_OPERATION_TIMEOUT,
      'PARSE_MUTATIONS'
    );
    
    mutations = parseResult || [];
    log(\`Found \${mutations.length} credit mutations\`);
    
    await safeLogout();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(\`=== SCRAPE COMPLETED in \${duration}s ===\`);
    
    successCount++;
    lastError = null;
    
    return { success: true, mutations, duration };
    
  } catch (error) {
    const errorType = categorizeError(error);
    log(\`Scrape error [\${errorType}]: \${error.message}\`, 'ERROR');
    lastError = \`\${errorType}: \${error.message}\`;
    errorCount++;
    
    await saveDebug(page, 'error-state');
    await safeLogout();
    
    await forceKillAndRestart();
    
    return { success: false, error: error.message, errorType };
  } finally {
    isIdle = true;
    lastScrapeTime = Date.now();
  }
}

async function executeBurstScrapeWithTimeout() {
  const scrapePromise = executeBurstScrape();
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('BURST_GLOBAL_TIMEOUT')), CONFIG.GLOBAL_SCRAPE_TIMEOUT * 2)
  );
  
  try {
    return await Promise.race([scrapePromise, timeoutPromise]);
  } catch (e) {
    log(\`Burst global timeout! Force restarting browser...\`, 'ERROR');
    lastError = 'BURST_GLOBAL_TIMEOUT';
    errorCount++;
    await forceKillAndRestart();
    return { success: false, error: 'BURST_GLOBAL_TIMEOUT' };
  }
}

async function executeBurstScrape() {
  if (!isIdle) {
    log('Scraper busy, skipping burst...', 'WARN');
    return { success: false, reason: 'busy' };
  }
  
  isIdle = false;
  const startTime = Date.now();
  
  const maxIterations = 24;
  const maxDuration = 150000;
  let checkCount = 0;
  let matchFound = false;
  
  log(\`=== STARTING BURST MODE ===\`);
  log(\`Session reuse: \${isLoggedIn ? 'checking...' : 'need login'}\`);
  log(\`Last login: \${lastLoginTime > 0 ? ((Date.now() - lastLoginTime) / 1000).toFixed(0) + 's ago' : 'never'}\`);
  log(\`Cooldown remaining: \${(getLoginCooldownRemaining() / 1000).toFixed(0)}s\`);
  
  try {
    if (!await isPageHealthy()) {
      log('Page unhealthy before burst, restarting browser...', 'WARN');
      await forceKillAndRestart();
      isLoggedIn = false;
    }
    
    const loginSuccess = await ensureLoggedIn();
    if (!loginSuccess) {
      throw new Error('Failed to ensure login state');
    }
    
    await delay(1000);
    
    let atmFrame = page.frames().find(f => f.name() === 'atm');
    const alreadyOnMutasi = atmFrame && await safeFrameOperation(
      () => atmFrame.evaluate(() => {
        const buttons = document.querySelectorAll('input[type="submit"]');
        for (const btn of buttons) {
          if (btn.value.toLowerCase().includes('lihat')) return true;
        }
        return false;
      }),
      3000,
      'CHECK_MUTASI_PAGE'
    ).catch(() => false);
    
    if (!alreadyOnMutasi) {
      log('Navigating to Mutasi Rekening...');
      
      const menuFrame = page.frames().find(f => f.name() === 'menu');
      if (!menuFrame) throw new Error('FRAME_NOT_FOUND - Menu frame');
      
      await safeFrameOperation(
        () => menuFrame.evaluate(() => {
          const links = document.querySelectorAll('a');
          for (const link of links) {
            const text = (link.textContent || '').toLowerCase();
            if (text.includes('informasi rekening')) { link.click(); return; }
          }
        }),
        CONFIG.FRAME_OPERATION_TIMEOUT,
        'CLICK_INFORMASI_REKENING_BURST'
      );
      await delay(3000);
      
      const updatedMenuFrame = page.frames().find(f => f.name() === 'menu');
      await safeFrameOperation(
        () => updatedMenuFrame.evaluate(() => {
          const links = document.querySelectorAll('a');
          for (const link of links) {
            const text = (link.textContent || '').toLowerCase();
            if (text.includes('mutasi rekening')) { link.click(); return; }
          }
        }),
        CONFIG.FRAME_OPERATION_TIMEOUT,
        'CLICK_MUTASI_REKENING_BURST'
      );
      await delay(3000);
    } else {
      log('Already on Mutasi page, reusing navigation');
    }
    
    atmFrame = page.frames().find(f => f.name() === 'atm');
    if (!atmFrame) throw new Error('FRAME_NOT_FOUND - ATM frame');
    
    const today = getJakartaDate();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    const currentYear = today.getFullYear();
    
    await safeFrameOperation(
      () => atmFrame.evaluate((day, month) => {
        const selectors = [
          { start: 'select[name="value(startDt)"]', startMt: 'select[name="value(startMt)"]', end: 'select[name="value(endDt)"]', endMt: 'select[name="value(endMt)"]' }
        ];
        for (const sel of selectors) {
          const startDt = document.querySelector(sel.start);
          const startMt = document.querySelector(sel.startMt);
          const endDt = document.querySelector(sel.end);
          const endMt = document.querySelector(sel.endMt);
          if (startDt && startMt && endDt && endMt) {
            startDt.value = day; startMt.value = month;
            endDt.value = day; endMt.value = month;
            return;
          }
        }
      }, day, month),
      CONFIG.FRAME_OPERATION_TIMEOUT,
      'SET_DATE_BURST'
    );
    
    await safeFrameOperation(
      () => atmFrame.evaluate(() => {
        const buttons = document.querySelectorAll('input[type="submit"]');
        for (const btn of buttons) {
          if (btn.value.toLowerCase().includes('lihat') || btn.type === 'submit') {
            btn.click(); return;
          }
        }
      }),
      CONFIG.FRAME_OPERATION_TIMEOUT,
      'CLICK_LIHAT_BURST'
    );
    await delay(3000);
    
    
    while (checkCount < maxIterations && (Date.now() - startTime < maxDuration)) {
      checkCount++;
      log(\`--- Burst iteration #\${checkCount} ---\`);
      
      if (await checkSessionExpired()) {
        log('Session expired during burst loop, exiting...', 'WARN');
        break;
      }
      
      atmFrame = page.frames().find(f => f.name() === 'atm');
      if (!atmFrame) {
        log('ATM frame lost during burst, exiting...', 'WARN');
        break;
      }
      
      const mutations = await safeFrameOperation(
        () => atmFrame.evaluate((year) => {
          const results = [];
          const seen = new Set();
          const tables = document.querySelectorAll('table');
          
          for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
              const cells = row.querySelectorAll('td');
              if (cells.length > 10 || cells.length < 4) continue;
              
              const firstCell = (cells[0]?.innerText || '').trim();
              const dateMatch = firstCell.match(/^(\\d{1,2})\\/(\\d{1,2})/);
              const isPending = firstCell.toUpperCase().includes('PEND');
              
              if (dateMatch || isPending) {
                let date;
                if (isPending) {
                  const now = new Date();
                  date = \`\${year}-\${String(now.getMonth()+1).padStart(2,'0')}-\${String(now.getDate()).padStart(2,'0')}\`;
                } else {
                  date = \`\${year}-\${dateMatch[2].padStart(2,'0')}-\${dateMatch[1].padStart(2,'0')}\`;
                }
                
                const description = cells[1]?.innerText?.trim() || '';
                const mutasiCell = cells[3]?.innerText?.trim() || '';
                
                if (description.toUpperCase().includes('DB') || mutasiCell.toUpperCase().includes('DB')) continue;
                
                const amount = parseFloat(mutasiCell.replace(/,/g, '').replace(/[^0-9.]/g, ''));
                if (amount > 0) {
                  const key = \`\${date}-\${Math.round(amount)}-\${description.substring(0,30)}\`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ date, amount: Math.round(amount), type: 'credit', description });
                  }
                }
              }
            }
          }
          return results;
        }, currentYear),
        CONFIG.FRAME_OPERATION_TIMEOUT,
        'PARSE_MUTATIONS_BURST'
      );
      
      log(\`Found \${mutations.length} mutations\`);
      
      if (mutations.length > 0) {
        const result = await sendToWebhook(mutations);
        log(\`Webhook result: \${JSON.stringify(result)}\`);
        
        if (result.matched && result.matched > 0) {
          log('MATCH FOUND! Payment verified.');
          matchFound = true;
          break;
        }
      }
      
      const status = await checkBurstCommand();
      if (!status.burst_active) {
        log('Burst stopped by server');
        break;
      }
      
      const kembaliClicked = await safeFrameOperation(
        () => atmFrame.evaluate(() => {
          const buttons = document.querySelectorAll('input[type="button"], input[type="submit"]');
          for (const btn of buttons) {
            if (btn.value.toLowerCase().includes('kembali') || btn.value.toLowerCase().includes('back')) {
              btn.click(); return true;
            }
          }
          return false;
        }),
        CONFIG.FRAME_OPERATION_TIMEOUT,
        'CLICK_KEMBALI'
      );
      
      if (!kembaliClicked) {
        log('Kembali button not found, exiting burst loop', 'WARN');
        break;
      }
      await delay(2000);
      
      atmFrame = page.frames().find(f => f.name() === 'atm');
      if (!atmFrame) break;
      
      await safeFrameOperation(
        () => atmFrame.evaluate(() => {
          const buttons = document.querySelectorAll('input[type="submit"]');
          for (const btn of buttons) {
            if (btn.value.toLowerCase().includes('lihat') || btn.type === 'submit') {
              btn.click(); return;
            }
          }
        }),
        CONFIG.FRAME_OPERATION_TIMEOUT,
        'CLICK_LIHAT_LOOP'
      );
      await delay(3000);
    }
    
    log(\`=== BURST LOOP ENDED (\${checkCount} iterations, match=\${matchFound}) ===\`);
    
    // v4.1.3: Keep session active during burst - don't logout between iterations
    // Session will be reused for next burst iteration or normal scrape
    log('Session kept active for potential next iteration (v4.1.3)');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(\`=== BURST COMPLETED in \${duration}s ===\`);
    
    successCount++;
    lastError = null;
    
    return { success: true, iterations: checkCount, matchFound, duration };
    
  } catch (error) {
    const errorType = categorizeError(error);
    log(\`Burst error [\${errorType}]: \${error.message}\`, 'ERROR');
    lastError = \`\${errorType}: \${error.message}\`;
    errorCount++;
    
    await safeLogout();
    isLoggedIn = false;
    await forceKillAndRestart();
    return { success: false, error: error.message, errorType };
  } finally {
    isIdle = true;
    lastScrapeTime = Date.now();
  }
}

// === API FUNCTIONS ===

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

async function checkBurstCommand() {
  if (!CONFIG.BURST_CHECK_URL) return { burst_active: false };
  
  try {
    const response = await fetch(CONFIG.BURST_CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_key: CONFIG.SECRET_KEY }),
    });
    return await response.json();
  } catch (e) {
    return { burst_active: false };
  }
}

async function sendToWebhook(mutations) {
  try {
    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret_key: CONFIG.SECRET_KEY,
        mutations,
        bank_name: 'BCA',
        account_number: CONFIG.ACCOUNT_NUMBER,
        scraped_at: new Date().toISOString(),
        scraper_version: SCRAPER_VERSION,
      }),
    });
    return await response.json();
  } catch (e) {
    log(\`Webhook error: \${e.message}\`, 'ERROR');
    return { error: e.message };
  }
}

// === MAIN LOOP ===

async function mainLoop() {
  log('=== ULTRA-ROBUST SCHEDULER STARTED ===');
  log(\`Config URL: \${CONFIG_URL}\`);
  log(\`Poll interval: \${CONFIG.CONFIG_POLL_INTERVAL / 1000}s\`);
  log(\`Watchdog interval: \${CONFIG.WATCHDOG_INTERVAL / 1000}s\`);
  log(\`Heartbeat interval: \${CONFIG.HEARTBEAT_INTERVAL / 1000}s\`);
  
  await initBrowser();
  
  setInterval(watchdog, CONFIG.WATCHDOG_INTERVAL);
  
  await sendHeartbeat('started');
  heartbeatInterval = setInterval(() => sendHeartbeat('running'), CONFIG.HEARTBEAT_INTERVAL);
  
  while (true) {
    try {
      if (!await isPageHealthy()) {
        log('Page unhealthy in main loop, restarting browser...', 'WARN');
        await forceKillAndRestart();
      }
      
      if (shouldRestartBrowser()) {
        log('Scheduled browser restart in main loop...');
        await forceKillAndRestart();
      }
      
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
          await sendHeartbeat('burst_mode');
        }
        
        await executeBurstScrapeWithTimeout();
        
        const updatedConfig = await fetchServerConfig();
        if (!updatedConfig?.burst_in_progress) {
          log('=== BURST MODE ENDED ===');
          isBurstMode = false;
          await sendHeartbeat('running');
          
          // v4.1.3: Post-burst cooldown to prevent restart loops
          log('Post-burst cooldown: waiting 10s before next poll');
          await delay(10000);
        }
        continue;
      } else {
        if (isBurstMode) {
          log('=== BURST MODE ENDED ===');
          isBurstMode = false;
          await sendHeartbeat('running');
          
          // v4.1.3: Post-burst cooldown
          log('Post-burst cooldown: waiting 10s before next poll');
          await delay(10000);
        }
      }
      
      if (config.is_active) {
        const timeSinceLastScrape = Date.now() - lastScrapeTime;
        
        if (timeSinceLastScrape >= currentIntervalMs) {
          log(\`Time to scrape (\${(timeSinceLastScrape / 60000).toFixed(1)}m since last)\`);
          
          const result = await executeScrapeWithTimeout();
          
          if (result.success && result.mutations && result.mutations.length > 0) {
            const webhookResult = await sendToWebhook(result.mutations);
            log(\`Webhook result: \${JSON.stringify(webhookResult)}\`);
          } else if (result.success) {
            log('No mutations found');
          }
        } else {
          const nextScrapeIn = ((currentIntervalMs - timeSinceLastScrape) / 60000).toFixed(1);
          log(\`Next scrape in \${nextScrapeIn}m\`);
        }
      } else {
        log('Scraper inactive (disabled in settings)');
      }
      
    } catch (error) {
      const errorType = categorizeError(error);
      log(\`Loop error [\${errorType}]: \${error.message}\`, 'ERROR');
      lastError = \`\${errorType}: \${error.message}\`;
      errorCount++;
      
      await sendHeartbeat('error');
      await forceKillAndRestart();
    }
    
    await delay(CONFIG.CONFIG_POLL_INTERVAL);
  }
}

// === GRACEFUL SHUTDOWN ===

process.on('SIGINT', async () => {
  log('Received SIGINT, shutting down...');
  await sendHeartbeat('shutdown');
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (browser) {
    await safeLogout();
    await browser.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('Received SIGTERM, shutting down...');
  await sendHeartbeat('shutdown');
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (browser) {
    await safeLogout();
    await browser.close();
  }
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  log(\`UNCAUGHT EXCEPTION: \${error.message}\`, 'ERROR');
  lastError = \`UNCAUGHT: \${error.message}\`;
  await sendHeartbeat('crash');
  await forceKillAndRestart();
});

process.on('unhandledRejection', async (reason, promise) => {
  log(\`UNHANDLED REJECTION: \${reason}\`, 'ERROR');
  lastError = \`UNHANDLED: \${reason}\`;
  await sendHeartbeat('crash');
  await forceKillAndRestart();
});

// === START ===

mainLoop().catch(async (err) => {
  log(\`Fatal error: \${err.message}\`, 'ERROR');
  await sendHeartbeat('fatal');
  process.exit(1);
});
`,

  'config.env.template': `# BCA Scraper Configuration - v4.1.0
# Copy this file to config.env and fill in your credentials

# === BCA CREDENTIALS (REQUIRED) ===
BCA_USER_ID=your_klikbca_user_id
BCA_PIN=your_klikbca_pin
BCA_ACCOUNT_NUMBER=1234567890

# === WEBHOOK SETTINGS (REQUIRED) ===
WEBHOOK_URL=https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook
SECRET_KEY=your_secret_key_from_admin

# === BROWSER SETTINGS ===
HEADLESS=true
DEBUG_MODE=false
TIMEOUT=90000

# === PERFORMANCE SETTINGS ===
# Chromium path (auto-detected if not set)
# CHROMIUM_PATH=/usr/bin/chromium-browser
`,

  'run.sh': `#!/bin/bash
# BCA Scraper Runner - v4.1.0

cd "$(dirname "$0")"

case "\${1:-normal}" in
  normal)
    echo "Starting BCA Scraper v4.1.0 (Session Reuse Mode)..."
    node bca-scraper.js
    ;;
  burst-check)
    echo "Checking burst status..."
    node -e "
      const config = require('dotenv').config({ path: './config.env' });
      fetch(process.env.WEBHOOK_URL.replace('/bank-scraper-webhook', '/check-burst-command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_key: process.env.SECRET_KEY })
      }).then(r => r.json()).then(console.log);
    "
    ;;
  daemon)
    echo "Starting as daemon..."
    nohup node bca-scraper.js > scraper.log 2>&1 &
    echo "PID: \$!"
    ;;
  *)
    echo "Usage: ./run.sh [normal|burst-check|daemon]"
    ;;
esac
`,

  'install.sh': `#!/bin/bash
# BCA Scraper Installer - v4.1.0

set -e

echo "==================================="
echo "  BCA Scraper Installer v4.1.0"
echo "  Session Reuse Mode"
echo "==================================="

# Check if running as root
if [ "\$(id -u)" != "0" ]; then
   echo "Please run as root (sudo ./install.sh)"
   exit 1
fi

# Update system
echo "[1/5] Updating system..."
apt-get update -y

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "[2/5] Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "[2/5] Node.js already installed: \$(node -v)"
fi

# Install Chromium
echo "[3/5] Installing Chromium..."
apt-get install -y chromium-browser || apt-get install -y chromium

# Install dependencies
echo "[4/5] Installing npm dependencies..."
npm install puppeteer

# Set permissions
echo "[5/5] Setting permissions..."
chmod +x run.sh install-service.sh 2>/dev/null || true

echo ""
echo "==================================="
echo "  Installation Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Copy config.env.template to config.env"
echo "2. Fill in your BCA credentials and secret key"
echo "3. Run: ./run.sh"
echo "   Or install as service: ./install-service.sh"
echo ""
`,

  'install-service.sh': `#!/bin/bash
# BCA Scraper Service Installer - v4.1.0

set -e

SERVICE_NAME="bca-scraper"
SCRIPT_DIR="\$(cd "\$(dirname "\$0")" && pwd)"
USER="\$(whoami)"

echo "Installing \$SERVICE_NAME as systemd service..."
echo "Directory: \$SCRIPT_DIR"
echo "User: \$USER"

# Create service file
cat > /etc/systemd/system/\$SERVICE_NAME.service << EOF
[Unit]
Description=BCA iBanking Scraper v4.1.0 - Session Reuse Mode
After=network.target

[Service]
Type=simple
User=\$USER
WorkingDirectory=\$SCRIPT_DIR
Environment=NODE_ENV=production
ExecStartPre=-/usr/bin/pkill -9 -f "node.*bca-scraper" || true
ExecStart=/usr/bin/node --max-old-space-size=4096 \$SCRIPT_DIR/bca-scraper.js
ExecStopPost=-/usr/bin/pkill -9 -f chromium || true
Restart=always
RestartSec=30
StandardOutput=append:/var/log/\$SERVICE_NAME.log
StandardError=append:/var/log/\$SERVICE_NAME.log

[Install]
WantedBy=multi-user.target
EOF

# Setup log rotation
cat > /etc/logrotate.d/\$SERVICE_NAME << EOF
/var/log/\$SERVICE_NAME.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
EOF

# Reload and enable service
systemctl daemon-reload
systemctl enable \$SERVICE_NAME
systemctl start \$SERVICE_NAME

echo ""
echo "Service installed successfully!"
echo ""
echo "Commands:"
echo "  Status: sudo systemctl status \$SERVICE_NAME"
echo "  Logs:   sudo tail -f /var/log/\$SERVICE_NAME.log"
echo "  Stop:   sudo systemctl stop \$SERVICE_NAME"
echo "  Start:  sudo systemctl start \$SERVICE_NAME"
`,

  'README.md': `# BCA iBanking Scraper v4.1.0 - Session Reuse Mode

## Fitur Baru v4.1.0

### Login Cooldown (5 menit)
- Menghormati limit login BCA (max 1x login per 5 menit)
- Mencegah "Found 0 mutations" karena terlalu sering login
- Cooldown tracking via \`lastLoginTime\` dan \`LOGIN_COOLDOWN_MS\`

### Session Reuse
- Burst mode menggunakan session yang sudah ada (tidak login ulang)
- \`ensureLoggedIn()\` akan reuse session jika masih valid
- Lebih cepat dan hemat resource

### No Burst Restart
- Browser tidak akan restart di tengah burst mode
- \`shouldRestartBrowser()\` skip check saat \`isBurstMode = true\`
- Mencegah kehilangan session saat burst

### Enhanced Heartbeat
- Mengirim \`is_logged_in\`, \`login_cooldown_remaining\`, \`last_login_at\`
- Monitoring status login dari dashboard

## Quick Install

\`\`\`bash
cd ~/bca-scraper
curl -sL "https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/get-scraper-file?file=bca-scraper.js" -o bca-scraper.js
sudo systemctl restart bca-scraper
\`\`\`

## Update dari v4.0.0

Hanya perlu download \`bca-scraper.js\` terbaru:

\`\`\`bash
curl -sL "https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/get-scraper-file?file=bca-scraper.js" -o bca-scraper.js
sudo systemctl restart bca-scraper
\`\`\`

## Verifikasi

\`\`\`bash
sudo tail -f /var/log/bca-scraper.log
\`\`\`

Pastikan muncul banner:
\`\`\`
==========================================
  BCA SCRAPER - SESSION REUSE v4.1.0
==========================================
  v4.1.0 FEATURES:
  - Login Cooldown    : 5 minutes (BCA limit)
  - Session Reuse     : Burst mode reuses active session
  - No Burst Restart  : Browser won't restart during burst
\`\`\`
`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const results: { file: string; status: string; error?: string }[] = [];
    
    for (const [filename, content] of Object.entries(SCRAPER_FILES)) {
      try {
        const { error } = await supabase.storage
          .from('scraper-files')
          .upload(filename, new Blob([content], { type: 'text/plain' }), {
            upsert: true,
            contentType: filename.endsWith('.js') ? 'application/javascript' : 'text/plain',
          });
        
        if (error) throw error;
        
        results.push({ file: filename, status: 'success' });
        console.log(`[SYNC] Uploaded: ${filename}`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({ file: filename, status: 'error', error: errorMsg });
        console.error(`[SYNC] Failed: ${filename} - ${errorMsg}`);
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return new Response(JSON.stringify({
      success: errorCount === 0,
      message: `Synced ${successCount}/${results.length} files (v4.1.3 Burst Fix Mode)`,
      version: '4.1.3',
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
