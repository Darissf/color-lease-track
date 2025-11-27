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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { identifier } = await req.json()

    if (!identifier) {
      throw new Error('Identifier required (email, phone, or username)')
    }

    // If identifier contains @, it's an email - return directly
    if (identifier.includes('@')) {
      return new Response(
        JSON.stringify({ email: identifier }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if it's a phone number (contains only digits, +, -, spaces, parentheses)
    const isPhone = /^[0-9+\-\s()]+$/.test(identifier)
    
    let profile;

    if (isPhone) {
      // Normalize phone: remove spaces, dashes, etc
      const normalizedPhone = identifier.replace(/\D/g, '')

      // Find user by phone in profiles
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('nomor_telepon', normalizedPhone)
        .maybeSingle()

      if (error) throw error
      profile = data
    } else {
      // Assume it's a username - case insensitive lookup
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .ilike('username', identifier)
        .maybeSingle()

      if (error) throw error
      profile = data
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user email from auth.users
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(profile.id)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ email: user.email, userId: user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
