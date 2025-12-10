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
      throw new Error('Only super admins can register users')
    }

    const { email, password, full_name, username, nomor_telepon, role } = await req.json()

    if (!password || !full_name || !role) {
      throw new Error('Missing required fields: password, full_name, role')
    }

    if (!email && !nomor_telepon) {
      throw new Error('Email or phone number required')
    }

    // Generate temp email if email not provided
    const finalEmail = email || `noemail_${nomor_telepon}@temp.local`
    const isTempEmail = !email

    // Create user in auth
    const { data: newUser, error: userError } = await supabaseClient.auth.admin.createUser({
      email: finalEmail,
      password,
      email_confirm: !isTempEmail,
      user_metadata: {
        full_name,
        username,
        nomor_telepon,
        temp_email: isTempEmail
      }
    })

    if (userError) throw userError

    // Create profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name,
        username,
        nomor_telepon,
        email_verified: !isTempEmail,
        temp_email: isTempEmail
      })

    if (profileError) throw profileError

    // Assign role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role,
        created_by: caller.id
      })

    if (roleError) throw roleError

    // For 'user' role, try to link to client_group by phone number
    let linkedClientGroup = null
    if (role === 'user' && nomor_telepon) {
      // Clean the phone number for matching
      const cleanedPhone = nomor_telepon.replace(/\D/g, '')
      
      // Search for client group with matching phone number in phone_numbers JSONB array
      const { data: clientGroups, error: clientError } = await supabaseClient
        .from('client_groups')
        .select('id, nama, nomor_telepon, phone_numbers')
        .is('linked_user_id', null) // Only unlinked clients

      if (!clientError && clientGroups) {
        // Find matching client group by phone number
        for (const clientGroup of clientGroups) {
          const phoneNumbers = clientGroup.phone_numbers || []
          const nomor_utama = clientGroup.nomor_telepon?.replace(/\D/g, '') || ''
          
          // Check main phone or phone_numbers array
          let matched = cleanedPhone === nomor_utama || 
            cleanedPhone.endsWith(nomor_utama) || 
            nomor_utama.endsWith(cleanedPhone)
          
          if (!matched && Array.isArray(phoneNumbers)) {
            for (const phoneEntry of phoneNumbers) {
              const phoneNum = (phoneEntry.nomor || '').replace(/\D/g, '')
              if (cleanedPhone === phoneNum || cleanedPhone.endsWith(phoneNum) || phoneNum.endsWith(cleanedPhone)) {
                matched = true
                break
              }
            }
          }

          if (matched) {
            // Link this client group to the new user
            const { error: linkError } = await supabaseClient
              .from('client_groups')
              .update({ linked_user_id: newUser.user.id })
              .eq('id', clientGroup.id)

            if (!linkError) {
              linkedClientGroup = { id: clientGroup.id, nama: clientGroup.nama }
              console.log(`Linked user ${newUser.user.id} to client group ${clientGroup.nama}`)
            }
            break
          }
        }
      }

      // Send credentials via WhatsApp if phone number is provided
      try {
        const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || 'https://sewascaffoldingbali.com'
        
        const message = `🎉 *Selamat Datang di Sewa Scaffolding Bali!*

Halo *${full_name}*,

Akun Anda telah berhasil dibuat.

📧 *Login dengan:* ${finalEmail}
🔑 *Password:* ${password}

🔗 Silakan login di:
${appUrl}/vip/login

${linkedClientGroup ? `\n✅ Akun Anda terhubung dengan: *${linkedClientGroup.nama}*\n` : ''}
⚠️ Segera ganti password setelah login pertama.

Terima kasih! 🙏`

        // Try to send via WhatsApp
        const { error: waError } = await supabaseClient.functions.invoke('send-whatsapp-unified', {
          body: {
            phoneNumber: nomor_telepon,
            message: message,
            notificationType: 'welcome'
          }
        })

        if (waError) {
          console.error('Failed to send WhatsApp notification:', waError)
        } else {
          console.log('WhatsApp credentials sent successfully')
        }
      } catch (waErr) {
        console.error('Error sending WhatsApp:', waErr)
        // Don't fail the registration if WhatsApp fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUser.user.id,
        linked_client_group: linkedClientGroup,
        message: linkedClientGroup 
          ? `User registered and linked to ${linkedClientGroup.nama}` 
          : 'User registered successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Register user error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
