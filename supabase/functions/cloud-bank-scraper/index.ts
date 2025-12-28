import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BankCredentials {
  user_id: string;
  pin: string;
  account_number: string;
}

interface ProxyConfig {
  enabled: boolean;
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  country: string;
}

interface MutationData {
  date: string;
  time: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  balance_after: number | null;
}

interface BurstResult {
  check_number: number;
  mutations_found: number;
  matched: boolean;
  matched_request_id?: string;
}

// Rate limit: minimum 30 seconds between scrapes
const MIN_SCRAPE_INTERVAL_MS = 30000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Parse request body for mode
  let mode: 'normal' | 'burst' = 'normal';
  let burstRequestId: string | null = null;
  
  try {
    const body = await req.json();
    mode = body.mode || 'normal';
    burstRequestId = body.burst_request_id || null;
  } catch {
    // Default to normal mode if no body
  }

  try {
    console.log(`[Cloud Bank Scraper] Starting scrape job in ${mode} mode...`);

    if (!browserlessApiKey) {
      throw new Error('BROWSERLESS_API_KEY not configured');
    }

    // Fetch cloud scraper settings
    const { data: settings, error: settingsError } = await supabase
      .from('payment_provider_settings')
      .select('*')
      .eq('provider', 'cloud_scraper')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      console.log('[Cloud Bank Scraper] No active cloud scraper settings found');
      return new Response(
        JSON.stringify({ success: false, error: 'Cloud scraper not configured or inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // RATE LIMIT CHECK: Prevent 429 errors from Browserless
    const lastScrapeAt = settings.last_scrape_at ? new Date(settings.last_scrape_at).getTime() : 0;
    const timeSinceLastScrape = Date.now() - lastScrapeAt;
    
    if (timeSinceLastScrape < MIN_SCRAPE_INTERVAL_MS) {
      const waitSeconds = Math.ceil((MIN_SCRAPE_INTERVAL_MS - timeSinceLastScrape) / 1000);
      console.log(`[Cloud Bank Scraper] Rate limit: Too soon since last scrape. Wait ${waitSeconds}s`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Rate limit: Tunggu ${waitSeconds} detik sebelum menjalankan lagi`,
          cooldown_remaining: waitSeconds 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    const credentials = settings.bank_credentials as BankCredentials;
    const proxyConfig = settings.proxy_config as ProxyConfig | null;
    
    if (!credentials?.user_id || !credentials?.pin || !credentials?.account_number) {
      throw new Error('BCA credentials not configured');
    }
    
    // Log proxy status
    if (proxyConfig?.enabled) {
      const proxyUsername = proxyConfig.country 
        ? `${proxyConfig.username}-country-${proxyConfig.country}`
        : proxyConfig.username;
      console.log(`[Cloud Bank Scraper] Proxy ENABLED: ${proxyConfig.host}:${proxyConfig.port} (${proxyConfig.country})`);
      console.log(`[Cloud Bank Scraper] Proxy username: ${proxyUsername}`);
    } else {
      console.log('[Cloud Bank Scraper] Proxy DISABLED - direct connection');
    }

    // Update status
    await supabase
      .from('payment_provider_settings')
      .update({ 
        scrape_status: 'running', 
        last_scrape_at: new Date().toISOString(),
        ...(mode === 'burst' ? { 
          burst_in_progress: true, 
          burst_started_at: new Date().toISOString(),
          burst_request_id: burstRequestId,
          burst_check_count: 0,
          burst_last_match_found: false
        } : {})
      })
      .eq('id', settings.id);

    if (mode === 'burst') {
      // BURST MODE: Single login, multiple checks
      console.log('[Cloud Bank Scraper] Starting BURST mode...');
      
      const burstInterval = settings.burst_interval_seconds || 5;
      const burstDuration = settings.burst_duration_seconds || 120;
      const maxChecks = Math.floor(burstDuration / burstInterval);
      
      console.log(`[Cloud Bank Scraper] Burst config: ${burstInterval}s interval, ${burstDuration}s duration, max ${maxChecks} checks`);

      // Run burst scraping with session persistence
      const burstResults = await scrapeBCAMutationsBurstMode(
        browserlessApiKey, 
        credentials,
        proxyConfig,
        burstInterval,
        maxChecks,
        async (checkNumber: number, mutations: MutationData[]) => {
          // Callback for each check iteration
          console.log(`[Cloud Bank Scraper] Burst check #${checkNumber}: Found ${mutations.length} mutations`);
          
          // Update check count
          await supabase
            .from('payment_provider_settings')
            .update({ burst_check_count: checkNumber })
            .eq('id', settings.id);

          // Process mutations and check for match
          const matchResult = await processMutations(supabase, settings, mutations);
          
          if (matchResult.matched) {
            console.log(`[Cloud Bank Scraper] Match found at check #${checkNumber}!`);
            await supabase
              .from('payment_provider_settings')
              .update({ burst_last_match_found: true })
              .eq('id', settings.id);
            return true; // Signal to stop burst
          }
          
          return false; // Continue burst
        }
      );

      // Burst complete - update status
      await supabase
        .from('payment_provider_settings')
        .update({
          scrape_status: 'idle',
          burst_in_progress: false,
          total_scrapes: (settings.total_scrapes || 0) + burstResults.totalChecks,
          last_error: null,
          error_count: 0,
        })
        .eq('id', settings.id);

      console.log(`[Cloud Bank Scraper] Burst complete. Total checks: ${burstResults.totalChecks}, Match found: ${burstResults.matchFound}`);

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'burst',
          total_checks: burstResults.totalChecks,
          match_found: burstResults.matchFound,
          total_mutations: burstResults.totalMutations,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // NORMAL MODE: Single login, single check
      console.log('[Cloud Bank Scraper] Running in NORMAL mode...');
      
      const mutations = await scrapeBCAMutationsWithRetry(browserlessApiKey, credentials, proxyConfig);
      console.log(`[Cloud Bank Scraper] Found ${mutations.length} mutations`);

      const result = await processMutations(supabase, settings, mutations);

      // Update status
      await supabase
        .from('payment_provider_settings')
        .update({
          scrape_status: 'idle',
          total_scrapes: (settings.total_scrapes || 0) + 1,
          total_mutations_found: (settings.total_mutations_found || 0) + mutations.length,
          last_error: null,
          error_count: 0,
        })
        .eq('id', settings.id);

      console.log(`[Cloud Bank Scraper] Completed. Processed: ${result.processedCount}, Matched: ${result.matchedCount}`);

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'normal',
          mutations_found: mutations.length,
          processed: result.processedCount,
          matched: result.matchedCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Cloud Bank Scraper] Error:', err);

    // Check for specific error types
    const is429Error = err.message.includes('429') || err.message.includes('Too Many Requests');
    const isTimeoutError = err.message.includes('timeout') || err.message.includes('timed out');
    
    let userFriendlyError = err.message;
    if (is429Error) {
      userFriendlyError = 'Rate limit tercapai. Tunggu 30 detik sebelum menjalankan lagi.';
    } else if (isTimeoutError) {
      userFriendlyError = 'Timeout: KlikBCA lambat merespon. Coba lagi dalam 30 detik.';
    }

    // Update error status
    const { data: settings } = await supabase
      .from('payment_provider_settings')
      .select('id, error_count')
      .eq('provider', 'cloud_scraper')
      .single();

    if (settings) {
      await supabase
        .from('payment_provider_settings')
        .update({
          scrape_status: 'error',
          last_error: userFriendlyError,
          error_count: (settings.error_count || 0) + 1,
          burst_in_progress: false,
        })
        .eq('id', settings.id);
    }

    return new Response(
      JSON.stringify({ success: false, error: userFriendlyError }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: is429Error ? 429 : 500 }
    );
  }
});

