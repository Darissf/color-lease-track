import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting constants
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ATTEMPTS_PER_CODE = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { code } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate code format (alphanumeric, 6-12 characters)
    if (typeof code !== 'string' || !/^[A-Za-z0-9]{6,12}$/.test(code)) {
      await addArtificialDelay(startTime);
      return new Response(
        JSON.stringify({ error: 'Format kode tidak valid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    console.log('[verify-temp-access] Verifying temp code from IP:', clientIP);

    // Check rate limit by code - count attempts on this specific code
    const { data: codeAttempts, error: attemptError } = await supabaseClient
      .from('temporary_access_codes')
      .select('attempts_count, last_attempt_at')
      .eq('code', code)
      .maybeSingle();

    if (codeAttempts) {
      const lastAttempt = codeAttempts.last_attempt_at ? new Date(codeAttempts.last_attempt_at) : null;
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
      
      // Check if within rate limit window and exceeded attempts
      if (lastAttempt && lastAttempt > windowStart && (codeAttempts.attempts_count || 0) >= MAX_ATTEMPTS_PER_CODE) {
        console.log('[verify-temp-access] Rate limit exceeded for code');
        await addArtificialDelay(startTime);
        return new Response(
          JSON.stringify({ 
            error: `Terlalu banyak percobaan. Tunggu ${RATE_LIMIT_WINDOW_MINUTES} menit.`,
            retryAfter: RATE_LIMIT_WINDOW_MINUTES
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify temp code exists and is valid
    const { data: tempCodeData, error: codeError } = await supabaseClient
      .from('temporary_access_codes')
      .select('user_id, force_password_change, id')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    // Update attempt count regardless of success/failure
    if (codeAttempts || tempCodeData) {
      await supabaseClient
        .from('temporary_access_codes')
        .update({ 
          attempts_count: (codeAttempts?.attempts_count || 0) + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('code', code);
    }

    if (codeError || !tempCodeData) {
      console.error('[verify-temp-access] Invalid code:', codeError);
      await addArtificialDelay(startTime);
      return new Response(
        JSON.stringify({ error: 'Kode akses tidak valid atau sudah kadaluarsa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-temp-access] Valid code found for user:', tempCodeData.user_id);

    // Get user data via admin API
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(tempCodeData.user_id);

    if (userError || !user || !user.email) {
      console.error('[verify-temp-access] User not found:', userError);
      await addArtificialDelay(startTime);
      return new Response(
        JSON.stringify({ error: 'User tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary password (use the code itself as password for simplicity)
    const tempPassword = code;

    // Update user password via admin API
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      tempCodeData.user_id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('[verify-temp-access] Failed to update password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Gagal mengatur password sementara' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark code as used
    await supabaseClient
      .from('temporary_access_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('code', code);

    console.log('[verify-temp-access] Success! Returning credentials');

    return new Response(
      JSON.stringify({
        email: user.email,
        tempPassword,
        forcePasswordChange: tempCodeData.force_password_change
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[verify-temp-access] Error:', error);
    await addArtificialDelay(startTime);
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan. Silakan coba lagi.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Add artificial delay to prevent timing attacks
async function addArtificialDelay(startTime: number) {
  const minResponseTime = 300;
  const elapsed = Date.now() - startTime;
  if (elapsed < minResponseTime) {
    await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsed + Math.random() * 100));
  }
}
