import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { secret_key, action } = await req.json();
    
    console.log("[windows-balance-command] Received request:", { action, hasSecretKey: !!secret_key });

    if (!secret_key) {
      return new Response(
        JSON.stringify({ error: "Missing secret_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate secret key and get active session
    const { data: providerSettings, error: settingsError } = await supabase
      .from("payment_provider_settings")
      .select("id, user_id, webhook_secret_encrypted")
      .eq("provider", "vps_scraper")
      .eq("webhook_secret_encrypted", secret_key)
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError || !providerSettings) {
      console.error("[windows-balance-command] Invalid secret key");
      return new Response(
        JSON.stringify({ error: "Invalid secret key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = providerSettings.user_id;
    console.log("[windows-balance-command] Validated user:", userId);

    // Get the active balance check session for this user
    const { data: session, error: sessionError } = await supabase
      .from("windows_balance_check_sessions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["grab_initial", "checking_loop"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error("[windows-balance-command] Session query error:", sessionError);
    }

    if (action === "poll") {
      // Windows script is polling for commands
      if (!session) {
        return new Response(
          JSON.stringify({ command: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[windows-balance-command] Returning command:", session.last_command);

      return new Response(
        JSON.stringify({
          command: session.last_command,
          session_id: session.id,
          expected_amount: session.expected_amount,
          initial_balance: session.initial_balance,
          max_checks: session.max_checks,
          data: session.command_data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "clear") {
      // Clear command after processing
      if (session) {
        await supabase
          .from("windows_balance_check_sessions")
          .update({ last_command: null })
          .eq("id", session.id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : "Unknown error";
    console.error("[windows-balance-command] Error:", err);
    return new Response(
      JSON.stringify({ error: err }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
