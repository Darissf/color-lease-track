import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      authHeader ? Deno.env.get("SUPABASE_ANON_KEY") ?? "" : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id || null;
    }

    console.log("Checking WhatsApp health...", { userId });

    // Get all active settings (or specific user if authenticated)
    const settingsQuery = supabaseClient
      .from('whatsapp_settings')
      .select('*');
    
    if (userId) {
      // When manually testing (authenticated), check user's settings regardless of is_active status
      settingsQuery.eq('user_id', userId);
    } else {
      // When running scheduled check, only check active configurations
      settingsQuery.eq('is_active', true);
    }

    const { data: settingsList, error: settingsError } = await settingsQuery;

    if (settingsError || !settingsList?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No active WhatsApp configurations found",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const settings of settingsList) {
      try {
        const startTime = Date.now();
        
        // Check WAHA status
        const statusUrl = `${settings.waha_api_url}/api/sessions/${settings.waha_session_name}`;
        const statusResponse = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'X-Api-Key': settings.waha_api_key,
          },
        });

        const responseTime = Date.now() - startTime;
        const statusData = await statusResponse.json();

        const isHealthy = statusResponse.ok && 
                          (statusData.status === 'WORKING' || statusData.status === 'SCAN_QR_CODE');

        // Log health check
        await supabaseClient.from('whatsapp_health_checks').insert({
          user_id: settings.user_id,
          check_type: userId ? 'manual' : 'scheduled',
          status: isHealthy ? 'healthy' : 'unhealthy',
          response_time_ms: responseTime,
          waha_version: statusData.version || null,
          session_status: statusData.status || null,
          error_message: isHealthy ? null : JSON.stringify(statusData),
        });

        // Update settings
        await supabaseClient
          .from('whatsapp_settings')
          .update({
            connection_status: isHealthy ? 'connected' : 'disconnected',
            last_connection_test: new Date().toISOString(),
            error_message: isHealthy ? null : JSON.stringify(statusData),
          })
          .eq('id', settings.id);

        results.push({
          user_id: settings.user_id,
          healthy: isHealthy,
          response_time_ms: responseTime,
          status: statusData.status,
          version: statusData.version,
        });

      } catch (error) {
        console.error(`Health check failed for user ${settings.user_id}:`, error);
        
        await supabaseClient.from('whatsapp_health_checks').insert({
          user_id: settings.user_id,
          check_type: userId ? 'manual' : 'scheduled',
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });

        await supabaseClient
          .from('whatsapp_settings')
          .update({
            connection_status: 'error',
            last_connection_test: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', settings.id);

        results.push({
          user_id: settings.user_id,
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in health check:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
