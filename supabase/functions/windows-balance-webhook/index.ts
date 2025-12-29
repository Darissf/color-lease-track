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
    const body = await req.json();
    const { 
      secret_key, 
      action, 
      session_id,
      initial_balance, 
      current_balance, 
      check_count, 
      difference,
      error_message 
    } = body;
    
    console.log("[windows-balance-webhook] Received:", { action, session_id, initial_balance, current_balance, check_count });

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

    // Validate secret key
    const { data: providerSettings, error: settingsError } = await supabase
      .from("payment_provider_settings")
      .select("id, user_id, webhook_secret_encrypted")
      .eq("provider", "vps_scraper")
      .eq("webhook_secret_encrypted", secret_key)
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError || !providerSettings) {
      console.error("[windows-balance-webhook] Invalid secret key");
      return new Response(
        JSON.stringify({ error: "Invalid secret key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = providerSettings.user_id;
    console.log("[windows-balance-webhook] Validated user:", userId);

    // Get session
    let session;
    if (session_id) {
      const { data, error } = await supabase
        .from("windows_balance_check_sessions")
        .select("*")
        .eq("id", session_id)
        .single();
      
      if (error || !data) {
        console.error("[windows-balance-webhook] Session not found:", session_id);
        return new Response(
          JSON.stringify({ error: "Session not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      session = data;
    } else {
      // Get latest active session
      const { data, error } = await supabase
        .from("windows_balance_check_sessions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["grab_initial", "checking_loop"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) {
        console.error("[windows-balance-webhook] No active session found");
        return new Response(
          JSON.stringify({ error: "No active session" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      session = data;
    }

    // Handle different actions
    if (action === "initial_balance") {
      // Windows script grabbed initial balance - now ready
      console.log("[windows-balance-webhook] Saving initial balance:", initial_balance);
      
      const { error: updateError } = await supabase
        .from("windows_balance_check_sessions")
        .update({
          initial_balance: initial_balance,
          current_balance: initial_balance,
          status: "ready",
          last_command: null,
        })
        .eq("id", session.id);

      if (updateError) {
        console.error("[windows-balance-webhook] Failed to update session:", updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Initial balance saved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "progress") {
      // Windows script reporting check progress
      console.log("[windows-balance-webhook] Progress:", { check_count, current_balance, difference });
      
      const { error: updateError } = await supabase
        .from("windows_balance_check_sessions")
        .update({
          current_balance: current_balance,
          check_count: check_count,
        })
        .eq("id", session.id);

      if (updateError) {
        console.error("[windows-balance-webhook] Failed to update progress:", updateError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "matched") {
      // Payment matched!
      console.log("[windows-balance-webhook] PAYMENT MATCHED! Difference:", difference);
      
      // Update session
      await supabase
        .from("windows_balance_check_sessions")
        .update({
          current_balance: current_balance,
          check_count: check_count,
          status: "matched",
          matched_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          last_command: null,
        })
        .eq("id", session.id);

      // Update payment confirmation request if linked
      if (session.payment_request_id) {
        await supabase
          .from("payment_confirmation_requests")
          .update({
            status: "matched",
            matched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.payment_request_id);
        
        console.log("[windows-balance-webhook] Updated payment request:", session.payment_request_id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Payment matched!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "failed" || action === "timeout") {
      // Check loop completed without match or error
      console.log("[windows-balance-webhook] Failed/timeout:", { check_count, error_message });
      
      await supabase
        .from("windows_balance_check_sessions")
        .update({
          current_balance: current_balance,
          check_count: check_count || session.max_checks,
          status: "failed",
          ended_at: new Date().toISOString(),
          error_message: error_message || "No payment match found after all checks",
          last_command: null,
        })
        .eq("id", session.id);

      return new Response(
        JSON.stringify({ success: true, message: "Session marked as failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "error") {
      // Error during check
      console.error("[windows-balance-webhook] Error reported:", error_message);
      
      await supabase
        .from("windows_balance_check_sessions")
        .update({
          status: "error",
          ended_at: new Date().toISOString(),
          error_message: error_message,
          last_command: null,
        })
        .eq("id", session.id);

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
    console.error("[windows-balance-webhook] Error:", err);
    return new Response(
      JSON.stringify({ error: err }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
