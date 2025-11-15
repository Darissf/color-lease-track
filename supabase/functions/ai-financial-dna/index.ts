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

    console.log("Analyzing Financial DNA for user:", user.id);

    // Comprehensive financial data
    const [expenses, income, savings, budget] = await Promise.all([
      supabaseClient.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabaseClient.from("income_sources").select("*").eq("user_id", user.id),
      supabaseClient.from("savings_plans").select("*").eq("user_id", user.id),
      supabaseClient.from("monthly_budgets").select("*").eq("user_id", user.id)
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Analisis FINANCIAL DNA user berdasarkan data historis:

Expenses: ${JSON.stringify(expenses.data?.slice(0, 50))}
Income: ${JSON.stringify(income.data)}
Savings: ${JSON.stringify(savings.data)}
Budgets: ${JSON.stringify(budget.data)}

Create comprehensive Financial DNA Profile dengan:

1. **Personality Type**: (Spender/Saver/Balanced/Investor)
2. **Risk Profile**: (Conservative/Moderate/Aggressive)
3. **Savings Style**: (Systematic/Opportunistic/Goal-driven)
4. **Spending Patterns**: Top categories & habits
5. **Financial Strengths**: What they do well
6. **Areas for Improvement**: Specific actionable insights
7. **Unique Traits**: Distinctive financial behaviors

Return sebagai JSON dengan structure:
{
  "personality": "string",
  "riskProfile": "string",
  "savingsStyle": "string",
  "insights": "detailed markdown insights"
}`;

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
            content: "Anda adalah expert behavioral economist yang analyze financial DNA dengan deep psychological insights."
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
    let profile;
    
    try {
      profile = JSON.parse(aiData.choices[0].message.content);
    } catch {
      // Fallback jika tidak bisa parse JSON
      profile = {
        personality: "Balanced",
        riskProfile: "Moderate",
        savingsStyle: "Goal-driven",
        insights: aiData.choices[0].message.content
      };
    }

    return new Response(
      JSON.stringify({ profile }),
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
