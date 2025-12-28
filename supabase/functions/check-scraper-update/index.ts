import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateRequest {
  secret_key: string;
  current_hash?: string;
  current_version?: string;
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

    const { secret_key, current_hash, current_version } = await req.json() as UpdateRequest;

    if (!secret_key) {
      return new Response(
        JSON.stringify({ error: "Missing secret_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[check-scraper-update] Checking for updates. Current hash: ${current_hash}, version: ${current_version}`);

    // Validate secret key and get settings
    const { data: settings, error: settingsError } = await supabase
      .from("payment_provider_settings")
      .select("*")
      .eq("provider", "vps_scraper")
      .eq("webhook_secret_encrypted", secret_key)
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError || !settings) {
      console.log(`[check-scraper-update] Invalid or inactive secret key`);
      return new Response(
        JSON.stringify({ error: "Invalid or inactive secret key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current version from database
    const { data: currentVersionData, error: versionError } = await supabase
      .from("scraper_versions")
      .select("*")
      .eq("user_id", settings.user_id)
      .eq("is_current", true)
      .maybeSingle();

    if (versionError) {
      console.error(`[check-scraper-update] Error fetching version:`, versionError);
      return new Response(
        JSON.stringify({ error: "Error fetching version info" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no version in database yet
    if (!currentVersionData) {
      console.log(`[check-scraper-update] No version in database yet`);
      return new Response(
        JSON.stringify({
          update_available: false,
          message: "No managed version available yet",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if update is needed
    const updateAvailable = 
      (current_hash && current_hash !== currentVersionData.content_hash) ||
      (current_version && current_version !== currentVersionData.version_number) ||
      (!current_hash && !current_version);

    if (!updateAvailable) {
      console.log(`[check-scraper-update] Already up to date (v${currentVersionData.version_number})`);
      return new Response(
        JSON.stringify({
          update_available: false,
          current_version: currentVersionData.version_number,
          message: "Already up to date",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return update info
    console.log(`[check-scraper-update] Update available: v${currentVersionData.version_number}`);
    return new Response(
      JSON.stringify({
        update_available: true,
        version: currentVersionData.version_number,
        content_hash: currentVersionData.content_hash,
        changelog: currentVersionData.changelog,
        file_size_bytes: currentVersionData.file_size_bytes,
        line_count: currentVersionData.line_count,
        content: currentVersionData.content,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[check-scraper-update] Error:`, err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
