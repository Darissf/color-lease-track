/**
 * BCA iBanking Scraper - PERSISTENT BROWSER MODE
 * 
 * Features:
 * - Browser standby 24/7, siap dipakai kapan saja
 * - Page refresh untuk clear session sebelum setiap scrape
 * - Watchdog mechanism untuk restart jika browser crash
 * - Single daemon yang handle normal + burst mode
 * 
 * Usage: node bca-scraper.js
 * 
 * Arsitektur Baru:
 * - Browser di-launch saat startup, tidak ditutup
 * - Setiap scrape dimulai dengan page refresh (clear session)
 * - Watchdog check setiap 5 menit untuk ensure browser responsive
 */

// ============ SCRAPER VERSION ============
const SCRAPER_VERSION = "3.0.0";
const SCRAPER_BUILD_DATE = "2025-12-29";
// v3.0.0: Persistent Browser Mode - browser standby 24/7, page refresh untuk clear session
// v2.1.2: Added forceLogout on error/stuck - session always cleaned up
// v2.1.1: Fixed button click stuck - using Promise.race with timeout
// v2.1.0: Fixed timezone bug - now uses WIB (Asia/Jakarta) instead of UTC
// v2.0.0: Optimized burst mode - login 1x, loop Kembali+Lihat
// =========================================

const puppeteer = require('puppeteer');
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
  CHROMIUM_PATH: process.env.CHROMIUM_PATH || findChromiumPath(),
  DEBUG_MODE: process.env.DEBUG_MODE !== 'false',
  CONFIG_POLL_INTERVAL: 60000,
  WATCHDOG_INTERVAL: 300000, // 5 minutes
  BURST_CHECK_URL: process.env.BURST_CHECK_URL || (process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL.replace('/bank-scraper-webhook', '/check-burst-command') : ''),
};

// Derive config URL from webhook URL
const CONFIG_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/get-scraper-config');

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
console.log('  BCA SCRAPER - PERSISTENT BROWSER MODE');
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
console.log('');

// Check Chromium existence
if (!CONFIG.CHROMIUM_PATH) {
  console.error('!!! CRITICAL ERROR: Chromium browser not found !!!');
  console.error('Please install with: apt install chromium-browser');
  process.exit(1);
}

if (!fs.existsSync(CONFIG.CHROMIUM_PATH)) {
  console.error(`!!! CRITICAL ERROR: Chromium not found at: ${CONFIG.CHROMIUM_PATH} !!!`);
  process.exit(1);
}

console.log(`[OK] Chromium verified at: ${CONFIG.CHROMIUM_PATH}`);
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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min + 1)) + min);
const log = (msg, level = 'INFO') => console.log(`[${new Date().toISOString()}] [${level}] ${msg}`);

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
    const { execSync } = require('child_process');
    execSync('pkill -f "chromium.*puppeteer" 2>/dev/null || true', { stdio: 'ignore' });
    log('Cleaned up orphan Chromium processes');
  } catch (e) {}
  
  await delay(2000);
  
  // Launch new browser
  browser = await puppeteer.launch({
    headless: CONFIG.HEADLESS ? 'new' : false,
    slowMo: CONFIG.SLOW_MO,
    executablePath: CONFIG.CHROMIUM_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ],
  });
  
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
 * Watchdog - check if browser is responsive
 */
async function watchdog() {
  if (!browser || !page) {
    log('Watchdog: Browser not initialized, restarting...', 'WARN');
    await initBrowser();
    return;
  }
  
  try {
    // Simple health check - try to evaluate something
    const result = await Promise.race([
      page.evaluate(() => true),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
    ]);
    
    if (result === true) {
      const uptime = Math.round((Date.now() - browserStartTime) / 60000);
      log(`Watchdog: Browser healthy (uptime: ${uptime}m, scrapes: ${scrapeCount})`);
    }
  } catch (e) {
    log(`Watchdog: Browser unresponsive (${e.message}), restarting...`, 'WARN');
    await initBrowser();
  }
}

/**
 * Safe logout with timeout protection
 */
