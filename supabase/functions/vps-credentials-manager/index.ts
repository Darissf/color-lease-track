import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-GCM encryption using Web Crypto API
const getEncryptionKey = async (): Promise<CryptoKey> => {
  const keyString = Deno.env.get('VPS_ENCRYPTION_KEY');
  
  if (!keyString) {
    // Fallback: use a derived key from service role key (not ideal but better than base64)
    const fallbackKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'default-key-please-set-vps-encryption-key';
    const keyMaterial = new TextEncoder().encode(fallbackKey.substring(0, 32).padEnd(32, '0'));
    return await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  // Use the provided encryption key (should be 32 bytes / 256 bits)
  const keyMaterial = new TextEncoder().encode(keyString.substring(0, 32).padEnd(32, '0'));
  return await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptPassword = async (password: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const encodedPassword = new TextEncoder().encode(password);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedPassword
    );
    
    // Combine IV and encrypted data, then base64 encode
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Mark as AES encrypted with prefix
    return 'aes:' + btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt password');
  }
};

const decryptPassword = async (encrypted: string): Promise<string> => {
  try {
    // Check if it's legacy base64 encoded (no prefix)
    if (!encrypted.startsWith('aes:')) {
      // Legacy base64 decoding for backwards compatibility
      try {
        return atob(encrypted);
      } catch {
        return encrypted; // Return as-is if not base64
      }
    }
    
    // AES-GCM decryption
    const key = await getEncryptionKey();
    const encryptedData = encrypted.substring(4); // Remove 'aes:' prefix
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt password');
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, credentials, id } = await req.json();

    switch (action) {
      case 'list': {
        const { data, error } = await supabaseClient
          .from('vps_credentials')
          .select('*')
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Decrypt passwords for display
        const decryptedData = await Promise.all(
          (data || []).map(async (cred) => ({
            ...cred,
            password: await decryptPassword(cred.password_encrypted)
          }))
        );

        return new Response(
          JSON.stringify({ success: true, data: decryptedData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'save': {
        // Encrypt password before saving with AES-GCM
        const encryptedPassword = await encryptPassword(credentials.password);
        const encryptedCredentials = {
          ...credentials,
          password_encrypted: encryptedPassword,
          user_id: user.id,
        };
        delete encryptedCredentials.password;

        // If setting as default, unset other defaults
        if (credentials.is_default) {
          await supabaseClient
            .from('vps_credentials')
            .update({ is_default: false })
            .eq('user_id', user.id);
        }

        const { data, error } = await supabaseClient
          .from('vps_credentials')
          .insert(encryptedCredentials)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!id) throw new Error('ID required for update');

        const updateData: Record<string, unknown> = { ...credentials, updated_at: new Date().toISOString() };
        
        // Encrypt password if provided with AES-GCM
        if (credentials.password) {
          updateData.password_encrypted = await encryptPassword(credentials.password);
          delete updateData.password;
        }

        // If setting as default, unset other defaults
        if (credentials.is_default) {
          await supabaseClient
            .from('vps_credentials')
            .update({ is_default: false })
            .eq('user_id', user.id)
            .neq('id', id);
        }

        const { data, error } = await supabaseClient
          .from('vps_credentials')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!id) throw new Error('ID required for delete');

        const { error } = await supabaseClient
          .from('vps_credentials')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'set-default': {
        if (!id) throw new Error('ID required');

        // Unset all defaults
        await supabaseClient
          .from('vps_credentials')
          .update({ is_default: false })
          .eq('user_id', user.id);

        // Set this one as default
        const { error } = await supabaseClient
          .from('vps_credentials')
          .update({ is_default: true })
          .eq('id', id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'migrate-encryption': {
        // Migration action to re-encrypt legacy base64 passwords with AES-GCM
        const { data, error } = await supabaseClient
          .from('vps_credentials')
          .select('id, password_encrypted')
          .eq('user_id', user.id);

        if (error) throw error;

        let migratedCount = 0;
        for (const cred of data || []) {
          // Skip already encrypted passwords
          if (cred.password_encrypted.startsWith('aes:')) continue;
          
          // Decrypt legacy and re-encrypt with AES
          const decrypted = await decryptPassword(cred.password_encrypted);
          const reEncrypted = await encryptPassword(decrypted);
          
          await supabaseClient
            .from('vps_credentials')
            .update({ password_encrypted: reEncrypted })
            .eq('id', cred.id);
          
          migratedCount++;
        }

        return new Response(
          JSON.stringify({ success: true, migratedCount }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('VPS Credentials Manager Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
