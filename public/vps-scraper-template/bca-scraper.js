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
 * 
 * REFERENSI:
 * - https://github.com/nicnocquee/klikbca.js
 * - https://github.com/nicnocquee/cek-mutasi-bca
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
  SLOW_MO: 50,              // delay antar aksi (ms)
  TIMEOUT: 60000,           // timeout navigasi (ms)
  
  // Retry settings  
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,        // delay antara retry (ms)
};
// ====================================================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get public IP for BCA login requirement
async function getPublicIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.log('Could not get public IP, using fallback...');
    return '127.0.0.1';
  }
}

// Parse Indonesian currency format (1.234.567,89 or 1,234,567.89)
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  // Remove all non-numeric characters except comma and dot
  let cleaned = amountStr.replace(/[^\d.,]/g, '').trim();
  
  // BCA uses dot as thousand separator and comma as decimal
  // e.g., 1.234.567,00 or just 1.234.567
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Format: 1.234.567,00
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.')) {
    // Check if dot is decimal or thousand separator
    const parts = cleaned.split('.');
    if (parts[parts.length - 1].length === 2) {
      // Likely decimal: 1234567.00
    } else {
      // Thousand separator: 1.234.567
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (cleaned.includes(',')) {
    // Comma might be decimal
    const parts = cleaned.split(',');
    if (parts[parts.length - 1].length === 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  return Math.abs(parseFloat(cleaned) || 0);
}

// Parse BCA date format (DD/MM or DD/MM/YYYY)
function parseDate(dateStr, year) {
  if (!dateStr) return null;
  
  const parts = dateStr.trim().split('/');
  if (parts.length === 2) {
    // Format: DD/MM
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else if (parts.length === 3) {
    // Format: DD/MM/YYYY
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${yr}-${month}-${day}`;
  }
  return null;
}

async function scrapeBCA() {
  console.log(`[${new Date().toISOString()}] Starting BCA scraper...`);
  
  let browser;
  const currentYear = new Date().getFullYear();
  
  try {
    // Get public IP first (BCA may require this)
    const publicIP = await getPublicIP();
    console.log(`Public IP: ${publicIP}`);
    
    browser = await puppeteer.launch({
      headless: CONFIG.HEADLESS ? 'new' : false,
      slowMo: CONFIG.SLOW_MO,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1366,768',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Enable request interception for debugging
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      request.continue();
    });
    
    // ========== STEP 1: Navigate to KlikBCA Login Page ==========
    console.log('Navigating to KlikBCA...');
    await page.goto('https://ibank.klikbca.com/', { 
      waitUntil: 'networkidle2',
      timeout: CONFIG.TIMEOUT 
    });
    
    // Wait for login form to be ready
    await page.waitForSelector('input[name="value(user_id)"]', { timeout: 15000 });
    console.log('Login form found');
    
    // ========== STEP 2: Login ==========
    console.log('Entering credentials...');
    
    // Clear any existing values and type credentials
    await page.evaluate(() => {
      const userIdInput = document.querySelector('input[name="value(user_id)"]');
      const pinInput = document.querySelector('input[name="value(pswd)"]');
      if (userIdInput) userIdInput.value = '';
      if (pinInput) pinInput.value = '';
    });
    
    // Type User ID
    await page.type('input[name="value(user_id)"]', CONFIG.BCA_USER_ID, { delay: 30 });
    await delay(300);
    
    // Type PIN
    await page.type('input[name="value(pswd)"]', CONFIG.BCA_PIN, { delay: 30 });
    await delay(300);
    
    // Find and click the submit button
    console.log('Submitting login form...');
    const submitButton = await page.$('input[type="submit"], input[name="value(Submit)"], button[type="submit"]');
    
    if (!submitButton) {
      throw new Error('Submit button not found');
    }
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT }),
      submitButton.click(),
    ]);
    
    // ========== STEP 3: Check Login Result ==========
    console.log('Checking login status...');
    await delay(2000);
    
    const pageContent = await page.content();
    const pageUrl = page.url();
    
    // Check for common login errors
    const loginErrors = [
      'User ID atau PIN Anda salah',
      'User ID atau PIN salah',
      'login gagal',
      'Login Failed',
      'suspended',
      'diblokir',
      'blocked',
      'Koneksi Anda telah terputus',
      'session expired'
    ];
    
    for (const errorMsg of loginErrors) {
      if (pageContent.toLowerCase().includes(errorMsg.toLowerCase())) {
        throw new Error(`Login failed: ${errorMsg}`);
      }
    }
    
    // Verify we're past login page
    if (pageUrl.includes('authentication.do') && pageContent.includes('value(pswd)')) {
      throw new Error('Still on login page - credentials may be incorrect');
    }
    
    console.log('Login successful!');
    
    // ========== STEP 4: Navigate to Mutasi Rekening ==========
    console.log('Navigating to Mutasi Rekening...');
    
    // Try multiple ways to find the account statement menu
    const menuSelectors = [
      'a[href*="accountstmt.do"]',
      'a[href*="acctstmtview"]',
      'a:contains("Mutasi")',
      'a:contains("Account Statement")',
    ];
    
    let menuClicked = false;
    
    // Method 1: Direct navigation to account statement page
    try {
      await page.goto('https://ibank.klikbca.com/accountstmt.do?value(actions)=acct_stmt', {
        waitUntil: 'networkidle2',
        timeout: CONFIG.TIMEOUT
      });
      menuClicked = true;
      console.log('Navigated to account statement via direct URL');
    } catch (e) {
      console.log('Direct navigation failed, trying menu click...');
    }
    
    // Method 2: Click on menu if direct navigation failed
    if (!menuClicked) {
      for (const selector of menuSelectors) {
        try {
          const menuLink = await page.$(selector);
          if (menuLink) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT }),
              menuLink.click(),
            ]);
            menuClicked = true;
            console.log(`Clicked menu with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!menuClicked) {
      // Method 3: Evaluate and click via JavaScript
      try {
        await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const mutasiLink = links.find(a => 
            a.textContent.includes('Mutasi') || 
            a.textContent.includes('Account Statement') ||
            a.href.includes('accountstmt')
          );
          if (mutasiLink) mutasiLink.click();
        });
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });
        menuClicked = true;
      } catch (e) {
        console.log('JavaScript click also failed');
      }
    }
    
    await delay(2000);
    
    // ========== STEP 5: Set Date Range ==========
    console.log('Setting date range for today...');
    
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    
    // Try to find and set date selectors
    try {
      // Wait for date selectors
      await page.waitForSelector('select[name="value(startDt)"], select[name="value(D1)"]', { timeout: 10000 });
      
      // Try different selector name formats
      const dateSelectors = {
        startDay: ['value(startDt)', 'value(D1)'],
        startMonth: ['value(startMt)', 'value(M1)'],
        startYear: ['value(startYr)', 'value(Y1)'],
        endDay: ['value(endDt)', 'value(D2)'],
        endMonth: ['value(endMt)', 'value(M2)'],
        endYear: ['value(endYr)', 'value(Y2)'],
      };
      
      // Helper to try multiple selectors
      const selectValue = async (names, value) => {
        for (const name of names) {
          try {
            const selector = `select[name="${name}"]`;
            const el = await page.$(selector);
            if (el) {
              await page.select(selector, String(value));
              return true;
            }
          } catch (e) {
            continue;
          }
        }
        return false;
      };
      
      // Set start date (today)
      await selectValue(dateSelectors.startDay, day);
      await selectValue(dateSelectors.startMonth, month);
      await selectValue(dateSelectors.startYear, year);
      
      // Set end date (today)
      await selectValue(dateSelectors.endDay, day);
      await selectValue(dateSelectors.endMonth, month);
      await selectValue(dateSelectors.endYear, year);
      
      console.log(`Date range set to: ${day}/${month}/${year}`);
      
    } catch (e) {
      console.log('Date selectors not found, proceeding with defaults...');
    }
    
    // ========== STEP 6: Submit and Get Mutations ==========
    console.log('Submitting date range form...');
    
    // Find submit button
    const viewButton = await page.$('input[type="submit"], input[name="value(submit1)"], input[value="View Account Statement"], button[type="submit"]');
    
    if (viewButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT }).catch(() => {}),
        viewButton.click(),
      ]);
    }
    
    await delay(3000);
    
    // ========== STEP 7: Parse Mutation Table ==========
    console.log('Parsing mutations...');
    
    const mutations = await page.evaluate((currentYear) => {
      const results = [];
      
      // BCA uses tables with specific characteristics
      // Look for the main mutation table
      const tables = document.querySelectorAll('table');
      
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          
          // BCA mutation table typically has 5-6 columns:
          // Date | Description | Branch | Amount | CR/DB | Balance
          // or
          // Date | Description | Amount (CR) | Amount (DB) | Balance
          
          if (cells.length >= 3) {
            const firstCell = cells[0]?.innerText?.trim() || '';
            
            // Check if first cell looks like a date (DD/MM or DD/MM/YY or DD/MM/YYYY)
            const dateMatch = firstCell.match(/^(\d{1,2})\/(\d{1,2})(\/\d{2,4})?$/);
            
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, '0');
              const month = dateMatch[2].padStart(2, '0');
              let year = currentYear;
              
              if (dateMatch[3]) {
                const yearPart = dateMatch[3].replace('/', '');
                year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
              }
              
              const date = `${year}-${month}-${day}`;
              const description = cells[1]?.innerText?.trim() || '';
              
              // Try to find amount and type
              let amount = 0;
              let type = 'credit';
              let balanceAfter = null;
              
              // Check each cell for amount-like values
              for (let i = 2; i < cells.length; i++) {
                const cellText = cells[i]?.innerText?.trim() || '';
                
                // Check for CR/DB indicator
                if (cellText.toUpperCase() === 'CR' || cellText.toUpperCase() === 'CREDIT') {
                  type = 'credit';
                } else if (cellText.toUpperCase() === 'DB' || cellText.toUpperCase() === 'DEBIT') {
                  type = 'debit';
                }
                
                // Check for amount (numbers with thousand separators)
                const amountMatch = cellText.match(/[\d.,]+/);
                if (amountMatch && !amount) {
                  const parsed = parseFloat(cellText.replace(/[.,]/g, (m, offset, str) => {
                    // Last separator before 2 digits is decimal, others are thousands
                    const remaining = str.slice(offset + 1);
                    return remaining.length === 2 ? '.' : '';
                  }));
                  
                  if (parsed > 0) {
                    if (i === cells.length - 1) {
                      // Last column is usually balance
                      balanceAfter = parsed;
                    } else {
                      amount = parsed;
                    }
                  }
                }
              }
              
              // Only add if we have a valid transaction
              if (amount > 0) {
                results.push({
                  date,
                  time: null,
                  amount: Math.round(amount),
                  type,
                  description,
                  balance_after: balanceAfter ? Math.round(balanceAfter) : null,
                });
              }
            }
          }
        }
      }
      
      return results;
    }, currentYear);
    
    console.log(`Found ${mutations.length} mutations`);
    
    // ========== STEP 8: Logout ==========
    console.log('Logging out...');
    try {
      const logoutSelectors = [
        'a[href*="logout"]',
        'a:contains("Logout")',
        'a:contains("Log Out")',
        'input[value="Logout"]',
      ];
      
      for (const selector of logoutSelectors) {
        const logoutBtn = await page.$(selector);
        if (logoutBtn) {
          await logoutBtn.click();
          break;
        }
      }
      
      await delay(2000);
    } catch (e) {
      console.log('Logout button not found, continuing...');
    }
    
    // ========== STEP 9: Send to Webhook ==========
    if (mutations.length > 0) {
      console.log('Sending mutations to webhook...');
      
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
          scraped_at: new Date().toISOString(),
        }),
      });
      
      const result = await response.json();
      console.log('Webhook response:', JSON.stringify(result, null, 2));
      
      if (!result.success) {
        throw new Error(`Webhook failed: ${result.error || 'Unknown error'}`);
      }
      
      console.log(`Successfully sent ${mutations.length} mutations to webhook`);
      console.log(`Processed: ${result.processed || 0}, Matched: ${result.matched || 0}`);
    } else {
      console.log('No mutations found for today');
    }
    
    await browser.close();
    console.log(`[${new Date().toISOString()}] Scraper completed successfully`);
    
    return mutations;
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Scraper error:`, error.message);
    
    if (browser) {
      try {
        // Take screenshot for debugging
        const pages = await browser.pages();
        if (pages.length > 0) {
          await pages[0].screenshot({ path: 'error-screenshot.png', fullPage: true });
          console.log('Error screenshot saved to error-screenshot.png');
        }
      } catch (e) {
        // Ignore screenshot errors
      }
      
      await browser.close();
    }
    
    throw error;
  }
}

// Run with retry logic
async function runWithRetry() {
  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`\n========== Attempt ${attempt}/${CONFIG.MAX_RETRIES} ==========\n`);
      await scrapeBCA();
      console.log('\n========== SUCCESS ==========\n');
      process.exit(0);
    } catch (error) {
      console.error(`\nAttempt ${attempt} failed:`, error.message);
      
      if (attempt < CONFIG.MAX_RETRIES) {
        console.log(`Retrying in ${CONFIG.RETRY_DELAY / 1000} seconds...`);
        await delay(CONFIG.RETRY_DELAY);
      }
    }
  }
  
  console.error(`\n========== ALL ${CONFIG.MAX_RETRIES} ATTEMPTS FAILED ==========\n`);
  process.exit(1);
}

// Execute
runWithRetry();
