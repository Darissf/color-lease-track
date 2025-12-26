import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check super admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get credentials
    const { data: cred, error: credError } = await supabase
      .from('bca_credentials')
      .select('id, webhook_secret, vps_host')
      .eq('user_id', user.id)
      .single();

    if (credError || !cred) {
      return new Response(
        JSON.stringify({ error: 'No credentials found. Please save credentials first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/bca-mutation-webhook`;
    const credentialsUrl = `${supabaseUrl}/functions/v1/bca-credentials-manager`;

    // Generate install script with improved scraper
    const installScript = `#!/bin/bash
# ============================================
# BCA Auto-Mutation Scraper - Install Script
# Generated for: ${cred.vps_host}
# Version: 2.0 (Improved iframe handling)
# ============================================

set -e

echo "🚀 Starting BCA Scraper Installation..."

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

# 1. Update system
echo -e "\${YELLOW}[1/7] Updating system...\\033[0m"
apt-get update -y
apt-get upgrade -y

# 2. Install dependencies
echo -e "\${YELLOW}[2/7] Installing dependencies...\\033[0m"
apt-get install -y curl wget gnupg2 ca-certificates lsb-release ufw fail2ban

# 3. Setup Firewall
echo -e "\${YELLOW}[3/7] Configuring firewall...\\033[0m"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw --force enable

# 4. Install Node.js 20
echo -e "\${YELLOW}[4/7] Installing Node.js...\\033[0m"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 5. Install Chromium with all dependencies
echo -e "\${YELLOW}[5/7] Installing Chromium...\\033[0m"
apt-get install -y chromium-browser || apt-get install -y chromium
# Install additional fonts for proper rendering
apt-get install -y fonts-liberation fonts-noto-cjk xfonts-base xfonts-75dpi || true

# 6. Create scraper directory
echo -e "\${YELLOW}[6/7] Setting up scraper...\\033[0m"
mkdir -p /opt/bca-scraper
cd /opt/bca-scraper

# Create package.json
cat > package.json << 'PKGEOF'
{
  "name": "bca-scraper",
  "version": "2.0.0",
  "type": "module",
  "dependencies": {
    "puppeteer": "^21.0.0",
    "node-fetch": "^3.3.0"
  }
}
PKGEOF

# Install npm packages
npm install

# Create scraper script with improved iframe handling
cat > index.js << 'SCRAPEREOF'
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import crypto from 'crypto';
import fs from 'fs';

const WEBHOOK_URL = '${webhookUrl}';
const CREDENTIALS_URL = '${credentialsUrl}';
const WEBHOOK_SECRET = '${cred.webhook_secret}';

const LOG_FILE = '/var/log/bca-scraper.log';
const ERROR_SCREENSHOT = '/var/log/bca-error-screenshot.png';

// Detect Chromium path
function getChromiumPath() {
  const paths = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return '/usr/bin/chromium-browser';
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = \`[\${timestamp}] \${message}\\n\`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

async function getCredentials() {
  try {
    const response = await fetch(CREDENTIALS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_for_vps',
        webhook_secret: WEBHOOK_SECRET
      })
    });
    return await response.json();
  } catch (error) {
    log(\`Error fetching credentials: \${error.message}\`);
    return null;
  }
}

// Retry helper for finding elements
async function waitForSelectorWithRetry(frameOrPage, selector, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 3000;
  const timeout = options.timeout || 15000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await frameOrPage.waitForSelector(selector, { visible: true, timeout });
      return true;
    } catch (e) {
      log(\`Retry \${i + 1}/\${maxRetries}: Waiting for \${selector}...\`);
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, retryDelay));
      }
    }
  }
  return false;
}

// Find login frame (KlikBCA uses iframes)
async function findLoginFrame(page) {
  // First try main page
  const mainHasLogin = await page.$('#user_id');
  if (mainHasLogin) {
    log('Login form found on main page');
    return { frame: page, isMainPage: true };
  }
  
  // Search in all frames
  const frames = page.frames();
  log(\`Searching \${frames.length} frames for login form...\`);
  
  for (const frame of frames) {
    try {
      const hasLoginForm = await frame.$('#user_id');
      if (hasLoginForm) {
        log(\`Login form found in frame: \${frame.name() || frame.url()}\`);
        return { frame, isMainPage: false };
      }
    } catch (e) {
      // Frame might be detached, skip it
    }
  }
  
  return null;
}

async function scrapeMutations(userId, pin) {
  log('Starting mutation scrape...');
  
  const chromiumPath = getChromiumPath();
  log(\`Using Chromium at: \${chromiumPath}\`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1366,768'
    ],
    executablePath: chromiumPath
  });

  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8'
    });

    // Navigate to KlikBCA with more robust loading
    log('Navigating to KlikBCA...');
    await page.goto('https://ibank.klikbca.com', { 
      waitUntil: 'networkidle0', 
      timeout: 90000 
    });
    
    // Wait for page to fully settle
    await new Promise(r => setTimeout(r, 3000));
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/var/log/bca-initial-page.png', fullPage: true });
    log('Initial page screenshot saved');

    // Find login form (might be in iframe)
    log('Looking for login form...');
    let loginResult = await findLoginFrame(page);
    
    if (!loginResult) {
      // Try waiting longer and retry
      log('Login form not found, waiting and retrying...');
      await new Promise(r => setTimeout(r, 5000));
      loginResult = await findLoginFrame(page);
    }
    
    if (!loginResult) {
      await page.screenshot({ path: ERROR_SCREENSHOT, fullPage: true });
      throw new Error('Login form not found in any frame. Screenshot saved for debugging.');
    }
    
    const loginFrame = loginResult.frame;
    
    // Wait for login fields to be interactable
    const foundUserId = await waitForSelectorWithRetry(loginFrame, '#user_id', { maxRetries: 5, timeout: 10000 });
    if (!foundUserId) {
      await page.screenshot({ path: ERROR_SCREENSHOT, fullPage: true });
      throw new Error('User ID field not interactable after retries');
    }

    // Login with delay between keystrokes
    log('Entering credentials...');
    await loginFrame.click('#user_id');
    await new Promise(r => setTimeout(r, 500));
    await loginFrame.type('#user_id', userId, { delay: 100 });
    
    await loginFrame.click('#pswd');
    await new Promise(r => setTimeout(r, 500));
    await loginFrame.type('#pswd', pin, { delay: 100 });
    
    // Find and click submit button
    log('Submitting login...');
    const submitSelectors = ['input[type="submit"]', 'input[name="value(Submit)"]', 'button[type="submit"]', '.login-btn'];
    let submitted = false;
    
    for (const sel of submitSelectors) {
      try {
        const btn = await loginFrame.$(sel);
        if (btn) {
          await btn.click();
          submitted = true;
          log(\`Clicked submit using: \${sel}\`);
          break;
        }
      } catch (e) {}
    }
    
    if (!submitted) {
      // Try pressing Enter
      await loginFrame.keyboard.press('Enter');
      log('Pressed Enter to submit');
    }
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {
      log('Navigation wait timed out, continuing...');
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Take screenshot after login
    await page.screenshot({ path: '/var/log/bca-after-login.png', fullPage: true });
    log('Post-login screenshot saved');

    // Check for login error
    let loginError = null;
    const errorSelectors = ['.errorMessage', '.error', '.alert-danger', '.err-msg', '.login-error'];
    
    for (const sel of errorSelectors) {
      loginError = await page.$(sel);
      if (loginError) break;
      
      // Also check in frames
      for (const frame of page.frames()) {
        try {
          loginError = await frame.$(sel);
          if (loginError) break;
        } catch (e) {}
      }
      if (loginError) break;
    }
    
    if (loginError) {
      const errorText = await page.evaluate(el => el?.textContent || 'Unknown error', loginError);
      throw new Error(\`Login failed: \${errorText.trim()}\`);
    }

    // Navigate to Account Info > Mutation
    log('Navigating to mutation page...');
    
    // Find menu frame
    let menuFrame = null;
    for (const frame of page.frames()) {
      const frameName = frame.name().toLowerCase();
      if (frameName.includes('menu') || frameName === 'menu') {
        menuFrame = frame;
        log(\`Found menu frame: \${frame.name()}\`);
        break;
      }
    }
    
    if (menuFrame) {
      try {
        // Click on Informasi Rekening
        await menuFrame.evaluate(() => {
          const links = document.querySelectorAll('a');
          for (const link of links) {
            const text = link.textContent.toLowerCase();
            if (text.includes('informasi') || text.includes('account')) {
              link.click();
              return true;
            }
          }
          return false;
        });
        
        await new Promise(r => setTimeout(r, 2000));
        
        // Click on Mutasi Rekening
        await menuFrame.evaluate(() => {
          const links = document.querySelectorAll('a');
          for (const link of links) {
            const text = link.textContent.toLowerCase();
            if (text.includes('mutasi') || text.includes('statement')) {
              link.click();
              return true;
            }
          }
          return false;
        });
        
        log('Menu navigation completed');
      } catch (e) {
        log(\`Menu navigation error: \${e.message}\`);
      }
    } else {
      log('Menu frame not found, trying direct navigation...');
    }

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: '/var/log/bca-mutation-page.png', fullPage: true });

    // Get content frame
    let contentFrame = null;
    const contentFrameNames = ['atm', 'content', 'at498', 'main'];
    
    for (const frame of page.frames()) {
      const frameName = frame.name().toLowerCase();
      for (const name of contentFrameNames) {
        if (frameName.includes(name)) {
          contentFrame = frame;
          log(\`Found content frame: \${frame.name()}\`);
          break;
        }
      }
      if (contentFrame) break;
    }
    
    if (!contentFrame) {
      log('Content frame not found by name, searching for form...');
      for (const frame of page.frames()) {
        try {
          const hasForm = await frame.$('select[name="startDt"], form[name="AccountStatementForm"]');
          if (hasForm) {
            contentFrame = frame;
            log(\`Found form in frame: \${frame.name() || 'unnamed'}\`);
            break;
          }
        } catch (e) {}
      }
    }
    
    if (!contentFrame) {
      contentFrame = page.mainFrame();
      log('Using main frame for content');
    }

    // Select date range (today)
    const today = new Date();
    log(\`Setting date range for: \${today.toISOString().split('T')[0]}\`);
    
    try {
      // Wait for date selectors
      const hasDateSelector = await waitForSelectorWithRetry(contentFrame, 'select[name="startDt"]', { maxRetries: 3, timeout: 10000 });
      
      if (hasDateSelector) {
        await contentFrame.select('select[name="startDt"]', today.getDate().toString());
        await contentFrame.select('select[name="startMt"]', (today.getMonth() + 1).toString());
        await contentFrame.select('select[name="startYr"]', today.getFullYear().toString());
        await contentFrame.select('select[name="endDt"]', today.getDate().toString());
        await contentFrame.select('select[name="endMt"]', (today.getMonth() + 1).toString());
        await contentFrame.select('select[name="endYr"]', today.getFullYear().toString());
        
        log('Date range set');
        
        // Submit form
        const submitSelectors = ['input[name="value(submit1)"]', 'input[type="submit"]', 'button[type="submit"]'];
        for (const sel of submitSelectors) {
          try {
            const btn = await contentFrame.$(sel);
            if (btn) {
              await btn.click();
              log(\`Clicked form submit: \${sel}\`);
              break;
            }
          } catch (e) {}
        }
      } else {
        log('Date selectors not found');
      }
    } catch (e) {
      log(\`Date selection error: \${e.message}\`);
    }
    
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: '/var/log/bca-mutations-result.png', fullPage: true });

    // Parse mutation table
    log('Parsing mutations...');
    const mutations = await contentFrame.evaluate(() => {
      const rows = document.querySelectorAll('table tr');
      const result = [];
      
      rows.forEach((row, index) => {
        if (index < 2) return; // Skip header rows
        
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const dateText = cells[0]?.textContent?.trim() || '';
          const description = cells[1]?.textContent?.trim() || '';
          const branch = cells[2]?.textContent?.trim() || '';
          const amountText = cells[3]?.textContent?.trim() || '';
          const balanceText = cells[4]?.textContent?.trim() || '';
          
          if (dateText && amountText && amountText !== '0,00') {
            const isCredit = amountText.includes('CR');
            const amount = parseFloat(amountText.replace(/[^0-9.-]/g, '')) || 0;
            const balance = parseFloat(balanceText.replace(/[^0-9.-]/g, '')) || 0;
            
            if (amount > 0) {
              result.push({
                transaction_date: dateText,
                description: description,
                amount: amount,
                transaction_type: isCredit ? 'CR' : 'DB',
                balance_after: balance,
                reference_number: branch,
                raw_data: { original: row.textContent?.trim() }
              });
            }
          }
        }
      });
      
      return result;
    });

    log(\`Found \${mutations.length} mutations\`);

    // Logout
    log('Logging out...');
    try {
      if (menuFrame) {
        await menuFrame.evaluate(() => {
          const links = document.querySelectorAll('a');
          for (const link of links) {
            const text = link.textContent.toUpperCase();
            if (text.includes('LOGOUT') || text.includes('KELUAR')) {
              link.click();
              return true;
            }
          }
          return false;
        });
      }
    } catch (e) {
      log(\`Logout error (non-critical): \${e.message}\`);
    }

    await browser.close();
    log('Scrape completed successfully');
    return mutations;

  } catch (error) {
    log(\`Scrape error: \${error.message}\`);
    
    // Save error screenshot
    if (page) {
      try {
        await page.screenshot({ path: ERROR_SCREENSHOT, fullPage: true });
        log(\`Error screenshot saved to \${ERROR_SCREENSHOT}\`);
      } catch (e) {
        log('Could not save error screenshot');
      }
    }
    
    await browser.close();
    throw error;
  }
}

async function sendToWebhook(mutations, syncMode) {
  const timestamp = Date.now().toString();
  const body = JSON.stringify({
    webhook_secret: WEBHOOK_SECRET,
    mutations: mutations,
    sync_mode: syncMode
  });
  
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(\`\${timestamp}:\${body}\`)
    .digest('hex');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET,
        'X-HMAC-Signature': signature,
        'X-Timestamp': timestamp
      },
      body: body
    });
    
    const result = await response.json();
    log(\`Webhook response: \${JSON.stringify(result)}\`);
    return result;
  } catch (error) {
    log(\`Webhook error: \${error.message}\`);
    throw error;
  }
}

async function main() {
  log('=== BCA Scraper v2.0 Started ===');
  
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5;
  
  while (true) {
    try {
      // Get credentials and check for burst mode
      const config = await getCredentials();
      
      if (!config || !config.is_active) {
        log('Scraper is inactive or credentials not found. Waiting 60s...');
        await new Promise(r => setTimeout(r, 60000));
        consecutiveErrors = 0;
        continue;
      }

      const { klikbca_user_id, klikbca_pin, default_interval_minutes, burst_mode, burst_interval_seconds, burst_duration_seconds } = config;

      if (!klikbca_user_id || !klikbca_pin) {
        log('Missing KlikBCA credentials. Waiting 60s...');
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }

      if (burst_mode) {
        // BURST MODE
        log('🔥 BURST MODE ACTIVATED');
        const burstStart = Date.now();
        const maxDuration = (burst_duration_seconds || 180) * 1000;
        
        while (Date.now() - burstStart < maxDuration) {
          try {
            const mutations = await scrapeMutations(klikbca_user_id, klikbca_pin);
            await sendToWebhook(mutations, 'burst');
            consecutiveErrors = 0;
          } catch (e) {
            log(\`Burst scrape error: \${e.message}\`);
          }
          
          // Check if still in burst mode
          const checkConfig = await getCredentials();
          if (!checkConfig?.burst_mode) {
            log('✅ Burst mode completed - all requests matched');
            break;
          }
          
          log(\`Burst mode: waiting \${burst_interval_seconds || 60}s...\`);
          await new Promise(r => setTimeout(r, (burst_interval_seconds || 60) * 1000));
        }
        
        log('⏰ Burst mode ended, returning to normal mode');
        
      } else {
        // NORMAL MODE
        log('📊 Normal mode - scraping...');
        const mutations = await scrapeMutations(klikbca_user_id, klikbca_pin);
        await sendToWebhook(mutations, 'normal');
        consecutiveErrors = 0;
        
        log(\`Normal mode: waiting \${default_interval_minutes || 15} minutes...\`);
        await new Promise(r => setTimeout(r, (default_interval_minutes || 15) * 60 * 1000));
      }
      
    } catch (error) {
      consecutiveErrors++;
      log(\`Main loop error (\${consecutiveErrors}/\${maxConsecutiveErrors}): \${error.message}\`);
      
      // Exponential backoff on errors
      const waitTime = Math.min(60000 * Math.pow(2, consecutiveErrors - 1), 600000);
      log(\`Waiting \${waitTime / 1000}s before retry...\`);
      await new Promise(r => setTimeout(r, waitTime));
      
      if (consecutiveErrors >= maxConsecutiveErrors) {
        log('⚠️ Too many consecutive errors, waiting 10 minutes before reset...');
        await new Promise(r => setTimeout(r, 600000));
        consecutiveErrors = 0;
      }
    }
  }
}

main().catch(console.error);
SCRAPEREOF

# 7. Create systemd service
echo -e "\${YELLOW}[7/7] Creating systemd service...\\033[0m"
cat > /etc/systemd/system/bca-scraper.service << 'SVCEOF'
[Unit]
Description=BCA Auto-Mutation Scraper v2.0
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bca-scraper
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/bca-scraper.log
StandardError=append:/var/log/bca-scraper.log

[Install]
WantedBy=multi-user.target
SVCEOF

# Enable and start service
systemctl daemon-reload
systemctl enable bca-scraper
systemctl start bca-scraper

# Create log file
touch /var/log/bca-scraper.log
chmod 644 /var/log/bca-scraper.log

echo ""
echo -e "\${GREEN}============================================\\033[0m"
echo -e "\${GREEN}✅ BCA Scraper v2.0 Installation Complete!\\033[0m"
echo -e "\${GREEN}============================================\\033[0m"
echo ""
echo "Service Status:"
systemctl status bca-scraper --no-pager
echo ""
echo "Debug screenshots will be saved to:"
echo "  - /var/log/bca-initial-page.png"
echo "  - /var/log/bca-after-login.png"
echo "  - /var/log/bca-mutation-page.png"
echo "  - /var/log/bca-mutations-result.png"
echo "  - /var/log/bca-error-screenshot.png (on error)"
echo ""
echo "Useful commands:"
echo "  - Check status: systemctl status bca-scraper"
echo "  - View logs: tail -f /var/log/bca-scraper.log"
echo "  - Restart: systemctl restart bca-scraper"
echo "  - Stop: systemctl stop bca-scraper"
echo ""
echo -e "\${GREEN}The scraper is now running!\\033[0m"
`;

    // Update credential status
    await supabase
      .from('bca_credentials')
      .update({ status: 'pending_install' })
      .eq('id', cred.id);

    return new Response(
      JSON.stringify({
        success: true,
        install_script: installScript,
        webhook_url: webhookUrl,
        webhook_secret: cred.webhook_secret,
        instructions: [
          '1. SSH ke VPS Anda',
          '2. Copy script di bawah dan paste ke terminal',
          '3. Jalankan dengan: bash install.sh',
          '4. Tunggu hingga instalasi selesai',
          '5. Scraper akan otomatis berjalan'
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[BCA VPS Setup] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
