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

    const { description } = await req.json();
    console.log("Categorizing:", description);

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

    // Fetch user's historical expenses to learn patterns
    const { data: historicalExpenses } = await supabaseClient
      .from("expenses")
      .select("description, category")
      .eq("user_id", user.id)
      .limit(100);

    const systemPrompt = `Anda adalah AI yang ahli dalam mengkategorikan pengeluaran.

Kategori yang tersedia:
- Makanan & Minuman
- Transport
- Belanja
- Tagihan
- Hiburan
- Kesehatan
- Pendidikan
- Lainnya

Historical patterns user:
${JSON.stringify(historicalExpenses?.slice(0, 20), null, 2)}

Instruksi:
1. Analisis deskripsi expense
2. Berdasarkan context dan historical data, tentukan kategori yang paling sesuai
3. Learn from user's categorization patterns
4. Return ONLY kategori name, nothing else`;

    let aiResponse;
    let endpoint;
    let headers;
    let body: any;

    if (provider === "openai") {
      endpoint = "https://api.openai.com/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Kategorikan: "${description}"` }
        ],
        temperature: 0.3,
        max_tokens: 50,
      };
    } else if (provider === "deepseek") {
      endpoint = "https://api.deepseek.com/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Kategorikan: "${description}"` }
        ],
        temperature: 0.3,
        max_tokens: 50,
      };
    } else {
      throw new Error("Unsupported provider");
    }

    aiResponse = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!aiResponse.ok) throw new Error(`AI API error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    const category = aiData.choices[0].message.content.trim();

    return new Response(
      JSON.stringify({ category }),
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
