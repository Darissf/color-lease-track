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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the caller is a super admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller } } = await supabaseClient.auth.getUser(token)
    
    if (!caller) {
      throw new Error('Unauthorized')
    }

    // Check if caller is super admin
    const { data: callerRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single()

    if (!callerRole || callerRole.role !== 'super_admin') {
      throw new Error('Only super admins can view users')
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, username, nomor_telepon, created_at')
      .order('created_at', { ascending: false })

    if (profilesError) throw profilesError

    // Fetch roles and emails for each user
    const usersWithData = await Promise.all(
      (profiles || []).map(async (profile) => {
        // Get role
        const { data: roleData } = await supabaseClient
          .from('user_roles')
          .select('id, role')
          .eq('user_id', profile.id)
          .single()

        // Get email from auth using service role
        const { data: authData } = await supabaseClient.auth.admin.getUserById(profile.id)

        return {
          ...profile,
          email: authData.user?.email || '',
          role: roleData?.role || null,
          role_id: roleData?.id || null,
        }
      })
    )

    return new Response(
      JSON.stringify({ users: usersWithData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
