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

    const { query, conversation } = await req.json();
    console.log("Natural language query:", query);

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

    console.log("Using provider:", provider);

    // Fetch relevant financial data
    const [expensesResult, incomeResult, savingsResult] = await Promise.all([
      supabaseClient.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
      supabaseClient.from("income_sources").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(50),
      supabaseClient.from("savings_plans").select("*").eq("user_id", user.id)
    ]);

    const context = {
      expenses: expensesResult.data || [],
      income: incomeResult.data || [],
      savings: savingsResult.data || []
    };

    const systemPrompt = `Anda adalah AI financial analyst yang bisa menjawab pertanyaan tentang data keuangan dalam bahasa Indonesia.

Data yang tersedia:
- Expenses: ${context.expenses.length} transaksi
- Income: ${context.income.length} sumber pemasukan
- Savings: ${context.savings.length} rencana tabungan

Instruksi:
1. Jawab pertanyaan user berdasarkan data yang ada
2. Berikan analisis yang akurat dengan angka yang spesifik
3. Gunakan format Markdown untuk readability
4. Jika perlu visualisasi, describe data yang bisa di-chart
5. Berikan insights & recommendations yang actionable

Data Context:
${JSON.stringify(context, null, 2)}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversation || []),
      { role: "user", content: query }
    ];

    let aiResponse;
    let endpoint;
    let headers;
    let body: any;

    // Route based on provider
    if (provider === "openai") {
      endpoint = "https://api.openai.com/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      };
    } else if (provider === "deepseek") {
      endpoint = "https://api.deepseek.com/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      };
    } else {
      throw new Error("Unsupported provider. Please use OpenAI or DeepSeek.");
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
    const response = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ response }),
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
