/**
 * BCA iBanking Scraper - SESSION REUSE MODE v4.1.2
 * 
 * Features:
 * - Browser standby 24/7, siap dipakai kapan saja
 * - LOGIN COOLDOWN: Respects BCA 5-minute login limit (skipped if logout successful)
 * - SESSION REUSE: Burst mode reuses active session (no re-login)
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
const SCRAPER_VERSION = "4.1.2";
const SCRAPER_BUILD_DATE = "2025-12-29";
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
  return `${year}-${month}-${day} ${hours}:${minutes} WIB`;
}
// =================================================

// Load config from config.env
const configPath = path.join(__dirname, 'config.env');
if (fs.existsSync(configPath)) {
  const envConfig = fs.readFileSync(configPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
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
      console.log(`  ${k}=${val}${process.env[k].length > 30 ? '...' : ''}`);
    }
  });
}

// Find Chromium path with smart priority
// Priority: apt chromium > snap chromium > puppeteer bundled
function findChromiumPath() {
  // Priority 1: apt-installed chromium (most reliable)
  const aptPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ];
  for (const p of aptPaths) {
    if (fs.existsSync(p)) {
      console.log(`[CHROMIUM] Found apt-installed: ${p}`);
      return p;
    }
  }
  
  // Priority 2: snap-installed chromium (less reliable in systemd)
  const snapPaths = ['/snap/bin/chromium'];
  for (const p of snapPaths) {
    if (fs.existsSync(p)) {
      console.log(`[CHROMIUM] Found snap-installed: ${p} (may have issues in systemd)`);
      return p;
    }
  }
  
  // Priority 3: Puppeteer bundled chromium
  try {
    const puppeteerPath = require('puppeteer').executablePath();
    if (puppeteerPath && fs.existsSync(puppeteerPath)) {
      console.log(`[CHROMIUM] Found Puppeteer bundled: ${puppeteerPath}`);
      return puppeteerPath;
    }
  } catch (e) {
    // Puppeteer not installed or no bundled browser
  }
  
  // Priority 4: Check common puppeteer cache locations
  const puppeteerCachePaths = [
    `${process.env.HOME}/.cache/puppeteer/chrome`,
    '/root/.cache/puppeteer/chrome'
  ];
  for (const basePath of puppeteerCachePaths) {
    if (fs.existsSync(basePath)) {
      // Find the latest version directory
      try {
        const versions = fs.readdirSync(basePath);
        for (const version of versions.reverse()) {
          const chromePath = `${basePath}/${version}/chrome-linux64/chrome`;
          if (fs.existsSync(chromePath)) {
            console.log(`[CHROMIUM] Found Puppeteer cache: ${chromePath}`);
            return chromePath;
          }
        }
      } catch (e) {
        // Ignore read errors
      }
    }
  }
  
  return null;
}

// Fallback browser launch - try puppeteer bundled if system chromium fails
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
  
  // Try system Chromium first
  if (chromiumPath && fs.existsSync(chromiumPath)) {
    try {
      log(`Launching browser with system Chromium: ${chromiumPath}`);
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
      log(`System Chromium failed: ${err.message}`, 'WARN');
      log('Trying Puppeteer bundled Chromium as fallback...', 'WARN');
    }
  }
  
  // Fallback: Let Puppeteer use its bundled browser
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
    log(`Puppeteer bundled Chromium also failed: ${err.message}`, 'ERROR');
    throw new Error(`All Chromium launch attempts failed. Last error: ${err.message}`);
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
  WATCHDOG_INTERVAL: 300000, // 5 minutes
  BURST_CHECK_URL: process.env.BURST_CHECK_URL || (process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL.replace('/bank-scraper-webhook', '/check-burst-command') : ''),
  // v4.0.0 Ultra-Robust settings
  GLOBAL_SCRAPE_TIMEOUT: parseInt(process.env.GLOBAL_SCRAPE_TIMEOUT) || 120000, // 2 minutes max per scrape
  MAX_SCRAPES_BEFORE_RESTART: parseInt(process.env.MAX_SCRAPES_BEFORE_RESTART) || 10,
  MAX_UPTIME_MS: parseInt(process.env.MAX_UPTIME_MS) || 7200000, // 2 hours
  FRAME_OPERATION_TIMEOUT: parseInt(process.env.FRAME_OPERATION_TIMEOUT) || 10000,
  HEARTBEAT_INTERVAL: parseInt(process.env.HEARTBEAT_INTERVAL) || 300000, // 5 minutes
};

// Derive config URL from webhook URL
const CONFIG_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/get-scraper-config');
const HEARTBEAT_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/update-scraper-status');

// Validate config
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
console.log(`  Version      : ${SCRAPER_VERSION} (${SCRAPER_BUILD_DATE})`);
console.log(`  Timestamp    : ${new Date().toISOString()} (UTC)`);
console.log(`  Jakarta Time : ${getJakartaDateString()}`);
console.log(`  Chromium Path: ${CONFIG.CHROMIUM_PATH || 'NOT FOUND!'}`);
console.log(`  User ID      : ${CONFIG.BCA_USER_ID.substring(0, 3)}***`);
console.log(`  Account      : ${CONFIG.ACCOUNT_NUMBER}`);
console.log(`  Headless     : ${CONFIG.HEADLESS}`);
console.log(`  Debug Mode   : ${CONFIG.DEBUG_MODE}`);
console.log(`  Webhook URL  : ${CONFIG.WEBHOOK_URL.substring(0, 50)}...`);
console.log(`  Config URL   : ${CONFIG_URL.substring(0, 50)}...`);
console.log('==========================================');
console.log('  v4.1.0 FEATURES:');
console.log(`  - Login Cooldown    : 5 minutes (BCA limit)`);
console.log(`  - Session Reuse     : Burst mode reuses active session`);
console.log(`  - No Burst Restart  : Browser won't restart during burst`);
console.log('  ULTRA-ROBUST FEATURES:');
console.log(`  - Global Timeout    : ${CONFIG.GLOBAL_SCRAPE_TIMEOUT / 1000}s`);
console.log(`  - Browser Restart   : Every 50 logins or ${CONFIG.MAX_UPTIME_MS / 3600000}h`);
console.log(`  - Frame Timeout     : ${CONFIG.FRAME_OPERATION_TIMEOUT / 1000}s`);
console.log(`  - Heartbeat         : Every ${CONFIG.HEARTBEAT_INTERVAL / 60000}m`);
console.log('==========================================');
console.log('');

// Check Chromium existence (warning only, will fallback at runtime)
if (!CONFIG.CHROMIUM_PATH) {
  console.log('[WARN] System Chromium not found - will try Puppeteer bundled at runtime');
  console.log('[INFO] To install system Chromium: apt install chromium-browser');
} else if (!fs.existsSync(CONFIG.CHROMIUM_PATH)) {
  console.log(`[WARN] Chromium path invalid: ${CONFIG.CHROMIUM_PATH} - will try fallback`);
} else {
  console.log(`[OK] Primary Chromium: ${CONFIG.CHROMIUM_PATH}`);
}
console.log('[OK] Fallback: Puppeteer bundled Chromium available');
console.log('');

// === GLOBAL STATE ===
let browser = null;
let page = null;
let isIdle = true;
let lastScrapeTime = 0;
let currentIntervalMs = 600000; // Default 10 minutes
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
const log = (msg, level = 'INFO') => console.log(`[${new Date().toISOString()}] [${level}] ${msg}`);

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

// Save debug screenshot
async function saveDebug(page, name, type = 'png') {
  if (!CONFIG.DEBUG_MODE) return;
  try {
    if (type === 'png') {
      await page.screenshot({ path: `debug-${name}.png`, fullPage: true });
      log(`Screenshot: debug-${name}.png`);
    } else {
      const html = await page.content();
      fs.writeFileSync(`debug-${name}.html`, html);
      log(`HTML saved: debug-${name}.html`);
    }
  } catch (e) {
    log(`Debug save failed: ${e.message}`, 'WARN');
  }
}

// ============ ULTRA-ROBUST HELPERS ============

/**
 * Safe frame operation with timeout protection
 */
