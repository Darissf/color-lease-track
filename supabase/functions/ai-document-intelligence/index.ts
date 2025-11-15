import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { image } = await req.json();
    console.log("Processing document with AI OCR");

    // Fetch user AI settings
    const { data: aiSettings } = await supabaseClient
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!aiSettings || !aiSettings.api_key) {
      throw new Error("AI Settings belum dikonfigurasi. Silakan setup di Settings > AI Settings");
    }

    const provider = aiSettings.ai_provider;
    const apiKey = aiSettings.api_key;

    const systemPrompt = `Anda adalah AI OCR expert yang extract data dari receipt, invoice, atau contract.

Extract informasi berikut:
1. amount (jumlah total)
2. date (tanggal transaksi)
3. merchant (nama merchant/toko)
4. category (kategori expense)
5. items (list items jika ada)

Return dalam format JSON.`;

    let aiResponse;
    let endpoint;
    let headers;
    let body: any;

    if (provider === "lovable") {
      // Use Lovable AI Gateway (supports vision via Gemini)
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableApiKey) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
      };
    } else if (provider === "openai") {
      endpoint = "https://api.openai.com/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      };
    } else {
      throw new Error(`Provider ${provider} belum support vision/OCR. Gunakan Lovable atau OpenAI untuk Document Intelligence.`);
    }

    aiResponse = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extractedData = aiData.choices[0].message.content;

    let result;
    try {
      result = JSON.parse(extractedData);
    } catch {
      result = {
        rawText: extractedData,
        amount: null,
        date: null,
        merchant: null,
        category: null
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
