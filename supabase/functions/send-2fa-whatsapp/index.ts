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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('User ID required')
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('nomor_telepon, full_name, two_factor_enabled')
      .eq('id', userId)
      .single()

    if (!profile || !profile.two_factor_enabled || !profile.nomor_telepon) {
      throw new Error('2FA not enabled or phone not configured')
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Save code
    await supabaseClient
      .from('two_factor_codes')
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt.toISOString()
      })

    // Send via WhatsApp
    const message = `🔐 *KODE VERIFIKASI 2FA*\n\nHalo ${profile.full_name || 'User'},\n\nKode verifikasi login Anda:\n\n*${code}*\n\nKode ini berlaku selama 5 menit.\n\nJika Anda tidak mencoba login, abaikan pesan ini.`

    await supabaseClient.functions.invoke('send-whatsapp', {
      body: {
        phone: profile.nomor_telepon,
        message,
        notificationType: 'manual'
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