async function safeFrameOperation(operation, timeoutMs = CONFIG.FRAME_OPERATION_TIMEOUT, operationName = 'operation') {
  try {
    const opPromise = operation();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operationName}_TIMEOUT`)), timeoutMs)
    );
    return await Promise.race([opPromise, timeoutPromise]);
  } catch (e) {
    log(`${operationName} failed: ${e.message}`, 'WARN');
    throw e;
  }
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, operationName = 'operation') {
  const delays = [5000, 15000, 45000]; // 5s, 15s, 45s
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      log(`${operationName} failed (attempt ${attempt}/${maxRetries}): ${e.message}`, 'WARN');
      
      if (attempt < maxRetries) {
        const delayMs = delays[attempt - 1] || 30000;
        log(`Retrying ${operationName} in ${delayMs / 1000}s...`);
        await delay(delayMs);
      } else {
        throw e;
      }
    }
  }
}

/**
 * Check if page is healthy
 */
async function isPageHealthy() {
  if (!page) return false;
  
  try {
    const result = await Promise.race([
      page.evaluate(() => document.readyState),
      new Promise((_, reject) => setTimeout(() => reject(new Error('health_check_timeout')), 5000))
    ]);
    return result === 'complete' || result === 'interactive';
  } catch (e) {
    log(`Page health check failed: ${e.message}`, 'WARN');
    return false;
  }
}

/**
 * Wait for target number of frames to be loaded
 * This indicates successful login (BCA has 5 frames when logged in)
 */
async function waitForFrames(targetCount, maxWait = 15000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    const frames = page.frames();
    if (frames.length >= targetCount) {
      log(`Frames ready: ${frames.length}/${targetCount}`);
      return true;
    }
    await delay(500);
  }
  const finalCount = page.frames().length;
  log(`Timeout waiting for ${targetCount} frames, got ${finalCount}`, 'WARN');
  return false;
}

/**
 * Check if session expired
 */
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
        log(`Session expired detected: "${indicator}"`, 'WARN');
        return true;
      }
    }
    
    return false;
  } catch (e) {
    log(`Session check failed: ${e.message}`, 'WARN');
    return true; // Assume expired if check fails
  }
}

/**
 * Check if browser needs restart (memory leak prevention)
 * v4.1.0: Skip restart during burst mode to avoid breaking active session
 */
function shouldRestartBrowser() {
  if (!browserStartTime) return true;
  
  // v4.1.0: NEVER restart during burst mode - it breaks the active session
  if (isBurstMode) {
    log('Skipping browser restart check - burst mode active');
    return false;
  }
  
  const uptime = Date.now() - browserStartTime;
  
  // v4.1.0: Increase limit to 50 for burst-heavy usage
  const effectiveLimit = 50;
  if (scrapeCount >= effectiveLimit) {
    log(`Browser restart needed: ${scrapeCount} scrapes reached limit (${effectiveLimit})`);
    return true;
  }
  
  if (uptime >= CONFIG.MAX_UPTIME_MS) {
    log(`Browser restart needed: ${(uptime / 3600000).toFixed(1)}h uptime exceeded limit (${CONFIG.MAX_UPTIME_MS / 3600000}h)`);
    return true;
  }
  
  return false;
}

/**
 * Force kill ALL browser processes and restart
 */
async function forceKillAndRestart() {
  log('=== FORCE KILL & RESTART ===', 'WARN');
  
  // Try graceful close first
  if (browser) {
    try {
      await Promise.race([
        browser.close(),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      log('Browser closed gracefully');
    } catch (e) {
      log(`Graceful close failed: ${e.message}`, 'WARN');
    }
  }
  
  // Force kill ALL chromium/puppeteer processes
  try {
    execSync('pkill -9 -f chromium 2>/dev/null || true', { stdio: 'ignore' });
    execSync('pkill -9 -f puppeteer 2>/dev/null || true', { stdio: 'ignore' });
    execSync('pkill -9 -f "chrome.*type=renderer" 2>/dev/null || true', { stdio: 'ignore' });
    log('Force killed all browser processes');
  } catch (e) {
    // Ignore errors - process might not exist
  }
  
  browser = null;
  page = null;
  
  // Cool down period
  await delay(5000);
  
  // Reinitialize
  await initBrowser();
  scrapeCount = 0; // Reset counter after restart
  isLoggedIn = false; // Reset login state after restart
  
  log('=== FORCE KILL COMPLETE, BROWSER RESTARTED ===');
}

/**
 * Send heartbeat to server
 */
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
    
    log(`Heartbeat sent: status=${status}, uptime=${uptimeMinutes}m, logins=${scrapeCount}, cooldown=${loginCooldownRemaining}s`);
  } catch (e) {
    log(`Heartbeat failed: ${e.message}`, 'WARN');
  }
}

// === BROWSER MANAGEMENT ===

/**
 * Initialize or restart browser
 */
async function initBrowser() {
  log('Initializing browser...');
  
  // Close existing browser if any
  if (browser) {
    try {
      await browser.close();
      log('Previous browser closed');
    } catch (e) {
      log(`Error closing previous browser: ${e.message}`, 'WARN');
    }
  }
  
  // Kill any orphan chromium processes
  try {
    execSync('pkill -f "chromium.*puppeteer" 2>/dev/null || true', { stdio: 'ignore' });
    log('Cleaned up orphan Chromium processes');
  } catch (e) {}
  
  await delay(2000);
  
  // Launch browser with smart fallback
  browser = await launchBrowserWithFallback();
  
  page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  page.setDefaultTimeout(CONFIG.TIMEOUT);
  page.setDefaultNavigationTimeout(CONFIG.TIMEOUT);
  
  // Navigate to blank page (idle state)
  await page.goto('about:blank');
  
  browserStartTime = Date.now();
  isIdle = true;
  
  log('Browser initialized and ready (standby mode)');
  return true;
}

/**
 * Enhanced Watchdog - check if browser is responsive
 */
async function watchdog() {
  if (!browser || !page) {
    log('Watchdog: Browser not initialized, restarting...', 'WARN');
    await forceKillAndRestart();
    return;
  }
  
  try {
    // Simple health check with timeout
    const result = await Promise.race([
      page.evaluate(() => true),
      new Promise((_, reject) => setTimeout(() => reject(new Error('watchdog_timeout')), 10000))
    ]);
    
    if (result === true) {
      const uptime = Math.round((Date.now() - browserStartTime) / 60000);
      log(`Watchdog: Browser healthy (uptime: ${uptime}m, scrapes: ${scrapeCount}, errors: ${errorCount})`);
      
      // Check if browser needs restart
      if (shouldRestartBrowser()) {
        log('Watchdog: Scheduled browser restart...');
        await forceKillAndRestart();
      }
    }
  } catch (e) {
    log(`Watchdog: Browser unresponsive (${e.message}), force restarting...`, 'WARN');
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
    log(`Frame-based logout failed: ${e.message}`, 'WARN');
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
      log(`goToPage() execution failed: ${e.message}`, 'WARN');
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
        log(`Logout via evaluate click (${clicked}) - SUCCESS`);
        loggedOut = true;
      }
    } catch (e) {
      log(`Evaluate click failed: ${e.message}`, 'WARN');
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

/**
 * Refresh page to clear any stuck session
 */
async function refreshToCleanState() {
  log('Refreshing page to clear session...');
  
  try {
    // First try to logout if we're logged in
    await safeLogout();
    
    // Navigate to login page (fresh start) with retry
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
    log(`Refresh failed: ${e.message}`, 'ERROR');
    // If refresh fails, restart browser
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
  log(`Total frames on page: ${frames.length}`);
  
  const loginSelectors = [
    'input#txt_user_id',
    'input[name="txt_user_id"]',
    'input[name="value(user_id)"]',
    'input[name="user_id"]',
    'input#user_id'
  ];
  
  // Check main page first
  for (const selector of loginSelectors) {
    try {
      const mainInput = await page.$(selector);
      if (mainInput) {
        log(`Login form found in MAIN PAGE with "${selector}"`);
        return { frame: page, isMainPage: true };
      }
    } catch (e) {}
  }
  
  // Search all frames
  for (const selector of loginSelectors) {
    for (const frame of frames) {
      try {
        const input = await frame.$(selector);
        if (input) {
          log(`Login form found with "${selector}" in FRAME: ${frame.url()}`);
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
    const userIdInput = await frame.$('input#txt_user_id') || 
                        await frame.$('input[name="txt_user_id"]') ||
                        await frame.$('input[name="value(user_id)"]');
    
    const pinInput = await frame.$('input#txt_pswd') || 
                     await frame.$('input[name="txt_pswd"]') ||
                     await frame.$('input[type="password"]') ||
                     await frame.$('input[name="value(pswd)"]');
    
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
    log(`Enter credentials failed: ${e.message}`, 'WARN');
  }
  
  return false;
}

async function submitLogin(frame) {
  log('Submitting login...');
  
  try {
    const submitBtn = await frame.$('input[value="LOGIN"]') ||
                      await frame.$('input[type="submit"]') ||
                      await frame.$('input[name="value(Submit)"]');
    
    if (submitBtn) {
      await submitBtn.click();
      log('LOGIN button clicked');
      await delay(3000);
      return true;
    }
  } catch (e) {
    log(`Submit failed: ${e.message}`, 'WARN');
  }
  
  return false;
}

// === v4.1.0: SESSION REUSE WITH LOGIN COOLDOWN ===

/**
 * Check if we're currently logged in (session still active)
 * BCA shows 5 frames when logged in, and no login form visible
 */
async function isCurrentlyLoggedIn() {
  if (!page) return false;
  
  try {
    // Check frame count first (quick check)
    const frameCount = page.frames().length;
    if (frameCount < 5) {
      log(`Not logged in: only ${frameCount} frames (need 5)`);
      return false;
    }
    
    // Check if login form is visible
    const loginFrame = await findLoginFrame();
    if (loginFrame) {
      log('Not logged in: login form visible');
      return false;
    }
    
    // Check if session expired
    if (await checkSessionExpired()) {
      log('Not logged in: session expired');
      return false;
    }
    
    log(`Session active: ${frameCount} frames, no login form visible`);
    return true;
  } catch (e) {
    log(`Login check failed: ${e.message}`, 'WARN');
    return false;
  }
}

/**
 * Calculate remaining cooldown time before next login allowed
 */
function getLoginCooldownRemaining() {
  const timeSinceLastLogin = Date.now() - lastLoginTime;
  const remaining = LOGIN_COOLDOWN_MS - timeSinceLastLogin;
  return remaining > 0 ? remaining : 0;
}

/**
 * Ensure we're logged in, respecting BCA 5-minute login cooldown
 * Returns true if logged in successfully, false otherwise
 * 
 * Logic:
 * 1. If already logged in with valid session → reuse session (no new login)
 * 2. If not logged in and last logout was successful → skip cooldown, proceed login
 * 3. If not logged in and last logout failed → wait for cooldown (safety measure)
 */
async function ensureLoggedIn() {
  // Check if already logged in
  if (await isCurrentlyLoggedIn()) {
    log('Session still active, reusing existing session');
    isLoggedIn = true;
    return true;
  }
  
  // v4.1.2: Skip cooldown if last logout was successful
  const cooldownRemaining = getLoginCooldownRemaining();
  if (cooldownRemaining > 0) {
    if (lastLogoutSuccess) {
      log(`Cooldown skipped - previous logout was successful (${(cooldownRemaining / 1000).toFixed(0)}s remaining but ignored)`);
    } else {
      log(`Login cooldown active: waiting ${(cooldownRemaining / 1000).toFixed(0)}s (last logout may have failed)`, 'WARN');
      await delay(cooldownRemaining);
    }
  }
  
  // Reset logout success flag before new login attempt
  lastLogoutSuccess = false;
  
  log('Performing fresh login...');
  
  // Navigate to login page
  try {
    await page.goto('https://ibank.klikbca.com/', { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.TIMEOUT 
    });
    await delay(2000);
  } catch (e) {
    log(`Navigation to login failed: ${e.message}`, 'ERROR');
    return false;
  }
  
  // Find login frame
  const frameResult = await retryWithBackoff(
    () => findLoginFrame(),
    3,
    'FIND_LOGIN_FRAME_ENSURE'
  );
  
  if (!frameResult) {
    // Maybe already logged in after navigation
    if (await isCurrentlyLoggedIn()) {
      log('Already logged in after navigation');
      lastLoginTime = Date.now();
      isLoggedIn = true;
      scrapeCount++; // Count this as a login
      return true;
    }
    throw new Error('Could not find login form');
  }
  
  // Enter credentials and submit
  await enterCredentials(frameResult.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
  await submitLogin(frameResult.frame);
  
  // Wait for frames to load (5 frames = fully logged in)
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
  
  // Final verification
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
  
  // Login successful - update tracking
  lastLoginTime = Date.now();
  isLoggedIn = true;
  scrapeCount++; // Only count actual logins
  
  log(`LOGIN SUCCESSFUL! (${finalFrameCount} frames loaded, cooldown reset)`);
  return true;
}

/**
 * Execute a single scrape with global timeout wrapper
 */
async function executeScrapeWithTimeout() {
  const scrapePromise = executeScrape();
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('GLOBAL_SCRAPE_TIMEOUT')), CONFIG.GLOBAL_SCRAPE_TIMEOUT)
  );
  
  try {
    return await Promise.race([scrapePromise, timeoutPromise]);
  } catch (e) {
    log(`Global timeout exceeded (${CONFIG.GLOBAL_SCRAPE_TIMEOUT / 1000}s)! Force restarting browser...`, 'ERROR');
    lastError = 'GLOBAL_TIMEOUT';
    errorCount++;
    await forceKillAndRestart();
    return { success: false, error: 'GLOBAL_TIMEOUT' };
  }
}

/**
 * Execute a single scrape (normal mode)
 */
async function executeScrape() {
  if (!isIdle) {
    log('Scraper busy, skipping...', 'WARN');
    return { success: false, reason: 'busy' };
  }
  
  isIdle = false;
  scrapeCount++;
  const startTime = Date.now();
  let mutations = [];
  
  log(`=== STARTING SCRAPE #${scrapeCount} (NORMAL MODE) ===`);
  
  try {
    // Pre-scrape checks
    if (!await isPageHealthy()) {
      log('Page unhealthy before scrape, restarting browser...', 'WARN');
      await forceKillAndRestart();
    }
    
    // Step 1: Refresh page to clear any stuck session
    await refreshToCleanState();
    await saveDebug(page, '01-login-page');
    
    // Step 2: Find login frame with retry
    const frameResult = await retryWithBackoff(
      () => findLoginFrame(),
      3,
      'FIND_LOGIN_FRAME'
    );
    
    if (!frameResult) {
      throw new Error('Could not find login form after 3 attempts');
    }
    
    const { frame, isMainPage } = frameResult;
    log(`Using ${isMainPage ? 'main page' : 'iframe'} for login`);
    
    // Step 3: Enter credentials with retry
    const credentialsEntered = await retryWithBackoff(
      () => enterCredentials(frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN),
      2,
      'ENTER_CREDENTIALS'
    );
    
    if (!credentialsEntered) {
      throw new Error('Failed to enter credentials after retries');
    }
    
    await saveDebug(page, '02-credentials-entered');
    
    // Step 4: Submit login
    await submitLogin(frame);
    await delay(3000);
    
    // Check if still on login page
    let loginFrame = await findLoginFrame();
    if (loginFrame) {
      log('Still on login page, trying again...');
      await enterCredentials(loginFrame.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
      await submitLogin(loginFrame.frame);
      await delay(3000);
    }
    
    // Final login check
    const finalLoginCheck = await findLoginFrame();
    if (finalLoginCheck) {
      throw new Error('LOGIN_FAILED - still on login page');
    }
    
    // Check for session expiry
    if (await checkSessionExpired()) {
      throw new Error('SESSION_EXPIRED - detected after login attempt');
    }
    
    log('LOGIN SUCCESSFUL!');
    await saveDebug(page, '03-logged-in');
    
    // Step 5: Navigate to Mutasi Rekening with safe operations
    await delay(2000);
    
    const menuFrame = page.frames().find(f => f.name() === 'menu');
    if (!menuFrame) {
      throw new Error('FRAME_NOT_FOUND - Menu frame');
    }
    
    // Click Informasi Rekening with timeout protection
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
    
    // Click Mutasi Rekening with timeout protection
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
    
    // Step 6: Set date and view
    let atmFrame = page.frames().find(f => f.name() === 'atm');
    if (!atmFrame) {
      throw new Error('FRAME_NOT_FOUND - ATM frame');
    }
    
    const today = getJakartaDate();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    const currentYear = today.getFullYear();
    
    log(`Setting date: ${day}/${month}/${currentYear} (Jakarta: ${getJakartaDateString()})`);
    
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
    
    // Click Lihat with timeout protection
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
    
    // Step 7: Parse mutations with timeout protection
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
              
              const dateMatch = firstCell.match(/^(\d{1,2})\/(\d{1,2})/);
              const isPending = firstCellUpper.includes('PEND');
              
              if (dateMatch || isPending) {
                let date;
                if (isPending) {
                  const now = new Date();
                  const day = String(now.getDate()).padStart(2, '0');
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  date = `${year}-${month}-${day}`;
                } else {
                  const day = dateMatch[1].padStart(2, '0');
                  const month = dateMatch[2].padStart(2, '0');
                  date = `${year}-${month}-${day}`;
                }
                
                const description = cells[1]?.innerText?.trim() || '';
                const mutasiCell = cells[3]?.innerText?.trim() || '';
                
                let type = 'credit';
                const descUpper = description.toUpperCase();
                if (descUpper.includes(' DB') || descUpper.includes('/DB') || mutasiCell.toUpperCase().includes('DB')) {
                  type = 'debit';
                }
                
                // Skip debits
                if (type === 'debit') continue;
                
                const cleanedAmount = mutasiCell.replace(/,/g, '').replace(/[^0-9.]/g, '');
                const amount = parseFloat(cleanedAmount);
                
                if (amount > 0) {
                  const dedupKey = `${date}-${Math.round(amount)}-${description.substring(0, 30)}`;
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
    log(`Found ${mutations.length} credit mutations`);
    
    // Step 8: Logout
    await safeLogout();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`=== SCRAPE COMPLETED in ${duration}s ===`);
    
    successCount++;
    lastError = null;
    
    return { success: true, mutations, duration };
    
  } catch (error) {
    const errorType = categorizeError(error);
    log(`Scrape error [${errorType}]: ${error.message}`, 'ERROR');
    lastError = `${errorType}: ${error.message}`;
    errorCount++;
    
    await saveDebug(page, 'error-state');
    await safeLogout();
    
    // Restart browser on error
    await forceKillAndRestart();
    
    return { success: false, error: error.message, errorType };
  } finally {
    isIdle = true;
    lastScrapeTime = Date.now();
  }
}

/**
 * Execute burst mode scrape with global timeout
 */
async function executeBurstScrapeWithTimeout() {
  const scrapePromise = executeBurstScrape();
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('BURST_GLOBAL_TIMEOUT')), CONFIG.GLOBAL_SCRAPE_TIMEOUT * 2) // 4 minutes for burst
  );
  
  try {
    return await Promise.race([scrapePromise, timeoutPromise]);
  } catch (e) {
    log(`Burst global timeout! Force restarting browser...`, 'ERROR');
    lastError = 'BURST_GLOBAL_TIMEOUT';
    errorCount++;
    await forceKillAndRestart();
    return { success: false, error: 'BURST_GLOBAL_TIMEOUT' };
  }
}

