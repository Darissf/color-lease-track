import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

interface MutasibankPayload {
  id: string;
  bank_id: string;
  account_number: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  type: "CR" | "DB"; // Credit or Debit
  amount: number;
  description: string;
  balance: number;
  reference?: string;
  created_at: string;
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
    console.log("[Mutasibank Webhook] Received request");

    // Get the signature from header for verification
    const signature = req.headers.get("x-signature") || req.headers.get("X-Signature") || "";
    
    const body = await req.json();
    console.log("[Mutasibank Webhook] Payload:", JSON.stringify(body));

    // Get provider settings to verify webhook secret
    const { data: settings } = await supabase
      .from("payment_provider_settings")
      .select("*")
      .eq("provider", "mutasibank")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!settings) {
      console.log("[Mutasibank Webhook] No active Mutasibank settings found");
      return new Response(
        JSON.stringify({ success: false, error: "Mutasibank integration not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify API key from payload matches stored key
    // Mutasibank sends api_key in the payload body, not in headers
    const payloadApiKey = body.api_key || "";
    if (settings.api_key_encrypted) {
      if (payloadApiKey !== settings.api_key_encrypted) {
        console.log("[Mutasibank Webhook] Invalid API key in payload");
        console.log("[Mutasibank Webhook] Expected:", settings.api_key_encrypted?.substring(0, 20) + "...");
        console.log("[Mutasibank Webhook] Received:", payloadApiKey?.substring(0, 20) + "...");
        return new Response(
          JSON.stringify({ success: false, error: "Invalid API key" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
    }
    
    console.log("[Mutasibank Webhook] API key verified successfully");

    // Handle Mutasibank payload format
    // Mutasibank sends: { api_key, account_id, module, account_name, account_number, balance, data_mutasi: [...] }
    const rawMutations = body.data_mutasi || body.data || [];
    const mutations = Array.isArray(rawMutations) ? rawMutations : [rawMutations];
    
    console.log(`[Mutasibank Webhook] Processing ${mutations.length} mutation(s)`);

    let processedCount = 0;
    let matchedCount = 0;

    for (const mutation of mutations) {
      // Parse Mutasibank format: { id, system_date, transaction_date, description, type, amount, balance }
      const mutationType = mutation.type;
      const mutationAmount = Number(mutation.amount);
      const mutationDescription = mutation.description || "";
      const mutationId = mutation.id || "";
      const mutationBalance = Number(mutation.balance) || null;
      
      // Parse transaction_date: "2025-12-26 17:15:07" -> date and time
      const transactionDateStr = mutation.transaction_date || mutation.date || "";
      const [datePart, timePart] = transactionDateStr.split(" ");
      
      // Skip if not a credit transaction (incoming payment)
      if (mutationType !== "CR") {
        console.log(`[Mutasibank Webhook] Skipping non-credit transaction: ${mutationType}`);
        continue;
      }

      // Check if mutation already exists (dedup by reference or date+amount+description)
      const { data: existingMutation } = await supabase
        .from("bank_mutations")
        .select("id")
        .eq("transaction_date", datePart)
        .eq("amount", mutationAmount)
        .eq("description", mutationDescription)
        .limit(1)
        .maybeSingle();

      if (existingMutation) {
        console.log(`[Mutasibank Webhook] Duplicate mutation, skipping: ${mutationId}`);
        continue;
      }

      // Insert new mutation
      const { data: newMutation, error: insertError } = await supabase
        .from("bank_mutations")
        .insert({
          user_id: settings.user_id,
          transaction_date: datePart,
          transaction_time: timePart || null,
          description: mutationDescription,
          amount: mutationAmount,
          transaction_type: mutationType === "CR" ? "kredit" : "debit",
          balance_after: mutationBalance,
          reference_number: mutationId,
          source: "mutasibank",
          is_processed: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error(`[Mutasibank Webhook] Error inserting mutation:`, insertError);
        continue;
      }

      processedCount++;
      console.log(`[Mutasibank Webhook] Inserted mutation: ${newMutation.id}, amount: ${mutation.amount}`);

      // Try to match with pending payment confirmation requests
      const { data: matchedRequest } = await supabase.rpc("match_mutation_with_request", {
        p_mutation_id: newMutation.id,
        p_amount: mutation.amount,
      });

      if (matchedRequest) {
        matchedCount++;
        console.log(`[Mutasibank Webhook] Matched with request: ${matchedRequest}`);

        // Get the matched request details for notification
        const { data: requestData } = await supabase
          .from("payment_confirmation_requests")
          .select("*, rental_contracts!inner(*, client_groups!inner(*))")
          .eq("id", matchedRequest)
          .single();

        if (requestData?.rental_contracts) {
          const contract = requestData.rental_contracts as any;
          const clientGroup = contract.client_groups as any;

          // Create contract payment record
          await supabase.from("contract_payments").insert({
            user_id: settings.user_id,
            contract_id: contract.id,
            payment_date: mutation.date,
            amount: mutation.amount,
            payment_source: 'auto',
            confirmed_by: null,
            notes: `Auto-verified via Mutasibank: ${mutation.description}`,
          });

          // Update contract tagihan_belum_bayar
          const newTagihanBelumBayar = Math.max(0, (contract.tagihan_belum_bayar || 0) - mutation.amount);
          await supabase
            .from("rental_contracts")
            .update({
              tagihan_belum_bayar: newTagihanBelumBayar,
              tanggal_bayar_terakhir: mutation.date,
            })
            .eq("id", contract.id);

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
              console.log(`[Mutasibank Webhook] WhatsApp notification sent for contract ${contract.id}`);
            }
          } catch (waError) {
            console.error(`[Mutasibank Webhook] WhatsApp notification error:`, waError);
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

    console.log(`[Mutasibank Webhook] Processed: ${processedCount}, Matched: ${matchedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        matched: matchedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Mutasibank Webhook] Error:", error);

    // Try to update error count
    try {
      await supabase
        .from("payment_provider_settings")
        .update({
          error_count: supabase.rpc("increment_error_count"),
          last_error: error.message,
        })
        .eq("provider", "mutasibank");
    } catch {}

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
