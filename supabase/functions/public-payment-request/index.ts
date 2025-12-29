import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  access_code: string;
  amount_expected: number;
  action: 'create' | 'cancel';
  request_id?: string; // For cancel action
}

// Generate unique code (100-300) that's not currently in use
// This will be SUBTRACTED from amount, so unique_amount = amount - code
async function generateUniqueCode(supabase: any): Promise<number> {
  const maxAttempts = 50;
  
  for (let i = 0; i < maxAttempts; i++) {
    // Generate random code between 100-300
    const code = Math.floor(Math.random() * 201 + 100); // 100 to 300
    
    const { data: existing } = await supabase
      .from("payment_confirmation_requests")
      .select("id")
      .eq("unique_code", code.toString())
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    
    if (!existing) {
      return code;
    }
  }
  
  // Fallback: use timestamp-based code within range
  return (Date.now() % 201) + 100; // Still 100-300
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: RequestBody = await req.json();
    const { access_code, amount_expected, action, request_id } = body;

    if (!access_code) {
      return new Response(
        JSON.stringify({ success: false, error: "Access code is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`[Public Payment Request] Action: ${action}, Access Code: ${access_code}`);

    // Verify access code and get contract info
    const { data: linkData, error: linkError } = await supabase
      .from("contract_public_links")
      .select(`
        id,
        contract_id,
        user_id,
        expires_at,
        is_active,
        contract:rental_contracts!inner(
          id,
          invoice,
          tagihan,
          tagihan_belum_bayar,
          client_group:client_groups!inner(
            id,
            nama,
            linked_user_id
          )
        )
      `)
      .eq("access_code", access_code)
      .eq("is_active", true)
      .single();

    if (linkError || !linkData) {
      console.log("[Public Payment Request] Link not found:", linkError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid access code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check if link is expired
    if (new Date(linkData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "Link has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 410 }
      );
    }

    const contract = linkData.contract as any;
    const clientGroup = contract.client_group;
    const remainingBalance = contract.tagihan_belum_bayar || 0;

    // Handle CANCEL action
    if (action === "cancel") {
      if (!request_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Request ID is required for cancel" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { error: cancelError } = await supabase
        .from("payment_confirmation_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", request_id)
        .eq("contract_id", linkData.contract_id)
        .eq("status", "pending");

      if (cancelError) {
        console.log("[Public Payment Request] Cancel error:", cancelError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to cancel request" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log(`[Public Payment Request] Cancelled request: ${request_id}`);
      return new Response(
        JSON.stringify({ success: true, message: "Request cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Handle CREATE action
    if (action === "create") {
      if (!amount_expected) {
        return new Response(
          JSON.stringify({ success: false, error: "Amount is required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Validate minimum 50%
      const minimumAmount = Math.ceil(remainingBalance * 0.5);
      if (amount_expected < minimumAmount) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Minimum payment is 50% (${minimumAmount})`,
            minimum_amount: minimumAmount
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Validate doesn't exceed remaining
      if (amount_expected > remainingBalance) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Amount exceeds remaining balance. Max: ${remainingBalance}` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Cancel any existing pending requests for this contract
      await supabase
        .from("payment_confirmation_requests")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("contract_id", linkData.contract_id)
        .eq("status", "pending");

      // Generate unique code (100-300, will be subtracted)
      const uniqueCode = await generateUniqueCode(supabase);
      // SUBTRACT the unique code from amount (e.g., 100000 - 240 = 99760)
      const uniqueAmount = amount_expected - uniqueCode;
      
      // Set expiry to 3 days
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      // Create new request
      const { data: request, error: insertError } = await supabase
        .from("payment_confirmation_requests")
        .insert({
          contract_id: linkData.contract_id,
          customer_name: clientGroup.nama,
          amount_expected,
          unique_code: uniqueCode.toString(),
          unique_amount: uniqueAmount,
          status: "pending",
          expires_at: expiresAt.toISOString(),
          user_id: linkData.user_id,
          created_by_role: "user", // Public link is always "user"
        })
        .select("id, unique_code, unique_amount, expires_at, burst_triggered_at, created_at")
        .single();

      if (insertError) {
        console.log("[Public Payment Request] Insert error:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create payment request" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log(`[Public Payment Request] Created request ${request.id}, unique amount: ${uniqueAmount}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          request_id: request.id,
          unique_code: request.unique_code,
          unique_amount: request.unique_amount,
          amount_expected,
          expires_at: request.expires_at,
          created_at: request.created_at,
          message: `Transfer tepat Rp ${uniqueAmount.toLocaleString('id-ID')} untuk verifikasi otomatis.`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error: unknown) {
    console.error("[Public Payment Request] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
