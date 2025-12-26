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

    // Generate install script
    const installScript = `#!/bin/bash
# ============================================
# BCA Auto-Mutation Scraper - Install Script
# Generated for: ${cred.vps_host}
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

# 5. Install Chromium
echo -e "\${YELLOW}[5/7] Installing Chromium...\\033[0m"
apt-get install -y chromium-browser || apt-get install -y chromium

# 6. Create scraper directory
echo -e "\${YELLOW}[6/7] Setting up scraper...\\033[0m"
mkdir -p /opt/bca-scraper
cd /opt/bca-scraper

# Create package.json
cat > package.json << 'PKGEOF'
{
  "name": "bca-scraper",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "puppeteer": "^21.0.0",
    "node-fetch": "^3.3.0"
  }
}
PKGEOF

# Install npm packages
npm install

# Create scraper script
cat > index.js << 'SCRAPEREOF'
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import crypto from 'crypto';
import fs from 'fs';

const WEBHOOK_URL = '${webhookUrl}';
const CREDENTIALS_URL = '${credentialsUrl}';
const WEBHOOK_SECRET = '${cred.webhook_secret}';

const LOG_FILE = '/var/log/bca-scraper.log';

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

async function scrapeMutations(userId, pin) {
  log('Starting mutation scrape...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    executablePath: '/usr/bin/chromium-browser'
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Navigate to KlikBCA
    log('Navigating to KlikBCA...');
    await page.goto('https://ibank.klikbca.com', { waitUntil: 'networkidle2', timeout: 60000 });

    // Login
    log('Logging in...');
    await page.type('#user_id', userId);
    await page.type('#pswd', pin);
    await page.click('input[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Check for login error
    const loginError = await page.$('.errorMessage');
    if (loginError) {
      const errorText = await page.evaluate(el => el.textContent, loginError);
      throw new Error(\`Login failed: \${errorText}\`);
    }

    // Navigate to Account Info > Mutation
    log('Navigating to mutation page...');
    
    // Click menu
    const menuFrame = await page.frames().find(f => f.name() === 'menu');
    if (menuFrame) {
      await menuFrame.click('a:has-text("Informasi Rekening")');
      await page.waitForTimeout(1000);
      await menuFrame.click('a:has-text("Mutasi Rekening")');
    }

    await page.waitForTimeout(2000);

    // Get content frame
    const contentFrame = await page.frames().find(f => f.name() === 'at498');
    if (!contentFrame) {
      throw new Error('Content frame not found');
    }

    // Select date range (today)
    const today = new Date();
    const startDate = today.toLocaleDateString('en-GB').split('/').reverse().join('-');
    
    // Submit form to get mutations
    await contentFrame.select('select[name="startDt"]', today.getDate().toString());
    await contentFrame.select('select[name="startMt"]', (today.getMonth() + 1).toString());
    await contentFrame.select('select[name="startYr"]', today.getFullYear().toString());
    await contentFrame.select('select[name="endDt"]', today.getDate().toString());
    await contentFrame.select('select[name="endMt"]', (today.getMonth() + 1).toString());
    await contentFrame.select('select[name="endYr"]', today.getFullYear().toString());
    
    await contentFrame.click('input[name="value(submit1)"]');
    await page.waitForTimeout(3000);

    // Parse mutation table
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
          
          if (dateText && amountText) {
            const isCredit = amountText.includes('CR');
            const amount = parseFloat(amountText.replace(/[^0-9.-]/g, '')) || 0;
            const balance = parseFloat(balanceText.replace(/[^0-9.-]/g, '')) || 0;
            
            result.push({
              transaction_date: dateText,
              description: description,
              amount: amount,
              transaction_type: isCredit ? 'CR' : 'DB',
              balance_after: balance,
              reference_number: branch,
              raw_data: { original: row.textContent }
            });
          }
        }
      });
      
      return result;
    });

    log(\`Found \${mutations.length} mutations\`);

    // Logout
    log('Logging out...');
    const logoutFrame = await page.frames().find(f => f.name() === 'menu');
    if (logoutFrame) {
      await logoutFrame.click('a:has-text("LOGOUT")');
    }

    await browser.close();
    return mutations;

  } catch (error) {
    log(\`Scrape error: \${error.message}\`);
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
  log('=== BCA Scraper Started ===');
  
  while (true) {
    try {
      // Get credentials and check for burst mode
      const config = await getCredentials();
      
      if (!config || !config.is_active) {
        log('Scraper is inactive or credentials not found. Waiting 60s...');
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }

      const { klikbca_user_id, klikbca_pin, default_interval_minutes, burst_mode, burst_interval_seconds, burst_duration_seconds } = config;

      if (burst_mode) {
        // BURST MODE
        log('🔥 BURST MODE ACTIVATED');
        const burstStart = Date.now();
        const maxDuration = (burst_duration_seconds || 180) * 1000;
        
        while (Date.now() - burstStart < maxDuration) {
          const mutations = await scrapeMutations(klikbca_user_id, klikbca_pin);
          await sendToWebhook(mutations, 'burst');
          
          // Check if still in burst mode
          const checkConfig = await getCredentials();
          if (!checkConfig?.burst_mode) {
            log('✅ Burst mode completed - all requests matched');
            break;
          }
          
          log(\`Burst mode: waiting \${burst_interval_seconds}s...\`);
          await new Promise(r => setTimeout(r, (burst_interval_seconds || 60) * 1000));
        }
        
        log('⏰ Burst mode ended, returning to normal mode');
        
      } else {
        // NORMAL MODE
        log('📊 Normal mode - scraping...');
        const mutations = await scrapeMutations(klikbca_user_id, klikbca_pin);
        await sendToWebhook(mutations, 'normal');
        
        log(\`Normal mode: waiting \${default_interval_minutes} minutes...\`);
        await new Promise(r => setTimeout(r, (default_interval_minutes || 15) * 60 * 1000));
      }
      
    } catch (error) {
      log(\`Main loop error: \${error.message}\`);
      await new Promise(r => setTimeout(r, 60000)); // Wait 1 min on error
    }
  }
}

main().catch(console.error);
SCRAPEREOF

# 7. Create systemd service
echo -e "\${YELLOW}[7/7] Creating systemd service...\\033[0m"
cat > /etc/systemd/system/bca-scraper.service << 'SVCEOF'
[Unit]
Description=BCA Auto-Mutation Scraper
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
echo -e "\${GREEN}✅ BCA Scraper Installation Complete!\\033[0m"
echo -e "\${GREEN}============================================\\033[0m"
echo ""
echo "Service Status:"
systemctl status bca-scraper --no-pager
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
