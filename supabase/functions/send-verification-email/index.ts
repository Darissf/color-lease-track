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
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // Save token
    await supabaseClient
      .from('email_verification_tokens')
      .insert({
        user_id: user.id,
        email,
        token: otp,
        expires_at: expiresAt.toISOString()
      })

    // Get email template from database
    const { data: template } = await supabaseClient
      .from('email_templates')
      .select('subject_template, body_template')
      .eq('template_type', 'email_verification')
      .eq('is_active', true)
      .maybeSingle()

    // Get user profile for name
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const userName = profile?.full_name || email.split('@')[0]

    // Prepare variables
    const variables = {
      name: userName,
      otp: otp,
      valid_minutes: '30',
      app_name: 'Sewa Scaffolding Bali'
    }

    // Replace variables in template
    let subject = template?.subject_template || 'Verifikasi Email Anda'
    let body = template?.body_template || `<h1>${otp}</h1>`

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      subject = subject.replace(regex, value)
      body = body.replace(regex, value)
    })

    // Send email via send-email function
    await supabaseClient.functions.invoke('send-email', {
      body: {
        to: email,
        subject: subject,
        html: body,
        template_type: 'email_verification'
      }
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
