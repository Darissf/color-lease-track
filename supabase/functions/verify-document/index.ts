import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verificationCode } = await req.json();

    if (!verificationCode) {
      return new Response(
        JSON.stringify({ isValid: false, error: "Verification code is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Verifying document with code:", verificationCode);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Look up the document in invoice_receipts table
    const { data: document, error: docError } = await supabaseClient
      .from("invoice_receipts")
      .select("*")
      .eq("verification_code", verificationCode.toUpperCase())
      .single();

    if (docError || !document) {
      console.log("Document not found:", docError);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: "Document not found or invalid verification code" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Update verification count and last verified timestamp
    const { error: updateError } = await supabaseClient
      .from("invoice_receipts")
      .update({
        verified_count: (document.verified_count || 0) + 1,
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    if (updateError) {
      console.error("Error updating verification count:", updateError);
    }

    console.log("Document verified successfully:", document.document_number);

    // Return document details
    return new Response(
      JSON.stringify({
        isValid: true,
        document: {
          id: document.id,
          documentType: document.document_type,
          documentNumber: document.document_number,
          amount: document.amount,
          clientName: document.client_name,
          issueDate: document.issue_date,
          description: document.description,
          status: document.status,
          verifiedCount: (document.verified_count || 0) + 1,
          lastVerifiedAt: new Date().toISOString(),
          createdAt: document.created_at,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error verifying document:", error);
    return new Response(
      JSON.stringify({ isValid: false, error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
