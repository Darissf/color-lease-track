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

    const { data: { user: caller } } = await supabaseClient.auth.getUser(token)
    if (!caller) throw new Error('Unauthorized')

    // Check if caller is super admin
    const { data: callerRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single()

    if (!callerRole || callerRole.role !== 'super_admin') {
      throw new Error('Only super admins can generate temporary access codes')
    }

    const { userId, expiryHours = 24 } = await req.json()

    // Generate random code
    const code = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

    // Save code
    const { data: tempCode, error } = await supabaseClient
      .from('temporary_access_codes')
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt.toISOString(),
        created_by: caller.id
      })
      .select()
      .single()

    if (error) throw error

    // Get user info for WhatsApp message
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('nomor_telepon, full_name')
      .eq('id', userId)
      .single()

    if (profile?.nomor_telepon) {
      // Send temp code via WhatsApp
      const message = `🔑 *KODE AKSES SEMENTARA*\n\nHalo ${profile.full_name || 'User'},\n\nBerikut kode akses sementara Anda:\n\n*${code}*\n\nKode ini berlaku hingga: ${expiresAt.toLocaleString('id-ID')}\n\n⚠️ Anda akan diminta mengganti password setelah login pertama kali.\n\nGunakan kode ini untuk login di halaman login aplikasi.`

      await supabaseClient.functions.invoke('send-whatsapp', {
        body: {
          phone: profile.nomor_telepon,
          message,
          notificationType: 'manual'
        }
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        code,
        expiresAt: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
