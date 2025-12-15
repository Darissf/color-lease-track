import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to decode JWT and extract user ID
function getUserIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload.sub || null
  } catch {
    return null
  }
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

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Extract user ID from JWT (Supabase gateway already verified the signature)
    const userId = getUserIdFromJwt(token)
    if (!userId) {
      throw new Error('Invalid token')
    }
    
    // Verify user exists using admin API (bypasses session validation)
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.admin.getUserById(userId)
    
    if (userError || !caller) {
      console.error('User verification failed:', userError?.message)
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

    // Use optimized database function to get users with roles in single query
    const { data: usersWithRoles, error: usersError } = await supabaseClient
      .rpc('get_users_with_roles')

    if (usersError) {
      console.error('Error fetching users with roles:', usersError)
      throw usersError
    }

    // Get all user IDs for batch auth lookup
    const userIds = (usersWithRoles || []).map((u: any) => u.id)
    
    // Batch fetch auth data - single call instead of N calls
    const { data: authData, error: authError } = await supabaseClient.auth.admin.listUsers({
      perPage: 1000 // Fetch all users in one call
    })

    if (authError) {
      console.error('Error fetching auth users:', authError)
      throw authError
    }

    // Create lookup map for O(1) access
    const authUsersMap = new Map(
      (authData?.users || []).map(user => [user.id, user])
    )

    // Merge data efficiently using the map
    const usersWithData = (usersWithRoles || []).map((user: any) => {
      const authUser = authUsersMap.get(user.id)
      return {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        nomor_telepon: user.nomor_telepon,
        created_at: user.created_at,
        email_verified: user.email_verified,
        temp_email: user.temp_email,
        is_suspended: user.is_suspended,
        email: authUser?.email || '',
        role: user.role,
        role_id: user.role_id,
        last_sign_in_at: authUser?.last_sign_in_at || null,
      }
    })

    console.log(`Successfully fetched ${usersWithData.length} users with optimized query`)

    return new Response(
      JSON.stringify({ users: usersWithData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('get-users error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
