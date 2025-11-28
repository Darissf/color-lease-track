import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple encryption/decryption using base64 encoding
// For production, consider using a more robust encryption method
const encryptPassword = (password: string): string => {
  return btoa(password);
};

const decryptPassword = (encrypted: string): string => {
  return atob(encrypted);
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
        const decryptedData = data?.map(cred => ({
          ...cred,
          password: decryptPassword(cred.password_encrypted)
        }));

        return new Response(
          JSON.stringify({ success: true, data: decryptedData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'save': {
        // Encrypt password before saving
        const encryptedCredentials = {
          ...credentials,
          password_encrypted: encryptPassword(credentials.password),
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

        const updateData: any = { ...credentials, updated_at: new Date().toISOString() };
        
        // Encrypt password if provided
        if (credentials.password) {
          updateData.password_encrypted = encryptPassword(credentials.password);
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