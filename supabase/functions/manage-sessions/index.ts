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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser(token)
    if (!user) throw new Error('Unauthorized')

    const { action, sessionId } = await req.json()

    if (action === 'create') {
      // Create new session
      const { deviceInfo, ipAddress, userAgent } = await req.json()
      
      const { data, error } = await supabaseClient
        .from('login_sessions')
        .insert({
          user_id: user.id,
          device_info: deviceInfo,
          ip_address: ipAddress,
          user_agent: userAgent
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, session: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'list') {
      // Get all active sessions
      const { data, error } = await supabaseClient
        .from('login_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('logged_out_at', null)
        .order('last_active', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, sessions: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'logout') {
      // Logout specific session
      const { error } = await supabaseClient
        .from('login_sessions')
        .update({ logged_out_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('user_id', user.id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'logout_all') {
      // Logout all sessions except current
      const { error } = await supabaseClient
        .from('login_sessions')
        .update({ logged_out_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('logged_out_at', null)
        .neq('id', sessionId)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
