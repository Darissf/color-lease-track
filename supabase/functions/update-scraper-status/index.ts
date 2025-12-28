import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusUpdate {
  secret_key: string;
  version: string;
  status: "success" | "failed";
  error_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { secret_key, version, status, error_message } = await req.json() as StatusUpdate;

    if (!secret_key || !version || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: secret_key, version, status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[update-scraper-status] Version: ${version}, Status: ${status}`);

    // Validate secret key
    const { data: settings, error: settingsError } = await supabase
      .from("payment_provider_settings")
      .select("*")
      .eq("provider", "vps_scraper")
      .eq("webhook_secret_encrypted", secret_key)
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError || !settings) {
      console.log(`[update-scraper-status] Invalid or inactive secret key`);
      return new Response(
        JSON.stringify({ error: "Invalid or inactive secret key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status === "success") {
      // Mark version as deployed
      const { error: updateError } = await supabase
        .from("scraper_versions")
        .update({
          deployed_to_vps: true,
          deployed_at: new Date().toISOString(),
        })
        .eq("user_id", settings.user_id)
        .eq("version_number", version);

      if (updateError) {
        console.error(`[update-scraper-status] Error updating version:`, updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update version status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update VPS settings with last update info
      await supabase
        .from("payment_provider_settings")
        .update({
          vps_last_scraper_version: version,
          vps_last_update_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      console.log(`[update-scraper-status] Successfully marked v${version} as deployed`);
    } else {
      // Log failure
      console.log(`[update-scraper-status] Update failed for v${version}: ${error_message}`);
      
      await supabase
        .from("payment_provider_settings")
        .update({
          vps_last_update_error: error_message,
          vps_last_update_error_at: new Date().toISOString(),
        })
        .eq("id", settings.id);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Update status recorded: ${status}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[update-scraper-status] Error:`, err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