async function safeLogout() {
  if (!page) return;
  
  log('Attempting safe logout...');
  
  try {
    const logoutPromise = page.evaluate(() => {
      // Try to find and click logout link
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = (link.textContent || '').toLowerCase();
        const href = (link.getAttribute('href') || '').toLowerCase();
        if (text.includes('logout') || text.includes('keluar') || href.includes('logout')) {
          link.click();
          return { success: true, method: 'link_click' };
        }
      }
      
      // Check iframes
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
                return { success: true, method: 'iframe_link_click' };
              }
            }
          }
        } catch (e) {}
      }
      
      return { success: false };
    });
    
    const timeoutPromise = new Promise(resolve => 
      setTimeout(() => resolve({ success: false, timeout: true }), 5000)
    );
    
    const result = await Promise.race([logoutPromise, timeoutPromise]);
    
    if (result.success) {
      await delay(2000);
      log(`Safe logout successful via ${result.method}`);
    } else if (result.timeout) {
      log('Logout timeout - will be cleared on next page refresh');
    }
    
    // Try direct URL navigation as backup
    try {
      await page.goto('https://ibank.klikbca.com/logout.do', { 
        timeout: 5000,
        waitUntil: 'domcontentloaded' 
      });
      await delay(1000);
    } catch (e) {}
    
  } catch (e) {
    log(`Safe logout error: ${e.message}`, 'WARN');
  }
}

/**
 * Refresh page to clear any stuck session
 * This is the KEY feature of persistent mode
 */
