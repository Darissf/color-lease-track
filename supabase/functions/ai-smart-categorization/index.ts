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

    // Fetch user's historical expenses to learn patterns
    const { data: historicalExpenses } = await supabaseClient
      .from("expenses")
      .select("description, category")
      .eq("user_id", user.id)
      .limit(100);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Kategorikan: "${description}"` }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
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
