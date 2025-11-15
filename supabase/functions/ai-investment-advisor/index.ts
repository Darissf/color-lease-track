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

    console.log("Generating investment advice for user:", user.id);

    // Fetch financial data
    const [expensesResult, incomeResult, savingsResult] = await Promise.all([
      supabaseClient.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
      supabaseClient.from("income_sources").select("*").eq("user_id", user.id),
      supabaseClient.from("savings_plans").select("*").eq("user_id", user.id)
    ]);

    const totalExpenses = expensesResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalIncome = incomeResult.data?.reduce((sum, i) => sum + Number(i.amount || 0), 0) || 0;
    const totalSavings = savingsResult.data?.reduce((sum, s) => sum + Number(s.current_amount || 0), 0) || 0;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Sebagai financial advisor expert, berikan rekomendasi investasi berdasarkan data:

Financial Summary:
- Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}
- Total Pengeluaran: Rp ${totalExpenses.toLocaleString('id-ID')}
- Total Tabungan: Rp ${totalSavings.toLocaleString('id-ID')}
- Savings Rate: ${totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0}%

Berikan:
1. **Portfolio Recommendation**: Alokasi ideal untuk investasi (saham, obligasi, reksadana, dll)
2. **Risk Assessment**: Risk profile user berdasarkan data
3. **Investment Strategy**: Short-term dan long-term strategies
4. **Specific Recommendations**: 3-5 instrumen investasi yang cocok
5. **Action Plan**: Step-by-step untuk mulai invest

Format dengan Markdown yang rapi.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Anda adalah certified financial advisor dengan expertise di investasi dan portfolio management."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI API error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    const advice = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ advice }),
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
