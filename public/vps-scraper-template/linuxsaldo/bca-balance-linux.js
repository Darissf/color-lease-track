#!/usr/bin/env node
/**
 * ============================================================
 *  BCA BALANCE CHECKER - LINUX VPS
 *  Version: 1.0.0
 *  Build Date: 2025-12-30
 *  Platform: Linux (Ubuntu/Debian)
 *  
 *  FLOW:
 *  1. Poll for GRAB_INITIAL command
 *  2. Login + Navigate to Saldo < 10 detik
 *  3. Report initial_balance (triggers web to show unique amount)
 *  4. Stay logged in, wait for CHECK_BALANCE command
 *  5. Loop: refresh saldo, compare, report match/timeout
 * ============================================================
 */

'use strict';

// ============================================================
// DEPENDENCIES
// ============================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Puppeteer with stealth plugin
let puppeteer;
let StealthPlugin;

try {
  puppeteer = require('puppeteer-extra');
  StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());
  console.log('[STEALTH] puppeteer-extra with stealth plugin loaded');
} catch (e) {
  console.log('[STEALTH] Falling back to regular puppeteer');
  puppeteer = require('puppeteer');
}

// ============================================================
// TIMEZONE HELPERS
// ============================================================

function getJakartaDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
}

function getJakartaDateString() {
  const d = getJakartaDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================================
// LOAD CONFIGURATION
// ============================================================

const configPath = path.join(__dirname, 'config.env');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  configContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  console.log('[CONFIG] Loaded from config.env');
}

// ============================================================
// FIND CHROMIUM PATH
// ============================================================

function findChromiumPath() {
  const possiblePaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`[CHROMIUM] Found at: ${p}`);
      return p;
    }
  }
  
  // Try to find via which
  try {
    const result = execSync('which chromium-browser || which chromium || which google-chrome', { encoding: 'utf-8' }).trim();
    if (result && fs.existsSync(result)) {
      console.log(`[CHROMIUM] Found via which: ${result}`);
      return result;
    }
  } catch (e) {}
  
  console.log('[CHROMIUM] Using Puppeteer bundled Chromium');
  return null;
}

// ============================================================
// HUMAN-LIKE BEHAVIOR HELPERS
// ============================================================

function gaussianRandom(mean = 0, stdev = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

function humanDelay(minMs, maxMs) {
  const mean = (minMs + maxMs) / 2;
  const stdev = (maxMs - minMs) / 4;
  let delay = Math.round(gaussianRandom(mean, stdev));
  delay = Math.max(minMs, Math.min(maxMs, delay));
  return new Promise(resolve => setTimeout(resolve, delay));
}

function quickDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanType(element, text) {
  for (const char of text) {
    await element.type(char, { delay: Math.floor(Math.random() * 80) + 40 });
    if (Math.random() < 0.1) {
      await quickDelay(Math.floor(Math.random() * 200) + 50);
    }
  }
}

// ============================================================
// STEALTH PAGE SETUP
// ============================================================

async function setupStealthPage(page) {
  const width = 1280 + Math.floor(Math.random() * 200);
  const height = 720 + Math.floor(Math.random() * 100);
  
  await page.setViewport({ width, height });
  
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
    
    // Timezone
    const originalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(locale, options) {
      options = options || {};
      options.timeZone = 'Asia/Jakarta';
      return new originalDateTimeFormat(locale, options);
    };
  });
}

// ============================================================
// CONFIGURATION CONSTANTS
// ============================================================

const SCRAPER_VERSION = '1.0.1';
const SCRAPER_BUILD_DATE = '2025-12-30';

