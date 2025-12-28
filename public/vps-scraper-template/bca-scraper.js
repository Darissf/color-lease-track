/**
 * BCA iBanking Scraper with Enhanced Frame/Iframe Handling
 * 
 * Features:
 * - Proper iframe detection and handling
 * - Multiple fallback strategies for login
 * - Debug screenshots at each step
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

/**
 * Find the frame containing the login form
 * KlikBCA uses iframes, so we need to search all frames
 */
async function findLoginFrame(page) {
  const frames = page.frames();
  log(`Total frames on page: ${frames.length}`);
  
  // Log all frames for debugging
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const url = f.url();
    const name = f.name() || 'unnamed';
    log(`Frame ${i}: name="${name}", url=${url.substring(0, 80)}...`);
  }
  
  // Priority selectors - VISIBLE input fields first, then hidden
  const loginSelectors = [
    'input#txt_user_id',           // Visible User ID field (priority)
    'input[name="txt_user_id"]',   // Visible User ID field alt
    'input[name="value(user_id)"]', // Hidden field fallback
    'input[name="user_id"]',
    'input#user_id'
  ];
  
  // First, check main page
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
      } catch (e) {
        // Frame might be inaccessible
      }
    }
  }
  
  return null;
}

/**
 * Enter credentials using multiple strategies
 */
async function enterCredentials(frame, userId, pin) {
  log('Entering credentials...');
  
  // Strategy 1: Use VISIBLE input fields (txt_user_id, txt_pswd) - CORRECT APPROACH
  try {
    log('Strategy 1: Using VISIBLE input fields (txt_user_id, txt_pswd)...');
    
    // Priority: VISIBLE fields first (txt_user_id, txt_pswd)
    const userIdInput = await frame.$('input#txt_user_id') || 
                        await frame.$('input[name="txt_user_id"]') ||
                        await frame.$('input[name="value(user_id)"]'); // hidden fallback
    
    const pinInput = await frame.$('input#txt_pswd') || 
                     await frame.$('input[name="txt_pswd"]') ||
                     await frame.$('input[type="password"]') ||
                     await frame.$('input[name="value(pswd)"]'); // hidden fallback
    
    if (userIdInput && pinInput) {
      // Log which selectors were found
      const userIdSelector = await frame.evaluate(el => {
        return `id="${el.id}" name="${el.name}" type="${el.type}"`;
      }, userIdInput);
      log(`Found User ID input: ${userIdSelector}`);
      
      const pinSelector = await frame.evaluate(el => {
        return `id="${el.id}" name="${el.name}" type="${el.type}"`;
      }, pinInput);
      log(`Found PIN input: ${pinSelector}`);
      
      // Focus, clear and type into User ID
      await userIdInput.focus();
      await delay(200);
      await frame.evaluate(el => { el.value = ''; }, userIdInput);
      await userIdInput.type(userId, { delay: 50 });
      log('User ID entered via type()');
      
      // Focus, clear and type into PIN
      await pinInput.focus();
      await delay(200);
      await frame.evaluate(el => { el.value = ''; }, pinInput);
      await pinInput.type(pin, { delay: 50 });
      log('PIN entered via type()');
      
      return true;
    } else {
      log(`User ID input found: ${!!userIdInput}, PIN input found: ${!!pinInput}`, 'WARN');
    }
  } catch (e) {
    log(`Strategy 1 failed: ${e.message}`, 'WARN');
  }
  
  // Strategy 2: Use frame.evaluate() for direct DOM manipulation with VISIBLE fields
  try {
    log('Strategy 2: Using frame.evaluate() with VISIBLE fields...');
    
    const success = await frame.evaluate((userId, pin) => {
      const findInput = (selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            console.log(`Found input with selector: ${sel}`);
            return el;
          }
        }
        return null;
      };
      
      // Priority: VISIBLE fields first
      const userIdInput = findInput([
        'input#txt_user_id',           // Visible - priority
        'input[name="txt_user_id"]',   // Visible - alt
        'input[name="value(user_id)"]', // Hidden - fallback
        'input[name="user_id"]',
        'input#user_id'
      ]);
      
      const pinInput = findInput([
        'input#txt_pswd',              // Visible - priority
        'input[name="txt_pswd"]',      // Visible - alt
        'input[type="password"]',      // Generic password
        'input[name="value(pswd)"]',   // Hidden - fallback
        'input[name="pswd"]',
        'input#pswd'
      ]);
      
      console.log(`UserID input found: ${!!userIdInput}, PIN input found: ${!!pinInput}`);
      
      if (userIdInput && pinInput) {
        // Set value and trigger events
        userIdInput.value = userId;
        userIdInput.dispatchEvent(new Event('input', { bubbles: true }));
        userIdInput.dispatchEvent(new Event('change', { bubbles: true }));
        userIdInput.dispatchEvent(new Event('keyup', { bubbles: true }));
        
        pinInput.value = pin;
        pinInput.dispatchEvent(new Event('input', { bubbles: true }));
        pinInput.dispatchEvent(new Event('change', { bubbles: true }));
        pinInput.dispatchEvent(new Event('keyup', { bubbles: true }));
        
        console.log(`Credentials set: userID=${userId.substring(0,3)}***, pinLength=${pin.length}`);
        return true;
      }
      return false;
    }, userId, pin);
    
    if (success) {
      log('Credentials entered via evaluate()');
      return true;
    }
  } catch (e) {
    log(`Strategy 2 failed: ${e.message}`, 'WARN');
  }
  
  // Strategy 3: Click on input first, then type (simulates real user)
  try {
    log('Strategy 3: Click + type simulation...');
    
    const userIdInput = await frame.$('input#txt_user_id') || 
                        await frame.$('input[name="txt_user_id"]');
    const pinInput = await frame.$('input#txt_pswd') || 
                     await frame.$('input[name="txt_pswd"]') ||
                     await frame.$('input[type="password"]');
    
    if (userIdInput && pinInput) {
      // Click on User ID field
      await userIdInput.click({ clickCount: 3 }); // Triple click to select all
      await delay(100);
      await frame.keyboard.type(userId, { delay: 50 });
      log('User ID entered via click+type');
      
      // Click on PIN field
      await pinInput.click({ clickCount: 3 });
      await delay(100);
      await frame.keyboard.type(pin, { delay: 50 });
      log('PIN entered via click+type');
      
      return true;
    }
  } catch (e) {
    log(`Strategy 3 failed: ${e.message}`, 'WARN');
  }
  
  return false;
}

