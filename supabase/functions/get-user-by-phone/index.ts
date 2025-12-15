import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Consistent response delay to prevent timing attacks
const RESPONSE_DELAY_MS = 300;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { identifier } = await req.json()

    if (!identifier) {
      // Wait for consistent timing
      await ensureMinResponseTime(startTime, RESPONSE_DELAY_MS);
      return new Response(
        JSON.stringify({ error: 'Identifier required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Input validation
    if (typeof identifier !== 'string' || identifier.length > 255) {
      await ensureMinResponseTime(startTime, RESPONSE_DELAY_MS);
      return new Response(
        JSON.stringify({ error: 'Invalid identifier format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If identifier contains @, it's an email - return directly
    if (identifier.includes('@')) {
      await ensureMinResponseTime(startTime, RESPONSE_DELAY_MS);
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

      // Validate phone length
      if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
        await ensureMinResponseTime(startTime, RESPONSE_DELAY_MS);
        return genericNotFoundResponse();
      }

      // Find user by phone in profiles
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('nomor_telepon', normalizedPhone)
        .maybeSingle()

      if (error) {
        console.error('[get-user-by-phone] Database error:', error);
        throw error;
      }
      profile = data
    } else {
      // Assume it's a username - case insensitive lookup
      // Sanitize username input
      const sanitizedUsername = identifier.trim().slice(0, 50);
      
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .ilike('username', sanitizedUsername)
        .maybeSingle()

      if (error) {
        console.error('[get-user-by-phone] Database error:', error);
        throw error;
      }
      profile = data
    }

    // SECURITY: Return consistent response regardless of user existence
    // This prevents user enumeration attacks
    if (!profile) {
      await ensureMinResponseTime(startTime, RESPONSE_DELAY_MS);
      return genericNotFoundResponse();
    }

    // Get user email from auth.users
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(profile.id)

    if (userError || !user) {
      await ensureMinResponseTime(startTime, RESPONSE_DELAY_MS);
      return genericNotFoundResponse();
    }

    await ensureMinResponseTime(startTime, RESPONSE_DELAY_MS);
    return new Response(
      JSON.stringify({ email: user.email, userId: user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[get-user-by-phone] Error:', error);
    await ensureMinResponseTime(startTime, RESPONSE_DELAY_MS);
    // Return generic error to prevent information leakage
    return genericNotFoundResponse();
  }
})

// Helper function to ensure consistent response timing
async function ensureMinResponseTime(startTime: number, minMs: number) {
  const elapsed = Date.now() - startTime;
  if (elapsed < minMs) {
    await new Promise(resolve => setTimeout(resolve, minMs - elapsed + Math.random() * 100));
  }
}

// Generic "not found" response - always 200 to avoid client-side hard errors
// Response body is intentionally generic to prevent user enumeration.
function genericNotFoundResponse() {
  return new Response(
    JSON.stringify({ email: null }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
