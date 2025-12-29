/**
 * BCA Balance Checker - WINDOWS RDP VERSION v1.0.0
 * 
 * Script khusus untuk cek saldo BCA (BUKAN mutasi).
 * Digunakan untuk payment verification berbasis perubahan saldo.
 * 
 * Flow:
 * 1. User klik "Generate" -> Script login, grab saldo awal
 * 2. User transfer -> Klik "Saya Sudah Transfer"
 * 3. Script loop 30x: refresh saldo, check perubahan
 * 4. Jika saldo bertambah sesuai unique amount -> SUKSES!
 * 
 * Features:
 * - SPEED OPTIMIZED: Minimal delays, fast login
 * - STEALTH MODE: Anti-detection
 * - POLLING: Check server untuk command
 * - REAL-TIME: Report progress ke server
 * 
 * Usage: node bca-balance-checker.js
 */

// ============ SCRAPER VERSION ============
const CHECKER_VERSION = "1.0.0-windows";
const CHECKER_BUILD_DATE = "2025-12-29";
// =========================================

// Use puppeteer-extra with stealth plugin
let puppeteer;
let StealthPlugin;
try {
  puppeteer = require('puppeteer-extra');
  StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());
  console.log('[STEALTH] puppeteer-extra-plugin-stealth loaded');
} catch (e) {
  console.log('[STEALTH] Stealth plugin not found, using regular puppeteer');
  puppeteer = require('puppeteer');
}

const path = require('path');
const fs = require('fs');

// ============ LOAD CONFIG ============
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
  console.log('[CONFIG] Loaded config.env');
}

// Find Chrome path for Windows
function findChromiumPath() {
  const windowsPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  
  for (const p of windowsPaths) {
    if (p && fs.existsSync(p)) {
      console.log(`[CHROME] Found: ${p}`);
      return p;
    }
  }
  return null;
}

const CONFIG = {
  BCA_USER_ID: process.env.BCA_USER_ID || 'YOUR_KLIKBCA_USER_ID',
  BCA_PIN: process.env.BCA_PIN || 'YOUR_KLIKBCA_PIN',
  SECRET_KEY: process.env.SECRET_KEY || 'YOUR_SECRET_KEY_HERE',
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook',
  HEADLESS: process.env.HEADLESS !== 'false',
  CHROMIUM_PATH: process.env.CHROMIUM_PATH || findChromiumPath(),
  POLL_INTERVAL: 2000, // Poll server every 2 seconds
  CHECK_DELAY_MIN: 2000, // Min delay between saldo checks
  CHECK_DELAY_MAX: 3000, // Max delay between saldo checks
  MAX_CHECKS: 30, // Maximum checks per session
};

// Derived URLs
const COMMAND_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/windows-balance-command');
const WEBHOOK_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/windows-balance-webhook');

// Validate config
if (CONFIG.BCA_USER_ID === 'YOUR_KLIKBCA_USER_ID') {
  console.error('ERROR: BCA_USER_ID belum dikonfigurasi!');
  process.exit(1);
}
if (CONFIG.SECRET_KEY === 'YOUR_SECRET_KEY_HERE') {
  console.error('ERROR: SECRET_KEY belum dikonfigurasi!');
  process.exit(1);
}

// Startup banner
console.log('');
console.log('==========================================');
console.log('  BCA BALANCE CHECKER v1.0.0');
console.log('==========================================');
console.log(`  Version : ${CHECKER_VERSION} (${CHECKER_BUILD_DATE})`);
console.log(`  Headless: ${CONFIG.HEADLESS}`);
console.log('');

// ============ LOGGING ============
function log(message, level = 'INFO') {
  const now = new Date().toISOString();
  console.log(`[${now}] [${level}] ${message}`);
}

// ============ HUMAN-LIKE DELAYS ============
async function humanDelay(minMs, maxMs) {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise(r => setTimeout(r, delay));
}

