import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, code } = await req.json()

    if (!userId || !code) {
      return new Response(
        JSON.stringify({ error: 'User ID and code are required', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate code format (6 digits only)
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limiting - count failed attempts in the last LOCKOUT_DURATION_MINUTES
    const lockoutTime = new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
    
    const { data: recentAttempts, error: attemptsError } = await supabaseClient
      .from('two_factor_codes')
      .select('id, verified, created_at')
      .eq('user_id', userId)
      .gte('created_at', lockoutTime)
      .eq('verified', false)
      .order('created_at', { ascending: false });

    if (attemptsError) {
      console.error('[verify-2fa-code] Error checking attempts:', attemptsError);
    }

    // Count failed verification attempts (codes that were checked but not verified)
    // We track this by counting codes with attempts_count > 0
    const { data: failedAttempts, error: failedError } = await supabaseClient
      .from('two_factor_codes')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', lockoutTime)
      .gt('attempts_count', 0)
      .eq('verified', false);

    const failedCount = failedAttempts?.length || 0;

    if (failedCount >= MAX_ATTEMPTS) {
      console.log(`[verify-2fa-code] User ${userId} is locked out. Failed attempts: ${failedCount}`);
      return new Response(
        JSON.stringify({ 
          error: `Terlalu banyak percobaan gagal. Silakan tunggu ${LOCKOUT_DURATION_MINUTES} menit.`,
          verified: false,
          locked: true,
          retryAfter: LOCKOUT_DURATION_MINUTES
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find valid code
    const { data: codeData, error } = await supabaseClient
      .from('two_factor_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[verify-2fa-code] Database error:', error);
      throw new Error('Database error')
    }

    if (!codeData) {
      // Increment attempts count on the most recent unverified code for this user
      const { data: latestCode } = await supabaseClient
        .from('two_factor_codes')
        .select('id, attempts_count')
        .eq('user_id', userId)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestCode) {
        await supabaseClient
          .from('two_factor_codes')
          .update({ attempts_count: (latestCode.attempts_count || 0) + 1 })
          .eq('id', latestCode.id);
      }

      console.log(`[verify-2fa-code] Invalid code for user ${userId}. Remaining attempts: ${MAX_ATTEMPTS - failedCount - 1}`);
      
      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      return new Response(
        JSON.stringify({ 
          error: 'Kode tidak valid atau sudah kadaluarsa',
          verified: false,
          remainingAttempts: Math.max(0, MAX_ATTEMPTS - failedCount - 1)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark code as verified
    await supabaseClient
      .from('two_factor_codes')
      .update({ verified: true })
      .eq('id', codeData.id)

    // Clean up old codes for this user
    await supabaseClient
      .from('two_factor_codes')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString());

    console.log(`[verify-2fa-code] Successfully verified code for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, verified: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[verify-2fa-code] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message, verified: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
