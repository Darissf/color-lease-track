import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    console.log('[verify-temp-access] Verifying temp code:', code);

    // Verify temp code exists and is valid
    const { data: tempCodeData, error: codeError } = await supabaseClient
      .from('temporary_access_codes')
      .select('user_id, force_password_change')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !tempCodeData) {
      console.error('[verify-temp-access] Invalid code:', codeError);
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
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});