async function quickDelay(ms = 500) {
  await new Promise(r => setTimeout(r, ms));
}

// ============ SERVER COMMUNICATION ============
async function pollCommand() {
  try {
    const response = await fetch(COMMAND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret_key: CONFIG.SECRET_KEY,
        action: 'poll'
      })
    });
    
    if (!response.ok) {
      log(`Poll failed: ${response.status}`, 'WARN');
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (e) {
    log(`Poll error: ${e.message}`, 'ERROR');
    return null;
  }
}

async function reportToWebhook(action, data = {}) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret_key: CONFIG.SECRET_KEY,
        action,
        ...data
      })
    });
    
    const result = await response.json();
    log(`Reported ${action}: ${JSON.stringify(result)}`);
    return result;
  } catch (e) {
    log(`Report error: ${e.message}`, 'ERROR');
    return null;
  }
}

async function clearCommand() {
  try {
    await fetch(COMMAND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret_key: CONFIG.SECRET_KEY,
        action: 'clear'
      })
    });
  } catch (e) {
    // Ignore
  }
}

// ============ BROWSER HELPERS ============
let browser = null;
let page = null;
let isLoggedIn = false;
let currentBalance = null;
let initialBalance = null;

async function launchBrowser() {
  if (browser) {
    try { await browser.close(); } catch (e) {}
  }
  
  log('Launching browser...');
  
  const browserArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
  ];
  
  browser = await puppeteer.launch({
    headless: CONFIG.HEADLESS,
    executablePath: CONFIG.CHROMIUM_PATH,
    args: browserArgs,
    ignoreDefaultArgs: ['--enable-automation']
  });
  
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  log('Browser launched');
}

async function findLoginFrame() {
  const frames = page.frames();
  for (const frame of frames) {
    const url = frame.url();
    if (url.includes('login.htm') || url.includes('loginform')) {
      log('Found login frame');
      return frame;
    }
  }
  return null;
}

async function findAtmFrame() {
  const frames = page.frames();
  for (const frame of frames) {
    const url = frame.url();
    if (url.includes('atmb') || url.includes('accountstmt') || url.includes('balanceinquiry')) {
      return frame;
    }
  }
  return null;
}

// ============ BCA LOGIN (SPEED OPTIMIZED) ============
async function bcaLogin() {
  log('Starting BCA login...');
  
  await page.goto('https://ibank.klikbca.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await quickDelay(1000);
  
  // Find login frame
  let loginFrame = await findLoginFrame();
  if (!loginFrame) {
    // Try main page
    loginFrame = page;
  }
  
  // Enter User ID
  log('Entering User ID...');
  const userInput = await loginFrame.$('input[name="value(user_id)"], input[name="user_id"], #user_id');
  if (!userInput) throw new Error('User ID input not found');
  
  await userInput.click();
  await quickDelay(200);
  await userInput.type(CONFIG.BCA_USER_ID, { delay: 50 });
  
  // Enter PIN using hybrid approach
  log('Entering PIN...');
  const pinInput = await loginFrame.$('input[name="value(pswd)"], input[name="pswd"], #pswd');
  if (!pinInput) throw new Error('PIN input not found');
  
  await pinInput.focus();
  await quickDelay(200);
  
  // Hybrid PIN entry - simulate events manually
  for (const char of CONFIG.BCA_PIN) {
    await loginFrame.evaluate((el, c) => {
      el.value += c;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: c, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: c, bubbles: true }));
    }, pinInput, char);
    await quickDelay(80);
  }
  
  // Click login button
  log('Clicking login...');
  const submitBtn = await loginFrame.$('input[type="submit"], input[value="LOGIN"], button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
  } else {
    await loginFrame.evaluate(() => {
      document.forms[0]?.submit();
    });
  }
  
  // Wait for navigation
  await quickDelay(2000);
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  
  // Check if login successful
  const pageContent = await page.content();
  if (pageContent.includes('Selamat Datang') || pageContent.includes('Welcome') || pageContent.includes('Account Information')) {
    log('Login successful!');
    isLoggedIn = true;
    return true;
  }
  
  throw new Error('Login failed - check credentials');
}

