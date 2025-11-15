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

    // Fetch financial data
    const [expensesResult, incomeResult, savingsResult] = await Promise.all([
      supabaseClient.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(100),
      supabaseClient.from("income_sources").select("*").eq("user_id", user.id),
      supabaseClient.from("savings_plans").select("*").eq("user_id", user.id)
    ]);

    const totalExpenses = expensesResult.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalIncome = incomeResult.data?.reduce((sum, i) => sum + Number(i.amount || 0), 0) || 0;
    const totalSavings = savingsResult.data?.reduce((sum, s) => sum + Number(s.current_amount || 0), 0) || 0;

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
          { role: "system", content: "Anda adalah certified financial advisor dengan expertise di investasi dan portfolio management." },
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
          { role: "system", content: "Anda adalah certified financial advisor dengan expertise di investasi dan portfolio management." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      };
    } else {
      throw new Error("Unsupported provider");
    }

    const startTime = Date.now();
    console.log("Calling AI provider:", provider, "with endpoint:", endpoint);
    aiResponse = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const responseTime = Date.now() - startTime;

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      await supabaseClient.from("ai_usage_analytics").insert({
        user_id: user.id,
        ai_provider: provider,
        model_name: provider === "openai" ? "gpt-4o-mini" : "deepseek-chat",
        status: "error",
        error_message: `${aiResponse.status} - ${errorText}`,
        response_time_ms: responseTime
      });
      
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const advice = aiData.choices[0].message.content;

    const tokensUsed = (aiData.usage?.prompt_tokens || 0) + (aiData.usage?.completion_tokens || 0);
    await supabaseClient.from("ai_usage_analytics").insert({
      user_id: user.id,
      ai_provider: provider,
      model_name: provider === "openai" ? "gpt-4o-mini" : "deepseek-chat",
      request_tokens: aiData.usage?.prompt_tokens,
      response_tokens: aiData.usage?.completion_tokens,
      tokens_used: tokensUsed,
      cost_estimate: tokensUsed * (provider === "openai" ? 0.00015 / 1000 : 0.00014 / 1000),
      status: "success",
      response_time_ms: Date.now() - startTime
    });

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
