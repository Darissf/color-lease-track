import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple encryption using XOR with key (for demo - in production use proper AES-256)
function encrypt(text: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const textBytes = new TextEncoder().encode(text);
  const encrypted = new Uint8Array(textBytes.length);
  
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return btoa(String.fromCharCode(...encrypted));
}

function decrypt(encrypted: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const decrypted = new Uint8Array(encryptedBytes.length);
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return new TextDecoder().decode(decrypted);
}

interface CredentialsPayload {
  action: 'create' | 'update' | 'delete' | 'get' | 'get_for_vps';
  vps_host?: string;
  vps_port?: number;
  vps_username?: string;
  vps_password?: string;
  klikbca_user_id?: string;
  klikbca_pin?: string;
  default_interval_minutes?: number;
  is_active?: boolean;
  allowed_ip?: string;
  webhook_secret?: string; // For VPS fetch
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    
    // Create client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload: CredentialsPayload = await req.json();
    const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!.substring(0, 32);

    // Special case: VPS fetching credentials (no JWT needed, uses webhook_secret)
    if (payload.action === 'get_for_vps' && payload.webhook_secret) {
      const { data: cred, error } = await supabase
        .from('bca_credentials')
        .select('klikbca_user_id_encrypted, klikbca_pin_encrypted, default_interval_minutes, burst_interval_seconds, burst_duration_seconds, is_active')
        .eq('webhook_secret', payload.webhook_secret)
        .eq('is_active', true)
        .single();

      if (error || !cred) {
        return new Response(
          JSON.stringify({ error: 'Invalid webhook secret or inactive' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get pending burst requests
      const { data: burstRequests } = await supabase
        .rpc('get_pending_burst_requests');

      return new Response(
        JSON.stringify({
          klikbca_user_id: decrypt(cred.klikbca_user_id_encrypted, encryptionKey),
          klikbca_pin: decrypt(cred.klikbca_pin_encrypted, encryptionKey),
          default_interval_minutes: cred.default_interval_minutes,
          burst_interval_seconds: cred.burst_interval_seconds,
          burst_duration_seconds: cred.burst_duration_seconds,
          is_active: cred.is_active,
          burst_mode: burstRequests && burstRequests.length > 0,
          burst_requests: burstRequests || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For other actions, require JWT auth
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if super admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (payload.action) {
      case 'create': {
        if (!payload.vps_host || !payload.vps_username || !payload.vps_password || 
            !payload.klikbca_user_id || !payload.klikbca_pin) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('bca_credentials')
          .insert({
            user_id: user.id,
            vps_host: payload.vps_host,
            vps_port: payload.vps_port || 22,
            vps_username: payload.vps_username,
            vps_password_encrypted: encrypt(payload.vps_password, encryptionKey),
            klikbca_user_id_encrypted: encrypt(payload.klikbca_user_id, encryptionKey),
            klikbca_pin_encrypted: encrypt(payload.klikbca_pin, encryptionKey),
            default_interval_minutes: payload.default_interval_minutes || 15,
            allowed_ip: payload.allowed_ip,
            status: 'pending'
          })
          .select('id, webhook_secret')
          .single();

        if (error) {
          // If duplicate, update instead
          if (error.code === '23505') {
            const { data: updateData, error: updateError } = await supabase
              .from('bca_credentials')
              .update({
                vps_host: payload.vps_host,
                vps_port: payload.vps_port || 22,
                vps_username: payload.vps_username,
                vps_password_encrypted: encrypt(payload.vps_password, encryptionKey),
                klikbca_user_id_encrypted: encrypt(payload.klikbca_user_id, encryptionKey),
                klikbca_pin_encrypted: encrypt(payload.klikbca_pin, encryptionKey),
                default_interval_minutes: payload.default_interval_minutes || 15,
                allowed_ip: payload.allowed_ip,
                status: 'pending'
              })
              .eq('user_id', user.id)
              .select('id, webhook_secret')
              .single();

            if (updateError) throw updateError;
            return new Response(
              JSON.stringify({ success: true, ...updateData, updated: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true, ...data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const updateData: Record<string, unknown> = {};
        
        if (payload.vps_host) updateData.vps_host = payload.vps_host;
        if (payload.vps_port) updateData.vps_port = payload.vps_port;
        if (payload.vps_username) updateData.vps_username = payload.vps_username;
        if (payload.vps_password) updateData.vps_password_encrypted = encrypt(payload.vps_password, encryptionKey);
        if (payload.klikbca_user_id) updateData.klikbca_user_id_encrypted = encrypt(payload.klikbca_user_id, encryptionKey);
        if (payload.klikbca_pin) updateData.klikbca_pin_encrypted = encrypt(payload.klikbca_pin, encryptionKey);
        if (payload.default_interval_minutes) updateData.default_interval_minutes = payload.default_interval_minutes;
        if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
        if (payload.allowed_ip !== undefined) updateData.allowed_ip = payload.allowed_ip;

        const { data, error } = await supabase
          .from('bca_credentials')
          .update(updateData)
          .eq('user_id', user.id)
          .select('id, webhook_secret, is_active, status')
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, ...data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { error } = await supabase
          .from('bca_credentials')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, deleted: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        const { data, error } = await supabase
          .from('bca_credentials')
          .select('id, vps_host, vps_port, vps_username, webhook_secret, allowed_ip, default_interval_minutes, burst_interval_seconds, burst_duration_seconds, is_active, status, last_sync_at, error_message, error_count, created_at, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, credentials: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: unknown) {
    console.error('[BCA Credentials] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