// ============ NAVIGATE TO SALDO ============
async function navigateToInfoSaldo() {
  log('Navigating to Info Saldo...');
  
  // Find account info link
  const accountInfoLink = await page.$('a[href*="accountstmt.do"]') || 
                          await page.$('a:contains("Account Information")') ||
                          await page.$('area[href*="accountstmt"]');
  
  if (accountInfoLink) {
    await accountInfoLink.click();
    await quickDelay(1500);
  } else {
    // Try direct navigation
    await page.goto('https://ibank.klikbca.com/nav_bar_indo/account_information_bar.htm', { timeout: 15000 }).catch(() => {});
    await quickDelay(1000);
  }
  
  // Click on Saldo
  const atmFrame = await findAtmFrame();
  const targetFrame = atmFrame || page;
  
  // Look for balance inquiry link
  const balanceLink = await targetFrame.$('a[href*="balanceinquiry"]') ||
                      await targetFrame.$('a:contains("Informasi Saldo")') ||
                      await targetFrame.$('a:contains("Balance Inquiry")');
  
  if (balanceLink) {
    await balanceLink.click();
    await quickDelay(1500);
  }
  
  log('Navigated to Info Saldo');
}

// ============ GRAB SALDO EFEKTIF ============
async function grabSaldoEfektif() {
  log('Grabbing saldo efektif...');
  
  const atmFrame = await findAtmFrame() || page;
  
  // Look for balance table
  const balance = await atmFrame.evaluate(() => {
    // Find table with balance info
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const cells = table.querySelectorAll('td');
      for (let i = 0; i < cells.length; i++) {
        const text = cells[i].textContent || '';
        if (text.includes('Saldo Efektif') || text.includes('Effective Balance')) {
          // Next cell should have the amount
          const amountCell = cells[i + 1] || cells[i + 2];
          if (amountCell) {
            const amountText = amountCell.textContent || '';
            // Parse Indonesian number format: 1.234.567,89
            const cleaned = amountText.replace(/[^\d,.-]/g, '')
                                      .replace(/\./g, '')
                                      .replace(',', '.');
            const amount = parseFloat(cleaned);
            if (!isNaN(amount) && amount > 0) {
              return amount;
            }
          }
        }
      }
    }
    
    // Alternative: Look for any large number in page
    const allText = document.body.innerText;
    const matches = allText.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g);
    if (matches) {
      for (const match of matches) {
        const cleaned = match.replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(cleaned);
        if (amount > 100000) { // At least 100k
          return amount;
        }
      }
    }
    
    return null;
  });
  
  if (balance) {
    log(`Saldo efektif: Rp ${balance.toLocaleString('id-ID')}`);
    return balance;
  }
  
  throw new Error('Could not find saldo efektif');
}

// ============ REFRESH SALDO ============
async function refreshSaldo() {
  log('Refreshing saldo page...');
  
  const atmFrame = await findAtmFrame() || page;
  
  // Look for refresh/inquiry button
  const refreshBtn = await atmFrame.$('input[type="submit"]') ||
                     await atmFrame.$('button[type="submit"]') ||
                     await atmFrame.$('input[value*="Inquiry"]');
  
  if (refreshBtn) {
    await refreshBtn.click();
    await quickDelay(1000);
  } else {
    // Navigate to balance inquiry again
    await navigateToInfoSaldo();
  }
}

// ============ LOGOUT ============
async function bcaLogout() {
  log('Logging out...');
  try {
    const logoutLink = await page.$('a[href*="logout"]') ||
                       await page.$('area[alt="Logout"]') ||
                       await page.$('a:contains("Logout")');
    
    if (logoutLink) {
      await logoutLink.click();
      await quickDelay(1500);
    }
    
    isLoggedIn = false;
    log('Logged out successfully');
  } catch (e) {
    log(`Logout error: ${e.message}`, 'WARN');
  }
}

