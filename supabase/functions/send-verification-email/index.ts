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

    const { email } = await req.json()

    if (!email) {
      throw new Error('Email required')
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Save token
    await supabaseClient
      .from('email_verification_tokens')
      .insert({
        user_id: user.id,
        email,
        token: otp,
        expires_at: expiresAt.toISOString()
      })

    // Send email via send-email function
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Verifikasi Email Anda',
        html: `
          <h2>Kode Verifikasi Email</h2>
          <p>Gunakan kode berikut untuk memverifikasi email Anda:</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; font-weight: bold;">${otp}</h1>
          <p>Kode ini akan kadaluarsa dalam 15 menit.</p>
        `,
        template_type: 'email_verification'
      })
    })

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
