import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  contract_id: string;
  customer_name: string;
  amount_expected: number;
}

// Generate unique 3-digit code (001-999) that's not currently in use
async function generateUniqueCode(supabase: any): Promise<string> {
  const maxAttempts = 50;
  
  for (let i = 0; i < maxAttempts; i++) {
    // Generate random 3-digit code (100-999 to avoid leading zeros issues)
    const code = Math.floor(Math.random() * 900 + 100).toString();
    
    // Check if code is already in use for pending requests
    const { data: existing } = await supabase
      .from("payment_confirmation_requests")
      .select("id")
      .eq("unique_code", code)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    
    if (!existing) {
      return code;
    }
  }
  
  // Fallback: use timestamp-based code
  return (Date.now() % 900 + 100).toString();
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log("[BCA Request Payment Check] Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log(`[BCA Request Payment Check] User ${user.id} requesting payment check`);

    // Parse request body
    const body: RequestBody = await req.json();
    const { contract_id, customer_name, amount_expected } = body;

    if (!contract_id || !amount_expected) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: contract_id, amount_expected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`[BCA Request Payment Check] Contract: ${contract_id}, Amount: ${amount_expected}`);

    // Verify user has access to this contract via linked client_group
    const { data: contract, error: contractError } = await supabase
      .from("rental_contracts")
      .select(`
        id,
        invoice,
        keterangan,
        tagihan,
        tagihan_belum_bayar,
        client_group:client_groups!inner(
          id,
          nama,
          linked_user_id
        )
      `)
      .eq("id", contract_id)
      .single();

    if (contractError || !contract) {
      console.log("[BCA Request Payment Check] Contract not found:", contractError);
      return new Response(
        JSON.stringify({ success: false, error: "Contract not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check if user is linked to this contract's client group
    const clientGroup = contract.client_group as unknown as { id: string; nama: string; linked_user_id: string | null };
    if (clientGroup.linked_user_id !== user.id) {
      console.log(`[BCA Request Payment Check] Access denied. User: ${user.id}, Linked: ${clientGroup.linked_user_id}`);
      return new Response(
        JSON.stringify({ success: false, error: "Access denied to this contract" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Validate amount doesn't exceed remaining balance
    const remainingBalance = contract.tagihan_belum_bayar || 0;
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
    const { error: cancelError } = await supabase
      .from("payment_confirmation_requests")
      .update({ 
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("contract_id", contract_id)
      .eq("status", "pending");

    if (cancelError) {
      console.log("[BCA Request Payment Check] Warning: Failed to cancel old requests:", cancelError);
    }

    // Generate unique 3-digit code
    const uniqueCode = await generateUniqueCode(supabase);
    const uniqueAmount = amount_expected + parseInt(uniqueCode);
    
    // Set expiry to 3 days from now
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    
    // Create new payment confirmation request with unique amount
    const { data: request, error: insertError } = await supabase
      .from("payment_confirmation_requests")
      .insert({
        contract_id,
        customer_name: customer_name || clientGroup.nama,
        amount_expected,
        unique_code: uniqueCode,
        unique_amount: uniqueAmount,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        user_id: user.id,
      })
      .select("id, unique_code, unique_amount, expires_at")
      .single();

    if (insertError) {
      console.log("[BCA Request Payment Check] Failed to create request:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create payment check request" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`[BCA Request Payment Check] Created request ${request.id}, unique amount: ${uniqueAmount}, expires: ${expiresAt.toISOString()}`);

    // Return success with request details for frontend
    return new Response(
      JSON.stringify({ 
        success: true, 
        request_id: request.id,
        unique_code: request.unique_code,
        unique_amount: request.unique_amount,
        amount_expected: amount_expected,
        expires_at: request.expires_at,
        message: `Transfer tepat Rp ${uniqueAmount.toLocaleString('id-ID')} untuk verifikasi otomatis.`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    console.error("[BCA Request Payment Check] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
