/**
 * BCA iBanking Scraper - WINDOWS RDP VERSION v4.2.0
 * 
 * Versi Windows dari BCA Scraper untuk dijalankan di Windows RDP.
 * Fitur sama dengan versi Linux, dengan penyesuaian untuk Windows.
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
 * - HYBRID PIN ENTRY: Uses evaluate+events to bypass JavaScript protection
 * 
 * Usage: node bca-scraper-windows.js
 */

// ============ SCRAPER VERSION ============
const SCRAPER_VERSION = "4.2.0-windows";
const SCRAPER_BUILD_DATE = "2025-12-29";
const SCRAPER_PLATFORM = "windows";
// v4.2.0-windows: Advanced stealth mode + human-like behavior + anti-detection
// v4.1.9-windows: Fixed config/burst fetch 401 - use POST instead of GET
// v4.1.8-windows: Fixed "Node not clickable" - use focus() instead of click()
// v4.1.7-windows: Fixed PIN entry - use evaluate+events hybrid approach
// v4.1.6-windows: Fixed login - sync with Linux version (findLoginFrame, enterCredentials)
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

// Load config from config.env (Windows path)
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

// Find Chrome/Chromium path for Windows
function findChromiumPath() {
  // Common Chrome installation paths on Windows
  const windowsPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Chromium\\Application\\chrome.exe',
    // Edge as fallback (Chromium-based)
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  
  for (const p of windowsPaths) {
    if (p && fs.existsSync(p)) {
      console.log(`[CHROMIUM] Found browser: ${p}`);
      return p;
    }
  }
  
  // Try Puppeteer bundled chromium
  try {
    const puppeteerPath = require('puppeteer').executablePath();
    if (puppeteerPath && fs.existsSync(puppeteerPath)) {
      console.log(`[CHROMIUM] Found Puppeteer bundled: ${puppeteerPath}`);
      return puppeteerPath;
    }
  } catch (e) {
    // Puppeteer not installed or no bundled browser
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
async function humanMouseMove(page, targetX, targetY) {
  const mouse = page.mouse;
  const viewport = page.viewport();
  
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
async function humanClick(page, element) {
  if (!element) return false;
  
  try {
    const box = await element.boundingBox();
    if (!box) return false;
    
    // Random position within element (not always center)
    const targetX = box.x + box.width * (0.25 + Math.random() * 0.5);
    const targetY = box.y + box.height * (0.25 + Math.random() * 0.5);
    
    log(`[Human] Moving mouse to (${Math.round(targetX)}, ${Math.round(targetY)})...`);
    
    // Move mouse like human with Bezier curve
    await humanMouseMove(page, targetX, targetY);
    
    // Small pause before click (thinking time)
    await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
    
    // Click with realistic timing (press and release)
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 30 + Math.random() * 70));
    await page.mouse.up();
    
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

// Random scroll behavior (human reads pages before clicking)
async function humanScroll(page) {
  if (Math.random() < 0.3) { // 30% chance to scroll
    const scrollAmount = 50 + Math.random() * 150;
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    await humanDelay(200, 500);
  }
}

// ============ STEALTH PAGE SETUP ============

async function setupStealthPage(page) {
  // Random viewport (not always same size)
  const width = 1280 + Math.floor(Math.random() * 200);
  const height = 720 + Math.floor(Math.random() * 100);
  await page.setViewport({ width, height });
  
  // Set timezone Indonesia
  await page.emulateTimezone('Asia/Jakarta');
  
  // Additional stealth overrides (beyond stealth plugin)
  await page.evaluateOnNewDocument(() => {
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
    // === ANTI-DETECTION ARGS ===
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--disable-features=IsolateOrigins,site-per-process',
    '--flag-switches-begin',
    '--flag-switches-end',
    // Random window size (not predictable)
    `--window-size=${1280 + Math.floor(Math.random() * 200)},${720 + Math.floor(Math.random() * 100)}`,
  ];
  
  // Try specified Chrome path first
  if (chromiumPath && fs.existsSync(chromiumPath)) {
    try {
      log(`[Stealth] Launching browser with: ${chromiumPath}`);
      const browser = await puppeteer.launch({
        headless: CONFIG.HEADLESS,
        executablePath: chromiumPath,
        args: browserArgs,
        timeout: 60000,
        protocolTimeout: 120000,
        ignoreDefaultArgs: ['--enable-automation']
      });
      log('[Stealth] Browser launched successfully');
      return browser;
    } catch (err) {
      log(`Chrome launch failed: ${err.message}`, 'WARN');
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
  WATCHDOG_INTERVAL: 300000,
  BURST_CHECK_URL: process.env.BURST_CHECK_URL || (process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL.replace('/bank-scraper-webhook', '/check-burst-command') : ''),
  GLOBAL_SCRAPE_TIMEOUT: parseInt(process.env.GLOBAL_SCRAPE_TIMEOUT) || 120000,
  MAX_SCRAPES_BEFORE_RESTART: parseInt(process.env.MAX_SCRAPES_BEFORE_RESTART) || 10,
  MAX_UPTIME_MS: parseInt(process.env.MAX_UPTIME_MS) || 7200000,
  FRAME_OPERATION_TIMEOUT: parseInt(process.env.FRAME_OPERATION_TIMEOUT) || 10000,
  HEARTBEAT_INTERVAL: parseInt(process.env.HEARTBEAT_INTERVAL) || 300000,
};

// Derive config URL from webhook URL
const CONFIG_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/get-scraper-config');
const HEARTBEAT_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/update-scraper-status');

// Validate config
if (CONFIG.BCA_USER_ID === 'YOUR_KLIKBCA_USER_ID' || CONFIG.BCA_USER_ID === 'your_bca_user_id') {
  console.error('ERROR: BCA_USER_ID belum dikonfigurasi!');
  console.error('Edit file config.env dan masukkan User ID KlikBCA Anda.');
  process.exit(1);
}

if (CONFIG.SECRET_KEY === 'YOUR_SECRET_KEY_HERE') {
  console.error('ERROR: SECRET_KEY belum dikonfigurasi!');
  console.error('Generate secret key di Bank Scraper Settings, lalu masukkan ke config.env');
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
console.log(`  Chrome Path  : ${CONFIG.CHROMIUM_PATH || 'NOT FOUND!'}`);
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
console.log('  WINDOWS RDP FEATURES:');
console.log(`  - Native Windows paths`);
console.log(`  - Chrome/Edge detection`);
console.log(`  - No systemd (use Task Scheduler)`);
console.log('  ULTRA-ROBUST FEATURES:');
console.log(`  - Global Timeout    : ${CONFIG.GLOBAL_SCRAPE_TIMEOUT / 1000}s`);
console.log(`  - Browser Restart   : Every 50 logins or ${CONFIG.MAX_UPTIME_MS / 3600000}h`);
console.log(`  - Frame Timeout     : ${CONFIG.FRAME_OPERATION_TIMEOUT / 1000}s`);
console.log(`  - Heartbeat         : Every ${CONFIG.HEARTBEAT_INTERVAL / 60000}m`);
console.log('==========================================');
console.log('');

// Check Chrome/Chromium existence
if (!CONFIG.CHROMIUM_PATH) {
  console.log('[WARN] Chrome/Chromium not found - will try Puppeteer bundled at runtime');
  console.log('[INFO] To install Chrome: Download from https://www.google.com/chrome/');
} else if (!fs.existsSync(CONFIG.CHROMIUM_PATH)) {
  console.log(`[WARN] Chrome path invalid: ${CONFIG.CHROMIUM_PATH} - will try fallback`);
} else {
  console.log(`[OK] Primary Chrome: ${CONFIG.CHROMIUM_PATH}`);
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

// Login cooldown tracking
let lastLoginTime = 0;
let isLoggedIn = false;
const LOGIN_COOLDOWN_MS = 300000;

// Track logout success
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

// Save debug screenshot (Windows paths)
async function saveDebug(page, name, type = 'png') {
  if (!CONFIG.DEBUG_MODE) return;
  try {
    const debugDir = path.join(__dirname, 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    if (type === 'png') {
      const filePath = path.join(debugDir, `debug-${name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      log(`Screenshot: ${filePath}`);
    } else {
      const html = await page.content();
      const filePath = path.join(debugDir, `debug-${name}.html`);
      fs.writeFileSync(filePath, html);
      log(`HTML saved: ${filePath}`);
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

// ============ HEARTBEAT ============

async function sendHeartbeat(status = 'running', extraData = {}) {
  try {
    const payload = {
      secret_key: CONFIG.SECRET_KEY,
      status,
      version: SCRAPER_VERSION,
      platform: SCRAPER_PLATFORM,
      uptime_ms: browserStartTime ? Date.now() - browserStartTime : 0,
      scrape_count: scrapeCount,
      error_count: errorCount,
      success_count: successCount,
      is_logged_in: isLoggedIn,
      is_burst_mode: isBurstMode,
      last_error: lastError,
      timestamp: new Date().toISOString(),
      jakarta_time: getJakartaDateString(),
      ...extraData
    };

    const response = await fetch(HEARTBEAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      log(`Heartbeat sent: ${status}`);
    } else {
      log(`Heartbeat failed: ${response.status}`, 'WARN');
    }
  } catch (e) {
    log(`Heartbeat error: ${e.message}`, 'WARN');
  }
}

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => sendHeartbeat('running'), CONFIG.HEARTBEAT_INTERVAL);
  log(`Heartbeat started (every ${CONFIG.HEARTBEAT_INTERVAL / 60000}m)`);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    log('Heartbeat stopped');
  }
}

// ============ FETCH CONFIG FROM SERVER ============

async function fetchServerConfig() {
  try {
    const response = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_key: CONFIG.SECRET_KEY }),
    });

    if (!response.ok) {
      log(`Config fetch failed: ${response.status}`, 'WARN');
      return null;
    }

    return await response.json();
  } catch (e) {
    log(`Config fetch error: ${e.message}`, 'WARN');
    return null;
  }
}

// ============ CHECK BURST COMMAND ============

async function checkBurstCommand() {
  if (!CONFIG.BURST_CHECK_URL) return { burst_active: false };
  
  try {
    const response = await fetch(CONFIG.BURST_CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_key: CONFIG.SECRET_KEY }),
    });

    if (!response.ok) {
      return { burst_active: false };
    }

    return await response.json();
  } catch (e) {
    log(`Burst check error: ${e.message}`, 'WARN');
    return { burst_active: false };
  }
}

// ============ BROWSER MANAGEMENT ============

async function initBrowser() {
  log('[Stealth] Initializing browser with anti-detection...');
  
  try {
    browser = await launchBrowserWithFallback();
    page = await browser.newPage();
    
    // Setup stealth page with random viewport and fingerprint spoofing
    await setupStealthPage(page);
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Handle dialog popups
    page.on('dialog', async dialog => {
      log(`Dialog: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });
    
    browserStartTime = Date.now();
    scrapeCount = 0;
    log('[Stealth] Browser initialized with full anti-detection');
    
    startHeartbeat();
    
    return true;
  } catch (e) {
    log(`Browser init failed: ${e.message}`, 'ERROR');
    lastError = e.message;
    errorCount++;
    return false;
  }
}

async function closeBrowser() {
  stopHeartbeat();
  
  if (browser) {
    try {
      await browser.close();
      log('Browser closed');
    } catch (e) {
      log(`Browser close error: ${e.message}`, 'WARN');
    }
    browser = null;
    page = null;
  }
  
  isLoggedIn = false;
}

async function restartBrowser() {
  log('Restarting browser...');
  await closeBrowser();
  await delay(2000);
  return await initBrowser();
}

// ============ LOGIN HELPERS (synced from Linux version) ============

async function findLoginFrame() {
  const frames = page.frames();
  log(`[findLoginFrame] Total frames on page: ${frames.length}`);
  
  const loginSelectors = [
    'input[name="value(user_id)"]',
    'input#txt_user_id',
    'input[name="txt_user_id"]',
    'input[name="user_id"]',
    'input#user_id'
  ];
  
  // Check main page first
  for (const selector of loginSelectors) {
    try {
      const mainInput = await page.$(selector);
      if (mainInput) {
        log(`[findLoginFrame] Login form found in MAIN PAGE with "${selector}"`);
        return { frame: page, isMainPage: true, selector };
      }
    } catch (e) {}
  }
  
  // Search all frames
  for (const selector of loginSelectors) {
    for (const frame of frames) {
      try {
        const input = await frame.$(selector);
        if (input) {
          const frameUrl = frame.url();
          log(`[findLoginFrame] Login form found in FRAME: ${frameUrl.substring(0, 50)}...`);
          return { frame, isMainPage: false, selector };
        }
      } catch (e) {}
    }
  }
  
  log('[findLoginFrame] Could not find login form in any frame!', 'ERROR');
  return null;
}

async function enterCredentials(frame, userId, pin) {
  log('[enterCredentials] Finding input fields...');
  
  // Multiple selector fallbacks for User ID (same order as Linux)
  const userIdInput = await frame.$('input#txt_user_id') || 
                      await frame.$('input[name="txt_user_id"]') ||
                      await frame.$('input[name="value(user_id)"]') ||
                      await frame.$('input[name="user_id"]');
  
  // Multiple selector fallbacks for PIN (same order as Linux)
  const pinInput = await frame.$('input#txt_pswd') || 
                   await frame.$('input[name="txt_pswd"]') ||
                   await frame.$('input[type="password"]') ||
                   await frame.$('input[name="value(pswd)"]');
  
  if (!userIdInput) {
    throw new Error('Could not find User ID input field');
  }
  
  if (!pinInput) {
    throw new Error('Could not find PIN input field');
  }
  
  log('[enterCredentials] Found both input fields');
  
  // === USER ID: Human-like interaction ===
  await humanDelay(300, 600);
  await userIdInput.focus();
  await humanDelay(200, 400);
  await frame.evaluate(el => { el.value = ''; }, userIdInput);
  await humanDelay(100, 200);
  
  // Type with human-like speed
  await humanType(userIdInput, userId);
  log(`[enterCredentials] User ID entered (${userId.length} chars)`);
  
  await humanDelay(400, 800);
  
  // === PIN: Human-like interaction ===
  await pinInput.focus();
  await humanDelay(200, 400);
  await frame.evaluate(el => { el.value = ''; }, pinInput);
  await humanDelay(100, 200);
  
  // Type PIN with human-like speed
  await humanType(pinInput, pin);
  
  // Verify
  await humanDelay(200, 400);
  const pinLength = await frame.evaluate(el => el.value.length, pinInput);
  log(`[enterCredentials] PIN entered: ${pinLength} chars`);
  
  // Fallback if type() failed
  if (pinLength !== pin.length) {
    log('[enterCredentials] Fallback: using evaluate + events...');
    
    await frame.evaluate((el, pinValue) => {
      el.value = '';
      el.value = pinValue;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, pinInput, pin);
    
    const retryLength = await frame.evaluate(el => el.value.length, pinInput);
    log(`[enterCredentials] After fallback: ${retryLength} chars`);
    
    if (retryLength === 0) {
      throw new Error('PIN_ENTRY_FAILED');
    }
  }
  
  return true;
}

// ============ BCA LOGIN ============

async function bcaLogin() {
  // Check cooldown
  const now = Date.now();
  const timeSinceLastLogin = now - lastLoginTime;
  
  // Skip cooldown if last logout was successful
  if (!lastLogoutSuccess && timeSinceLastLogin < LOGIN_COOLDOWN_MS) {
    const waitTime = Math.ceil((LOGIN_COOLDOWN_MS - timeSinceLastLogin) / 1000);
    log(`Login cooldown active. Waiting ${waitTime}s...`);
    await delay(LOGIN_COOLDOWN_MS - timeSinceLastLogin);
  }
  
  log('[Stealth] Starting BCA login with human behavior...');
  lastLogoutSuccess = false; // Reset for next cycle
  
  // Validate credentials before attempting login
  if (!CONFIG.BCA_PIN || CONFIG.BCA_PIN === 'YOUR_KLIKBCA_PIN' || CONFIG.BCA_PIN.length < 4) {
    throw new Error('BCA_PIN tidak valid - cek config.env');
  }
  
  if (!CONFIG.BCA_USER_ID || CONFIG.BCA_USER_ID === 'YOUR_KLIKBCA_USER_ID') {
    throw new Error('BCA_USER_ID tidak valid - cek config.env');
  }
  
  log(`[bcaLogin] Credentials check: User ID=${CONFIG.BCA_USER_ID.length} chars, PIN=${CONFIG.BCA_PIN.length} chars`);
  
  try {
    // Human-like delay before navigation
    await humanDelay(500, 1000);
    
    await page.goto('https://ibank.klikbca.com/', { 
      waitUntil: 'networkidle2',
      timeout: CONFIG.LOGIN_TIMEOUT 
    });
    
    // Human reads the page before interacting
    await humanDelay(2000, 4000);
    await humanScroll(page);
    
    await saveDebug(page, 'login-page');
    
    // Find login form (might be in iframe)
    const loginResult = await findLoginFrame();
    if (!loginResult) {
      await saveDebug(page, 'login-no-form');
      throw new Error('Could not find login form on page');
    }
    
    const { frame } = loginResult;
    
    // Enter credentials with human-like behavior
    await enterCredentials(frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
    
    // Human pause before clicking submit
    await humanDelay(500, 1000);
    
    // Find submit button with multiple fallbacks
    const submitBtn = await frame.$('input[type="submit"]') ||
                      await frame.$('input[name="value(Submit)"]') ||
                      await frame.$('button[type="submit"]') ||
                      await frame.$('input[value="LOGIN"]');
    
    if (!submitBtn) {
      await saveDebug(page, 'login-no-submit');
      throw new Error('Could not find submit button');
    }
    
    log('[bcaLogin] Clicking submit button with human behavior...');
    
    // Human-like click on submit
    const clicked = await humanClick(page, submitBtn);
    if (!clicked) {
      // Fallback to regular click
      await submitBtn.click();
    }
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.LOGIN_TIMEOUT });
    
    // Human reads the result page
    await humanDelay(2000, 4000);
    
    // Check if login successful (should have multiple frames)
    const frameCount = page.frames().length;
    log(`Post-login frame count: ${frameCount}`);
    
    if (frameCount < 3) {
      await saveDebug(page, 'login-failed');
      throw new Error('Login failed - still on login page or insufficient frames');
    }
    
    lastLoginTime = Date.now();
    isLoggedIn = true;
    log('[Stealth] BCA login successful!');
    
    await saveDebug(page, 'login-success');
    return true;
    
  } catch (e) {
    log(`BCA login failed: ${e.message}`, 'ERROR');
    lastError = e.message;
    errorCount++;
    isLoggedIn = false;
    await saveDebug(page, 'login-error');
    throw e;
  }
}

// ============ SAFE LOGOUT ============

async function safeLogout() {
  if (!isLoggedIn || !page) {
    log('Not logged in, skipping logout');
    return;
  }
  
  log('Performing safe logout...');
  
  try {
    const frames = page.frames();
    let menuFrame = null;
    
    for (const frame of frames) {
      try {
        const hasLogout = await frame.$('#gotohome');
        if (hasLogout) {
          menuFrame = frame;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (menuFrame) {
      const logoutBtn = await menuFrame.$('#gotohome');
      await humanClick(page, logoutBtn);
      await humanDelay(1500, 2500);
      log('Logout successful via #gotohome');
      lastLogoutSuccess = true;
    } else {
      // Try goToPage function
      for (const frame of frames) {
        try {
          await frame.evaluate(() => {
            if (typeof goToPage === 'function') {
              goToPage('logout');
            }
          });
          await humanDelay(1500, 2500);
          log('Logout successful via goToPage');
          lastLogoutSuccess = true;
          break;
        } catch (e) {
          continue;
        }
      }
    }
    
    isLoggedIn = false;
    
  } catch (e) {
    log(`Logout error (non-fatal): ${e.message}`, 'WARN');
    isLoggedIn = false;
  }
}

// ============ SCRAPE MUTATIONS ============

async function scrapeMutations() {
  log('[Stealth] Starting mutation scrape with human behavior...');
  
  try {
    // Navigate to Informasi Rekening
    const frames = page.frames();
    log(`[Step 5] Available frames: ${frames.length}`);
    
    // List all frames for debugging
    frames.forEach((f, i) => {
      log(`  Frame ${i}: ${f.name() || '(no name)'} - ${f.url().substring(0, 50)}`);
    });
    
    // Find menu frame
    let menuFrame = null;
    for (const frame of frames) {
      const frameName = frame.name();
      if (frameName === 'menu' || frameName.includes('menu')) {
        menuFrame = frame;
        log(`[Step 5] Found menu frame: ${frameName}`);
        break;
      }
    }
    
    if (!menuFrame) {
      // Try to find by content
      for (const frame of frames) {
        try {
          const hasAccountInfo = await frame.$('a[href*="accountstmt"]') || 
                                 await frame.$('a:contains("Informasi Rekening")') ||
                                 await frame.evaluate(() => document.body.textContent.includes('Informasi Rekening'));
          if (hasAccountInfo) {
            menuFrame = frame;
            log(`[Step 5] Found menu frame by content`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!menuFrame) {
      throw new Error('FRAME_NOT_FOUND: Menu frame not found');
    }
    
    // Human delay before clicking
    await humanDelay(2000, 4000);
    
    // Click Informasi Rekening
    log('[Step 5] Clicking Informasi Rekening...');
    try {
      const infoLink = await menuFrame.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.find(link => link.textContent.includes('Informasi Rekening'));
      });
      
      if (infoLink) {
        await humanClick(page, infoLink);
      } else {
        await menuFrame.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          for (const link of links) {
            if (link.textContent.includes('Informasi Rekening')) {
              link.click();
              return true;
            }
          }
          if (typeof goToPage === 'function') {
            goToPage('accountstmt.do');
            return true;
          }
          return false;
        });
      }
      log('[Step 5] Informasi Rekening click: SUCCESS');
    } catch (e) {
      log(`[Step 5] Informasi Rekening click: FAILED - ${e.message}`, 'ERROR');
      throw new Error('CLICK_FAILED: Informasi Rekening');
    }
    
    // Human reads the page
    await humanDelay(3000, 6000);
    
    // Click Mutasi Rekening
    log('[Step 5] Clicking Mutasi Rekening...');
    try {
      const mutasiLink = await menuFrame.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.find(link => link.textContent.includes('Mutasi Rekening'));
      });
      
      if (mutasiLink) {
        await humanClick(page, mutasiLink);
      } else {
        await menuFrame.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          for (const link of links) {
            if (link.textContent.includes('Mutasi Rekening')) {
              link.click();
              return true;
            }
          }
          if (typeof goToPage === 'function') {
            goToPage('balanceinquiry.do');
            return true;
          }
          return false;
        });
      }
      log('[Step 5] Mutasi Rekening click: SUCCESS');
    } catch (e) {
      log(`[Step 5] Mutasi Rekening click: FAILED - ${e.message}`, 'ERROR');
      throw new Error('CLICK_FAILED: Mutasi Rekening');
    }
    
    // Human reads and thinks
    await humanDelay(4000, 8000);
    
    // [Step 6] Set date and click Lihat
    log('[Step 6] Setting date range and clicking Lihat...');
    
    // Re-grab frames after navigation
    const updatedFrames = page.frames();
    let atmFrame = null;
    
    for (const frame of updatedFrames) {
      const frameName = frame.name();
      if (frameName === 'atm' || frameName.includes('atm')) {
        atmFrame = frame;
        log(`[Step 6] Found atm frame: ${frameName}`);
        break;
      }
    }
    
    if (!atmFrame) {
      // Try to find by content
      for (const frame of updatedFrames) {
        try {
          const hasDateInput = await frame.$('input[name*="date"]') ||
                               await frame.$('select[name*="date"]');
          if (hasDateInput) {
            atmFrame = frame;
            log(`[Step 6] Found atm frame by date input`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!atmFrame) {
      throw new Error('FRAME_NOT_FOUND: ATM frame not found');
    }
    
    // Set today's date
    const today = getJakartaDate();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    
    log(`[Step 6] Setting date: ${day}/${month}/${year}`);
    
    // Human delay before interacting with form
    await humanDelay(1000, 2000);
    
    try {
      await atmFrame.select('select[name="value(startDt)"]', day);
      await humanDelay(200, 400);
      await atmFrame.select('select[name="value(startMt)"]', month);
      await humanDelay(200, 400);
      await atmFrame.select('select[name="value(startYr)"]', String(year));
      await humanDelay(300, 600);
      await atmFrame.select('select[name="value(endDt)"]', day);
      await humanDelay(200, 400);
      await atmFrame.select('select[name="value(endMt)"]', month);
      await humanDelay(200, 400);
      await atmFrame.select('select[name="value(endYr)"]', String(year));
    } catch (e) {
      log(`Date selection warning: ${e.message}`, 'WARN');
    }
    
    // Human pause before clicking Lihat
    await humanDelay(1000, 2000);
    
    // Click Lihat button with human behavior
    const lihatBtn = await atmFrame.$('input[name="value(submit1)"]') || 
                     await atmFrame.$('input[type="submit"]');
    if (lihatBtn) {
      await humanClick(page, lihatBtn);
    } else {
      await atmFrame.click('input[name="value(submit1)"], input[type="submit"]');
    }
    
    // Human waits for results
    await humanDelay(3000, 5000);
    
    // [Step 7] Parse results
    log('[Step 7] Parsing mutation results...');
    
    // Re-grab atm frame after Lihat click
    const finalFrames = page.frames();
    let resultFrame = null;
    
    for (const frame of finalFrames) {
      const frameName = frame.name();
      if (frameName === 'atm' || frameName.includes('atm')) {
        resultFrame = frame;
        break;
      }
    }
    
    if (!resultFrame) {
      resultFrame = atmFrame; // Fallback to previous reference
    }
    
    const mutations = await resultFrame.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          const dateCell = cells[0]?.textContent?.trim();
          const descCell = cells[1]?.textContent?.trim();
          const amountCell = cells[2]?.textContent?.trim();
          
          if (dateCell && descCell && amountCell) {
            // Parse amount
            const amountStr = amountCell.replace(/[^\d.-]/g, '');
            const amount = parseFloat(amountStr) || 0;
            
            if (amount !== 0) {
              results.push({
                date: dateCell,
                description: descCell,
                amount: Math.abs(amount),
                type: amountCell.includes('CR') || amount > 0 ? 'credit' : 'debit'
              });
            }
          }
        }
      });
      
      return results;
    });
    
    log(`[Step 7] Found ${mutations.length} mutations`);
    
    scrapeCount++;
    successCount++;
    
    return mutations;
    
  } catch (e) {
    log(`Scrape failed: ${e.message}`, 'ERROR');
    lastError = e.message;
    errorCount++;
    await saveDebug(page, 'scrape-error');
    throw e;
  }
}

// ============ SEND TO WEBHOOK ============

async function sendToWebhook(mutations) {
  try {
    const payload = {
      secret_key: CONFIG.SECRET_KEY,
      mutations,
      version: SCRAPER_VERSION,
      platform: SCRAPER_PLATFORM,
      timestamp: new Date().toISOString(),
      jakarta_time: getJakartaDateString()
    };
    
    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.success) {
      log(`Webhook success: ${mutations.length} mutations sent, ${result.matched || 0} matched`);
      return result;
    } else {
      log(`Webhook error: ${result.error}`, 'WARN');
      return result;
    }
    
  } catch (e) {
    log(`Webhook send failed: ${e.message}`, 'ERROR');
    return { success: false, error: e.message };
  }
}

// ============ MAIN SCRAPE CYCLE ============

async function runScrapeCycle(isBurst = false) {
  if (!isIdle) {
    log('Scrape already in progress, skipping');
    return;
  }
  
  isIdle = false;
  log(`[Stealth] Starting scrape cycle (burst: ${isBurst})`);
  
  try {
    // Check if browser is healthy
    const healthy = await isPageHealthy();
    if (!healthy) {
      log('Page unhealthy, restarting browser...');
      await restartBrowser();
    }
    
    // Check if need to restart browser
    const uptime = browserStartTime ? Date.now() - browserStartTime : 0;
    if (scrapeCount >= CONFIG.MAX_SCRAPES_BEFORE_RESTART || uptime >= CONFIG.MAX_UPTIME_MS) {
      log(`Browser restart needed (scrapes: ${scrapeCount}, uptime: ${Math.round(uptime/60000)}m)`);
      await restartBrowser();
    }
    
    // Login if not logged in
    if (!isLoggedIn) {
      await bcaLogin();
    }
    
    // Scrape mutations
    const mutations = await scrapeMutations();
    
    // Send to webhook
    const result = await sendToWebhook(mutations);
    
    // Check for match in burst mode
    if (isBurst && result.matched > 0) {
      log('Payment matched! Stopping burst mode.');
      isBurstMode = false;
    }
    
    lastScrapeTime = Date.now();
    
  } catch (e) {
    log(`Scrape cycle failed: ${e.message}`, 'ERROR');
    
    const errorType = categorizeError(e);
    log(`Error type: ${errorType}`);
    
    // Handle different error types
    if (errorType === ERROR_TYPES.SESSION_EXPIRED || errorType === ERROR_TYPES.BROWSER_CRASHED) {
      await restartBrowser();
    } else if (errorType === ERROR_TYPES.LOGIN_FAILED) {
      isLoggedIn = false;
    }
    
  } finally {
    isIdle = true;
  }
}

// ============ BURST MODE HANDLER ============

async function runBurstMode(config) {
  log(`[Stealth] Starting burst mode: ${config.duration_seconds}s @ ${config.interval_seconds}s interval`);
  
  isBurstMode = true;
  burstEndTime = Date.now() + (config.duration_seconds * 1000);
  
  let iteration = 0;
  const maxIterations = Math.ceil(config.duration_seconds / config.interval_seconds);
  
  while (isBurstMode && Date.now() < burstEndTime && iteration < maxIterations) {
    iteration++;
    log(`Burst iteration ${iteration}/${maxIterations}`);
    
    await runScrapeCycle(true);
    
    // Check if burst should continue
    if (!isBurstMode) {
      log('Burst stopped (match found or manual stop)');
      break;
    }
    
    // Wait for next iteration with human-like variance
    if (Date.now() < burstEndTime) {
      const waitTime = config.interval_seconds * 1000 + Math.floor(Math.random() * 2000 - 1000);
      await delay(Math.max(5000, waitTime));
    }
  }
  
  log('Burst mode ended');
  isBurstMode = false;
  
  // Logout after burst
  await safeLogout();
  
  // Post-burst cooldown
  log('Post-burst cooldown: 10s');
  await delay(10000);
}

// ============ MAIN LOOP ============

async function main() {
  log('[Stealth] Starting BCA Scraper (Windows RDP) v4.2.0...');
  
  // Initialize browser
  const success = await initBrowser();
  if (!success) {
    log('Failed to initialize browser. Exiting.', 'ERROR');
    process.exit(1);
  }
  
  // Send startup heartbeat
  await sendHeartbeat('started');
  
  // Main loop
  while (true) {
    try {
      // Fetch server config
      const serverConfig = await fetchServerConfig();
      
      if (serverConfig) {
        // Update interval from server
        if (serverConfig.scrape_interval_minutes) {
          currentIntervalMs = serverConfig.scrape_interval_minutes * 60 * 1000;
        }
        
        // Check if scraper is active
        if (!serverConfig.is_active) {
          log('Scraper disabled on server. Waiting...');
          await delay(60000);
          continue;
        }
      }
      
      // Check for burst command
      const burstCommand = await checkBurstCommand();
      
      if (burstCommand && burstCommand.burst_in_progress) {
        // Run burst mode
        await runBurstMode({
          interval_seconds: burstCommand.burst_interval_seconds || 10,
          duration_seconds: burstCommand.burst_duration_seconds || 120
        });
      } else {
        // Normal mode - check if it's time to scrape
        const timeSinceLastScrape = Date.now() - lastScrapeTime;
        
        if (timeSinceLastScrape >= currentIntervalMs) {
          await runScrapeCycle(false);
          
          // Logout after normal scrape
          await safeLogout();
        } else {
          // Wait until next scrape time
          const waitTime = Math.min(currentIntervalMs - timeSinceLastScrape, 60000);
          await delay(waitTime);
        }
      }
      
    } catch (e) {
      log(`Main loop error: ${e.message}`, 'ERROR');
      await delay(30000);
    }
  }
}

// ============ GRACEFUL SHUTDOWN ============

process.on('SIGINT', async () => {
  log('Received SIGINT, shutting down...');
  await sendHeartbeat('stopped');
  await safeLogout();
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('Received SIGTERM, shutting down...');
  await sendHeartbeat('stopped');
  await safeLogout();
  await closeBrowser();
  process.exit(0);
});

// Start
main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
