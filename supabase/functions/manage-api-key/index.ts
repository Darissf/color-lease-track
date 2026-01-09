import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash function for API key storage
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a secure random API key
function generateApiKey(): string {
  const randomBytes = new Uint8Array(24);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `doc_api_${hex}`;
}

// Create key preview (first 12 and last 4 chars visible)
function createKeyPreview(key: string): string {
  if (key.length <= 20) return key;
  return `${key.substring(0, 12)}...${key.substring(key.length - 4)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client with user's token for auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const method = req.method;

    // GET - Retrieve current API key info (not the actual key, just metadata)
    if (method === 'GET') {
      const { data: apiKey, error } = await supabase
        .from('api_keys')
        .select('id, key_name, key_preview, created_at, last_used_at, is_active')
        .eq('user_id', user.id)
        .eq('key_name', 'Document API Key')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching API key:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to fetch API key" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          has_key: !!apiKey,
          api_key: apiKey || null 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Generate new API key
    if (method === 'POST') {
      // Check if user already has an active key
      const { data: existingKey } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .eq('key_name', 'Document API Key')
        .eq('is_active', true)
        .single();

      if (existingKey) {
        return new Response(
          JSON.stringify({ success: false, error: "API key already exists. Use PUT to regenerate." }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate new key
      const newKey = generateApiKey();
      const keyHash = await hashApiKey(newKey);
      const keyPreview = createKeyPreview(newKey);

      // Store in database
      const { data: insertedKey, error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          key_name: 'Document API Key',
          key_hash: keyHash,
          key_preview: keyPreview,
          is_active: true,
        })
        .select('id, key_name, key_preview, created_at')
        .single();

      if (insertError) {
        console.error("Error creating API key:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create API key" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return the FULL key (only shown once!)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "API key created successfully. Save this key - it will only be shown once!",
          api_key: {
            ...insertedKey,
            full_key: newKey, // Only returned on creation!
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT - Regenerate API key
    if (method === 'PUT') {
      // Deactivate existing key
      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('key_name', 'Document API Key');

      // Generate new key
      const newKey = generateApiKey();
      const keyHash = await hashApiKey(newKey);
      const keyPreview = createKeyPreview(newKey);

      // Store new key
      const { data: insertedKey, error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          key_name: 'Document API Key',
          key_hash: keyHash,
          key_preview: keyPreview,
          is_active: true,
        })
        .select('id, key_name, key_preview, created_at')
        .single();

      if (insertError) {
        console.error("Error regenerating API key:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to regenerate API key" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "API key regenerated successfully. Save this key - it will only be shown once!",
          api_key: {
            ...insertedKey,
            full_key: newKey,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Revoke API key
    if (method === 'DELETE') {
      const { error: deleteError } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('key_name', 'Document API Key');

      if (deleteError) {
        console.error("Error revoking API key:", deleteError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to revoke API key" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "API key revoked successfully" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("[manage-api-key] Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
