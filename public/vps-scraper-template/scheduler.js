/**
 * BCA Scraper Scheduler
 * 
 * Daemon script yang:
 * 1. Poll server setiap 60 detik untuk mengambil konfigurasi
 * 2. Jalankan scrape sesuai interval dari server
 * 3. Otomatis switch ke burst mode jika aktif
 * 
 * Usage: node scheduler.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load config from config.env with improved parsing
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
        // Remove surrounding quotes (single or double)
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
  
  // Log loaded config for debugging
  const configKeys = ['BCA_USER_ID', 'BCA_PIN', 'SECRET_KEY', 'WEBHOOK_URL', 'ACCOUNT_NUMBER', 'HEADLESS', 'DEBUG_MODE'];
  console.log('[SCHEDULER] Loaded config.env:');
  configKeys.forEach(k => {
    if (process.env[k]) {
      const val = k.includes('PIN') || k.includes('SECRET') ? '***' : process.env[k].substring(0, 30);
      console.log(`  ${k}=${val}${process.env[k].length > 30 ? '...' : ''}`);
    }
  });
}

const CONFIG = {
  SECRET_KEY: process.env.SECRET_KEY || 'YOUR_SECRET_KEY_HERE',
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/bank-scraper-webhook',
  CONFIG_POLL_INTERVAL: 60000, // Poll config setiap 60 detik
};

// Derive config URL from webhook URL
const CONFIG_URL = CONFIG.WEBHOOK_URL.replace('/bank-scraper-webhook', '/get-scraper-config');

// State
let lastScrapeTime = 0;
let currentIntervalMs = 600000; // Default 10 menit
let isScraperRunning = false;
let isBurstMode = false;
let burstEndTime = 0;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (msg, level = 'INFO') => console.log(`[${new Date().toISOString()}] [SCHEDULER] [${level}] ${msg}`);

// Fetch config dari server
async function fetchServerConfig() {
  try {
    const response = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_key: CONFIG.SECRET_KEY }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    log(`Failed to fetch config: ${error.message}`, 'ERROR');
    return null;
  }
}

// Run scraper as child process
function runScraper(mode = 'normal') {
  return new Promise((resolve, reject) => {
    if (isScraperRunning) {
      log('Scraper already running, skipping...', 'WARN');
      resolve(false);
      return;
    }
    
    isScraperRunning = true;
    const startTime = Date.now();
    
    log(`Starting scraper (${mode} mode)...`);
    
    const args = ['bca-scraper.js'];
    const child = spawn('node', args, {
      cwd: __dirname,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env, // Use full process.env, not spread with overrides
    });
    
    // Stream stdout realtime tanpa buffering
    if (child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
    }
    
    // Stream stderr realtime tanpa buffering
    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    }
    
    child.on('close', (code) => {
      isScraperRunning = false;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (code === 0) {
        log(`Scraper completed in ${duration}s`);
        lastScrapeTime = Date.now();
        resolve(true);
      } else {
        log(`Scraper exited with code ${code} after ${duration}s`, 'ERROR');
        resolve(false);
      }
    });
    
    child.on('error', (err) => {
      isScraperRunning = false;
      log(`Scraper spawn error: ${err.message}`, 'ERROR');
      reject(err);
    });
  });
}

// Main loop
async function mainLoop() {
  log('=== SCHEDULER STARTED ===');
  log(`Config URL: ${CONFIG_URL}`);
  log(`Poll interval: ${CONFIG.CONFIG_POLL_INTERVAL / 1000}s`);
  
  // Validate config
  if (CONFIG.SECRET_KEY === 'YOUR_SECRET_KEY_HERE') {
    log('ERROR: SECRET_KEY belum dikonfigurasi!', 'ERROR');
    process.exit(1);
  }
  
  while (true) {
    try {
      // 1. Fetch config dari server
      const config = await fetchServerConfig();
      
      if (!config || !config.success) {
        log(`Config fetch failed or inactive: ${config?.error || 'Unknown'}`, 'WARN');
        await delay(CONFIG.CONFIG_POLL_INTERVAL);
        continue;
      }
      
      // 2. Update interval dari server
      const serverIntervalMs = (config.scrape_interval_minutes || 10) * 60 * 1000;
      if (serverIntervalMs !== currentIntervalMs) {
        log(`Interval changed: ${currentIntervalMs / 60000}m -> ${serverIntervalMs / 60000}m`);
        currentIntervalMs = serverIntervalMs;
      }
      
      // 3. Check burst mode
      if (config.burst_in_progress && config.burst_enabled) {
        if (!isBurstMode) {
          log('=== ENTERING BURST MODE ===');
          isBurstMode = true;
          burstEndTime = Date.now() + (config.burst_remaining_seconds * 1000);
        }
        
        // Run burst scrapes
        await runBurstLoop(config);
        
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
      
      // 4. Normal mode - check if should scrape
      if (config.is_active) {
        const timeSinceLastScrape = Date.now() - lastScrapeTime;
        
        if (timeSinceLastScrape >= currentIntervalMs) {
          log(`Time to scrape (${(timeSinceLastScrape / 60000).toFixed(1)}m since last)`);
          await runScraper('normal');
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
    
    // 5. Wait sebelum poll config lagi
    await delay(CONFIG.CONFIG_POLL_INTERVAL);
  }
}

// Burst mode loop
async function runBurstLoop(config) {
  const burstIntervalMs = (config.burst_interval_seconds || 10) * 1000;
  let burstScrapeCount = 0;
  
  log(`Burst mode: interval=${burstIntervalMs / 1000}s, remaining=${config.burst_remaining_seconds}s`);
  
  while (Date.now() < burstEndTime) {
    burstScrapeCount++;
    log(`--- Burst scrape #${burstScrapeCount} ---`);
    
    await runScraper('burst');
    
    // Check if burst still active
    const checkConfig = await fetchServerConfig();
    if (!checkConfig?.burst_in_progress) {
      log('Burst stopped by server');
      break;
    }
    
    // Update end time
    if (checkConfig.burst_remaining_seconds) {
      burstEndTime = Date.now() + (checkConfig.burst_remaining_seconds * 1000);
    }
    
    // Wait burst interval
    log(`Waiting ${burstIntervalMs / 1000}s...`);
    await delay(burstIntervalMs);
  }
  
  log(`Burst completed: ${burstScrapeCount} scrapes`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start
mainLoop().catch(err => {
  log(`Fatal error: ${err.message}`, 'ERROR');
  process.exit(1);
});