/**
 * Submit login form using multiple strategies
 * IMPORTANT: Must CLICK the LOGIN button to trigger Login_Form_Validator() JavaScript
 */
async function submitLogin(frame, page) {
  log('Attempting to submit login form...');
  
  // Strategy 1: Click LOGIN button (PREFERRED - triggers JavaScript validator)
  try {
    log('Submit Strategy 1: Click LOGIN button (triggers validator)...');
    
    // Find LOGIN button - various selectors
    const submitBtn = await frame.$('input[value="LOGIN"]') ||
                      await frame.$('input[type="submit"]') ||
                      await frame.$('input[name="value(Submit)"]') ||
                      await frame.$('input[name="value(actions)"]') ||
                      await frame.$('input.btn') ||
                      await frame.$('input[onclick*="Login_Form_Validator"]');
    
    if (submitBtn) {
      // Log button info
      const btnInfo = await frame.evaluate(el => {
        return `value="${el.value}" name="${el.name}" onclick="${el.getAttribute('onclick') || 'none'}"`;
      }, submitBtn);
      log(`Found submit button: ${btnInfo}`);
      
      await submitBtn.click();
      log('LOGIN button clicked');
      await delay(3000);
      return true;
    }
  } catch (e) {
    log(`Submit Strategy 1 failed: ${e.message}`, 'WARN');
  }
  
  // Strategy 2: JavaScript click with validator trigger
  try {
    log('Submit Strategy 2: JavaScript click with validator...');
    const clicked = await frame.evaluate(() => {
      // First, try to call validator directly if it exists
      if (typeof Login_Form_Validator === 'function') {
        console.log('Calling Login_Form_Validator directly');
        Login_Form_Validator(document.forms[0]);
        return true;
      }
      
      // Otherwise, click the button
      const buttons = document.querySelectorAll('input[value="LOGIN"], input[type="submit"]');
      for (const btn of buttons) {
        console.log(`Clicking button: ${btn.value}`);
        btn.click();
        return true;
      }
      return false;
    });
    
    if (clicked) {
      log('Submit via JavaScript click/validator');
      await delay(3000);
      return true;
    }
  } catch (e) {
    log(`Submit Strategy 2 failed: ${e.message}`, 'WARN');
  }
  
  // Strategy 3: form.submit() - BACKUP ONLY (may skip JavaScript validation)
  try {
    log('Submit Strategy 3: form.submit() (backup)...');
    const submitted = await frame.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        // Try to trigger onsubmit handler first
        if (form.onsubmit) {
          const result = form.onsubmit();
          if (result === false) {
            console.log('onsubmit returned false, not submitting');
            return false;
          }
        }
        form.submit();
        return true;
      }
      return false;
    });
    
    if (submitted) {
      log('Form submitted via form.submit()');
      await delay(3000);
      return true;
    }
  } catch (e) {
    log(`Submit Strategy 3 failed: ${e.message}`, 'WARN');
  }
  
  // Strategy 4: Keyboard Enter on password field
  try {
    log('Submit Strategy 4: Keyboard Enter...');
    const pinInput = await frame.$('input#txt_pswd') || 
                     await frame.$('input[name="txt_pswd"]') ||
                     await frame.$('input[type="password"]');
    if (pinInput) {
      await pinInput.focus();
      await delay(100);
      await frame.keyboard.press('Enter');
      log('Enter key pressed');
      await delay(3000);
      return true;
    }
  } catch (e) {
    log(`Submit Strategy 4 failed: ${e.message}`, 'WARN');
  }
  
  return false;
}

