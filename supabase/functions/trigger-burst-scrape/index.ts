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
    const body = await req.json();
    const { request_id } = body;

    console.log(`[Trigger Burst] Starting burst mode for VPS scraper, request: ${request_id || 'manual'}`);

    // Check if VPS scraper is active
    const { data: settings, error: settingsError } = await supabase
      .from('payment_provider_settings')
      .select('*')
      .eq('provider', 'vps_scraper')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      console.log('[Trigger Burst] VPS scraper not active');
      return new Response(
        JSON.stringify({ success: false, error: 'VPS scraper not configured or inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if burst mode is enabled
    if (!settings.burst_enabled) {
      console.log('[Trigger Burst] Burst mode is disabled');
      return new Response(
        JSON.stringify({ success: false, error: 'Burst mode is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if another burst is already in progress
    if (settings.burst_in_progress) {
      const burstStarted = new Date(settings.burst_started_at).getTime();
      const now = Date.now();
      const burstDuration = (settings.burst_duration_seconds || 120) * 1000;
      
      // If burst started less than duration ago, it's still running
      if (now - burstStarted < burstDuration + 30000) { // +30s buffer
        console.log('[Trigger Burst] Another burst is already in progress');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Burst sedang berjalan. Tunggu hingga selesai.',
            burst_in_progress: true,
            burst_started_at: settings.burst_started_at,
            burst_check_count: settings.burst_check_count
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update status to indicate burst is starting
    // VPS will poll check-burst-command to know when to start burst mode
    const { error: updateError } = await supabase
      .from('payment_provider_settings')
      .update({
        burst_in_progress: true,
        burst_started_at: new Date().toISOString(),
        burst_request_id: request_id || null,
        burst_check_count: 0,
        burst_last_match_found: false,
      })
      .eq('id', settings.id);

    if (updateError) {
      console.error('[Trigger Burst] Failed to update settings:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to start burst mode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('[Trigger Burst] Burst mode activated for VPS scraper');

    // Return immediately - VPS will detect this via polling check-burst-command
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Burst mode activated. VPS will start burst scraping on next poll.',
        burst_started_at: new Date().toISOString(),
        burst_interval_seconds: settings.burst_interval_seconds || 10,
        burst_duration_seconds: settings.burst_duration_seconds || 120,
        max_checks: Math.floor((settings.burst_duration_seconds || 120) / (settings.burst_interval_seconds || 10))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Trigger Burst] Error:', err);
    
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
