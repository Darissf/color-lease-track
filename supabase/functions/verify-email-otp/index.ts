import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser(token)
    if (!user) throw new Error('Unauthorized')

    const { email, otp } = await req.json()

    // Find valid token
    const { data: tokenData, error } = await supabaseClient
      .from('email_verification_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('email', email)
      .eq('token', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !tokenData) {
      throw new Error('Invalid or expired OTP')
    }

    // Mark token as verified
    await supabaseClient
      .from('email_verification_tokens')
      .update({ verified: true })
      .eq('id', tokenData.id)

    // Update user email in auth
    await supabaseClient.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true
    })

    // Update profile
    await supabaseClient
      .from('profiles')
      .update({
        email_verified: true,
        temp_email: false
      })
      .eq('id', user.id)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
