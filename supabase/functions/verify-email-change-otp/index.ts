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

    const { otp, new_email } = await req.json()

    // Find valid token
    const { data: tokenData, error } = await supabaseClient
      .from('email_verification_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('token', otp)
      .eq('new_email', new_email)
      .eq('change_type', 'email_change')
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
    const { error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      {
        email: new_email,
        email_confirm: true
      }
    )

    if (updateAuthError) {
      console.error('Failed to update auth email:', updateAuthError)
      throw new Error('Failed to update email in authentication system')
    }

    // Update profile
    const { error: updateProfileError } = await supabaseClient
      .from('profiles')
      .update({
        email_verified: true,
        temp_email: false
      })
      .eq('id', user.id)

    if (updateProfileError) {
      console.error('Failed to update profile:', updateProfileError)
    }

    console.log(`Email successfully changed from ${tokenData.email} to ${new_email} for user ${user.id}`)

    // Send confirmation email to new address
    await supabaseClient.functions.invoke('send-email', {
      body: {
        to: new_email,
        subject: 'Email Berhasil Diubah',
        template_type: 'email_changed_confirmation',
        variables: {
          old_email: tokenData.email,
          new_email: new_email
        }
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email successfully updated'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in verify-email-change-otp:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