// deno-lint-ignore no-explicit-any
async function processMutations(supabase: any, settings: any, mutations: MutationData[]) {
  let processedCount = 0;
  let matchedCount = 0;
  let matched = false;

  for (const mutation of mutations) {
    if (mutation.type !== 'credit') continue;

    // Check for duplicate
    const { data: existing } = await supabase
      .from('bank_mutations')
      .select('id')
      .eq('user_id', settings.user_id)
      .eq('transaction_date', mutation.date)
      .eq('amount', mutation.amount)
      .eq('description', mutation.description)
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    // Insert mutation
    const { data: inserted, error: insertError } = await supabase
      .from('bank_mutations')
      .insert({
        user_id: settings.user_id,
        transaction_date: mutation.date,
        transaction_time: mutation.time,
        amount: mutation.amount,
        transaction_type: mutation.type,
        description: mutation.description,
        balance_after: mutation.balance_after,
        source: 'cloud_scraper',
        is_processed: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Cloud Bank Scraper] Failed to insert mutation:', insertError);
      continue;
    }

    processedCount++;
    console.log(`[Cloud Bank Scraper] Inserted mutation: ${inserted.id}, amount: ${mutation.amount}`);

    // Try to match with payment request
    const { data: matchedRequestId } = await supabase
      .rpc('match_mutation_with_request', {
        p_mutation_id: inserted.id,
        p_amount: mutation.amount,
      });

    if (matchedRequestId) {
      matchedCount++;
      matched = true;
      console.log(`[Cloud Bank Scraper] Matched with request: ${matchedRequestId}`);

      // Get request details for WhatsApp notification
      const { data: request } = await supabase
        .from('payment_confirmation_requests')
        .select('*, rental_contracts!inner(*, client_groups!inner(*))')
        .eq('id', matchedRequestId)
        .single();

      if (request) {
        const contract = request.rental_contracts;
        const actualAmount = mutation.amount;

        // Calculate new tagihan_belum_bayar
        const newTagihanBelumBayar = Math.max(0, (contract.tagihan_belum_bayar || 0) - actualAmount);

        // Update contract
        await supabase
          .from('rental_contracts')
          .update({
            tagihan_belum_bayar: newTagihanBelumBayar,
            tanggal_bayar_terakhir: new Date().toISOString().split('T')[0],
          })
          .eq('id', contract.id);

        // Create payment record
        await supabase
          .from('contract_payments')
          .insert({
            user_id: settings.user_id,
            contract_id: contract.id,
            amount: actualAmount,
            payment_date: new Date().toISOString().split('T')[0],
            payment_source: 'cloud_scraper',
            notes: `Auto-verified via Cloud Scraper. Mutation: ${mutation.description}`,
          });

        // Try to send WhatsApp notification
        try {
          await supabase.functions.invoke('send-whatsapp-unified', {
            body: {
              contract_id: contract.id,
              notification_type: 'payment_confirmation',
              custom_data: {
                amount: actualAmount,
                matched_at: new Date().toISOString(),
              },
            },
          });
          console.log(`[Cloud Bank Scraper] WhatsApp notification sent for contract ${contract.id}`);
        } catch (waError) {
          console.error('[Cloud Bank Scraper] Failed to send WhatsApp:', waError);
        }
      }
    }
  }

  return { processedCount, matchedCount, matched };
}

