/**
 * BCA iBanking Scraper with Burst Mode Support
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

const CONFIG = {
  BCA_USER_ID: process.env.BCA_USER_ID || 'YOUR_KLIKBCA_USER_ID',
  BCA_PIN: process.env.BCA_PIN || 'YOUR_KLIKBCA_PIN',
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook',
  SECRET_KEY: process.env.SECRET_KEY || 'YOUR_SECRET_KEY_HERE',
  ACCOUNT_NUMBER: process.env.BCA_ACCOUNT_NUMBER || '1234567890',
  HEADLESS: process.env.HEADLESS !== 'false',
  SLOW_MO: parseInt(process.env.SLOW_MO) || 50,
  TIMEOUT: parseInt(process.env.TIMEOUT) || 60000,
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY) || 5000,
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
}

// Main scrape function (simplified for brevity - keep your existing scrapeBCA logic)
async function scrapeBCA() {
  log('Starting BCA scrape...');
  
  const browser = await puppeteer.launch({
    headless: CONFIG.HEADLESS ? 'new' : false,
    slowMo: CONFIG.SLOW_MO,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');

  let mutations = [];

  try {
    // Navigate and login
    await page.goto('https://ibank.klikbca.com/', { waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });
    await page.waitForSelector('input[name="value(user_id)"]', { timeout: 15000 });
    
    await page.type('input[name="value(user_id)"]', CONFIG.BCA_USER_ID, { delay: 30 });
    await page.type('input[name="value(pswd)"]', CONFIG.BCA_PIN, { delay: 30 });
    
    const submitBtn = await page.$('input[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT }),
      submitBtn.click(),
    ]);

    log('Login successful, fetching mutations...');
    
    // Navigate to account statement
    await page.goto('https://ibank.klikbca.com/accountstmt.do?value(actions)=acct_stmt', {
      waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT
    });

    // Set today's date and submit
    const today = new Date();
    const day = String(today.getDate());
    const month = String(today.getMonth() + 1);
    
    try {
      await page.select('select[name="value(startDt)"]', day);
      await page.select('select[name="value(startMt)"]', month);
      await page.select('select[name="value(endDt)"]', day);
      await page.select('select[name="value(endMt)"]', month);
      
      const viewBtn = await page.$('input[type="submit"]');
      if (viewBtn) await viewBtn.click();
      await delay(3000);
    } catch (e) {
      log('Date selection failed, using defaults');
    }

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
      const logoutBtn = await page.$('a[href*="logout"]');
      if (logoutBtn) await logoutBtn.click();
    } catch (e) {}

  } catch (error) {
    log(`Scrape error: ${error.message}`, 'ERROR');
    await page.screenshot({ path: 'error-screenshot.png' }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
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