// Main scrape function with enhanced frame handling
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
    await saveDebug(page, '01-login-page', 'html');
    log(`Page title: ${await page.title()}`);
    
    // === FIND LOGIN FRAME ===
    log('Searching for login form in frames...');
    const frameResult = await findLoginFrame(page);
    
    if (!frameResult) {
      throw new Error('Could not find login form in any frame');
    }
    
    const { frame, isMainPage } = frameResult;
    log(`Using ${isMainPage ? 'main page' : 'iframe'} for login`);
    
    // === ENTER CREDENTIALS ===
    const credentialsEntered = await enterCredentials(frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
    if (!credentialsEntered) {
      throw new Error('Failed to enter credentials');
    }
    
    await delay(500);
    await saveDebug(page, '02-credentials-entered');
    
    // === SUBMIT LOGIN ===
    await saveDebug(page, '03-before-submit');
    const submitted = await submitLogin(frame, page);
    
    if (!submitted) {
      log('All submit strategies failed, trying additional methods...', 'WARN');
    }
    
    await delay(3000);
    await saveDebug(page, '04-after-submit');
    
    // Check if still on login page - try re-submit if needed
    let loginFrame = await findLoginFrame(page);
    if (loginFrame) {
      log('Still on login page, re-entering credentials and trying again...');
      
      await enterCredentials(loginFrame.frame, CONFIG.BCA_USER_ID, CONFIG.BCA_PIN);
      await delay(500);
      await submitLogin(loginFrame.frame, page);
      await delay(3000);
      
      await saveDebug(page, '05-second-attempt');
    }
    
    // Final login check
    await delay(2000);
    await saveDebug(page, '06-final-login-state');
    await saveDebug(page, '06-final-login-state', 'html');
    
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
    const finalLoginCheck = await findLoginFrame(page);
    if (finalLoginCheck) {
      throw new Error('Login failed - still on login page after all attempts');
    }
    
    log('Login successful!');
    await saveDebug(page, '07-logged-in');
    
    // === FRAME-BASED NAVIGATION (preserves session) ===
    log('Navigating to account statement via FRAME...');
    await delay(2000);
    
    // Log all frames after login
    const allFrames = page.frames();
    log(`Total frames after login: ${allFrames.length}`);
    allFrames.forEach((f, i) => {
      log(`Frame ${i}: name="${f.name() || 'unnamed'}", url=${f.url().substring(0, 60)}...`);
    });
    
    // Find the menu frame (left sidebar)
    const menuFrame = page.frames().find(f => f.name() === 'menu');
    let atmFrame = page.frames().find(f => f.name() === 'atm');
    
    if (!menuFrame) {
      log('Menu frame not found, trying fallback navigation...', 'WARN');
      throw new Error('Menu frame not found after login');
    }
    
    log(`Found menu frame: ${menuFrame.url()}`);
    if (atmFrame) log(`Found atm frame: ${atmFrame.url()}`);
    
    // Step 1: Click "Informasi Rekening" in menu frame
    log('Clicking Informasi Rekening in menu...');
    const menuClicked = await menuFrame.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = (link.textContent || '').toLowerCase();
        const href = (link.href || '').toLowerCase();
        console.log(`Menu link: "${text}" -> ${href}`);
        if (text.includes('informasi rekening') || 
            text.includes('account information') ||
            href.includes('account_information')) {
          console.log(`Clicking: ${text}`);
          link.click();
          return { success: true, text };
        }
      }
      return { success: false };
    });
    
    log(`Menu click result: ${JSON.stringify(menuClicked)}`);
    await delay(3000);
    await saveDebug(page, '08-after-menu-click');
    
    // Re-find atm frame (content may have changed)
    atmFrame = page.frames().find(f => f.name() === 'atm');
    if (!atmFrame) {
      throw new Error('ATM frame not found after menu click');
    }
    
    log(`ATM frame URL: ${atmFrame.url()}`);
    await saveDebug(page, '08b-atm-frame');
    
    // Step 2: Click "Mutasi Rekening" in MENU frame (submenu)
    // After clicking "Informasi Rekening", the menu frame updates to show submenu
    log('Looking for Mutasi Rekening in MENU frame (submenu)...');
    
    // Wait for menu frame to update with submenu
    await delay(1500);
    
    // Re-get the menu frame (it should now show submenu)
    const updatedMenuFrame = page.frames().find(f => f.name() === 'menu');
    if (!updatedMenuFrame) {
      throw new Error('Menu frame not found after menu click');
    }
    log(`Updated menu frame URL: ${updatedMenuFrame.url()}`);
    
    // List all links in updated menu frame for debugging
    await updatedMenuFrame.evaluate(() => {
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        console.log(`Submenu link: "${link.textContent?.trim()}" -> ${link.href}`);
      });
    });
    
    // Click "Mutasi Rekening" in the submenu
    const stmtClicked = await updatedMenuFrame.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = (link.textContent || '').toLowerCase().trim();
        const href = (link.href || '').toLowerCase();
        if (text.includes('mutasi rekening') || 
            text.includes('account statement') ||
            href.includes('accountstmt') ||
            href.includes('acct_stmt') ||
            href.includes('balanceinquiry')) {
          console.log(`Clicking submenu: ${text} -> ${href}`);
          link.click();
          return { success: true, text, href };
        }
      }
      return { success: false };
    });
    
    log(`Submenu click result: ${JSON.stringify(stmtClicked)}`);
    await delay(3000);
    
    // Now ATM frame should have the account statement form
    atmFrame = page.frames().find(f => f.name() === 'atm');
    if (!atmFrame) {
      throw new Error('ATM frame not found after submenu click');
    }
    log(`ATM frame URL after submenu click: ${atmFrame.url()}`);
    await saveDebug(page, '09-account-page');
    
    // Step 3: Set date range in ATM frame
    const today = new Date();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    
    log(`Setting date: ${day}/${month}`);
    
    try {
      // Try to set dates in ATM frame
      const dateSet = await atmFrame.evaluate((day, month) => {
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
            console.log('Found date selectors');
            startDt.value = day;
            startMt.value = month;
            endDt.value = day;
            endMt.value = month;
            return { success: true, pattern: sel.start };
          }
        }
        return { success: false };
      }, day, month);
      
      log(`Date set result: ${JSON.stringify(dateSet)}`);
      
      // Click view button in ATM frame
      const viewClicked = await atmFrame.evaluate(() => {
        const buttons = document.querySelectorAll('input[type="submit"], input[value*="Lihat"], input[value*="View"], input[name*="Submit"]');
        for (const btn of buttons) {
          console.log(`Button: value="${btn.value}" name="${btn.name}"`);
          if (btn.value.toLowerCase().includes('lihat') || 
              btn.value.toLowerCase().includes('view') ||
              btn.type === 'submit') {
            btn.click();
            return { success: true, value: btn.value };
          }
        }
        return { success: false };
      });
      
      log(`View button result: ${JSON.stringify(viewClicked)}`);
      await delay(3000);
    } catch (e) {
      log(`Date selection failed: ${e.message}`, 'WARN');
    }
    
    // Re-find atm frame for parsing
    atmFrame = page.frames().find(f => f.name() === 'atm');
    await saveDebug(page, '10-mutations-result');

    // Step 4: Parse mutations from ATM frame
    const currentYear = today.getFullYear();
    log('Parsing mutations from ATM frame...');
    
    mutations = await atmFrame.evaluate((year) => {
      const results = [];
      const seen = new Set(); // For deduplication
      const tables = document.querySelectorAll('table');
      console.log(`[PARSE] Found ${tables.length} tables total`);
      
      for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
        const table = tables[tableIdx];
        const rows = table.querySelectorAll('tr');
        console.log(`[TABLE ${tableIdx}] ${rows.length} rows`);
        
        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
          const row = rows[rowIdx];
          const cells = row.querySelectorAll('td');
          
          // FIX 3: Skip rows with too many cells (header rows with merged cells)
          if (cells.length > 10) {
            console.log(`[ROW ${rowIdx}] Skipping - too many cells (${cells.length})`);
            continue;
          }
          
          // Need at least 4 columns: Date, Description, Branch, Mutation
          if (cells.length >= 4) {
            const firstCellRaw = cells[0]?.innerText || '';
            const firstCell = firstCellRaw.trim();
            const firstCellUpper = firstCell.toUpperCase();
            
            // Log first few chars of each row for debugging
            console.log(`[ROW ${rowIdx}] ${cells.length} cells, first="${firstCell.substring(0, 10)}"`);
            
            // Handle both date format (28/12) and "PEND" for pending transactions
            // Use includes() for PEND to handle whitespace/hidden chars
            const dateMatch = firstCell.match(/^(\d{1,2})\/(\d{1,2})/);
            const isPending = firstCellUpper.includes('PEND');
            
            if (dateMatch || isPending) {
              let date;
              if (isPending) {
                // Use today's date for pending transactions
                const now = new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                date = `${year}-${month}-${day}`;
                console.log(`[PEND] Using today's date: ${date}`);
              } else {
                const day = dateMatch[1].padStart(2, '0');
                const month = dateMatch[2].padStart(2, '0');
                date = `${year}-${month}-${day}`;
              }
              
              const description = cells[1]?.innerText?.trim() || '';
              
              // BCA Table Structure:
              // Col 0: Date (DD/MM or PEND)
              // Col 1: Description (Keterangan)
              // Col 2: Branch (Cab.) - skip this
              // Col 3: Mutation (Mutasi) - contains amount + CR/DB
              // Col 4: Balance (Saldo) - skip this
              
              // Get mutation directly from column index 3
              const mutasiCell = cells[3]?.innerText?.trim() || '';
              console.log(`[MUTASI] Col3: "${mutasiCell}"`);
              
              // FIX 2: Determine type from description (more reliable than mutasi cell)
              // Look for DB indicator in description
              let type = 'credit';
              const descUpper = description.toUpperCase();
              if (descUpper.includes(' DB') || descUpper.includes('/DB') || descUpper.includes('DB\n') || descUpper.includes('DB ')) {
                type = 'debit';
              }
              // Also check mutasi cell as fallback
              if (mutasiCell.toUpperCase().includes('DB')) {
                type = 'debit';
              }
              
              // Parse amount - BCA uses comma for thousands, dot for decimals
              // Format examples: "2,345.00 CR" or "333,000.00 DB"
              // Remove commas and non-numeric chars except dot
              const cleanedAmount = mutasiCell.replace(/,/g, '').replace(/[^0-9.]/g, '');
              const amount = parseFloat(cleanedAmount);
              
              console.log(`[AMOUNT] Cleaned: "${cleanedAmount}" -> ${amount}`);
              console.log(`[TYPE] Detected: ${type} (desc="${descUpper.substring(0, 30)}")`);
              
              if (amount > 0) {
                // FIX 1: Deduplicate using unique key
                const dedupKey = `${date}-${Math.round(amount)}-${description.substring(0, 30)}`;
                
                if (seen.has(dedupKey)) {
                  console.log(`[SKIP] Duplicate: ${dedupKey}`);
                  continue;
                }
                seen.add(dedupKey);
                
                console.log(`[FOUND] ${date} ${type} Rp${amount} - ${description.substring(0, 30)}...`);
                results.push({ 
                  date, 
                  amount: Math.round(amount), 
                  type, 
                  description 
                });
              }
            }
          }
        }
      }
      
      console.log(`[RESULT] Total unique mutations found: ${results.length}`);
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
    
    await saveDebug(page, '10-final');

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
