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

    // v4.1.4: Improved burst timing logic
    // Reset burst timer on VPS first fetch BEFORE checking expiration
    let burstInProgress = settings.burst_in_progress || false;
    let burstRemainingSeconds = 0;
    
    if (burstInProgress && settings.burst_started_at) {
      const currentCheckCount = settings.burst_check_count || 0;
      
      if (currentCheckCount === 0) {
        // VPS FIRST FETCH during this burst - reset timer so VPS gets full duration
        // This happens BEFORE expiration check to ensure VPS always gets full time
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
        console.log('[Get Config] Burst timing reset on first VPS fetch - full duration:', burstRemainingSeconds, 's');
      } else {
        // Subsequent fetch - calculate remaining time based on actual burst_started_at
        const burstStarted = new Date(settings.burst_started_at).getTime();
        const burstDuration = (settings.burst_duration_seconds || 120) * 1000;
        const elapsed = Date.now() - burstStarted;
        
        if (elapsed > burstDuration) {
          // Burst has expired
          await supabase
            .from('payment_provider_settings')
            .update({
              burst_in_progress: false,
              burst_ended_at: new Date().toISOString(),
            })
            .eq('id', settings.id);
          
          burstInProgress = false;
          burstRemainingSeconds = 0;
          console.log('[Get Config] Burst expired, marked as ended');
        } else {
          // Burst still active - calculate remaining and increment counter
          burstRemainingSeconds = Math.max(0, Math.floor((burstDuration - elapsed) / 1000));
          
          await supabase
            .from('payment_provider_settings')
            .update({ 
              burst_check_count: currentCheckCount + 1,
              last_burst_check_at: new Date().toISOString(),
            })
            .eq('id', settings.id);
          
          console.log('[Get Config] Burst check #', currentCheckCount + 1, ', remaining:', burstRemainingSeconds, 's');
        }
      }
    } else if (!burstInProgress) {
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