// Retry wrapper for normal mode scraping
async function scrapeBCAMutationsWithRetry(apiKey: string, credentials: BankCredentials, proxyConfig: ProxyConfig | null, maxRetries = 1): Promise<MutationData[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Browserless] Retry attempt ${attempt}/${maxRetries} after 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      return await scrapeBCAMutations(apiKey, credentials, proxyConfig);
    } catch (error: unknown) {
      lastError = error as Error;
      console.error(`[Browserless] Attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry on 429 (rate limit) errors
      if (lastError.message.includes('429') || lastError.message.includes('Too Many Requests')) {
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error('Scraping failed after retries');
}

async function scrapeBCAMutations(apiKey: string, credentials: BankCredentials, proxyConfig: ProxyConfig | null): Promise<MutationData[]> {
  // Browserless REST API timeout is in MILLISECONDS
  // Maximum 60000ms (60 seconds) for free plan
  console.log('[Browserless] Starting scrape request with 60s timeout...');
  
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 80000); // 80s total timeout for fetch
  
  try {
    // Build request body with optional proxy launch args
    // deno-lint-ignore no-explicit-any
    const requestBody: any = {
      code: generateBrowserlessCode(credentials, proxyConfig),
    };
    
    // Add launch args for proxy if enabled
    if (proxyConfig?.enabled && proxyConfig.host && proxyConfig.port) {
      requestBody.launch = {
        args: [`--proxy-server=http://${proxyConfig.host}:${proxyConfig.port}`]
      };
      console.log(`[Browserless] Using proxy: ${proxyConfig.host}:${proxyConfig.port}`);
    }
    
    const response = await fetch(`https://production-sfo.browserless.io/function?token=${apiKey}&timeout=60000`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(fetchTimeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Browserless] Error response:', errorText);
      
      // Check for specific error types
      if (response.status === 429 || errorText.includes('429') || errorText.includes('Too Many Requests')) {
        throw new Error('429 Too Many Requests: Rate limit tercapai. Tunggu 30 detik.');
      }
      
      throw new Error(`Browserless error: ${errorText}`);
    }

    const result = await response.json();
    console.log('[Browserless] Scrape completed, mutations found:', result.mutations?.length || 0);
    return result.mutations || [];
  } catch (error: unknown) {
    clearTimeout(fetchTimeout);
    const err = error as Error;
    
    if (err.name === 'AbortError') {
      throw new Error('Request timeout: Scraping melebihi 80 detik');
    }
    throw error;
  }
}

