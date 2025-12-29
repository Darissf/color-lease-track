import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Embedded scraper files content - v4.0.0 Ultra-Robust Mode
const SCRAPER_FILES: Record<string, string> = {
  'bca-scraper.js': `/**
 * BCA iBanking Scraper - ULTRA-ROBUST MODE v4.0.0
 * 
 * Features:
 * - Browser standby 24/7, siap dipakai kapan saja
 * - Global scrape timeout (max 2 menit per scrape)
 * - Safe frame operations dengan timeout protection
 * - Session expired detection & auto-recovery
 * - Periodic browser restart (memory leak prevention)
 * - Retry with exponential backoff (3x retry)
 * - Force kill & restart jika browser unresponsive
 * - Page health check sebelum scrape
 * - Server heartbeat reporting
 * - Error categorization
 * 
 * Usage: node bca-scraper.js
 */

// ============ SCRAPER VERSION ============
const SCRAPER_VERSION = "4.0.0";
const SCRAPER_BUILD_DATE = "2025-12-29";
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

console.log('');
console.log('==========================================');
console.log('  BCA SCRAPER - ULTRA-ROBUST MODE v4.0.0');
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
console.log('  ULTRA-ROBUST FEATURES:');
console.log(\`  - Global Timeout    : \${CONFIG.GLOBAL_SCRAPE_TIMEOUT / 1000}s\`);
console.log(\`  - Browser Restart   : Every \${CONFIG.MAX_SCRAPES_BEFORE_RESTART} scrapes or \${CONFIG.MAX_UPTIME_MS / 3600000}h\`);
console.log(\`  - Frame Timeout     : \${CONFIG.FRAME_OPERATION_TIMEOUT / 1000}s\`);
console.log(\`  - Heartbeat         : Every \${CONFIG.HEARTBEAT_INTERVAL / 60000}m\`);
console.log(\`  - Retry with Backoff: 3x (5s, 15s, 45s)\`);
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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min + 1)) + min);
const log = (msg, level = 'INFO') => console.log(\`[\${new Date().toISOString()}] [\${level}] \${msg}\`);

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

function shouldRestartBrowser() {
  if (!browserStartTime) return true;
  
  const uptime = Date.now() - browserStartTime;
  
  if (scrapeCount >= CONFIG.MAX_SCRAPES_BEFORE_RESTART) {
    log(\`Browser restart needed: \${scrapeCount} scrapes reached limit (\${CONFIG.MAX_SCRAPES_BEFORE_RESTART})\`);
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
  
  log('=== FORCE KILL COMPLETE, BROWSER RESTARTED ===');
}

async function sendHeartbeat(status = 'running') {
  try {
    const uptimeMinutes = browserStartTime ? Math.round((Date.now() - browserStartTime) / 60000) : 0;
    
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
      timestamp: new Date().toISOString(),
    };
    
    await fetch(HEARTBEAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    log(\`Heartbeat sent: status=\${status}, uptime=\${uptimeMinutes}m, scrapes=\${scrapeCount}\`);
  } catch (e) {
    log(\`Heartbeat failed: \${e.message}\`, 'WARN');
  }
}

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

async function safeLogout() {
  if (!page) return;
  
  log('Attempting safe logout...');
  
  try {
    const logoutPromise = safeFrameOperation(
      () => page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          const text = (link.textContent || '').toLowerCase();
          const href = (link.getAttribute('href') || '').toLowerCase();
          if (text.includes('logout') || text.includes('keluar') || href.includes('logout')) {
            link.click();
            return { success: true, method: 'main_page_link' };
          }
        }
        
        const frames = document.querySelectorAll('iframe');
        for (const frame of frames) {
          try {
            const frameDoc = frame.contentDocument || frame.contentWindow?.document;
            if (frameDoc) {
              const frameLinks = frameDoc.querySelectorAll('a');
              for (const link of frameLinks) {
                const text = (link.textContent || '').toLowerCase();
                if (text.includes('logout') || text.includes('keluar')) {
                  link.click();
                  return { success: true, method: 'iframe_link' };
                }
              }
            }
          } catch (e) {}
        }
        
        return { success: false };
      }),
      5000,
      'LOGOUT_CLICK'
    );
    
    const result = await logoutPromise;
    
    if (result.success) {
      await delay(2000);
      log(\`Safe logout successful via \${result.method}\`);
    }
    
  } catch (e) {
    log(\`Logout click failed: \${e.message}\`, 'WARN');
  }
  
  try {
    await Promise.race([
      page.goto('https://ibank.klikbca.com/logout.do', { 
        timeout: 5000,
        waitUntil: 'domcontentloaded' 
      }),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
    await delay(1000);
    log('Logout via direct URL navigation');
  } catch (e) {
    log('Direct logout navigation failed, session will be cleared on refresh', 'WARN');
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
  scrapeCount++;
  const startTime = Date.now();
  
  const maxIterations = 24;
  const maxDuration = 150000;
  let checkCount = 0;
  let matchFound = false;
  
  log(\`=== STARTING BURST MODE SCRAPE #\${scrapeCount} ===\`);
  
  try {
    if (!await isPageHealthy()) {
      log('Page unhealthy before burst, restarting browser...', 'WARN');
      await forceKillAndRestart();
    }
    
    await refreshToCleanState();
    
    const frameResult = await retryWithBackoff(
      () => findLoginFrame(),
      3,
      'FIND_LOGIN_FRAME_BURST'
    );
    
    if (!frameResult) {
      throw new Error('Could not find login form');
    }
    
    await enterCredentials(frameResult.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
    await submitLogin(frameResult.frame);
    
    log('Waiting for page to fully load after login...');
    let framesLoaded = await waitForFrames(5, 15000);
    
    if (!framesLoaded) {
      log('Frames not loaded, checking if still on login page...');
      const loginFrame = await findLoginFrame();
      if (loginFrame) {
        log('Still on login page, retrying login...');
        await enterCredentials(loginFrame.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
        await submitLogin(loginFrame.frame);
        framesLoaded = await waitForFrames(5, 15000);
      }
    }
    
    const finalFrameCount = page.frames().length;
    if (finalFrameCount < 5) {
      const finalLoginCheck = await findLoginFrame();
      if (finalLoginCheck) {
        throw new Error('LOGIN_FAILED - still on login page');
      }
    }
    
    if (await checkSessionExpired()) {
      throw new Error('SESSION_EXPIRED');
    }
    
    log(\`LOGIN SUCCESSFUL! (\${finalFrameCount} frames loaded)\`);
    
    await delay(2000);
    
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
    
    let atmFrame = page.frames().find(f => f.name() === 'atm');
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
    
    log('=== ENTERING BURST LOOP ===');
    
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
    
    await safeLogout();
    
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
    await forceKillAndRestart();
    return { success: false, error: error.message, errorType };
  } finally {
    isIdle = true;
    lastScrapeTime = Date.now();
  }
}

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
        }
        continue;
      } else {
        if (isBurstMode) {
          log('=== BURST MODE ENDED ===');
          isBurstMode = false;
          await sendHeartbeat('running');
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

mainLoop().catch(async (err) => {
  log(\`Fatal error: \${err.message}\`, 'ERROR');
  await sendHeartbeat('fatal');
  process.exit(1);
});
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
    sudo apt install -y openvpn chromium-browser || sudo apt install -y openvpn chromium
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
# BCA Scraper - Systemd Service Installer v4.0.0
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
Description=BCA Scraper v4.0.0 - Ultra-Robust Mode
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=\${SCRIPT_DIR}
ExecStart=/usr/bin/node --max-old-space-size=4096 \${SCRIPT_DIR}/bca-scraper.js
Restart=always
RestartSec=30
StandardOutput=append:\${LOG_FILE}
StandardError=append:\${ERROR_LOG_FILE}
Environment=NODE_ENV=production
EnvironmentFile=-\${SCRIPT_DIR}/config.env

# Memory and process limits
MemoryMax=4G
TasksMax=100

# Security (relaxed for Chromium compatibility)
ProtectSystem=false
PrivateTmp=true
NoNewPrivileges=false

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable \${SERVICE_NAME}
echo "Service installed and enabled"
echo "Start with: sudo systemctl start \${SERVICE_NAME}"
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

  'README.md': `# VPS BCA Scraper Template v4.0.0 - Ultra-Robust Mode

Script untuk scraping mutasi BCA dari VPS sendiri dan mengirim ke webhook.

## Features v4.0.0
- Ultra-Robust Mode dengan comprehensive error handling
- Browser standby 24/7, siap dipakai kapan saja
- Global scrape timeout (max 2 menit per scrape)
- Safe frame operations dengan timeout protection
- Session expired detection & auto-recovery
- Periodic browser restart (memory leak prevention)
- Retry with exponential backoff (3x retry)
- Force kill & restart jika browser unresponsive
- Page health check sebelum scrape
- Server heartbeat reporting
- Error categorization

## Quick Setup

1. Upload semua file ke VPS
2. Jalankan: \`chmod +x install.sh && sudo ./install.sh\`
3. Edit config.env dengan kredensial BCA Anda
4. Start service: \`sudo systemctl start bca-scraper\`

## Files

- \`bca-scraper.js\` - Main scraper script v4.0.0
- \`scheduler.js\` - Scheduler daemon
- \`config.env.template\` - Configuration template
- \`install.sh\` - All-in-one installer
- \`install-service.sh\` - Systemd service installer
- \`run.sh\` - Manual run script

## Support

Jika ada masalah, hubungi admin atau buka issue di GitHub.
`,

  'README.txt': `============================================================
    BCA VPS Scraper v4.0.0 - Quick Start Guide
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

    console.log(`[Sync Scraper Files] Synced ${successCount} files (v4.0.0), ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${successCount} files successfully (v4.0.0 Ultra-Robust)`,
        version: '4.0.0',
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
