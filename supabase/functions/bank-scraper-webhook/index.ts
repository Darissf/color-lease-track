import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-secret-key",
};

interface MutationPayload {
  date: string;       // YYYY-MM-DD
  time?: string;      // HH:MM:SS (optional)
  amount: number;
  type: "credit" | "debit";
  description: string;
  balance_after?: number;
  reference?: string;
}

interface WebhookPayload {
  secret_key: string;
  mutations: MutationPayload[];
  bank_name?: string;
  account_number?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("[VPS Scraper Webhook] Received request");

    const body: WebhookPayload = await req.json();
    console.log("[VPS Scraper Webhook] Payload received, mutations count:", body.mutations?.length || 0);

    // Validate secret_key
    if (!body.secret_key) {
      console.log("[VPS Scraper Webhook] No secret_key provided");
      return new Response(
        JSON.stringify({ success: false, error: "secret_key is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get VPS scraper settings to verify secret key
    const { data: settings } = await supabase
      .from("payment_provider_settings")
      .select("*")
      .eq("provider", "vps_scraper")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!settings) {
      console.log("[VPS Scraper Webhook] No active VPS scraper settings found");
      return new Response(
        JSON.stringify({ success: false, error: "VPS scraper not configured or inactive" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify secret key
    if (body.secret_key !== settings.webhook_secret_encrypted) {
      console.log("[VPS Scraper Webhook] Invalid secret key");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid secret key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log("[VPS Scraper Webhook] Secret key verified");

    // Validate mutations array
    if (!body.mutations || !Array.isArray(body.mutations) || body.mutations.length === 0) {
      console.log("[VPS Scraper Webhook] No mutations to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0, matched: 0, message: "No mutations provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedCount = 0;
    let matchedCount = 0;
    let skippedCount = 0;

    for (const mutation of body.mutations) {
      // Validate required fields
      if (!mutation.date || mutation.amount === undefined || !mutation.type || !mutation.description) {
        console.log("[VPS Scraper Webhook] Invalid mutation, skipping:", mutation);
        skippedCount++;
        continue;
      }

      // Only process credit transactions (incoming payments)
      if (mutation.type !== "credit") {
        console.log(`[VPS Scraper Webhook] Skipping non-credit transaction: ${mutation.type}`);
        skippedCount++;
        continue;
      }

      // Check for duplicate - by date + amount + description
      const { data: existingMutation } = await supabase
        .from("bank_mutations")
        .select("id")
        .eq("transaction_date", mutation.date)
        .eq("amount", mutation.amount)
        .eq("description", mutation.description)
        .limit(1)
        .maybeSingle();

      if (existingMutation) {
        console.log(`[VPS Scraper Webhook] Duplicate mutation found, skipping`);
        skippedCount++;
        continue;
      }

      // Insert new mutation
      const { data: newMutation, error: insertError } = await supabase
        .from("bank_mutations")
        .insert({
          user_id: settings.user_id,
          transaction_date: mutation.date,
          transaction_time: mutation.time || null,
          description: mutation.description,
          amount: mutation.amount,
          transaction_type: mutation.type === "credit" ? "kredit" : "debit",
          balance_after: mutation.balance_after || null,
          reference_number: mutation.reference || null,
          source: "vps_scraper",
          is_processed: false,
          raw_data: mutation as unknown as Record<string, unknown>,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[VPS Scraper Webhook] Error inserting mutation:", insertError);
        continue;
      }

      processedCount++;
      console.log(`[VPS Scraper Webhook] Inserted mutation: ${newMutation.id}, amount: ${mutation.amount}`);

      // Try to match with pending payment confirmation requests
      const { data: matchedRequest } = await supabase.rpc("match_mutation_with_request", {
        p_mutation_id: newMutation.id,
        p_amount: mutation.amount,
      });

      if (matchedRequest) {
        matchedCount++;
        console.log(`[VPS Scraper Webhook] Matched with request: ${matchedRequest}`);

        // Auto-stop burst mode when match is found
        try {
          await supabase
            .from("payment_provider_settings")
            .update({
              burst_in_progress: false,
              burst_ended_at: new Date().toISOString(),
              burst_last_match_found: true,
            })
            .eq("provider", "vps_scraper");
          console.log("[VPS Scraper Webhook] Burst mode auto-stopped due to match");
        } catch (burstError) {
          console.error("[VPS Scraper Webhook] Failed to stop burst mode:", burstError);
        }

        // Get the matched request details for contract update and notification
        const { data: requestData } = await supabase
          .from("payment_confirmation_requests")
          .select("*, rental_contracts!inner(*, client_groups!inner(*))")
          .eq("id", matchedRequest)
          .single();

        if (requestData?.rental_contracts) {
          const contract = requestData.rental_contracts as any;
          const clientGroup = contract.client_groups as any;

          // FIX: Use amount_expected (full invoice amount) instead of mutation.amount (unique amount transferred)
          // Example: Invoice 300, unique_code 223, user transfers 77
          // - mutation.amount = 77 (actual transfer)
          // - requestData.amount_expected = 300 (full invoice amount)
          // We should deduct 300 from tagihan_belum_bayar, not 77
          const fullAmount = requestData.amount_expected || mutation.amount;
          const uniqueCode = requestData.unique_code || 0;
          const transferredAmount = mutation.amount;

          // Create contract payment record with full amount
          await supabase.from("contract_payments").insert({
            user_id: settings.user_id,
            contract_id: contract.id,
            payment_date: mutation.date,
            amount: fullAmount,
            payment_source: "auto",
            confirmed_by: null,
            notes: `Auto-verified via ExEnt Creative: ${mutation.description}. Transfer: Rp ${transferredAmount.toLocaleString('id-ID')}.`,
          });

          // Update contract tagihan_belum_bayar with FULL amount
          const newTagihanBelumBayar = Math.max(0, (contract.tagihan_belum_bayar || 0) - fullAmount);
          await supabase
            .from("rental_contracts")
            .update({
              tagihan_belum_bayar: newTagihanBelumBayar,
              tanggal_bayar_terakhir: mutation.date,
            })
            .eq("id", contract.id);
          
          console.log(`[VPS Scraper Webhook] Payment recorded: fullAmount=${fullAmount}, transferred=${transferredAmount}, uniqueCode=${uniqueCode}, newTagihan=${newTagihanBelumBayar}`);

          // Send WhatsApp notification
          try {
            const { data: waSettings } = await supabase
              .from("whatsapp_settings")
              .select("*")
              .eq("user_id", settings.user_id)
              .eq("is_active", true)
              .limit(1)
              .maybeSingle();

            if (waSettings && clientGroup?.nomor_telepon) {
              await supabase.functions.invoke("send-whatsapp-unified", {
                body: {
                  user_id: settings.user_id,
                  contract_id: contract.id,
                  notification_type: "payment",
                },
              });
              console.log(`[VPS Scraper Webhook] WhatsApp notification sent for contract ${contract.id}`);
            }
          } catch (waError) {
            console.error("[VPS Scraper Webhook] WhatsApp notification error:", waError);
          }
        }
      }
    }

    // Update last webhook timestamp
    await supabase
      .from("payment_provider_settings")
      .update({
        last_webhook_at: new Date().toISOString(),
        error_count: 0,
        last_error: null,
      })
      .eq("id", settings.id);

    console.log(`[VPS Scraper Webhook] Complete - Processed: ${processedCount}, Matched: ${matchedCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        matched: matchedCount,
        skipped: skippedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[VPS Scraper Webhook] Error:", error);

    // Try to update error count
    try {
      const { data: settings } = await supabase
        .from("payment_provider_settings")
        .select("id, error_count")
        .eq("provider", "vps_scraper")
        .limit(1)
        .maybeSingle();

      if (settings) {
        await supabase
          .from("payment_provider_settings")
          .update({
            error_count: (settings.error_count || 0) + 1,
            last_error: error.message,
          })
          .eq("id", settings.id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
