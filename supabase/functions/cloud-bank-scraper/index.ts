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

    const credentials = settings.bank_credentials as BankCredentials;
    if (!credentials?.user_id || !credentials?.pin || !credentials?.account_number) {
      throw new Error('BCA credentials not configured');
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
      
      const mutations = await scrapeBCAMutations(browserlessApiKey, credentials);
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
          last_error: err.message,
          error_count: (settings.error_count || 0) + 1,
          burst_in_progress: false,
        })
        .eq('id', settings.id);
    }

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
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

async function scrapeBCAMutations(apiKey: string, credentials: BankCredentials): Promise<MutationData[]> {
  // Use timeout parameter in URL for Browserless V2 (300 seconds / 5 minutes)
  const response = await fetch(`https://production-sfo.browserless.io/function?token=${apiKey}&timeout=300`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: generateBrowserlessCode(credentials, false),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserless error: ${errorText}`);
  }

  const result = await response.json();
  return result.mutations || [];
}

async function scrapeBCAMutationsBurstMode(
  apiKey: string, 
  credentials: BankCredentials,
  intervalSeconds: number,
  maxChecks: number,
  onCheck: (checkNumber: number, mutations: MutationData[]) => Promise<boolean>
): Promise<{ totalChecks: number; matchFound: boolean; totalMutations: number }> {
  
  console.log(`[Burst Mode] Starting with ${intervalSeconds}s interval, max ${maxChecks} checks`);
  
  // Use Browserless with session persistence for burst mode (timeout in SECONDS, capped at plan limit)
  const burstTimeoutSeconds = Math.min(300, Math.max(180, intervalSeconds * maxChecks + 120));
  const response = await fetch(`https://production-sfo.browserless.io/function?token=${apiKey}&timeout=${burstTimeoutSeconds}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: generateBurstModeCode(credentials, intervalSeconds, maxChecks),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
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

function generateBrowserlessCode(credentials: BankCredentials, burstMode: boolean): string {
  return `
    export default async ({ page }) => {
      const CONFIG = ${JSON.stringify(credentials)};
      const mutations = [];
      
      try {
        // Set shorter default timeouts for faster operation
        page.setDefaultTimeout(45000);
        page.setDefaultNavigationTimeout(45000);
        
        // Navigate to KlikBCA
        await page.goto('https://ibank.klikbca.com/', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
        // Wait for login form
        await page.waitForSelector('input[name="value(user_id)"]', { timeout: 20000 });
        
        // Fill login form
        await page.type('input[name="value(user_id)"]', CONFIG.user_id, { delay: 50 });
        await page.type('input[name="value(pswd)"]', CONFIG.pin, { delay: 50 });
        
        // Submit login
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
          page.click('input[name="value(Submit)"]')
        ]);
        
        // Check login success
        const pageContent = await page.content();
        if (pageContent.includes('User ID atau PIN salah') || 
            pageContent.includes('Login gagal')) {
          throw new Error('Login failed: Invalid credentials');
        }
        
        // Navigate to Account Statement (Mutasi Rekening)
        await page.goto('https://ibank.klikbca.com/accountstmt.do?value(actions)=acctstmtview', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // Set date range (today)
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
        
        // Submit form
        const submitBtn = await page.$('input[type="submit"]');
        if (submitBtn) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
            submitBtn.click()
          ]);
        }
        
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
        try {
          await page.goto('https://ibank.klikbca.com/authentication.do?value(actions)=logout', {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
        } catch (e) {}
        
      } catch (error) {
        throw error;
      }
      
      return { mutations };
    };
  `;
}

function generateBurstModeCode(credentials: BankCredentials, intervalSeconds: number, maxChecks: number): string {
  return `
    export default async ({ page }) => {
      const CONFIG = ${JSON.stringify(credentials)};
      const INTERVAL_SECONDS = ${intervalSeconds};
      const MAX_CHECKS = ${maxChecks};
      const allMutations = [];
      let totalChecks = 0;
      
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
        
        // Single login
        await page.goto('https://ibank.klikbca.com/', { 
          waitUntil: 'networkidle2',
          timeout: 60000 
        });
        
        await page.waitForSelector('input[name="value(user_id)"]', { timeout: 30000 });
        await page.type('input[name="value(user_id)"]', CONFIG.user_id);
        await page.type('input[name="value(pswd)"]', CONFIG.pin);
        
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
          page.click('input[name="value(Submit)"]')
        ]);
        
        const pageContent = await page.content();
        if (pageContent.includes('User ID atau PIN salah') || pageContent.includes('Login gagal')) {
          throw new Error('Login failed: Invalid credentials');
        }
        
        console.log('[Burst] Login successful, starting mutation checks...');
        
        // Navigate to statement page
        await page.goto('https://ibank.klikbca.com/accountstmt.do?value(actions)=acctstmtview', {
          waitUntil: 'networkidle2',
          timeout: 60000
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
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
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
            await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
            
            // Re-submit the form to get fresh data
            const refreshBtn = await page.$('input[type="submit"]');
            if (refreshBtn) {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
                refreshBtn.click()
              ]);
            }
          }
        }
        
        console.log('[Burst] Burst complete, logging out...');
        
        // Logout after all checks
        try {
          await page.goto('https://ibank.klikbca.com/authentication.do?value(actions)=logout', {
            waitUntil: 'networkidle2',
            timeout: 30000
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
