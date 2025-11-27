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
      throw new Error('Only super admins can delete users')
    }

    const { user_id } = await req.json()

    if (!user_id) {
      throw new Error('user_id is required')
    }

    // Prevent super admin from deleting themselves
    if (user_id === caller.id) {
      throw new Error('Cannot delete your own account')
    }

    // Delete user via admin API (will cascade delete profiles and related data)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user_id)

    if (deleteError) throw deleteError

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User deleted successfully' 
      }),
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
