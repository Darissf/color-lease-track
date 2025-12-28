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
    // Validate secret key from request
    const body = await req.json().catch(() => ({}));
    const { secret_key } = body;

    if (!secret_key) {
      return new Response(
        JSON.stringify({ error: 'Missing secret_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify secret key matches VPS scraper settings
    const { data: settings, error: settingsError } = await supabase
      .from('payment_provider_settings')
      .select('*')
      .eq('provider', 'vps_scraper')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      console.log('[Check Burst] VPS scraper not configured');
      return new Response(
        JSON.stringify({ burst_active: false, reason: 'VPS scraper not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate secret key
    if (settings.secret_key !== secret_key) {
      console.log('[Check Burst] Invalid secret key');
      return new Response(
        JSON.stringify({ error: 'Invalid secret_key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if burst mode is enabled and in progress
    if (!settings.burst_enabled || !settings.burst_in_progress) {
      return new Response(
        JSON.stringify({ 
          burst_active: false, 
          reason: settings.burst_enabled ? 'No burst in progress' : 'Burst mode disabled'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if burst has expired
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

      console.log('[Check Burst] Burst expired');
      return new Response(
        JSON.stringify({ 
          burst_active: false, 
          reason: 'Burst expired',
          burst_duration_seconds: settings.burst_duration_seconds || 120
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment check count
    await supabase
      .from('payment_provider_settings')
      .update({
        burst_check_count: (settings.burst_check_count || 0) + 1,
        last_burst_check_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    const remainingSeconds = Math.max(0, Math.floor((burstDuration - (now - burstStarted)) / 1000));

    console.log(`[Check Burst] Burst active, check #${(settings.burst_check_count || 0) + 1}, ${remainingSeconds}s remaining`);

    return new Response(
      JSON.stringify({
        burst_active: true,
        interval_seconds: settings.burst_interval_seconds || 10,
        remaining_seconds: remainingSeconds,
        check_count: (settings.burst_check_count || 0) + 1,
        request_id: settings.burst_request_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Check Burst] Error:', err);
    
    return new Response(
      JSON.stringify({ burst_active: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
