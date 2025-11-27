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

    const { new_email } = await req.json()

    // Validate old email is not a temp email
    const currentEmail = user.email
    if (!currentEmail || currentEmail.includes('@temp.local')) {
      throw new Error('Please verify your email first before changing it')
    }

    // Validate new email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(new_email)) {
      throw new Error('Invalid email format')
    }

    // Check if new email is different from current
    if (new_email.toLowerCase() === currentEmail.toLowerCase()) {
      throw new Error('New email must be different from current email')
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Set expiry to 1 hour from now
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    // Save OTP to database
    const { error: insertError } = await supabaseClient
      .from('email_verification_tokens')
      .insert({
        user_id: user.id,
        email: currentEmail, // Old email where OTP will be sent
        new_email: new_email, // New email to change to
        token: otp,
        expires_at: expiresAt.toISOString(),
        verified: false,
        change_type: 'email_change'
      })

    if (insertError) throw insertError

    // Send OTP to OLD email via send-email function
    const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      body: {
        to: currentEmail,
        subject: 'Kode Verifikasi Perubahan Email',
        template_type: 'email_change_otp',
        variables: {
          otp: otp,
          new_email: new_email,
          valid_until: expiresAt.toLocaleString('id-ID', { 
            dateStyle: 'medium', 
            timeStyle: 'short',
            timeZone: 'Asia/Jakarta'
          })
        }
      }
    })

    if (emailError) {
      console.error('Failed to send OTP email:', emailError)
      throw new Error('Failed to send verification email')
    }

    console.log(`OTP sent to ${currentEmail} for email change to ${new_email}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `OTP has been sent to ${currentEmail}`,
        expires_in_minutes: 60
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in send-email-change-otp:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
