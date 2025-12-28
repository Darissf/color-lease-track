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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const browserlessApiKey = Deno.env.get('BROWSERLESS_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[Cloud Bank Scraper] Starting scrape job...');

    // Check if Browserless API key is configured
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

    // Get credentials
    const credentials = settings.bank_credentials as BankCredentials;
    if (!credentials?.user_id || !credentials?.pin || !credentials?.account_number) {
      throw new Error('BCA credentials not configured');
    }

    // Update status to running
    await supabase
      .from('payment_provider_settings')
      .update({ scrape_status: 'running', last_scrape_at: new Date().toISOString() })
      .eq('id', settings.id);

    console.log('[Cloud Bank Scraper] Connecting to Browserless...');

    // Execute scraping via Browserless
    const mutations = await scrapeBCAMutations(browserlessApiKey, credentials);

    console.log(`[Cloud Bank Scraper] Found ${mutations.length} mutations`);

    // Process mutations
    let processedCount = 0;
    let matchedCount = 0;

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
        console.log(`[Cloud Bank Scraper] Matched with request: ${matchedRequestId}`);

        // Get request details for WhatsApp notification
        const { data: request } = await supabase
          .from('payment_confirmation_requests')
          .select('*, rental_contracts!inner(*, client_groups!inner(*))')
          .eq('id', matchedRequestId)
          .single();

        if (request) {
          // Update contract payment
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

    // Update status to success
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

    console.log(`[Cloud Bank Scraper] Completed. Processed: ${processedCount}, Matched: ${matchedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        mutations_found: mutations.length,
        processed: processedCount,
        matched: matchedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Cloud Bank Scraper] Error:', error);

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
          last_error: error.message,
          error_count: (settings.error_count || 0) + 1,
        })
        .eq('id', settings.id);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function scrapeBCAMutations(apiKey: string, credentials: BankCredentials): Promise<MutationData[]> {
  const browserlessUrl = `wss://production-sfo.browserless.io?token=${apiKey}`;
  
  // Use Browserless HTTP API for simpler integration
  const response = await fetch(`https://production-sfo.browserless.io/function?token=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: `
        module.exports = async ({ page }) => {
          const CONFIG = ${JSON.stringify(credentials)};
          const mutations = [];
          
          try {
            // Navigate to KlikBCA
            await page.goto('https://ibank.klikbca.com/', { 
              waitUntil: 'networkidle2',
              timeout: 60000 
            });
            
            // Wait for login form
            await page.waitForSelector('input[name="value(user_id)"]', { timeout: 30000 });
            
            // Fill login form
            await page.type('input[name="value(user_id)"]', CONFIG.user_id);
            await page.type('input[name="value(pswd)"]', CONFIG.pin);
            
            // Submit login
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
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
              waitUntil: 'networkidle2',
              timeout: 60000
            });
            
            // Set date range (today)
            const today = new Date();
            const day = today.getDate().toString();
            const month = (today.getMonth() + 1).toString();
            const year = today.getFullYear().toString();
            
            // Try to set date range
            try {
              await page.select('select[name="value(startDt)"]', day);
              await page.select('select[name="value(startMt)"]', month);
              await page.select('select[name="value(startYr)"]', year);
              await page.select('select[name="value(endDt)"]', day);
              await page.select('select[name="value(endMt)"]', month);
              await page.select('select[name="value(endYr)"]', year);
            } catch (e) {
              // Alternative selectors
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
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
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
                    // Check if first cell looks like a date (DD/MM)
                    if (/^\\d{2}\\/\\d{2}$/.test(firstCell)) {
                      const desc = cells[1]?.innerText?.trim() || '';
                      const amountText = cells[2]?.innerText?.trim() || '';
                      
                      // Determine type from description or separate column
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
                      
                      // Parse amount
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
            
            // Format dates and times
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
            } catch (e) {
              // Ignore logout errors
            }
            
          } catch (error) {
            throw error;
          }
          
          return { mutations };
        };
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserless error: ${errorText}`);
  }

  const result = await response.json();
  return result.mutations || [];
}
