import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { secret_key } = body;

    if (!secret_key) {
      return new Response(
        JSON.stringify({ error: 'Missing secret_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get VPS scraper settings
    const { data: settings, error: settingsError } = await supabase
      .from('payment_provider_settings')
      .select('*')
      .eq('provider', 'vps_scraper')
      .single();

    if (settingsError || !settings) {
      console.log('[Get Config] VPS scraper not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'VPS scraper not configured',
          is_active: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate secret key
    if (settings.webhook_secret_encrypted !== secret_key) {
      console.log('[Get Config] Invalid secret key');
      return new Response(
        JSON.stringify({ error: 'Invalid secret_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if burst has expired
    let burstInProgress = settings.burst_in_progress || false;
    let burstRemainingSeconds = 0;
    
    if (burstInProgress && settings.burst_started_at) {
      const burstStarted = new Date(settings.burst_started_at).getTime();
      const now = Date.now();
      const burstDuration = (settings.burst_duration_seconds || 120) * 1000;

      if (now - burstStarted > burstDuration) {
        // Burst has expired, update status
        await supabase
          .from('payment_provider_settings')
          .update({
            burst_in_progress: false,
            burst_ended_at: new Date().toISOString(),
          })
          .eq('id', settings.id);
        
        burstInProgress = false;
        console.log('[Get Config] Burst expired, marked as ended');
      }
    }

    // v4.1.3: Reset burst timing when VPS first fetches during active burst
    // This ensures VPS gets full burst duration from the moment it starts processing
    if (burstInProgress) {
      const currentCheckCount = settings.burst_check_count || 0;
      
      if (currentCheckCount === 0) {
        // VPS first fetch during this burst - reset timer so VPS gets full duration
        const newBurstStartedAt = new Date().toISOString();
        await supabase
          .from('payment_provider_settings')
          .update({
            burst_started_at: newBurstStartedAt,
            burst_check_count: 1,
            last_burst_check_at: newBurstStartedAt,
          })
          .eq('id', settings.id);
        
        burstRemainingSeconds = settings.burst_duration_seconds || 120;
        console.log('[Get Config] Burst timing reset - VPS gets full duration:', burstRemainingSeconds, 's');
      } else {
        // Subsequent fetch - calculate remaining time and increment counter
        const burstStarted = new Date(settings.burst_started_at).getTime();
        const burstDuration = (settings.burst_duration_seconds || 120) * 1000;
        burstRemainingSeconds = Math.max(0, Math.floor((burstDuration - (Date.now() - burstStarted)) / 1000));
        
        await supabase
          .from('payment_provider_settings')
          .update({ 
            burst_check_count: currentCheckCount + 1,
            last_burst_check_at: new Date().toISOString(),
          })
          .eq('id', settings.id);
        
        console.log('[Get Config] Burst check #', currentCheckCount + 1, ', remaining:', burstRemainingSeconds, 's');
      }
    } else {
      // Not in burst mode - just update last check time
      await supabase
        .from('payment_provider_settings')
        .update({ 
          last_burst_check_at: new Date().toISOString(),
        })
        .eq('id', settings.id);
    }

    const config = {
      success: true,
      // General settings
      is_active: settings.is_active || false,
      scrape_interval_minutes: settings.scrape_interval_minutes || 10,
      
      // Burst mode settings
      burst_enabled: settings.burst_enabled || false,
      burst_in_progress: burstInProgress,
      burst_interval_seconds: settings.burst_interval_seconds || 10,
      burst_duration_seconds: settings.burst_duration_seconds || 120,
      burst_remaining_seconds: burstRemainingSeconds,
      burst_request_id: settings.burst_request_id || null,
      
      // Stats
      total_scrapes: settings.total_scrapes || 0,
      burst_check_count: settings.burst_check_count || 0,
      
      // Timestamps
      last_webhook_at: settings.last_webhook_at,
      server_time: new Date().toISOString(),
    };

    console.log('[Get Config] Returning config:', JSON.stringify(config));

    return new Response(
      JSON.stringify(config),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Get Config] Error:', err);
    
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
