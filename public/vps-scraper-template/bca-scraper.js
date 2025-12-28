/**
 * BCA iBanking Scraper Template
 * 
 * Script ini untuk scraping mutasi BCA dari VPS sendiri
 * Jalankan dengan Node.js + Puppeteer
 * 
 * REQUIREMENTS:
 * - Node.js 18+
 * - npm install puppeteer
 * 
 * USAGE:
 * 1. Edit konfigurasi di bagian CONFIG
 * 2. Test manual: node bca-scraper.js
 * 3. Setup cron: */5 * * * * node /path/to/bca-scraper.js >> /var/log/bca-scraper.log 2>&1
 */

const puppeteer = require('puppeteer');

// ===================== CONFIG - EDIT BAGIAN INI =====================
const CONFIG = {
  // Kredensial BCA
  BCA_USER_ID: 'YOUR_KLIKBCA_USER_ID',
  BCA_PIN: 'YOUR_KLIKBCA_PIN',
  
  // Webhook URL dari Lovable
  WEBHOOK_URL: 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook',
  
  // Secret Key dari halaman settings
  SECRET_KEY: 'YOUR_SECRET_KEY_HERE',
  
  // Bank account (untuk logging)
  ACCOUNT_NUMBER: '1234567890',
  
  // Browser settings
  HEADLESS: true,           // false untuk debug (melihat browser)
  SLOW_MO: 100,             // delay antar aksi (ms)
  TIMEOUT: 60000,           // timeout navigasi (ms)
  
  // Retry settings  
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,        // delay antara retry (ms)
};
// ====================================================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeBCA() {
  console.log(`[${new Date().toISOString()}] Starting BCA scraper...`);
  
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: CONFIG.HEADLESS,
      slowMo: CONFIG.SLOW_MO,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 1. Navigate to KlikBCA
    console.log('Navigating to KlikBCA...');
    await page.goto('https://ibank.klikbca.com/', { 
      waitUntil: 'networkidle2',
      timeout: CONFIG.TIMEOUT 
    });
    
    // 2. Login
    console.log('Logging in...');
    
    // Wait for login form
    await page.waitForSelector('input[name="value(user_id)"]', { timeout: 10000 });
    
    // Type credentials
    await page.type('input[name="value(user_id)"]', CONFIG.BCA_USER_ID, { delay: 50 });
    await page.type('input[name="value(pswd)"]', CONFIG.BCA_PIN, { delay: 50 });
    
    // Click login button
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('input[type="submit"]'),
    ]);
    
    // 3. Check for login success
    console.log('Checking login status...');
    await delay(2000);
    
    // Check for error messages
    const pageContent = await page.content();
    if (pageContent.includes('User ID atau PIN Anda salah') || 
        pageContent.includes('login gagal') ||
        pageContent.includes('suspended')) {
      throw new Error('Login failed - check credentials');
    }
    
    // 4. Navigate to Account Information -> Mutasi Rekening
    console.log('Navigating to Mutasi Rekening...');
    
    // Click menu "Informasi Rekening"
    await page.waitForSelector('a[href*="accountstmt"]', { timeout: 10000 });
    
    // Go to mutasi page
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('a[href*="accountstmt"]'),
    ]);
    
    // 5. Select account and date range
    console.log('Setting date range...');
    
    // Get today's date for date range
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format dates: DD/MM/YYYY
    const formatDate = (d) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // Select date range (today only for frequent checking)
    await page.waitForSelector('select[name="value(startDt)"]', { timeout: 5000 });
    
    // Set start date to today
    await page.select('select[name="value(startDt)"]', String(today.getDate()));
    await page.select('select[name="value(startMt)"]', String(today.getMonth() + 1));
    await page.select('select[name="value(startYr)"]', String(today.getFullYear()));
    
    // Set end date to today
    await page.select('select[name="value(endDt)"]', String(today.getDate()));
    await page.select('select[name="value(endMt)"]', String(today.getMonth() + 1));
    await page.select('select[name="value(endYr)"]', String(today.getFullYear()));
    
    // Submit
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('input[type="submit"]'),
    ]);
    
    // 6. Parse mutation table
    console.log('Parsing mutations...');
    
    const mutations = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tr');
      const results = [];
      
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          // Expected format: Date | Description | Branch | Amount | Type | Balance
          const dateCell = cells[0]?.innerText?.trim();
          const descCell = cells[1]?.innerText?.trim();
          const amountCell = cells[2]?.innerText?.trim() || cells[3]?.innerText?.trim();
          const typeCell = cells[3]?.innerText?.trim() || cells[4]?.innerText?.trim();
          const balanceCell = cells[4]?.innerText?.trim() || cells[5]?.innerText?.trim();
          
          // Skip header rows
          if (dateCell && dateCell.match(/\d{2}\/\d{2}\/\d{4}/) && amountCell) {
            // Parse amount - remove thousand separators
            const amountClean = amountCell.replace(/[.,]/g, '').replace(/\D/g, '');
            const amount = parseInt(amountClean, 10);
            
            // Determine transaction type
            const type = typeCell?.toUpperCase()?.includes('CR') ? 'credit' : 'debit';
            
            // Parse date to YYYY-MM-DD
            const [day, month, year] = dateCell.split('/');
            const date = `${year}-${month}-${day}`;
            
            // Parse balance
            const balanceClean = balanceCell?.replace(/[.,]/g, '').replace(/\D/g, '');
            const balance = balanceClean ? parseInt(balanceClean, 10) : null;
            
            if (amount > 0) {
              results.push({
                date,
                time: null, // BCA doesn't show time in standard mutasi view
                amount,
                type,
                description: descCell || '',
                balance_after: balance,
              });
            }
          }
        }
      }
      
      return results;
    });
    
    console.log(`Found ${mutations.length} mutations`);
    
    // 7. Logout
    console.log('Logging out...');
    try {
      await page.click('a[href*="logout"]');
      await delay(1000);
    } catch (e) {
      console.log('Logout button not found, continuing...');
    }
    
    // 8. Send to webhook
    if (mutations.length > 0) {
      console.log('Sending to webhook...');
      
      const response = await fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret_key: CONFIG.SECRET_KEY,
          mutations: mutations,
          bank_name: 'BCA',
          account_number: CONFIG.ACCOUNT_NUMBER,
        }),
      });
      
      const result = await response.json();
      console.log('Webhook response:', result);
      
      if (!result.success) {
        throw new Error(`Webhook failed: ${result.error}`);
      }
      
      console.log(`Successfully sent ${mutations.length} mutations to webhook`);
      console.log(`Processed: ${result.processed}, Matched: ${result.matched}`);
    } else {
      console.log('No new mutations found');
    }
    
    await browser.close();
    console.log(`[${new Date().toISOString()}] Scraper completed successfully`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Scraper error:`, error.message);
    
    if (browser) {
      await browser.close();
    }
    
    // Exit with error code for cron monitoring
    process.exit(1);
  }
}

// Run with retry logic
async function runWithRetry() {
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      await scrapeBCA();
      return; // Success, exit
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < CONFIG.MAX_RETRIES) {
        console.log(`Retrying in ${CONFIG.RETRY_DELAY / 1000} seconds...`);
        await delay(CONFIG.RETRY_DELAY);
      }
    }
  }
  
  console.error(`All ${CONFIG.MAX_RETRIES} attempts failed`);
  process.exit(1);
}

// Execute
runWithRetry();
