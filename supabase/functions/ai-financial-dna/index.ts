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

    // Comprehensive financial data
    const [expenses, income, savings, budget] = await Promise.all([
      supabaseClient.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabaseClient.from("income_sources").select("*").eq("user_id", user.id),
      supabaseClient.from("savings_plans").select("*").eq("user_id", user.id),
      supabaseClient.from("monthly_budgets").select("*").eq("user_id", user.id)
    ]);

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
          { role: "system", content: "Anda adalah expert behavioral economist yang analyze financial DNA dengan deep psychological insights." },
          { role: "user", content: prompt }
        ],
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
        messages: [
          { role: "system", content: "Anda adalah expert behavioral economist yang analyze financial DNA dengan deep psychological insights." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      };
    } else {
      throw new Error("Unsupported provider");
    }

    console.log("Calling AI provider:", provider, "with endpoint:", endpoint);
    aiResponse = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    let profile;
    
    try {
      profile = JSON.parse(aiData.choices[0].message.content);
    } catch {
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
