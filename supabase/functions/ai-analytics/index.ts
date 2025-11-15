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

    // Fetch relevant financial data
    const [expensesResult, incomeResult, savingsResult] = await Promise.all([
      supabaseClient.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
      supabaseClient.from("income_sources").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(50),
      supabaseClient.from("savings_plans").select("*").eq("user_id", user.id)
    ]);

    // Prepare context for AI
    const context = {
      expenses: expensesResult.data || [],
      income: incomeResult.data || [],
      savings: savingsResult.data || []
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
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
