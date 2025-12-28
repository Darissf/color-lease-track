/**
 * BCA iBanking Scraper with Enhanced Login Handling
 * 
 * Features:
 * - Multiple click strategies for login button
 * - Debug screenshots at each step
 * - Frame handling for KlikBCA structure
 * - Burst mode support
 * 
 * Usage:
 * - Normal mode: node bca-scraper.js
 * - Burst check: node bca-scraper.js --burst-check
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Load config from config.env
const configPath = path.join(__dirname, 'config.env');
if (fs.existsSync(configPath)) {
  const envConfig = fs.readFileSync(configPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
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
  TIMEOUT: parseInt(process.env.TIMEOUT) || 60000,
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY) || 5000,
  CHROMIUM_PATH: process.env.CHROMIUM_PATH || findChromiumPath(),
  DEBUG_MODE: process.env.DEBUG_MODE !== 'false',
  BURST_CHECK_URL: process.env.BURST_CHECK_URL || (process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL.replace('/bank-scraper-webhook', '/check-burst-command') : ''),
};

// Validate config
if (CONFIG.BCA_USER_ID === 'YOUR_KLIKBCA_USER_ID' || CONFIG.BCA_USER_ID === 'your_bca_user_id') {
  console.error('ERROR: BCA_USER_ID belum dikonfigurasi!');
  process.exit(1);
}

if (CONFIG.SECRET_KEY === 'YOUR_SECRET_KEY_HERE') {
  console.error('ERROR: SECRET_KEY belum dikonfigurasi!');
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
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

// Check burst command from server
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
    log(`Burst check failed: ${e.message}`, 'ERROR');
    return { burst_active: false };
  }
}

// Send mutations to webhook
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

// Main scrape function with enhanced login handling
async function scrapeBCA() {
  log('=== BCA SCRAPER STARTED ===');
  log(`Config: USER_ID=${CONFIG.BCA_USER_ID.substring(0, 3)}***, ACCOUNT=${CONFIG.ACCOUNT_NUMBER}`);
  log(`Using Chromium at: ${CONFIG.CHROMIUM_PATH}`);
  log(`Headless mode: ${CONFIG.HEADLESS}`);
  
  const browser = await puppeteer.launch({
    headless: CONFIG.HEADLESS ? 'new' : false,
    slowMo: CONFIG.SLOW_MO,
    executablePath: CONFIG.CHROMIUM_PATH,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ],
  });

  log('Browser launched successfully');
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Enable console logging
  page.on('console', msg => {
    if (CONFIG.DEBUG_MODE) log(`[BROWSER] ${msg.text()}`, 'DEBUG');
  });
  
  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('favicon') && !url.includes('analytics')) {
      log(`[REQUEST FAILED] ${url} - ${req.failure()?.errorText}`, 'ERROR');
    }
  });

  let mutations = [];

  try {
    // Navigate to KlikBCA
    log('Navigating to KlikBCA...');
    await page.goto('https://ibank.klikbca.com/', { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.TIMEOUT 
    });
    
    await delay(2000);
    await saveDebug(page, '01-login-page');
    log(`Page title: ${await page.title()}`);
    
    // Wait for login form - try multiple selectors
    log('Waiting for user_id input field...');
    const userIdSelectors = [
      'input[name="value(user_id)"]',
      'input[name="user_id"]',
      'input#user_id',
      'input[type="text"]'
    ];
    
    let userIdInput = null;
    for (const selector of userIdSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        userIdInput = await page.$(selector);
        if (userIdInput) {
          log(`Found user_id with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!userIdInput) {
      throw new Error('Could not find user_id input field');
    }
    
    // Enter credentials
    log('Entering user ID...');
    await userIdInput.click({ clickCount: 3 }); // Select all
    await userIdInput.type(CONFIG.BCA_USER_ID, { delay: 50 });
    await delay(500);
    log('User ID entered');
    
    log('Entering PIN...');
    const pinSelectors = [
      'input[name="value(pswd)"]',
      'input[name="pswd"]',
      'input#pswd',
      'input[type="password"]'
    ];
    
    let pinInput = null;
    for (const selector of pinSelectors) {
      pinInput = await page.$(selector);
      if (pinInput) {
        log(`Found PIN with selector: ${selector}`);
        break;
      }
    }
    
    if (!pinInput) {
      throw new Error('Could not find PIN input field');
    }
    
    await pinInput.click({ clickCount: 3 });
    await pinInput.type(CONFIG.BCA_PIN, { delay: 50 });
    await delay(500);
    log('PIN entered');
    
    await saveDebug(page, '02-credentials-entered');
    
    // Find submit button
    log('Looking for submit button...');
    await delay(1000); // Wait for any JS to initialize
    
    const submitSelectors = [
      'input[type="submit"]',
      'input[value="LOGIN"]',
      'input[name="value(actions)"]',
      'button[type="submit"]',
      'input.button'
    ];
    
    let submitButton = null;
    let submitSelector = null;
    for (const selector of submitSelectors) {
      submitButton = await page.$(selector);
      if (submitButton) {
        submitSelector = selector;
        log(`Submit button found with selector: ${selector}`);
        break;
      }
    }
    
    if (!submitButton) {
      await saveDebug(page, '02b-no-submit', 'html');
      throw new Error('Submit button not found');
    }
    
    await saveDebug(page, '03-before-click');
    log('Clicking submit button...');
    
    // === ENHANCED CLICK STRATEGY ===
    let loginSuccess = false;
    
    // Strategy 1: JavaScript form submit
    log('Strategy 1: JavaScript form.submit()...');
    try {
      const submitted = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.submit();
          return true;
        }
        return false;
      });
      
      if (submitted) {
        log('Form submitted via JavaScript');
        await delay(3000);
        
        // Check if we navigated
        const newUrl = page.url();
        if (!newUrl.includes('klikbca.com') || newUrl !== 'https://ibank.klikbca.com/') {
          loginSuccess = true;
        }
      }
    } catch (e) {
      log(`Strategy 1 failed: ${e.message}`, 'WARN');
    }
    
    await saveDebug(page, '04-after-submit-1');
    
    // Check if still on login page
    const stillOnLogin1 = await page.$('input[name="value(user_id)"], input[name="user_id"]');
    if (stillOnLogin1 && !loginSuccess) {
      log('Still on login page, trying Strategy 2...');
      
      // Re-enter credentials (they might have been cleared)
      const userIdField = await page.$('input[name="value(user_id)"], input[name="user_id"]');
      const pinField = await page.$('input[name="value(pswd)"], input[name="pswd"], input[type="password"]');
      
      if (userIdField && pinField) {
        await userIdField.click({ clickCount: 3 });
        await userIdField.type(CONFIG.BCA_USER_ID, { delay: 30 });
        await pinField.click({ clickCount: 3 });
        await pinField.type(CONFIG.BCA_PIN, { delay: 30 });
        await delay(500);
      }
      
      // Strategy 2: Direct click on submit with waitForNavigation
      log('Strategy 2: Direct click with waitForNavigation...');
      try {
        const newSubmitBtn = await page.$('input[type="submit"]');
        if (newSubmitBtn) {
          await Promise.all([
            page.waitForNavigation({ 
              waitUntil: 'networkidle2', 
              timeout: 15000 
            }).catch(e => log(`Nav timeout: ${e.message}`, 'WARN')),
            newSubmitBtn.click()
          ]);
          await delay(2000);
        }
      } catch (e) {
        log(`Strategy 2 failed: ${e.message}`, 'WARN');
      }
      
      await saveDebug(page, '05-after-submit-2');
    }
    
    // Check if still on login page
    const stillOnLogin2 = await page.$('input[name="value(user_id)"], input[name="user_id"]');
    if (stillOnLogin2) {
      log('Still on login page, trying Strategy 3...');
      
      // Strategy 3: Click via JavaScript on the element
      log('Strategy 3: Element.click() via JavaScript...');
      try {
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('input');
          for (const btn of buttons) {
            if (btn.type === 'submit' || btn.value.toUpperCase().includes('LOGIN')) {
              btn.click();
              return true;
            }
          }
          return false;
        });
        await delay(5000);
      } catch (e) {
        log(`Strategy 3 failed: ${e.message}`, 'WARN');
      }
      
      await saveDebug(page, '06-after-submit-3');
    }
    
    // Check if still on login page
    await delay(2000);
    const stillOnLogin3 = await page.$('input[name="value(user_id)"], input[name="user_id"]');
    if (stillOnLogin3) {
      // Try Strategy 4: Keyboard Enter
      log('Still on login page, trying Strategy 4: Keyboard Enter...');
      
      const pinField = await page.$('input[type="password"]');
      if (pinField) {
        await pinField.focus();
        await page.keyboard.press('Enter');
        await delay(5000);
      }
      
      await saveDebug(page, '07-after-enter');
    }
    
    // Final check
    await delay(2000);
    await saveDebug(page, '08-final-login-state');
    await saveDebug(page, '08-final-login-state', 'html');
    
    const pageContent = await page.content();
    const currentUrl = page.url();
    log(`Current URL: ${currentUrl}`);
    
    // Check for error messages
    if (pageContent.includes('Password atau User ID salah') || 
        pageContent.includes('incorrect') ||
        pageContent.includes('invalid') ||
        pageContent.includes('Kesalahan')) {
      throw new Error('Login failed - incorrect credentials');
    }
    
    // Check if still on login page
    const finalLoginCheck = await page.$('input[name="value(user_id)"], input[name="user_id"]');
    if (finalLoginCheck) {
      throw new Error('Login failed - still on login page after all attempts');
    }
    
    log('Login successful!');
    await saveDebug(page, '09-logged-in');
    
    // Navigate to account statement
    log('Navigating to account statement...');
    await delay(2000);
    
    // Try direct URL navigation
    try {
      await page.goto('https://ibank.klikbca.com/accountstmt.do?value(actions)=acct_stmt', {
        waitUntil: 'networkidle2', 
        timeout: CONFIG.TIMEOUT
      });
    } catch (e) {
      log(`Direct navigation failed: ${e.message}`, 'WARN');
      
      // Try clicking menu links
      await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          const text = (link.textContent || '').toLowerCase();
          if (text.includes('informasi rekening') || 
              text.includes('account information')) {
            link.click();
            return true;
          }
        }
        return false;
      });
      await delay(3000);
    }
    
    await saveDebug(page, '10-account-page');

    // Set today's date and submit
    const today = new Date();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    
    try {
      // Try different date selector patterns
      const dateSelectors = [
        { start: 'select[name="value(startDt)"]', startMt: 'select[name="value(startMt)"]', end: 'select[name="value(endDt)"]', endMt: 'select[name="value(endMt)"]' },
        { start: 'select[name="startDt"]', startMt: 'select[name="startMt"]', end: 'select[name="endDt"]', endMt: 'select[name="endMt"]' }
      ];
      
      for (const sel of dateSelectors) {
        try {
          await page.select(sel.start, day);
          await page.select(sel.startMt, month);
          await page.select(sel.end, day);
          await page.select(sel.endMt, month);
          log('Date range set successfully');
          break;
        } catch (e) {
          // Try next pattern
        }
      }
      
      // Click view button
      const viewBtn = await page.$('input[type="submit"], input[value*="Lihat"], input[value*="View"]');
      if (viewBtn) {
        await viewBtn.click();
        await delay(3000);
      }
    } catch (e) {
      log(`Date selection failed: ${e.message}`, 'WARN');
    }
    
    await saveDebug(page, '11-mutations-result');

    // Parse mutations from table
    const currentYear = today.getFullYear();
    mutations = await page.evaluate((year) => {
      const results = [];
      const tables = document.querySelectorAll('table');
      
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const firstCell = cells[0]?.innerText?.trim() || '';
            const dateMatch = firstCell.match(/^(\d{1,2})\/(\d{1,2})/);
            
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, '0');
              const month = dateMatch[2].padStart(2, '0');
              const date = `${year}-${month}-${day}`;
              const description = cells[1]?.innerText?.trim() || '';
              
              let amount = 0;
              let type = 'credit';
              
              for (let i = 2; i < cells.length; i++) {
                const cellText = cells[i]?.innerText?.trim() || '';
                if (cellText.toUpperCase() === 'DB') type = 'debit';
                const parsed = parseFloat(cellText.replace(/[.,]/g, ''));
                if (parsed > 0 && !amount) amount = parsed;
              }
              
              if (amount > 0) {
                results.push({ date, amount: Math.round(amount), type, description });
              }
            }
          }
        }
      }
      return results;
    }, currentYear);

    log(`Found ${mutations.length} mutations`);

    // Logout
    try {
      log('Logging out...');
      const logoutClicked = await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          const text = (link.textContent || '').toLowerCase();
          if (text.includes('logout') || text.includes('keluar')) {
            link.click();
            return true;
          }
        }
        return false;
      });
      if (logoutClicked) {
        await delay(2000);
        log('Logged out successfully');
      }
    } catch (e) {
      log(`Logout error: ${e.message}`, 'WARN');
    }
    
    await saveDebug(page, '12-final');

  } catch (error) {
    log(`Scrape error: ${error.message}`, 'ERROR');
    log(`Stack: ${error.stack}`, 'DEBUG');
    await saveDebug(page, 'error-state');
    await saveDebug(page, 'error-state', 'html');
    throw error;
  } finally {
    await browser.close();
    log('Browser closed');
  }

  return mutations;
}

// Burst mode loop
async function runBurstMode(initialCommand) {
  log('=== ENTERING BURST MODE ===');
  const maxDuration = 120000; // 2 minutes
  const burstStart = Date.now();
  let checkCount = 0;

  while (Date.now() - burstStart < maxDuration) {
    checkCount++;
    log(`--- Burst scrape #${checkCount} ---`);

    try {
      const mutations = await scrapeBCA();
      if (mutations.length > 0) {
        const result = await sendToWebhook(mutations);
        if (result.matched > 0) {
          log(`MATCH FOUND! Stopping burst.`);
          break;
        }
      }
    } catch (e) {
      log(`Burst scrape error: ${e.message}`, 'ERROR');
    }

    // Check if burst still active
    const status = await checkBurstCommand();
    if (!status.burst_active) {
      log('Burst stopped by server');
      break;
    }

    const interval = (status.interval_seconds || 10) * 1000;
    log(`Waiting ${interval/1000}s...`);
    await delay(interval);
  }

  log(`=== BURST MODE ENDED (${checkCount} scrapes) ===`);
}

// Main entry
async function main() {
  const isBurstCheck = process.argv.includes('--burst-check');

  if (isBurstCheck) {
    log('Checking for burst command...');
    const cmd = await checkBurstCommand();
    if (cmd.burst_active) {
      await runBurstMode(cmd);
    } else {
      log(`Burst inactive: ${cmd.reason || 'No burst'}`);
    }
  } else {
    // Normal mode
    const mutations = await scrapeBCA();
    if (mutations.length > 0) {
      const result = await sendToWebhook(mutations);
      log(`Result: ${JSON.stringify(result)}`);
    } else {
      log('No mutations found');
    }
  }
}

// Run with retry
async function runWithRetry() {
  const isBurstCheck = process.argv.includes('--burst-check');
  if (isBurstCheck) return main();

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      await main();
      return;
    } catch (e) {
      log(`Attempt ${attempt} failed: ${e.message}`, 'ERROR');
      if (attempt < CONFIG.MAX_RETRIES) await delay(CONFIG.RETRY_DELAY);
    }
  }
  process.exit(1);
}

runWithRetry();
