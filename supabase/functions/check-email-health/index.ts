import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailProvider {
  id: string;
  provider_name: string;
  api_key_encrypted: string;
  sender_email: string;
  sender_name: string;
  consecutive_errors: number;
  auto_disabled_at: string | null;
  is_active: boolean;
  health_status: string;
}

async function testProviderHealth(provider: EmailProvider): Promise<boolean> {
  try {
    console.log(`[health-check] Testing ${provider.provider_name}...`);
    
    // Perform lightweight health check based on provider type
    switch (provider.provider_name) {
      case 'resend':
        return await testResendHealth(provider);
      case 'brevo':
        return await testBrevoHealth(provider);
      case 'mailjet':
        return await testMailjetHealth(provider);
      case 'sendgrid':
        return await testSendGridHealth(provider);
      default:
        console.log(`[health-check] Unknown provider: ${provider.provider_name}`);
        return false;
    }
  } catch (error: any) {
    console.error(`[health-check] Error testing ${provider.provider_name}:`, error.message);
    return false;
  }
}

async function testResendHealth(provider: EmailProvider): Promise<boolean> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${provider.api_key_encrypted}`,
    },
  });
  return response.ok;
}

async function testBrevoHealth(provider: EmailProvider): Promise<boolean> {
  const response = await fetch("https://api.brevo.com/v3/account", {
    method: "GET",
    headers: {
      "api-key": provider.api_key_encrypted,
    },
  });
  return response.ok;
}

async function testMailjetHealth(provider: EmailProvider): Promise<boolean> {
  const [apiKey, secretKey] = provider.api_key_encrypted.includes(":") 
    ? provider.api_key_encrypted.split(":")
    : [provider.api_key_encrypted, ""];

  const response = await fetch("https://api.mailjet.com/v3/REST/contact", {
    method: "GET",
    headers: {
      Authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
    },
  });
  return response.ok;
}

async function testSendGridHealth(provider: EmailProvider): Promise<boolean> {
  const response = await fetch("https://api.sendgrid.com/v3/user/profile", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${provider.api_key_encrypted}`,
    },
  });
  return response.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    );

    console.log('[health-check] Starting email provider health check...');

    // Get all providers that are either auto-disabled or showing consecutive errors
    const { data: providers, error: fetchError } = await supabaseClient
      .from('email_providers')
      .select('*')
      .or('auto_disabled_at.not.is.null,consecutive_errors.gte.1');

    if (fetchError) {
      throw fetchError;
    }

    if (!providers || providers.length === 0) {
      console.log('[health-check] No providers need health check');
      return new Response(
        JSON.stringify({ message: 'No providers need health check', checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[health-check] Checking ${providers.length} providers...`);

    const results = await Promise.all(
      providers.map(async (provider: EmailProvider) => {
        const isHealthy = await testProviderHealth(provider);
        
        const updates: any = {
          health_status: isHealthy ? 'healthy' : 'unhealthy',
        };

        // Auto-recovery: Re-enable provider if it was auto-disabled and is now healthy
        if (provider.auto_disabled_at && isHealthy) {
          const disabledDuration = Date.now() - new Date(provider.auto_disabled_at).getTime();
          const thirtyMinutes = 30 * 60 * 1000;
          
          // Only re-enable if it's been at least 30 minutes since auto-disable
          if (disabledDuration >= thirtyMinutes) {
            updates.is_active = true;
            updates.auto_disabled_at = null;
            updates.consecutive_errors = 0;
            console.log(`[health-check] Auto-recovery: Re-enabling ${provider.provider_name}`);
          }
        }

        // Reset consecutive errors if healthy
        if (isHealthy && provider.consecutive_errors > 0) {
          updates.consecutive_errors = 0;
        }

        await supabaseClient
          .from('email_providers')
          .update(updates)
          .eq('id', provider.id);

        return {
          provider: provider.provider_name,
          healthy: isHealthy,
          recovered: provider.auto_disabled_at && isHealthy && updates.is_active,
        };
      })
    );

    const recovered = results.filter(r => r.recovered).length;
    const healthy = results.filter(r => r.healthy).length;

    console.log(`[health-check] Complete: ${healthy}/${providers.length} healthy, ${recovered} recovered`);

    return new Response(
      JSON.stringify({ 
        success: true,
        checked: providers.length,
        healthy,
        recovered,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[health-check] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