async function scrapeBCAMutationsBurstMode(
  apiKey: string, 
  credentials: BankCredentials,
  proxyConfig: ProxyConfig | null,
  intervalSeconds: number,
  maxChecks: number,
  onCheck: (checkNumber: number, mutations: MutationData[]) => Promise<boolean>
): Promise<{ totalChecks: number; matchFound: boolean; totalMutations: number }> {
  
  console.log(`[Burst Mode] Starting with ${intervalSeconds}s interval, max ${maxChecks} checks`);
  
  // Browserless REST API timeout is in MILLISECONDS
  // Burst mode needs higher plan - cap at 60000ms for free plan
  const burstTimeoutMs = 60000;
  console.log(`[Burst Mode] Using timeout: ${burstTimeoutMs}ms`);
  
  // Build request body with optional proxy launch args
  // deno-lint-ignore no-explicit-any
  const requestBody: any = {
    code: generateBurstModeCode(credentials, proxyConfig, intervalSeconds, maxChecks),
  };
  
  // Add launch args for proxy if enabled
  if (proxyConfig?.enabled && proxyConfig.host && proxyConfig.port) {
    requestBody.launch = {
      args: [`--proxy-server=http://${proxyConfig.host}:${proxyConfig.port}`]
    };
    console.log(`[Burst Mode] Using proxy: ${proxyConfig.host}:${proxyConfig.port}`);
  }
  
  const response = await fetch(`https://production-sfo.browserless.io/function?token=${apiKey}&timeout=${burstTimeoutMs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    if (response.status === 429 || errorText.includes('429')) {
      throw new Error('429 Too Many Requests: Rate limit tercapai. Tunggu 30 detik.');
    }
    
    throw new Error(`Browserless error: ${errorText}`);
  }

  const result = await response.json();
  
  // Process each batch of mutations from burst mode
  let totalMutations = 0;
  let matchFound = false;
  
  if (result.allMutations && Array.isArray(result.allMutations)) {
    for (let i = 0; i < result.allMutations.length; i++) {
      const mutations = result.allMutations[i] || [];
      totalMutations += mutations.length;
      
      const shouldStop = await onCheck(i + 1, mutations);
      if (shouldStop) {
        matchFound = true;
        break;
      }
    }
  }
  
  return {
    totalChecks: result.totalChecks || 0,
    matchFound,
    totalMutations
  };
}

function generateBrowserlessCode(credentials: BankCredentials, proxyConfig: ProxyConfig | null): string {
  // Build proxy auth code if proxy is enabled
  const proxyAuthCode = proxyConfig?.enabled && proxyConfig.username && proxyConfig.password
    ? `
        // Authenticate with proxy
        const proxyUsername = ${JSON.stringify(proxyConfig.country ? `${proxyConfig.username}-country-${proxyConfig.country}` : proxyConfig.username)};
        const proxyPassword = ${JSON.stringify(proxyConfig.password)};
        await page.authenticate({
          username: proxyUsername,
          password: proxyPassword
        });
        console.log('[BCA] Proxy authentication set:', proxyUsername);
      `
    : '';
    
  return `
    export default async ({ page }) => {
      const CONFIG = ${JSON.stringify(credentials)};
      const mutations = [];
      
      try {
        ${proxyAuthCode}
        
        // KlikBCA is very slow from US servers - use maximum timeouts
        // Total operation should complete in ~55 seconds to fit within 60s limit
        page.setDefaultTimeout(45000);
        page.setDefaultNavigationTimeout(50000);
        
        console.log('[BCA] Navigating to login page...');
        
        // Navigate to KlikBCA - use networkidle0 for more reliable loading
        // This waits until there are no network connections for 500ms
        await page.goto('https://ibank.klikbca.com/', { 
          waitUntil: 'networkidle0',
          timeout: 45000 
        });
        
        // Wait for login form
        console.log('[BCA] Waiting for login form...');
        await page.waitForSelector('input[name="value(user_id)"]', { timeout: 20000 });
        
        // Fill login form
        console.log('[BCA] Filling credentials...');
        await page.type('input[name="value(user_id)"]', CONFIG.user_id, { delay: 50 });
        await page.type('input[name="value(pswd)"]', CONFIG.pin, { delay: 50 });
        
        // Submit login - use networkidle0 to ensure page fully loads
        console.log('[BCA] Submitting login...');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 50000 }),
          page.click('input[name="value(Submit)"]')
        ]);
        
        // Quick login check
        const pageContent = await page.content();
        if (pageContent.includes('User ID atau PIN salah') || 
            pageContent.includes('Login gagal')) {
          throw new Error('Login failed: Invalid credentials');
        }
        
        console.log('[BCA] Login successful, navigating to mutations...');
        
        // Navigate to Account Statement (Mutasi Rekening)
        await page.goto('https://ibank.klikbca.com/accountstmt.do?value(actions)=acctstmtview', {
          waitUntil: 'networkidle0',
          timeout: 45000
        });
        
        // Set date range (today)
        const today = new Date();
        const day = today.getDate().toString();
        const month = (today.getMonth() + 1).toString();
        const year = today.getFullYear().toString();
        
        console.log('[BCA] Setting date range...');
        try {
          await page.select('select[name="value(startDt)"]', day);
          await page.select('select[name="value(startMt)"]', month);
          await page.select('select[name="value(startYr)"]', year);
          await page.select('select[name="value(endDt)"]', day);
          await page.select('select[name="value(endMt)"]', month);
          await page.select('select[name="value(endYr)"]', year);
        } catch (e) {
          console.log('[BCA] Using fallback select method...');
          const selects = await page.$$('select');
          if (selects.length >= 6) {
            await selects[0].select(day);
            await selects[1].select(month);
            await selects[2].select(year);
            await selects[3].select(day);
            await selects[4].select(month);
            await selects[5].select(year);
          }
        }
        
        // Submit form
        console.log('[BCA] Submitting date range...');
        const submitBtn = await page.$('input[type="submit"]');
        if (submitBtn) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 }),
            submitBtn.click()
          ]);
        }
        
        console.log('[BCA] Parsing mutation table...');
        
        // Parse mutation table
        const tableData = await page.evaluate(() => {
          const results = [];
          const tables = document.querySelectorAll('table');
          
          for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 3) {
                const firstCell = cells[0]?.innerText?.trim() || '';
                if (/^\\d{2}\\/\\d{2}$/.test(firstCell)) {
                  const desc = cells[1]?.innerText?.trim() || '';
                  const amountText = cells[2]?.innerText?.trim() || '';
                  
                  let type = 'debit';
                  let balanceAfter = null;
                  
                  if (cells.length >= 4) {
                    const typeCell = cells[3]?.innerText?.trim()?.toUpperCase() || '';
                    if (typeCell === 'CR' || typeCell.includes('CR')) {
                      type = 'credit';
                    }
                  }
                  
                  if (cells.length >= 5) {
                    const balText = cells[4]?.innerText?.trim()?.replace(/[^\\d.,]/g, '');
                    balanceAfter = parseFloat(balText.replace(/,/g, '')) || null;
                  }
                  
                  const amount = parseFloat(amountText.replace(/[^\\d.,]/g, '').replace(/,/g, '')) || 0;
                  
                  if (amount > 0) {
                    results.push({
                      date: firstCell,
                      description: desc,
                      amount: amount,
                      type: type,
                      balance_after: balanceAfter
                    });
                  }
                }
              }
            }
          }
          
          return results;
        });
        
        console.log('[BCA] Found', tableData.length, 'raw mutations');
        
        // Format dates
        const now = new Date();
        const currentYear = now.getFullYear();
        
        for (const item of tableData) {
          const [d, m] = item.date.split('/');
          mutations.push({
            date: currentYear + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0'),
            time: now.toTimeString().split(' ')[0],
            amount: item.amount,
            type: item.type,
            description: item.description,
            balance_after: item.balance_after
          });
        }
        
        // Logout
        console.log('[BCA] Logging out...');
        try {
          await page.goto('https://ibank.klikbca.com/authentication.do?value(actions)=logout', {
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });
        } catch (e) {
          console.log('[BCA] Logout skipped (timeout is okay)');
        }
        
        console.log('[BCA] Complete! Found', mutations.length, 'mutations');
        
      } catch (error) {
        console.error('[BCA] Error:', error.message);
        throw error;
      }
      
      return { mutations };
    };
  `;
}

function generateBurstModeCode(credentials: BankCredentials, proxyConfig: ProxyConfig | null, intervalSeconds: number, maxChecks: number): string {
  // Build proxy auth code if proxy is enabled
  const proxyAuthCode = proxyConfig?.enabled && proxyConfig.username && proxyConfig.password
    ? `
        // Authenticate with proxy
        const proxyUsername = ${JSON.stringify(proxyConfig.country ? `${proxyConfig.username}-country-${proxyConfig.country}` : proxyConfig.username)};
        const proxyPassword = ${JSON.stringify(proxyConfig.password)};
        await page.authenticate({
          username: proxyUsername,
          password: proxyPassword
        });
        console.log('[BCA] Proxy authentication set:', proxyUsername);
      `
    : '';
    
  return `
    export default async ({ page }) => {
      const CONFIG = ${JSON.stringify(credentials)};
      const INTERVAL_SECONDS = ${intervalSeconds};
      const MAX_CHECKS = ${maxChecks};
      const allMutations = [];
      let totalChecks = 0;
      
      ${proxyAuthCode}
      
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      const parseMutationTable = async () => {
        return await page.evaluate(() => {
          const results = [];
          const tables = document.querySelectorAll('table');
          
          for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 3) {
                const firstCell = cells[0]?.innerText?.trim() || '';
                if (/^\\d{2}\\/\\d{2}$/.test(firstCell)) {
                  const desc = cells[1]?.innerText?.trim() || '';
                  const amountText = cells[2]?.innerText?.trim() || '';
                  
                  let type = 'debit';
                  let balanceAfter = null;
                  
                  if (cells.length >= 4) {
                    const typeCell = cells[3]?.innerText?.trim()?.toUpperCase() || '';
                    if (typeCell === 'CR' || typeCell.includes('CR')) {
                      type = 'credit';
                    }
                  }
                  
                  if (cells.length >= 5) {
                    const balText = cells[4]?.innerText?.trim()?.replace(/[^\\d.,]/g, '');
                    balanceAfter = parseFloat(balText.replace(/,/g, '')) || null;
                  }
                  
                  const amount = parseFloat(amountText.replace(/[^\\d.,]/g, '').replace(/,/g, '')) || 0;
                  
                  if (amount > 0) {
                    results.push({
                      date: firstCell,
                      description: desc,
                      amount: amount,
                      type: type,
                      balance_after: balanceAfter
                    });
                  }
                }
              }
            }
          }
          
          return results;
        });
      };
      
      const formatMutations = (tableData) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        return tableData.map(item => {
          const [d, m] = item.date.split('/');
          return {
            date: currentYear + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0'),
            time: now.toTimeString().split(' ')[0],
            amount: item.amount,
            type: item.type,
            description: item.description,
            balance_after: item.balance_after
          };
        });
      };
      
      try {
        console.log('[Burst] Starting BCA login...');
        
        // Single login with optimized settings
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(35000);
        
        await page.goto('https://ibank.klikbca.com/', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
        await page.waitForSelector('input[name="value(user_id)"]', { timeout: 20000 });
        await page.type('input[name="value(user_id)"]', CONFIG.user_id, { delay: 30 });
        await page.type('input[name="value(pswd)"]', CONFIG.pin, { delay: 30 });
        
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 35000 }),
          page.click('input[name="value(Submit)"]')
        ]);
        
        const pageContent = await page.content();
        if (pageContent.includes('User ID atau PIN salah') || pageContent.includes('Login gagal')) {
          throw new Error('Login failed: Invalid credentials');
        }
        
        console.log('[Burst] Login successful, starting mutation checks...');
        
        // Navigate to statement page
        await page.goto('https://ibank.klikbca.com/accountstmt.do?value(actions)=acctstmtview', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // Set date range (today) once
        const today = new Date();
        const day = today.getDate().toString();
        const month = (today.getMonth() + 1).toString();
        const year = today.getFullYear().toString();
        
        try {
          await page.select('select[name="value(startDt)"]', day);
          await page.select('select[name="value(startMt)"]', month);
          await page.select('select[name="value(startYr)"]', year);
          await page.select('select[name="value(endDt)"]', day);
          await page.select('select[name="value(endMt)"]', month);
          await page.select('select[name="value(endYr)"]', year);
        } catch (e) {
          const selects = await page.$$('select');
          if (selects.length >= 6) {
            await selects[0].select(day);
            await selects[1].select(month);
            await selects[2].select(year);
            await selects[3].select(day);
            await selects[4].select(month);
            await selects[5].select(year);
          }
        }
        
        // First check
        const submitBtn = await page.$('input[type="submit"]');
        if (submitBtn) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
            submitBtn.click()
          ]);
        }
        
        // BURST LOOP: Check mutations repeatedly
        for (let check = 1; check <= MAX_CHECKS; check++) {
          console.log('[Burst] Check #' + check + ' of ' + MAX_CHECKS);
          totalChecks = check;
          
          // Parse current mutations
          const tableData = await parseMutationTable();
          const mutations = formatMutations(tableData);
          allMutations.push(mutations);
          
          console.log('[Burst] Check #' + check + ': Found ' + mutations.length + ' mutations');
          
          // If not last check, wait and refresh
          if (check < MAX_CHECKS) {
            console.log('[Burst] Waiting ' + INTERVAL_SECONDS + ' seconds...');
            await sleep(INTERVAL_SECONDS * 1000);
            
            // Refresh the statement page (no re-login needed)
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Re-submit the form to get fresh data
            const refreshBtn = await page.$('input[type="submit"]');
            if (refreshBtn) {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
                refreshBtn.click()
              ]);
            }
          }
        }
        
        console.log('[Burst] Burst complete, logging out...');
        
        // Logout after all checks
        try {
          await page.goto('https://ibank.klikbca.com/authentication.do?value(actions)=logout', {
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });
        } catch (e) {}
        
      } catch (error) {
        console.error('[Burst] Error:', error.message);
        throw error;
      }
      
      return { allMutations, totalChecks };
    };
  `;
}