const CONFIG = {
  BCA_USER_ID: process.env.BCA_USER_ID || '',
  BCA_PIN: process.env.BCA_PIN || '',
  SECRET_KEY: process.env.SECRET_KEY || '',
  COMMAND_URL: process.env.COMMAND_URL || 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/windows-balance-command',
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/windows-balance-webhook',
  HEADLESS: process.env.HEADLESS !== 'false',
  DEBUG_MODE: process.env.DEBUG_MODE === 'true',
  POLL_INTERVAL: parseInt(process.env.POLL_INTERVAL) || 2000,
  MAX_CHECKS: 30,
  CHECK_DELAY_MIN: 2000,
  CHECK_DELAY_MAX: 3000,
  CHROMIUM_PATH: findChromiumPath(),
};

// Validation
if (!CONFIG.BCA_USER_ID || !CONFIG.SECRET_KEY) {
  console.error('[FATAL] BCA_USER_ID and SECRET_KEY are required in config.env');
  process.exit(1);
}

// ============================================================
// STARTUP BANNER
// ============================================================

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       BCA BALANCE CHECKER - LINUX VPS v' + SCRAPER_VERSION + '              ║');
console.log('║                  Build: ' + SCRAPER_BUILD_DATE + '                        ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Mode: ' + (CONFIG.HEADLESS ? 'Headless' : 'Visible') + '                                           ║');
console.log('║  User: ' + CONFIG.BCA_USER_ID.substring(0, 3) + '***                                           ║');
console.log('║  Poll: ' + CONFIG.POLL_INTERVAL + 'ms                                           ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// ============================================================
// GLOBAL STATE
// ============================================================

let browser = null;
let page = null;
let isLoggedIn = false;
let initialBalance = 0;
let currentBalance = 0;
let currentSessionId = null;

// ============================================================
// LOGGING
// ============================================================

function log(message, level = 'INFO') {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const prefix = `[${timestamp}] [${level}]`;
  
  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`);
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// ============================================================
// SERVER COMMUNICATION
// ============================================================

async function pollCommand() {
  try {
    const response = await fetch(CONFIG.COMMAND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'poll',
        secret_key: CONFIG.SECRET_KEY 
      }),
    });
    
    if (!response.ok) {
      if (CONFIG.DEBUG_MODE) log(`Poll response: ${response.status}`, 'DEBUG');
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (CONFIG.DEBUG_MODE) log(`Poll error: ${error.message}`, 'DEBUG');
    return null;
  }
}

async function reportToWebhook(action, data) {
  try {
    log(`Reporting: ${action}`);
    
    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': CONFIG.SECRET_KEY,
      },
      body: JSON.stringify({
        action,
        secret_key: CONFIG.SECRET_KEY,
        ...data,
      }),
    });
    
    if (!response.ok) {
      log(`Webhook error: ${response.status}`, 'WARN');
    } else {
      log(`Webhook ${action}: OK`);
    }
  } catch (error) {
    log(`Webhook error: ${error.message}`, 'ERROR');
  }
}

async function clearCommand() {
  try {
    await fetch(CONFIG.COMMAND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'clear',
        secret_key: CONFIG.SECRET_KEY 
      }),
    });
  } catch (error) {
    log(`Clear command error: ${error.message}`, 'WARN');
  }
}

// ============================================================
// SAFE FRAME OPERATION
// ============================================================

async function safeFrameOperation(fn, timeoutMs, label) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// ============================================================
// RETRY WITH BACKOFF
// ============================================================

async function retryWithBackoff(fn, maxRetries, label) {
  const delays = [5000, 15000, 45000];
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      log(`${label} attempt ${i + 1} failed: ${error.message}`, 'WARN');
      if (i < maxRetries - 1) {
        const delay = delays[Math.min(i, delays.length - 1)];
        log(`Retrying in ${delay / 1000}s...`);
        await quickDelay(delay);
      } else {
        throw error;
      }
    }
  }
}

// ============================================================
// PAGE HEALTH CHECK
// ============================================================

async function isPageHealthy() {
  if (!page || page.isClosed()) return false;
  
  try {
    await page.evaluate(() => document.readyState);
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================
// SESSION EXPIRED CHECK
// ============================================================

async function checkSessionExpired() {
  if (!page) return true;
  
  try {
    const expired = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.toLowerCase() || '';
      return bodyText.includes('session') && bodyText.includes('expired') ||
             bodyText.includes('sesi') && bodyText.includes('berakhir') ||
             bodyText.includes('silakan login kembali');
    });
    return expired;
  } catch (error) {
    return true;
  }
}

// ============================================================
// BROWSER MANAGEMENT
// ============================================================

async function initBrowser() {
  if (browser && await isPageHealthy()) {
    log('Browser already running, reusing...');
    return;
  }
  
  log('Launching browser...');
  
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1366,768',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--lang=id-ID',
  ];
  
  const launchOptions = {
    headless: CONFIG.HEADLESS ? 'new' : false,
    args: launchArgs,
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: null,
  };
  
  if (CONFIG.CHROMIUM_PATH) {
    launchOptions.executablePath = CONFIG.CHROMIUM_PATH;
  }
  
  browser = await puppeteer.launch(launchOptions);
  page = await browser.newPage();
  
  await setupStealthPage(page);
  
  page.on('dialog', async dialog => {
    log(`Dialog: ${dialog.message()}`);
    await dialog.accept();
  });
  
  log('Browser launched successfully');
}

async function forceKillAndRestart() {
  log('Force killing browser...');
  
  isLoggedIn = false;
  
  if (browser) {
    try {
      await Promise.race([
        browser.close(),
        quickDelay(5000),
      ]);
    } catch (e) {}
    browser = null;
    page = null;
  }
  
  // Kill any orphaned processes
  try {
    execSync('pkill -9 -f chromium || true', { stdio: 'ignore' });
    execSync('pkill -9 -f chrome || true', { stdio: 'ignore' });
  } catch (e) {}
  
  await quickDelay(3000);
  
  log('Browser killed, will reinit on next command');
}

// ============================================================
// FIND LOGIN FRAME
// ============================================================

async function findLoginFrame() {
  const frames = page.frames();
  
  for (const frame of frames) {
    try {
      const hasLoginForm = await frame.evaluate(() => {
        const userInput = document.querySelector('input[name="value(user_id)"]') ||
                          document.querySelector('input[id="user_id"]') ||
                          document.querySelector('input[name="userid"]');
        return !!userInput;
      });
      
      if (hasLoginForm) {
        log(`Login frame found: ${frame.name() || 'unnamed'}`);
        return frame;
      }
    } catch (e) {}
  }
  
  return null;
}

// ============================================================
// ENTER CREDENTIALS
// ============================================================

async function enterCredentials(frame) {
  log('Entering credentials...');
  
  // Find and fill User ID
  const userIdSelector = 'input[name="value(user_id)"], input[id="user_id"], input[name="userid"]';
  await frame.waitForSelector(userIdSelector, { timeout: 10000 });
  const userIdInput = await frame.$(userIdSelector);
  
  if (!userIdInput) throw new Error('User ID input not found');
  
  await userIdInput.click({ clickCount: 3 });
  await quickDelay(100);
  await userIdInput.press('Backspace');
  await quickDelay(200);
  
  // Focus and type with human-like behavior
  await userIdInput.focus();
  await humanType(userIdInput, CONFIG.BCA_USER_ID);
  
  log('User ID entered');
  await humanDelay(500, 1000);
  
  // Find and fill PIN
  const pinSelector = 'input[name="value(pswd)"], input[id="pswd"], input[name="pin"], input[type="password"]';
  const pinInput = await frame.$(pinSelector);
  
  if (!pinInput) throw new Error('PIN input not found');
  
  await pinInput.click({ clickCount: 3 });
  await quickDelay(100);
  await pinInput.press('Backspace');
  await quickDelay(200);
  
  await pinInput.focus();
  await humanType(pinInput, CONFIG.BCA_PIN);
  
  log('PIN entered');
  await humanDelay(300, 600);
}

// ============================================================
// SUBMIT LOGIN
// ============================================================

async function submitLogin(frame) {
  log('Submitting login...');
  
  const submitSelectors = [
    'input[type="submit"][value="LOGIN"]',
    'input[type="submit"]',
    'button[type="submit"]',
    'input[name="value(Submit)"]',
  ];
  
  for (const selector of submitSelectors) {
    try {
      const button = await frame.$(selector);
      if (button) {
        await button.click();
        log('Login submitted');
        return;
      }
    } catch (e) {}
  }
  
  // Fallback: Press Enter
  await frame.keyboard.press('Enter');
  log('Login submitted via Enter key');
}

// ============================================================
// CHECK IF LOGGED IN
// ============================================================

async function isCurrentlyLoggedIn() {
  if (!page) return false;
  
  try {
    const frames = page.frames();
    
    // Check for menu frame (indicates logged in)
    const menuFrame = frames.find(f => f.name() === 'menu');
    if (menuFrame) {
      const hasLogout = await menuFrame.evaluate(() => {
        const text = document.body?.innerText?.toLowerCase() || '';
        return text.includes('logout') || text.includes('keluar');
      });
      if (hasLogout) return true;
    }
    
    // Check for 5 frames (typical logged-in state)
    if (frames.length >= 5) {
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

// ============================================================
// ENSURE LOGGED IN
// ============================================================

async function ensureLoggedIn() {
  if (await isCurrentlyLoggedIn()) {
    log('Already logged in');
    isLoggedIn = true;
    return;
  }
  
  log('Logging in to BCA...');
  
  await page.goto('https://ibank.klikbca.com', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  
  await humanDelay(2000, 3000);
  
  // Find login frame
  const loginFrame = await retryWithBackoff(
    () => findLoginFrame(),
    3,
    'Find login frame'
  );
  
  if (!loginFrame) throw new Error('Login frame not found');
  
  // Enter credentials
  await enterCredentials(loginFrame);
  
  // Submit
  await submitLogin(loginFrame);
  
  // Wait for frames to load (indicates successful login)
  log('Waiting for login completion...');
  await humanDelay(3000, 5000);
  
  // Verify login
  const frames = page.frames();
  log(`Frames after login: ${frames.length}`);
  
  if (frames.length < 4) {
    throw new Error('Login failed - insufficient frames');
  }
  
  isLoggedIn = true;
  log('Login successful');
}

// ============================================================
// SAFE LOGOUT
// ============================================================

async function safeLogout() {
  if (!isLoggedIn || !page) {
    log('Not logged in, skipping logout');
    return;
  }
  
  log('Logging out...');
  
  try {
    // Method 1: Direct URL navigation (most reliable)
    await page.goto('https://ibank.klikbca.com/authentication.do?value(actions)=logout', {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    
    await quickDelay(2000);
    isLoggedIn = false;
    log('Logout successful');
  } catch (error) {
    log(`Logout error: ${error.message}`, 'WARN');
    isLoggedIn = false;
  }
}

// ============================================================
// NAVIGATE TO INFO SALDO
// ============================================================

async function navigateToInfoSaldo() {
  log('Navigating to Informasi Saldo...');
  
  // Step 1: Find menu frame
  const menuFrame = page.frames().find(f => f.name() === 'menu');
  if (!menuFrame) throw new Error('Menu frame not found');
  log('Menu frame: FOUND');
  
  // Step 2: Click "Informasi Rekening" (from menu frame)
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
    10000,
    'CLICK_INFORMASI_REKENING'
  );
  
  if (!clickInfoResult) throw new Error('Informasi Rekening link not found');
  log('Clicked: Informasi Rekening');
  
  // Step 3: Wait for submenu to appear
  await humanDelay(2000, 3000);
  
  // Step 4: RE-GRAB menu frame (submenu updates the frame)
  const updatedMenuFrame = page.frames().find(f => f.name() === 'menu');
  if (!updatedMenuFrame) throw new Error('Updated menu frame not found');
  log('Updated menu frame: FOUND');
  
  // Step 5: Click "Informasi Saldo" (DARI MENU FRAME - BUKAN ATM!)
  await humanDelay(1000, 1500);
  
  const clickSaldoResult = await safeFrameOperation(
    () => updatedMenuFrame.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = (link.textContent || '').toLowerCase();
        if (text.includes('informasi saldo') || text.includes('balance inquiry')) {
          link.click();
          return true;
        }
      }
      return false;
    }),
    10000,
    'CLICK_INFORMASI_SALDO'
  );
  
  if (!clickSaldoResult) throw new Error('Informasi Saldo link not found in menu');
  log('Clicked: Informasi Saldo');
  
  // Step 6: Wait for balance page to load in atm frame
  await humanDelay(2000, 3000);
  
  log('Navigation to Info Saldo: SUCCESS');
}

// ============================================================
// GRAB SALDO EFEKTIF
// ============================================================

async function grabSaldoEfektif() {
  log('Grabbing saldo efektif...');
  
  const atmFrame = page.frames().find(f => f.name() === 'atm');
  if (!atmFrame) throw new Error('ATM frame not found');
  
  const balance = await safeFrameOperation(
    () => atmFrame.evaluate(() => {
      // Method 1: Look for table with "Saldo Efektif"
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const cells = table.querySelectorAll('td');
        for (let i = 0; i < cells.length; i++) {
          const text = cells[i].textContent || '';
          if (text.includes('Saldo Efektif') || text.includes('Effective Balance')) {
            // Check next cells for amount
            for (let j = 1; j <= 3; j++) {
              const amountCell = cells[i + j];
              if (amountCell) {
                const amountText = amountCell.textContent || '';
                // Look for IDR pattern: "IDR 1,234,567.89" or "1.234.567,89"
                const cleaned = amountText
                  .replace(/IDR/gi, '')
                  .replace(/[^\d,.-]/g, '')
                  .trim();
                
                // Handle Indonesian format (1.234.567,89)
                let normalized = cleaned;
                if (cleaned.includes('.') && cleaned.includes(',')) {
                  // Indonesian format: dots for thousands, comma for decimal
                  normalized = cleaned.replace(/\./g, '').replace(',', '.');
                } else if (cleaned.includes(',') && !cleaned.includes('.')) {
                  // Just comma, could be decimal
                  const parts = cleaned.split(',');
                  if (parts.length === 2 && parts[1].length <= 2) {
                    normalized = cleaned.replace(',', '.');
                  } else {
                    normalized = cleaned.replace(/,/g, '');
                  }
                }
                
                const amount = parseFloat(normalized);
                if (!isNaN(amount) && amount > 0) {
                  return amount;
                }
              }
            }
          }
        }
      }
      
      // Method 2: Look for any large number that looks like a balance
      const allText = document.body?.innerText || '';
      const matches = allText.match(/(?:IDR|Rp\.?)\s*([\d.,]+)/gi);
      if (matches) {
        for (const match of matches) {
          const numStr = match.replace(/IDR|Rp\.?/gi, '').trim();
          const normalized = numStr.replace(/\./g, '').replace(',', '.');
          const amount = parseFloat(normalized);
          if (!isNaN(amount) && amount > 100000) {
            return amount;
          }
        }
      }
      
      return null;
    }),
    10000,
    'GRAB_SALDO'
  );
  
  if (!balance) throw new Error('Could not extract saldo efektif');
  
  log(`Saldo Efektif: Rp ${balance.toLocaleString('id-ID')}`);
  return balance;
}

// ============================================================
// REFRESH BALANCE (stay on same page)
// ============================================================

async function refreshBalance() {
  log('Refreshing balance...');
  
  // Option 1: Click inquiry button if exists
  const atmFrame = page.frames().find(f => f.name() === 'atm');
  if (atmFrame) {
    try {
      const clicked = await atmFrame.evaluate(() => {
        const buttons = document.querySelectorAll('input[type="submit"], button');
        for (const btn of buttons) {
          const text = (btn.value || btn.textContent || '').toLowerCase();
          if (text.includes('lihat') || text.includes('inquiry') || text.includes('view')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (clicked) {
        await humanDelay(1500, 2500);
        return;
      }
    } catch (e) {}
  }
  
  // Option 2: Navigate to saldo page again
  await navigateToInfoSaldo();
}

// ============================================================
// ERROR RECOVERY
// ============================================================

async function handleError(error, context) {
  log(`Error in ${context}: ${error.message}`, 'ERROR');
  
  if (isLoggedIn) {
    log('Recovery: Logged in, logging out first...');
    await safeLogout();
    await humanDelay(2000, 3000);
  }
  
  await forceKillAndRestart();
}

// ============================================================
// HANDLE GRAB_INITIAL COMMAND
// ============================================================

async function handleGrabInitial(sessionId) {
  log('');
  log('═══════════════════════════════════════════');
  log('  GRAB INITIAL BALANCE');
  log('═══════════════════════════════════════════');
  
  const startTime = Date.now();
  currentSessionId = sessionId;
  
  try {
    // Step 1: Init browser
    await initBrowser();
    
    // Step 2: Login
    await ensureLoggedIn();
    
    // Step 3: Navigate to saldo
    await navigateToInfoSaldo();
    
    // Step 4: Grab balance
    const balance = await grabSaldoEfektif();
    initialBalance = balance;
    currentBalance = balance;
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`═══════════════════════════════════════════`);
    log(`  GRAB INITIAL COMPLETE in ${duration}s`);
    log(`  Initial Balance: Rp ${balance.toLocaleString('id-ID')}`);
    log(`═══════════════════════════════════════════`);
    
    // Step 5: Report to server (triggers web to show unique amount)
    await reportToWebhook('initial_balance', {
      session_id: sessionId,
      initial_balance: balance,
    });
    
    // Clear command
    await clearCommand();
    
    // DON'T logout - stay logged in for CHECK_BALANCE loop
    log('Staying logged in, waiting for CHECK_BALANCE...');
    
  } catch (error) {
    log(`GRAB_INITIAL failed: ${error.message}`, 'ERROR');
    
    await reportToWebhook('error', {
      session_id: sessionId,
      error_message: error.message,
      phase: 'grab_initial',
    });
    
    await clearCommand();
    await handleError(error, 'handleGrabInitial');
  }
}

// ============================================================
// HANDLE CHECK_BALANCE COMMAND (Loop)
// ============================================================

async function handleCheckLoop(sessionId, expectedAmount, maxChecks) {
  log('');
  log('═══════════════════════════════════════════');
  log(`  CHECK BALANCE LOOP`);
  log(`  Expecting: +Rp ${expectedAmount.toLocaleString('id-ID')}`);
  log(`  Max Checks: ${maxChecks}`);
  log('═══════════════════════════════════════════');
  
  currentSessionId = sessionId;
  
  // Ensure we're still logged in
  if (!await isCurrentlyLoggedIn()) {
    log('Not logged in, need to re-login...');
    await initBrowser();
    await ensureLoggedIn();
    await navigateToInfoSaldo();
  }
  
  for (let i = 1; i <= maxChecks; i++) {
    try {
      log(`Check ${i}/${maxChecks}...`);
      
      // Refresh balance
      await refreshBalance();
      
      // Grab current balance
      const balance = await grabSaldoEfektif();
      currentBalance = balance;
      
      // Calculate increase
      const increase = balance - initialBalance;
      log(`Current: Rp ${balance.toLocaleString('id-ID')} | Increase: Rp ${increase.toLocaleString('id-ID')}`);
      
      // Check if match
      if (increase >= expectedAmount) {
        log('');
        log('╔════════════════════════════════════════╗');
        log('║         MATCH DETECTED!                ║');
        log(`║  Increase: Rp ${increase.toLocaleString('id-ID').padEnd(20)}   ║`);
        log('╚════════════════════════════════════════╝');
        
        await reportToWebhook('matched', {
          session_id: sessionId,
          current_balance: balance,
          initial_balance: initialBalance,
          increase_amount: increase,
          check_count: i,
        });
        
        // Logout and cleanup
        await safeLogout();
        await clearCommand();
        return;
      }
      
      // Report progress
      if (i % 5 === 0) {
        await reportToWebhook('progress', {
          session_id: sessionId,
          current_balance: balance,
          check_count: i,
        });
      }
      
      // Wait before next check
      await humanDelay(CONFIG.CHECK_DELAY_MIN, CONFIG.CHECK_DELAY_MAX);
      
    } catch (error) {
      log(`Check ${i} error: ${error.message}`, 'WARN');
      
      // Try to recover
      if (!await isPageHealthy() || await checkSessionExpired()) {
        log('Session lost, attempting recovery...');
        await handleError(error, 'checkLoop');
        
        // Re-login and continue
        await initBrowser();
        await ensureLoggedIn();
        await navigateToInfoSaldo();
      }
    }
  }
  
  // Max checks reached without match
  log('');
  log('══════════════════════════════════════════');
  log('  MAX CHECKS REACHED - NO MATCH');
  log('══════════════════════════════════════════');
  
  await reportToWebhook('timeout', {
    session_id: sessionId,
    current_balance: currentBalance,
    initial_balance: initialBalance,
    error_message: `No balance increase of Rp ${expectedAmount} detected after ${maxChecks} checks`,
  });
  
  await safeLogout();
  await clearCommand();
}

// ============================================================
// MAIN LOOP
// ============================================================

async function main() {
  log('Starting main polling loop...');
  log(`Poll interval: ${CONFIG.POLL_INTERVAL}ms`);
  log('');
  
  while (true) {
    try {
      const command = await pollCommand();
      
      if (command?.command === 'GRAB_INITIAL' && command?.session_id) {
        log('Received: GRAB_INITIAL command');
        await handleGrabInitial(command.session_id);
      }
      else if (command?.command === 'CHECK_BALANCE' && command?.session_id) {
        log('Received: CHECK_BALANCE command');
        await handleCheckLoop(
          command.session_id,
          command.expected_amount || 0,
          command.max_checks || CONFIG.MAX_CHECKS
        );
      }
      else if (command?.command === 'PING') {
        log('Received: PING');
        await reportToWebhook('pong', { status: 'alive' });
        await clearCommand();
      }
      
      // Poll interval
      await quickDelay(CONFIG.POLL_INTERVAL);
      
    } catch (error) {
      log(`Main loop error: ${error.message}`, 'ERROR');
      await quickDelay(5000);
    }
  }
}

// ============================================================
// SIGNAL HANDLERS
// ============================================================

process.on('SIGINT', async () => {
  log('');
  log('SIGINT received, shutting down gracefully...');
  if (isLoggedIn) await safeLogout();
  if (browser) await browser.close().catch(() => {});
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('');
  log('SIGTERM received, shutting down gracefully...');
  if (isLoggedIn) await safeLogout();
  if (browser) await browser.close().catch(() => {});
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  log(`Uncaught exception: ${error.message}`, 'ERROR');
  log(error.stack, 'ERROR');
  await handleError(error, 'uncaughtException');
});

process.on('unhandledRejection', async (reason) => {
  log(`Unhandled rejection: ${reason}`, 'ERROR');
  await handleError(new Error(String(reason)), 'unhandledRejection');
});

// ============================================================
// START
// ============================================================

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});