async function refreshToCleanState() {
  log('Refreshing page to clear session...');
  
  try {
    // First try to logout if we're logged in
    await safeLogout();
    
    // Navigate to login page (fresh start)
    await page.goto('https://ibank.klikbca.com/', { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.TIMEOUT 
    });
    
    await delay(2000);
    log('Page refreshed - clean state ready');
    return true;
  } catch (e) {
    log(`Refresh failed: ${e.message}`, 'ERROR');
    // If refresh fails, restart browser
    await initBrowser();
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

// === SCRAPE FUNCTIONS ===

/**
 * Execute a single scrape (normal mode)
 * Uses the persistent browser, starts with page refresh
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
    // Step 1: Refresh page to clear any stuck session
    await refreshToCleanState();
    await saveDebug(page, '01-login-page');
    
    // Step 2: Find login frame
    const frameResult = await findLoginFrame();
    if (!frameResult) {
      throw new Error('Could not find login form');
    }
    
    const { frame, isMainPage } = frameResult;
    log(`Using ${isMainPage ? 'main page' : 'iframe'} for login`);
    
    // Step 3: Enter credentials
    const credentialsEntered = await enterCredentials(frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
    if (!credentialsEntered) {
      throw new Error('Failed to enter credentials');
    }
    
    await saveDebug(page, '02-credentials-entered');
    
    // Step 4: Submit login
    const submitted = await submitLogin(frame);
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
      throw new Error('Login failed - still on login page');
    }
    
    log('LOGIN SUCCESSFUL!');
    await saveDebug(page, '03-logged-in');
    
    // Step 5: Navigate to Mutasi Rekening
    await delay(2000);
    
    const menuFrame = page.frames().find(f => f.name() === 'menu');
    if (!menuFrame) {
      throw new Error('Menu frame not found');
    }
    
    // Click Informasi Rekening
    await menuFrame.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = (link.textContent || '').toLowerCase();
        if (text.includes('informasi rekening') || text.includes('account information')) {
          link.click();
          return true;
        }
      }
      return false;
    });
    await delay(3000);
    
    // Click Mutasi Rekening
    const updatedMenuFrame = page.frames().find(f => f.name() === 'menu');
    await updatedMenuFrame.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = (link.textContent || '').toLowerCase();
        if (text.includes('mutasi rekening') || text.includes('account statement')) {
          link.click();
          return true;
        }
      }
      return false;
    });
    await delay(3000);
    
    // Step 6: Set date and view
    let atmFrame = page.frames().find(f => f.name() === 'atm');
    if (!atmFrame) {
      throw new Error('ATM frame not found');
    }
    
    const today = getJakartaDate();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    const currentYear = today.getFullYear();
    
    log(`Setting date: ${day}/${month}/${currentYear} (Jakarta: ${getJakartaDateString()})`);
    
    await atmFrame.evaluate((day, month) => {
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
    }, day, month);
    
    // Click Lihat with timeout protection
    const clickPromise = atmFrame.evaluate(() => {
      const buttons = document.querySelectorAll('input[type="submit"], input[value*="Lihat"], input[value*="View"]');
      for (const btn of buttons) {
        if (btn.value.toLowerCase().includes('lihat') || btn.value.toLowerCase().includes('view') || btn.type === 'submit') {
          btn.click();
          return { success: true };
        }
      }
      return { success: false };
    });
    
    const timeoutPromise = new Promise(resolve => 
      setTimeout(() => resolve({ success: true, timeout: true }), 5000)
    );
    
    await Promise.race([clickPromise, timeoutPromise]);
    await delay(3000);
    
    // Step 7: Parse mutations
    atmFrame = page.frames().find(f => f.name() === 'atm');
    await saveDebug(page, '04-mutations-result');
    
    const parseResult = await atmFrame.evaluate((year) => {
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
    }, currentYear);
    
    mutations = parseResult || [];
    log(`Found ${mutations.length} credit mutations`);
    
    // Step 8: Logout
    await safeLogout();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`=== SCRAPE COMPLETED in ${duration}s ===`);
    
    return { success: true, mutations, duration };
    
  } catch (error) {
    log(`Scrape error: ${error.message}`, 'ERROR');
    await saveDebug(page, 'error-state');
    await safeLogout();
    
    // Restart browser on error
    await initBrowser();
    
    return { success: false, error: error.message };
  } finally {
    isIdle = true;
    lastScrapeTime = Date.now();
  }
}

/**
 * Execute burst mode scrape
 * Login once, then loop Kembali + Lihat
 */
async function executeBurstScrape() {
  if (!isIdle) {
    log('Scraper busy, skipping burst...', 'WARN');
    return { success: false, reason: 'busy' };
  }
  
  isIdle = false;
  scrapeCount++;
  const startTime = Date.now();
  
  const maxIterations = 24;
  const maxDuration = 150000; // 2.5 minutes
  let checkCount = 0;
  let matchFound = false;
  
  log(`=== STARTING BURST MODE SCRAPE #${scrapeCount} ===`);
  
  try {
    // Step 1: Refresh and login
    await refreshToCleanState();
    
    const frameResult = await findLoginFrame();
    if (!frameResult) {
      throw new Error('Could not find login form');
    }
    
    await enterCredentials(frameResult.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
    await submitLogin(frameResult.frame);
    await delay(3000);
    
    let loginFrame = await findLoginFrame();
    if (loginFrame) {
      await enterCredentials(loginFrame.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
      await submitLogin(loginFrame.frame);
      await delay(3000);
    }
    
    const finalLoginCheck = await findLoginFrame();
    if (finalLoginCheck) {
      throw new Error('Login failed');
    }
    
    log('LOGIN SUCCESSFUL!');
    
    // Step 2: Navigate to Mutasi Rekening
    await delay(2000);
    
    const menuFrame = page.frames().find(f => f.name() === 'menu');
    if (!menuFrame) throw new Error('Menu frame not found');
    
    await menuFrame.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = (link.textContent || '').toLowerCase();
        if (text.includes('informasi rekening')) { link.click(); return; }
      }
    });
    await delay(3000);
    
    const updatedMenuFrame = page.frames().find(f => f.name() === 'menu');
    await updatedMenuFrame.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = (link.textContent || '').toLowerCase();
        if (text.includes('mutasi rekening')) { link.click(); return; }
      }
    });
    await delay(3000);
    
    // Step 3: Set date
    let atmFrame = page.frames().find(f => f.name() === 'atm');
    if (!atmFrame) throw new Error('ATM frame not found');
    
    const today = getJakartaDate();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    const currentYear = today.getFullYear();
    
    await atmFrame.evaluate((day, month) => {
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
    }, day, month);
    
    // Step 4: First click Lihat
    await atmFrame.evaluate(() => {
      const buttons = document.querySelectorAll('input[type="submit"]');
      for (const btn of buttons) {
        if (btn.value.toLowerCase().includes('lihat') || btn.type === 'submit') {
          btn.click(); return;
        }
      }
    });
    await delay(3000);
    
    // Step 5: Burst loop
    log('=== ENTERING BURST LOOP ===');
    
    while (checkCount < maxIterations && (Date.now() - startTime < maxDuration)) {
      checkCount++;
      log(`--- Burst iteration #${checkCount} ---`);
      
      atmFrame = page.frames().find(f => f.name() === 'atm');
      if (!atmFrame) break;
      
      // Grab data
      const mutations = await atmFrame.evaluate((year) => {
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
      }, currentYear);
      
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
      
      // Click Kembali
      const kembaliClicked = await atmFrame.evaluate(() => {
        const buttons = document.querySelectorAll('input[type="button"], input[type="submit"]');
        for (const btn of buttons) {
          if (btn.value.toLowerCase().includes('kembali') || btn.value.toLowerCase().includes('back')) {
            btn.click(); return true;
          }
        }
        return false;
      });
      
      if (!kembaliClicked) break;
      await delay(2000);
      
      // Click Lihat again
      atmFrame = page.frames().find(f => f.name() === 'atm');
      if (!atmFrame) break;
      
      await atmFrame.evaluate(() => {
        const buttons = document.querySelectorAll('input[type="submit"]');
        for (const btn of buttons) {
          if (btn.value.toLowerCase().includes('lihat') || btn.type === 'submit') {
            btn.click(); return;
          }
        }
      });
      await delay(3000);
    }
    
    log(`=== BURST LOOP ENDED (${checkCount} iterations, match=${matchFound}) ===`);
    
    // Logout
    await safeLogout();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`=== BURST COMPLETED in ${duration}s ===`);
    
    return { success: true, iterations: checkCount, matchFound, duration };
    
  } catch (error) {
    log(`Burst error: ${error.message}`, 'ERROR');
    await safeLogout();
    await initBrowser();
    return { success: false, error: error.message };
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
  log('=== PERSISTENT BROWSER SCHEDULER STARTED ===');
  log(`Config URL: ${CONFIG_URL}`);
  log(`Poll interval: ${CONFIG.CONFIG_POLL_INTERVAL / 1000}s`);
  log(`Watchdog interval: ${CONFIG.WATCHDOG_INTERVAL / 1000}s`);
  
  // Initialize browser
  await initBrowser();
  
  // Start watchdog
  setInterval(watchdog, CONFIG.WATCHDOG_INTERVAL);
  
  while (true) {
    try {
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
        }
        
        // Execute burst scrape
        await executeBurstScrape();
        
        // Check if burst ended
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
      
      // Normal mode - check if should scrape
      if (config.is_active) {
        const timeSinceLastScrape = Date.now() - lastScrapeTime;
        
        if (timeSinceLastScrape >= currentIntervalMs) {
          log(`Time to scrape (${(timeSinceLastScrape / 60000).toFixed(1)}m since last)`);
          
          const result = await executeScrape();
          
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
      log(`Loop error: ${error.message}`, 'ERROR');
    }
    
    // Wait before next config poll
    await delay(CONFIG.CONFIG_POLL_INTERVAL);
  }
}

// === GRACEFUL SHUTDOWN ===

process.on('SIGINT', async () => {
  log('Received SIGINT, shutting down...');
  if (browser) {
    await safeLogout();
    await browser.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('Received SIGTERM, shutting down...');
  if (browser) {
    await safeLogout();
    await browser.close();
  }
  process.exit(0);
});

// === START ===

mainLoop().catch(err => {
  log(`Fatal error: ${err.message}`, 'ERROR');
  process.exit(1);
});