// ============ MAIN COMMAND HANDLERS ============

async function handleGrabInitial(sessionId) {
  log('=== GRAB INITIAL BALANCE ===');
  
  try {
    await launchBrowser();
    await bcaLogin();
    await navigateToInfoSaldo();
    
    const balance = await grabSaldoEfektif();
    initialBalance = balance;
    currentBalance = balance;
    
    // Report to server
    await reportToWebhook('initial_balance', {
      session_id: sessionId,
      initial_balance: balance
    });
    
    log(`Initial balance saved: Rp ${balance.toLocaleString('id-ID')}`);
    
    // Clear command
    await clearCommand();
    
    // Keep browser open for check loop
    return true;
    
  } catch (e) {
    log(`Grab initial failed: ${e.message}`, 'ERROR');
    await reportToWebhook('error', {
      session_id: sessionId,
      error_message: e.message
    });
    await clearCommand();
    return false;
  }
}

async function handleCheckLoop(sessionId, expectedAmount, maxChecks = 30) {
  log(`=== CHECK LOOP (expecting +${expectedAmount}) ===`);
  
  if (!isLoggedIn || !browser) {
    log('Not logged in, need to login first', 'ERROR');
    await reportToWebhook('error', {
      session_id: sessionId,
      error_message: 'Not logged in'
    });
    await clearCommand();
    return false;
  }
  
  try {
    for (let i = 1; i <= maxChecks; i++) {
      log(`Check ${i}/${maxChecks}...`);
      
      // Random delay 2-3 seconds
      await humanDelay(CONFIG.CHECK_DELAY_MIN, CONFIG.CHECK_DELAY_MAX);
      
      // Refresh and grab balance
      await refreshSaldo();
      const newBalance = await grabSaldoEfektif();
      currentBalance = newBalance;
      
      const difference = newBalance - initialBalance;
      log(`Current: ${newBalance}, Diff: ${difference}`);
      
      // Report progress
      await reportToWebhook('progress', {
        session_id: sessionId,
        current_balance: newBalance,
        check_count: i,
        difference: difference
      });
      
      // Check if matched
      if (difference >= expectedAmount) {
        log(`=== PAYMENT MATCHED! Difference: ${difference} ===`);
        
        await reportToWebhook('matched', {
          session_id: sessionId,
          current_balance: newBalance,
          check_count: i,
          difference: difference
        });
        
        await bcaLogout();
        await clearCommand();
        return true;
      }
    }
    
    // Reached max checks without match
    log(`Max checks reached (${maxChecks}), no match found`);
    
    await reportToWebhook('timeout', {
      session_id: sessionId,
      current_balance: currentBalance,
      check_count: maxChecks
    });
    
    await bcaLogout();
    await clearCommand();
    return false;
    
  } catch (e) {
    log(`Check loop error: ${e.message}`, 'ERROR');
    await reportToWebhook('error', {
      session_id: sessionId,
      error_message: e.message
    });
    await bcaLogout();
    await clearCommand();
    return false;
  }
}

// ============ MAIN LOOP ============
async function main() {
  log('Starting BCA Balance Checker...');
  log('Polling for commands...');
  
  while (true) {
    try {
      const command = await pollCommand();
      
      if (command && command.command) {
        log(`Received command: ${command.command}`);
        
        if (command.command === 'grab_initial') {
          await handleGrabInitial(command.session_id);
        } else if (command.command === 'check_loop') {
          await handleCheckLoop(
            command.session_id,
            command.expected_amount,
            command.max_checks || 30
          );
        }
      }
      
    } catch (e) {
      log(`Main loop error: ${e.message}`, 'ERROR');
    }
    
    // Wait before next poll
    await quickDelay(CONFIG.POLL_INTERVAL);
  }
}

// Cleanup on exit
process.on('SIGINT', async () => {
  log('Shutting down...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

// Start
main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