/**
 * Execute burst mode scrape
 * v4.1.0: Uses ensureLoggedIn() to respect BCA 5-minute login cooldown
 * - Reuses existing session if still valid
 * - Only logs in if cooldown allows
 * - Does NOT increment scrapeCount per burst call (ensureLoggedIn handles it)
 */
async function executeBurstScrape() {
  if (!isIdle) {
    log('Scraper busy, skipping burst...', 'WARN');
    return { success: false, reason: 'busy' };
  }
  
  isIdle = false;
  // v4.1.0: DON'T increment scrapeCount here - ensureLoggedIn() handles it for actual logins
  const startTime = Date.now();
  
  const maxIterations = 24;
  const maxDuration = 150000; // 2.5 minutes
  let checkCount = 0;
  let matchFound = false;
  
  log(`=== STARTING BURST MODE ===`);
  log(`Session reuse: ${isLoggedIn ? 'checking...' : 'need login'}`);
  log(`Last login: ${lastLoginTime > 0 ? ((Date.now() - lastLoginTime) / 1000).toFixed(0) + 's ago' : 'never'}`);
  log(`Cooldown remaining: ${(getLoginCooldownRemaining() / 1000).toFixed(0)}s`);
  
  try {
    // Pre-scrape checks
    if (!await isPageHealthy()) {
      log('Page unhealthy before burst, restarting browser...', 'WARN');
      await forceKillAndRestart();
      isLoggedIn = false; // Reset login state after browser restart
    }
    
    // v4.1.0: Use ensureLoggedIn() - handles cooldown and session reuse
    const loginSuccess = await ensureLoggedIn();
    if (!loginSuccess) {
      throw new Error('Failed to ensure login state');
    }
    
    // Step 2: Navigate to Mutasi Rekening (if not already there)
    await delay(1000);
    
    // Check if we're already on mutasi page (session reuse case)
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
    
    // Step 3: Set date
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
    
    // Step 4: First click Lihat
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
      log(`--- Burst iteration #${checkCount} ---`);
      
      // Check session during loop
      if (await checkSessionExpired()) {
        log('Session expired during burst loop, exiting...', 'WARN');
        break;
      }
      
      atmFrame = page.frames().find(f => f.name() === 'atm');
      if (!atmFrame) {
        log('ATM frame lost during burst, exiting...', 'WARN');
        break;
      }
      
      // Grab data with timeout
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
              const dateMatch = firstCell.match(/^(\d{1,2})\/(\d{1,2})/);
              const isPending = firstCell.toUpperCase().includes('PEND');
              
              if (dateMatch || isPending) {
                let date;
                if (isPending) {
                  const now = new Date();
                  date = `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                } else {
                  date = `${year}-${dateMatch[2].padStart(2,'0')}-${dateMatch[1].padStart(2,'0')}`;
                }
                
                const description = cells[1]?.innerText?.trim() || '';
                const mutasiCell = cells[3]?.innerText?.trim() || '';
                
                if (description.toUpperCase().includes('DB') || mutasiCell.toUpperCase().includes('DB')) continue;
                
                const amount = parseFloat(mutasiCell.replace(/,/g, '').replace(/[^0-9.]/g, ''));
                if (amount > 0) {
                  const key = `${date}-${Math.round(amount)}-${description.substring(0,30)}`;
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
      
      log(`Found ${mutations.length} mutations`);
      
      // Send to webhook if found
      if (mutations.length > 0) {
        const result = await sendToWebhook(mutations);
        log(`Webhook result: ${JSON.stringify(result)}`);
        
        if (result.matched && result.matched > 0) {
          log('MATCH FOUND! Payment verified.');
          matchFound = true;
          break;
        }
      }
      
      // Check server status
      const status = await checkBurstCommand();
      if (!status.burst_active) {
        log('Burst stopped by server');
        break;
      }
      
      // Click Kembali with timeout
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
      
      // Click Lihat again with timeout
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
    
    log(`=== BURST LOOP ENDED (${checkCount} iterations, match=${matchFound}) ===`);
    
    // Logout and mark session as ended
    await safeLogout();
    isLoggedIn = false;
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`=== BURST COMPLETED in ${duration}s ===`);
    
    successCount++;
    lastError = null;
    
    return { success: true, iterations: checkCount, matchFound, duration };
    
  } catch (error) {
    const errorType = categorizeError(error);
    log(`Burst error [${errorType}]: ${error.message}`, 'ERROR');
    lastError = `${errorType}: ${error.message}`;
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
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    log(`Failed to fetch config: ${error.message}`, 'ERROR');
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
    log(`Webhook error: ${e.message}`, 'ERROR');
    return { error: e.message };
  }
}

// === MAIN LOOP ===

async function mainLoop() {
  log('=== ULTRA-ROBUST SCHEDULER STARTED ===');
  log(`Config URL: ${CONFIG_URL}`);
  log(`Poll interval: ${CONFIG.CONFIG_POLL_INTERVAL / 1000}s`);
  log(`Watchdog interval: ${CONFIG.WATCHDOG_INTERVAL / 1000}s`);
  log(`Heartbeat interval: ${CONFIG.HEARTBEAT_INTERVAL / 1000}s`);
  
  // Initialize browser
  await initBrowser();
  
  // Start watchdog
  setInterval(watchdog, CONFIG.WATCHDOG_INTERVAL);
  
  // Start heartbeat
  await sendHeartbeat('started');
  heartbeatInterval = setInterval(() => sendHeartbeat('running'), CONFIG.HEARTBEAT_INTERVAL);
  
  while (true) {
    try {
      // Pre-loop health check
      if (!await isPageHealthy()) {
        log('Page unhealthy in main loop, restarting browser...', 'WARN');
        await forceKillAndRestart();
      }
      
      // Check if browser needs restart
      if (shouldRestartBrowser()) {
        log('Scheduled browser restart in main loop...');
        await forceKillAndRestart();
      }
      
      // Fetch config from server
      const config = await fetchServerConfig();
      
      if (!config || !config.success) {
        log(`Config fetch failed or inactive: ${config?.error || 'Unknown'}`, 'WARN');
        await delay(CONFIG.CONFIG_POLL_INTERVAL);
        continue;
      }
      
      // Update interval
      const serverIntervalMs = (config.scrape_interval_minutes || 10) * 60 * 1000;
      if (serverIntervalMs !== currentIntervalMs) {
        log(`Interval changed: ${currentIntervalMs / 60000}m -> ${serverIntervalMs / 60000}m`);
        currentIntervalMs = serverIntervalMs;
      }
      
      // Check burst mode
      if (config.burst_in_progress && config.burst_enabled) {
        if (!isBurstMode) {
          log('=== ENTERING BURST MODE ===');
          isBurstMode = true;
          burstEndTime = Date.now() + (config.burst_remaining_seconds * 1000);
          await sendHeartbeat('burst_mode');
        }
        
        // Execute burst scrape with global timeout
        await executeBurstScrapeWithTimeout();
        
        // Check if burst ended
        const updatedConfig = await fetchServerConfig();
        if (!updatedConfig?.burst_in_progress) {
          log('=== BURST MODE ENDED ===');
          isBurstMode = false;
          await sendHeartbeat('running');
        }
        continue;
      } else {
        if (isBurstMode) {
          log('=== BURST MODE ENDED ===');
          isBurstMode = false;
          await sendHeartbeat('running');
        }
      }
      
      // Normal mode - check if should scrape
      if (config.is_active) {
        const timeSinceLastScrape = Date.now() - lastScrapeTime;
        
        if (timeSinceLastScrape >= currentIntervalMs) {
          log(`Time to scrape (${(timeSinceLastScrape / 60000).toFixed(1)}m since last)`);
          
          // Execute scrape with global timeout
          const result = await executeScrapeWithTimeout();
          
          if (result.success && result.mutations && result.mutations.length > 0) {
            const webhookResult = await sendToWebhook(result.mutations);
            log(`Webhook result: ${JSON.stringify(webhookResult)}`);
          } else if (result.success) {
            log('No mutations found');
          }
        } else {
          const nextScrapeIn = ((currentIntervalMs - timeSinceLastScrape) / 60000).toFixed(1);
          log(`Next scrape in ${nextScrapeIn}m`);
        }
      } else {
        log('Scraper inactive (disabled in settings)');
      }
      
    } catch (error) {
      const errorType = categorizeError(error);
      log(`Loop error [${errorType}]: ${error.message}`, 'ERROR');
      lastError = `${errorType}: ${error.message}`;
      errorCount++;
      
      // Force restart on loop error
      await sendHeartbeat('error');
      await forceKillAndRestart();
    }
    
    // Wait before next config poll
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

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  log(`UNCAUGHT EXCEPTION: ${error.message}`, 'ERROR');
  lastError = `UNCAUGHT: ${error.message}`;
  await sendHeartbeat('crash');
  await forceKillAndRestart();
});

process.on('unhandledRejection', async (reason, promise) => {
  log(`UNHANDLED REJECTION: ${reason}`, 'ERROR');
  lastError = `UNHANDLED: ${reason}`;
  await sendHeartbeat('crash');
  await forceKillAndRestart();
});

// === START ===

mainLoop().catch(async (err) => {
  log(`Fatal error: ${err.message}`, 'ERROR');
  await sendHeartbeat('fatal');
  process.exit(1);
});
