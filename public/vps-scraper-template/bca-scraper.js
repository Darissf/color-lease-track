/**
 * BCA iBanking Scraper - STEALTH MODE v4.2.0
 * 
 * Features:
 * - STEALTH MODE: Anti-detection with puppeteer-extra-plugin-stealth
 * - HUMAN BEHAVIOR: Mouse movement with Bezier curves, realistic typing
 * - RANDOM DELAYS: Gaussian distribution delays, not fixed timing
 * - Browser standby 24/7, siap dipakai kapan saja
 * - LOGIN COOLDOWN: Respects BCA 5-minute login limit (skipped if logout successful)
 * - SESSION REUSE: Burst mode reuses active session (no re-login)
 * - FULL NAVIGATION LOOP: Step 5-6-7 per burst iteration for reliable data
 * - STOP ON MATCH: Immediately exits loop when payment matched
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
const SCRAPER_VERSION = "4.2.0";
const SCRAPER_BUILD_DATE = "2025-12-29";
const SCRAPER_PLATFORM = "linux";
// v4.2.0: Advanced stealth mode + human-like behavior + anti-detection
// v4.1.5: Add detailed logging for Step 5 navigation in normal mode
// v4.1.4: Full navigation per burst iteration (Step 5-6-7 loop), stop on match
// v4.1.3: Burst Fix - no logout during burst, post-burst cooldown, timing reset
// v4.1.2: Fix cooldown - skip 5-min wait if previous logout was successful
// v4.1.1: Fixed logout - uses correct BCA selector #gotohome and goToPage()
// v4.1.0: Login Cooldown & Session Reuse - respect BCA 5-minute login limit
// v4.0.0: Ultra-Robust Mode - comprehensive error handling, auto-recovery
// v3.0.0: Persistent Browser Mode - browser standby 24/7
// =========================================

// Use puppeteer-extra with stealth plugin for anti-detection
let puppeteer;
let StealthPlugin;
try {
  puppeteer = require('puppeteer-extra');
  StealthPlugin = require('puppeteer-extra-plugin-stealth');
  
  // Enable stealth with all evasions
  const stealth = StealthPlugin();
  puppeteer.use(stealth);
  console.log('[STEALTH] puppeteer-extra-plugin-stealth loaded with all evasions');
} catch (e) {
  // Fallback to regular puppeteer if stealth not installed
  console.log('[STEALTH] Stealth plugin not found, using regular puppeteer');
  console.log('[STEALTH] Run: npm install puppeteer-extra puppeteer-extra-plugin-stealth');
  puppeteer = require('puppeteer');
}

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

// ============ HUMAN-LIKE BEHAVIOR HELPERS ============

// Gaussian random for more natural distribution
function gaussianRandom(mean, stdev) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

// Human-like delay with gaussian distribution
async function humanDelay(minMs, maxMs) {
  const mean = (minMs + maxMs) / 2;
  const stdev = (maxMs - minMs) / 4;
  let delayTime = Math.round(gaussianRandom(mean, stdev));
  delayTime = Math.max(minMs, Math.min(maxMs, delayTime));
  log(`[Human] Waiting ${delayTime}ms...`);
  return new Promise(r => setTimeout(r, delayTime));
}

// Cubic Bezier interpolation for smooth mouse movement
function cubicBezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// Human-like mouse movement with Bezier curves
async function humanMouseMove(targetPage, targetX, targetY) {
  const mouse = targetPage.mouse;
  const viewport = targetPage.viewport();
  
  // Start from approximate current position (center as default)
  let currentX = viewport.width / 2;
  let currentY = viewport.height / 2;
  
  // Calculate distance
  const distance = Math.sqrt(Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2));
  
  // More steps for longer distance (minimum 20, max 80)
  const steps = Math.min(80, Math.max(20, Math.floor(distance / 8)));
  
  // Generate random control points for Bezier curve (not straight line)
  const cp1x = currentX + (targetX - currentX) * 0.25 + (Math.random() - 0.5) * 80;
  const cp1y = currentY + (targetY - currentY) * 0.25 + (Math.random() - 0.5) * 80;
  const cp2x = currentX + (targetX - currentX) * 0.75 + (Math.random() - 0.5) * 80;
  const cp2y = currentY + (targetY - currentY) * 0.75 + (Math.random() - 0.5) * 80;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    // Cubic Bezier interpolation
    const x = cubicBezier(t, currentX, cp1x, cp2x, targetX);
    const y = cubicBezier(t, currentY, cp1y, cp2y, targetY);
    
    // Add micro-jitter (human hand shake)
    const jitterX = (Math.random() - 0.5) * 2;
    const jitterY = (Math.random() - 0.5) * 2;
    
    await mouse.move(x + jitterX, y + jitterY);
    
    // Variable delay - slower at start/end, faster in middle (easing)
    const speedFactor = Math.sin(t * Math.PI);
    const stepDelay = 3 + Math.random() * 12 * (1 - speedFactor * 0.5);
    await new Promise(r => setTimeout(r, stepDelay));
  }
  
  // Final position exact
  await mouse.move(targetX, targetY);
}

// Human-like click with mouse movement
async function humanClick(targetPage, element) {
  if (!element) return false;
  
  try {
    const box = await element.boundingBox();
    if (!box) return false;
    
    // Random position within element (not always center)
    const targetX = box.x + box.width * (0.25 + Math.random() * 0.5);
    const targetY = box.y + box.height * (0.25 + Math.random() * 0.5);
    
    log(`[Human] Moving mouse to (${Math.round(targetX)}, ${Math.round(targetY)})...`);
    
    // Move mouse like human with Bezier curve
    await humanMouseMove(targetPage, targetX, targetY);
    
    // Small pause before click (thinking time)
    await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
    
    // Click with realistic timing (press and release)
    await targetPage.mouse.down();
    await new Promise(r => setTimeout(r, 30 + Math.random() * 70));
    await targetPage.mouse.up();
    
    return true;
  } catch (e) {
    log(`[Human] Click failed: ${e.message}`, 'WARN');
    return false;
  }
}

// Human-like typing with variable speed
async function humanType(element, text) {
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Base delay varies by character type
    let charDelay = 50 + Math.random() * 80;
    
    // Slower for uncommon characters
    if (!'aeioutnsr'.includes(char.toLowerCase())) {
      charDelay *= 1.2;
    }
    
    await element.type(char, { delay: 0 });
    await new Promise(r => setTimeout(r, charDelay));
    
    // Occasionally longer pause (thinking)
    if (Math.random() < 0.03) {
      await new Promise(r => setTimeout(r, 150 + Math.random() * 250));
    }
  }
}

// ============ STEALTH PAGE SETUP ============

async function setupStealthPage(targetPage) {
  // Random viewport (not always same size)
  const width = 1280 + Math.floor(Math.random() * 200);
  const height = 720 + Math.floor(Math.random() * 100);
  await targetPage.setViewport({ width, height });
  
  // Set timezone Indonesia
  await targetPage.emulateTimezone('Asia/Jakarta');
  
  // Additional stealth overrides (beyond stealth plugin)
  await targetPage.evaluateOnNewDocument(() => {
    // Override WebGL vendor/renderer to look like real hardware
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) return 'Intel Inc.';
      // UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.call(this, parameter);
    };
    
    // Fake battery API
    if (navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 0.85 + Math.random() * 0.15,
        addEventListener: () => {},
        removeEventListener: () => {}
      });
    }
    
    // Override connection info
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50 + Math.floor(Math.random() * 50),
        downlink: 10 + Math.random() * 5,
        saveData: false
      })
    });
    
    // Override hardware concurrency (CPU cores)
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 4 + Math.floor(Math.random() * 4)
    });
    
    // Override device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8
    });
    
    // Override max touch points
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 0 // Desktop
    });
  });
  
  log(`[Stealth] Page configured: ${width}x${height}, timezone: Asia/Jakarta`);
}

// ============ BROWSER LAUNCH WITH STEALTH ============

async function launchBrowserWithFallback() {
  const chromiumPath = CONFIG.CHROMIUM_PATH;
  
  // Advanced anti-detection browser args
  const browserArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-software-rasterizer',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--single-process',
    // === ANTI-DETECTION ARGS ===
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--disable-features=IsolateOrigins,site-per-process',
    '--flag-switches-begin',
    '--flag-switches-end',
    // Random window size (not predictable)
    `--window-size=${1280 + Math.floor(Math.random() * 200)},${720 + Math.floor(Math.random() * 100)}`,
  ];
  
  // Try system Chromium first
  if (chromiumPath && fs.existsSync(chromiumPath)) {
    try {
      log(`[Stealth] Launching browser with system Chromium: ${chromiumPath}`);
      const browser = await puppeteer.launch({
        headless: CONFIG.HEADLESS,
        executablePath: chromiumPath,
        args: browserArgs,
        timeout: 60000,
        protocolTimeout: 120000,
        ignoreDefaultArgs: ['--enable-automation']
      });
      log('[Stealth] Browser launched successfully with system Chromium');
      return browser;
    } catch (err) {
      log(`System Chromium failed: ${err.message}`, 'WARN');
      log('Trying Puppeteer bundled Chromium as fallback...', 'WARN');
    }
  }
  
  // Fallback: Let Puppeteer use its bundled browser
  try {
    log('[Stealth] Launching browser with Puppeteer bundled Chromium...');
    const browser = await puppeteer.launch({
      headless: CONFIG.HEADLESS,
      args: browserArgs,
      timeout: 60000,
      protocolTimeout: 120000,
      ignoreDefaultArgs: ['--enable-automation']
    });
    log('[Stealth] Browser launched successfully with Puppeteer bundled Chromium');
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
console.log('  BCA SCRAPER - STEALTH MODE v4.2.0');
console.log('==========================================');
console.log(`  Version      : ${SCRAPER_VERSION} (${SCRAPER_BUILD_DATE})`);
console.log(`  Platform     : ${SCRAPER_PLATFORM}`);
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
console.log('  v4.2.0 STEALTH FEATURES:');
console.log('  - puppeteer-extra-plugin-stealth');
console.log('  - Human-like mouse (Bezier curves)');
console.log('  - Random delays (Gaussian)');
console.log('  - WebGL/Canvas fingerprint spoof');
console.log('  - Random viewport size');
console.log('==========================================');
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
async function saveDebug(targetPage, name, type = 'png') {
  if (!CONFIG.DEBUG_MODE) return;
  try {
    if (type === 'png') {
      await targetPage.screenshot({ path: `debug-${name}.png`, fullPage: true });
      log(`Screenshot: debug-${name}.png`);
    } else {
      const html = await targetPage.content();
      fs.writeFileSync(`debug-${name}.html`, html);
      log(`HTML saved: debug-${name}.html`);
    }
  } catch (e) {
    log(`Debug save failed: ${e.message}`, 'WARN');
  }
}

// ============ ULTRA-ROBUST HELPERS ============

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

async function retryWithBackoff(fn, maxRetries = 3, operationName = 'operation') {
  const delays = [5000, 15000, 45000];
  
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
    return true;
  }
}

function shouldRestartBrowser() {
  if (!browserStartTime) return true;
  
  // NEVER restart during burst mode - it breaks the active session
  if (isBurstMode) {
    log('Skipping browser restart check - burst mode active');
    return false;
  }
  
  const uptime = Date.now() - browserStartTime;
  
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
  scrapeCount = 0;
  isLoggedIn = false;
  
  log('=== FORCE KILL COMPLETE, BROWSER RESTARTED ===');
}

// Calculate remaining cooldown time before next login allowed
function getLoginCooldownRemaining() {
  const timeSinceLastLogin = Date.now() - lastLoginTime;
  const remaining = LOGIN_COOLDOWN_MS - timeSinceLastLogin;
  return remaining > 0 ? remaining : 0;
}

async function sendHeartbeat(status = 'running') {
  try {
    const uptimeMinutes = browserStartTime ? Math.round((Date.now() - browserStartTime) / 60000) : 0;
    const loginCooldownRemaining = Math.round(getLoginCooldownRemaining() / 1000);
    
    const payload = {
      secret_key: CONFIG.SECRET_KEY,
      version: SCRAPER_VERSION,
      platform: SCRAPER_PLATFORM,
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

async function initBrowser() {
  log('[Stealth] Initializing browser with anti-detection...');
  
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
  
  // Setup stealth page with random viewport and fingerprint spoofing
  await setupStealthPage(page);
  
  // Set realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  page.setDefaultTimeout(CONFIG.TIMEOUT);
  page.setDefaultNavigationTimeout(CONFIG.TIMEOUT);
  
  // Navigate to blank page (idle state)
  await page.goto('about:blank');
  
  browserStartTime = Date.now();
  isIdle = true;
  
  log('[Stealth] Browser initialized with full anti-detection (standby mode)');
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
      log(`Watchdog: Browser healthy (uptime: ${uptime}m, scrapes: ${scrapeCount}, errors: ${errorCount})`);
      
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

async function safeLogout() {
  if (!page) return;
  
  log('Attempting safe logout with human behavior...');
  let loggedOut = false;
  
  // Method 1: Try clicking via Puppeteer frame API
  try {
    const frames = page.frames();
    
    for (const frame of frames) {
      try {
        const logoutLink = await frame.$('#gotohome > font > b > a');
        if (logoutLink) {
          await humanClick(page, logoutLink);
          log('Logout via #gotohome selector - SUCCESS');
          loggedOut = true;
          break;
        }
        
        const logoutByOnclick = await frame.$('a[onclick*="logout"]');
        if (logoutByOnclick) {
          await humanClick(page, logoutByOnclick);
          log('Logout via onclick attribute - SUCCESS');
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
  
  // Method 2: Execute goToPage() JavaScript function
  if (!loggedOut) {
    try {
      await safeFrameOperation(
        () => page.evaluate(() => {
          if (typeof goToPage === 'function') {
            goToPage('authentication.do?value(actions)=logout');
            return true;
          }
          
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
  
  // Method 3: Direct URL (last resort)
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
  
  await humanDelay(1500, 2500);
  isLoggedIn = false;
  
  if (loggedOut) {
    lastLogoutSuccess = true;
    lastLoginTime = 0;
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
    
    await humanDelay(2000, 4000);
    log('Page refreshed - clean state ready');
    return true;
  } catch (e) {
    log(`Refresh failed: ${e.message}`, 'ERROR');
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
  log('[enterCredentials] Finding input fields with human behavior...');
  
  try {
    const userIdInput = await frame.$('input#txt_user_id') || 
                        await frame.$('input[name="txt_user_id"]') ||
                        await frame.$('input[name="value(user_id)"]');
    
    const pinInput = await frame.$('input#txt_pswd') || 
                     await frame.$('input[name="txt_pswd"]') ||
                     await frame.$('input[type="password"]') ||
                     await frame.$('input[name="value(pswd)"]');
    
    if (userIdInput && pinInput) {
      // Human-like interaction
      await humanDelay(300, 600);
      await userIdInput.focus();
      await humanDelay(200, 400);
      await frame.evaluate(el => { el.value = ''; }, userIdInput);
      await humanDelay(100, 200);
      
      // Type with human-like speed
      await humanType(userIdInput, userId);
      log(`User ID entered (${userId.length} chars)`);
      
      await humanDelay(400, 800);
      
      await pinInput.focus();
      await humanDelay(200, 400);
      await frame.evaluate(el => { el.value = ''; }, pinInput);
      await humanDelay(100, 200);
      
      // Type PIN with human-like speed
      await humanType(pinInput, pin);
      log(`PIN entered (${pin.length} chars)`);
      
      return true;
    }
  } catch (e) {
    log(`Enter credentials failed: ${e.message}`, 'WARN');
  }
  
  return false;
}

async function submitLogin(frame) {
  log('Submitting login with human behavior...');
  
  try {
    const submitBtn = await frame.$('input[value="LOGIN"]') ||
                      await frame.$('input[type="submit"]') ||
                      await frame.$('input[name="value(Submit)"]');
    
    if (submitBtn) {
      // Human pause before clicking
      await humanDelay(500, 1000);
      
      // Try human click first
      const clicked = await humanClick(page, submitBtn);
      if (!clicked) {
        await submitBtn.click();
      }
      
      log('LOGIN button clicked');
      await humanDelay(2500, 4000);
      return true;
    }
  } catch (e) {
    log(`Submit failed: ${e.message}`, 'WARN');
  }
  
  return false;
}

// === SESSION REUSE WITH LOGIN COOLDOWN ===

async function isCurrentlyLoggedIn() {
  if (!page) return false;
  
  try {
    const frameCount = page.frames().length;
    if (frameCount < 5) {
      log(`Not logged in: only ${frameCount} frames (need 5)`);
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
    
    log(`Session active: ${frameCount} frames, no login form visible`);
    return true;
  } catch (e) {
    log(`Login check failed: ${e.message}`, 'WARN');
    return false;
  }
}

async function ensureLoggedIn() {
  // Check if already logged in
  if (await isCurrentlyLoggedIn()) {
    log('Session still active, reusing existing session');
    isLoggedIn = true;
    return true;
  }
  
  // Check cooldown
  const cooldownRemaining = getLoginCooldownRemaining();
  if (cooldownRemaining > 0) {
    if (lastLogoutSuccess) {
      log(`Cooldown skipped - previous logout was successful (${(cooldownRemaining / 1000).toFixed(0)}s remaining but ignored)`);
    } else {
      log(`Login cooldown active: waiting ${(cooldownRemaining / 1000).toFixed(0)}s (last logout may have failed)`, 'WARN');
      await delay(cooldownRemaining);
    }
  }
  
  lastLogoutSuccess = false;
  
  log('[Stealth] Performing fresh login with human behavior...');
  
  // Navigate to login page
  try {
    await humanDelay(500, 1000);
    await page.goto('https://ibank.klikbca.com/', { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.TIMEOUT 
    });
    await humanDelay(2000, 4000);
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
    if (await isCurrentlyLoggedIn()) {
      log('Already logged in after navigation');
      lastLoginTime = Date.now();
      isLoggedIn = true;
      scrapeCount++;
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
  
  // Login successful
  lastLoginTime = Date.now();
  isLoggedIn = true;
  scrapeCount++;
  
  log(`[Stealth] LOGIN SUCCESSFUL! (${finalFrameCount} frames loaded, cooldown reset)`);
  return true;
}

// === SCRAPE FUNCTIONS ===

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

async function executeScrape() {
  if (!isIdle) {
    log('Scraper busy, skipping...', 'WARN');
    return { success: false, reason: 'busy' };
  }
  
  isIdle = false;
  scrapeCount++;
  const startTime = Date.now();
  let mutations = [];
  
  log(`=== STARTING SCRAPE #${scrapeCount} (STEALTH MODE) ===`);
  
  try {
    // Pre-scrape checks
    if (!await isPageHealthy()) {
      log('Page unhealthy before scrape, restarting browser...', 'WARN');
      await forceKillAndRestart();
    }
    
    // Step 1: Refresh page to clear session
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
    
    // Step 3: Enter credentials with human behavior
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
    
    // Check if still on login page
    let loginFrame = await findLoginFrame();
    if (loginFrame) {
      log('Still on login page, trying again...');
      await enterCredentials(loginFrame.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
      await submitLogin(loginFrame.frame);
    }
    
    // Final login check
    const finalLoginCheck = await findLoginFrame();
    if (finalLoginCheck) {
      throw new Error('LOGIN_FAILED - still on login page');
    }
    
    if (await checkSessionExpired()) {
      throw new Error('SESSION_EXPIRED - detected after login attempt');
    }
    
    log('[Stealth] LOGIN SUCCESSFUL!');
    await saveDebug(page, '03-logged-in');
    
    // Step 5: Navigate to Mutasi Rekening with human delays
    log('Step 5: Navigating to Mutasi Rekening with human behavior...');
    await humanDelay(2000, 4000);
    
    const allFrames = page.frames();
    log(`Available frames: ${allFrames.map(f => f.name() || 'unnamed').join(', ')}`);
    
    const menuFrame = page.frames().find(f => f.name() === 'menu');
    log(`Menu frame found: ${menuFrame ? 'YES' : 'NO'}`);
    if (!menuFrame) {
      throw new Error('FRAME_NOT_FOUND - Menu frame');
    }
    
    // Click Informasi Rekening with human delay
    log('Clicking: Informasi Rekening...');
    await humanDelay(1000, 2000);
    const clickInfoResult = await safeFrameOperation(
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
    log(`Clicked Informasi Rekening: ${clickInfoResult ? 'SUCCESS' : 'FAILED'}`);
    if (!clickInfoResult) {
      throw new Error('CLICK_FAILED - Informasi Rekening not found in menu');
    }
    await humanDelay(3000, 6000);
    
    // Click Mutasi Rekening with human delay
    log('Clicking: Mutasi Rekening...');
    await humanDelay(1000, 2000);
    const updatedMenuFrame = page.frames().find(f => f.name() === 'menu');
    log(`Updated menu frame found: ${updatedMenuFrame ? 'YES' : 'NO'}`);
    const clickMutasiResult = await safeFrameOperation(
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
    log(`Clicked Mutasi Rekening: ${clickMutasiResult ? 'SUCCESS' : 'FAILED'}`);
    if (!clickMutasiResult) {
      throw new Error('CLICK_FAILED - Mutasi Rekening not found in menu');
    }
    await humanDelay(4000, 8000);
    
    // Step 6: Set date and view
    log('Step 6: Setting date filter with human behavior...');
    let atmFrame = page.frames().find(f => f.name() === 'atm');
    log(`ATM frame found: ${atmFrame ? 'YES' : 'NO'}`);
    if (!atmFrame) {
      throw new Error('FRAME_NOT_FOUND - ATM frame');
    }
    
    const today = getJakartaDate();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    const currentYear = today.getFullYear();
    
    log(`Setting date: ${day}/${month}/${currentYear} (Jakarta: ${getJakartaDateString()})`);
    
    await humanDelay(1000, 2000);
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
    
    // Click Lihat with human delay
    await humanDelay(1000, 2000);
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
    await humanDelay(3000, 5000);
    
    // Step 7: Parse mutations
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
    
    // Step 8: Logout with human behavior
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
    log(`Burst global timeout! Force restarting browser...`, 'ERROR');
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
  const maxDuration = 180000;
  let checkCount = 0;
  let matchFound = false;
  
  log(`=== STARTING BURST MODE v4.2.0 STEALTH ===`);
  log(`Session reuse: ${isLoggedIn ? 'checking...' : 'need login'}`);
  log(`Last login: ${lastLoginTime > 0 ? ((Date.now() - lastLoginTime) / 1000).toFixed(0) + 's ago' : 'never'}`);
  log(`Cooldown remaining: ${(getLoginCooldownRemaining() / 1000).toFixed(0)}s`);
  log(`Max iterations: ${maxIterations}, Max duration: ${maxDuration/1000}s`);
  
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
    
    log('[Stealth] Login successful, starting burst loop with human behavior');
    
    const today = getJakartaDate();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    const currentYear = today.getFullYear();
    
    // === BURST LOOP ===
    while (checkCount < maxIterations && (Date.now() - startTime < maxDuration)) {
      checkCount++;
      log(`--- Burst iteration #${checkCount}/${maxIterations} ---`);
      
      if (await checkSessionExpired()) {
        log('Session expired during burst loop, exiting...', 'WARN');
        break;
      }
      
      // Step 5: Navigate with human delays
      log('Step 5: Navigating to Mutasi Rekening...');
      
      const menuFrame = page.frames().find(f => f.name() === 'menu');
      if (!menuFrame) {
        log('Menu frame not found, exiting loop', 'WARN');
        break;
      }
      
      await humanDelay(1500, 3000);
      await safeFrameOperation(
        () => menuFrame.evaluate(() => {
          const links = document.querySelectorAll('a');
          for (const link of links) {
            const text = (link.textContent || '').toLowerCase();
            if (text.includes('informasi rekening')) { link.click(); return; }
          }
        }),
        CONFIG.FRAME_OPERATION_TIMEOUT,
        'CLICK_INFORMASI_REKENING_LOOP'
      );
      await humanDelay(3000, 5000);
      
      const updatedMenuFrame = page.frames().find(f => f.name() === 'menu');
      if (!updatedMenuFrame) {
        log('Updated menu frame not found', 'WARN');
        break;
      }
      
      await humanDelay(1000, 2000);
      await safeFrameOperation(
        () => updatedMenuFrame.evaluate(() => {
          const links = document.querySelectorAll('a');
          for (const link of links) {
            const text = (link.textContent || '').toLowerCase();
            if (text.includes('mutasi rekening')) { link.click(); return; }
          }
        }),
        CONFIG.FRAME_OPERATION_TIMEOUT,
        'CLICK_MUTASI_REKENING_LOOP'
      );
      await humanDelay(3000, 5000);
      
      // Step 6: Set Date + Click Lihat
      log('Step 6: Setting date and clicking Lihat...');
      
      let atmFrame = page.frames().find(f => f.name() === 'atm');
      if (!atmFrame) {
        log('ATM frame not found, exiting loop', 'WARN');
        break;
      }
      
      await humanDelay(800, 1500);
      await safeFrameOperation(
        () => atmFrame.evaluate((day, month) => {
          const startDt = document.querySelector('select[name="value(startDt)"]');
          const startMt = document.querySelector('select[name="value(startMt)"]');
          const endDt = document.querySelector('select[name="value(endDt)"]');
          const endMt = document.querySelector('select[name="value(endMt)"]');
          if (startDt && startMt && endDt && endMt) {
            startDt.value = day; startMt.value = month;
            endDt.value = day; endMt.value = month;
          }
        }, day, month),
        CONFIG.FRAME_OPERATION_TIMEOUT,
        'SET_DATE_LOOP'
      );
      
      await humanDelay(800, 1500);
      await safeFrameOperation(
        () => atmFrame.evaluate(() => {
          const buttons = document.querySelectorAll('input[type="submit"]');
          for (const btn of buttons) {
            if (btn.value.toLowerCase().includes('lihat')) {
              btn.click(); return;
            }
          }
        }),
        CONFIG.FRAME_OPERATION_TIMEOUT,
        'CLICK_LIHAT_LOOP'
      );
      await humanDelay(3000, 4000);
      
      // Re-grab atmFrame after Lihat click
      atmFrame = page.frames().find(f => f.name() === 'atm');
      if (!atmFrame) {
        log('ATM frame lost after Lihat click, exiting loop', 'WARN');
        break;
      }
      
      // Step 7: Parse Mutations
      log('Step 7: Parsing mutations...');
      
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
        'PARSE_MUTATIONS_LOOP'
      );
      
      log(`Found ${mutations.length} mutations in iteration #${checkCount}`);
      
      if (mutations.length > 0) {
        const result = await sendToWebhook(mutations);
        log(`Webhook result: ${JSON.stringify(result)}`);
        
        if (result.matched && result.matched > 0) {
          log(`🎯 MATCH FOUND! Payment verified at iteration #${checkCount}`);
          matchFound = true;
          break;
        }
      }
      
      const status = await checkBurstCommand();
      if (!status.burst_active) {
        log('Burst stopped by server');
        break;
      }
      
      log(`Iteration #${checkCount} complete, waiting before next...`);
      await humanDelay(2000, 3000);
    }
    
    log(`=== BURST LOOP ENDED ===`);
    log(`Iterations: ${checkCount}/${maxIterations}, Match found: ${matchFound}`);
    
    log('Session kept active for potential next iteration');
    
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
  log('=== STEALTH MODE SCHEDULER STARTED v4.2.0 ===');
  log(`Config URL: ${CONFIG_URL}`);
  log(`Poll interval: ${CONFIG.CONFIG_POLL_INTERVAL / 1000}s`);
  log(`Watchdog interval: ${CONFIG.WATCHDOG_INTERVAL / 1000}s`);
  log(`Heartbeat interval: ${CONFIG.HEARTBEAT_INTERVAL / 1000}s`);
  
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
        log(`Config fetch failed or inactive: ${config?.error || 'Unknown'}`, 'WARN');
        await delay(CONFIG.CONFIG_POLL_INTERVAL);
        continue;
      }
      
      const serverIntervalMs = (config.scrape_interval_minutes || 10) * 60 * 1000;
      if (serverIntervalMs !== currentIntervalMs) {
        log(`Interval changed: ${currentIntervalMs / 60000}m -> ${serverIntervalMs / 60000}m`);
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
          
          log('Post-burst cooldown: waiting 10s before next poll');
          await delay(10000);
        }
        continue;
      } else {
        if (isBurstMode) {
          log('=== BURST MODE ENDED ===');
          isBurstMode = false;
          await sendHeartbeat('running');
          
          log('Post-burst cooldown: waiting 10s before next poll');
          await delay(10000);
        }
      }
      
      if (config.is_active) {
        const timeSinceLastScrape = Date.now() - lastScrapeTime;
        
        if (timeSinceLastScrape >= currentIntervalMs) {
          log(`Time to scrape (${(timeSinceLastScrape / 60000).toFixed(1)}m since last)`);
          
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
