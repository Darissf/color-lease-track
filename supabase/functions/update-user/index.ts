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
      throw new Error('Only super admins can update users')
    }

    const { user_id, email, full_name, username, nomor_telepon, role, new_password, force_verify_email, is_suspended, send_password_email } = await req.json()

    if (!user_id) {
      throw new Error('user_id is required')
    }

    // Prevent super admin from downgrading their own role
    if (user_id === caller.id && role !== 'super_admin') {
      throw new Error('Cannot change your own super admin role')
    }

    // Get current user data
    const { data: currentProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    // Reset password if provided
    if (new_password) {
      const { error: passwordError } = await supabaseClient.auth.admin.updateUserById(
        user_id,
        { password: new_password }
      )
      if (passwordError) throw passwordError

      // Send password via email if requested
      if (send_password_email && email) {
        await supabaseClient.functions.invoke('send-email', {
          body: {
            to: email,
            subject: 'Password Baru Anda',
            html: `
              <h2>Password Baru</h2>
              <p>Password Anda telah direset oleh admin.</p>
              <p><strong>Password baru:</strong> ${new_password}</p>
              <p>Silakan login dengan password baru ini dan ubah password Anda segera.</p>
            `,
          }
        })
      }
    }

    // Force verify email if requested
    if (force_verify_email) {
      const { error: verifyError } = await supabaseClient.auth.admin.updateUserById(
        user_id,
        { email_confirm: true }
      )
      if (verifyError) throw verifyError

      // Update profiles table
      await supabaseClient
        .from('profiles')
        .update({ 
          email_verified: true, 
          temp_email: false 
        })
        .eq('id', user_id)
    }

    // Update email in auth if changed
    if (email && currentProfile) {
      const { data: authUser } = await supabaseClient.auth.admin.getUserById(user_id)
      
      if (authUser.user && authUser.user.email !== email) {
        const { error: emailError } = await supabaseClient.auth.admin.updateUserById(
          user_id,
          { email }
        )
        if (emailError) throw emailError
      }
    }

    // Update profile
    const profileUpdates: any = {}
    if (full_name !== undefined) profileUpdates.full_name = full_name
    if (username !== undefined) profileUpdates.username = username
    if (nomor_telepon !== undefined) profileUpdates.nomor_telepon = nomor_telepon
    if (is_suspended !== undefined) profileUpdates.is_suspended = is_suspended

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user_id)

      if (profileError) throw profileError
    }

    // Update role if provided and changed
    if (role) {
      const { data: currentRole } = await supabaseClient
        .from('user_roles')
        .select('id, role')
        .eq('user_id', user_id)
        .single()

      if (currentRole && currentRole.role !== role) {
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .update({ role })
          .eq('user_id', user_id)

        if (roleError) throw roleError
      } else if (!currentRole) {
        // Create role if doesn't exist
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .insert({
            user_id,
            role,
            created_by: caller.id
          })

        if (roleError) throw roleError
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User updated successfully' 
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
