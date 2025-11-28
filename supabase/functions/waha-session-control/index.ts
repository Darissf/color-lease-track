import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionControlRequest {
  action: 'start' | 'stop' | 'restart' | 'logout' | 'get-qr' | 'status';
  sessionName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const requestData: SessionControlRequest = await req.json();
    const { action, sessionName } = requestData;

    // Fetch WAHA settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('whatsapp_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      throw new Error("WAHA not configured");
    }

    const wahaBaseUrl = settings.waha_api_url;
    const apiKey = settings.waha_api_key;

    let endpoint = '';
    let method = 'GET';
    let body = null;

    switch (action) {
      case 'get-qr':
        endpoint = `/api/${sessionName}/auth/qr`;
        break;
      case 'status':
        endpoint = `/api/sessions/${sessionName}`;
        break;
      case 'start':
        endpoint = `/api/sessions/${sessionName}/start`;
        method = 'POST';
        break;
      case 'stop':
        endpoint = `/api/sessions/${sessionName}/stop`;
        method = 'POST';
        break;
      case 'restart':
        endpoint = `/api/sessions/${sessionName}/restart`;
        method = 'POST';
        break;
      case 'logout':
        endpoint = `/api/${sessionName}/logout`;
        method = 'POST';
        break;
      default:
        throw new Error("Invalid action");
    }

    const wahaResponse = await fetch(`${wahaBaseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body,
    });

    // Special handling for QR code image response
    if (action === 'get-qr') {
      if (!wahaResponse.ok) {
        const errorText = await wahaResponse.text().catch(() => '');
        throw new Error(errorText || `WAHA API Error: ${wahaResponse.status}`);
      }

      const buffer = await wahaResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const qrDataUrl = `data:image/png;base64,${base64}`;

      return new Response(
        JSON.stringify({ success: true, qrCode: qrDataUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wahaData = await wahaResponse.json();

    if (!wahaResponse.ok) {
      throw new Error(wahaData.message || `WAHA API Error: ${wahaResponse.status}`);
    }

    return new Response(
      JSON.stringify(wahaData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in waha-session-control:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
