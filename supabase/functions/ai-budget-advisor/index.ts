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

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("AI Budget Advisor request for user:", user.id);

    // Fetch user's AI settings
    const { data: aiSettings } = await supabaseClient
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const provider = aiSettings?.ai_provider || "lovable";
    const apiKey = aiSettings?.api_key || Deno.env.get("LOVABLE_API_KEY");
    const model = aiSettings?.model_name || "google/gemini-2.5-flash";

    console.log("Budget advisor - Using provider:", provider, "model:", model);

    // Fetch last 6 months of expenses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: expenses, error: expensesError } = await supabaseClient
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", sixMonthsAgo.toISOString().split('T')[0])
      .order("date", { ascending: true });

    if (expensesError) throw expensesError;

    // Fetch income data
    const { data: income, error: incomeError } = await supabaseClient
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", sixMonthsAgo.toISOString().split('T')[0]);

    if (incomeError) throw incomeError;

    // Fetch current budget
    const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long' });
    const currentYear = new Date().getFullYear();
    
    const { data: budget } = await supabaseClient
      .from("monthly_budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .single();

    // Prepare data analysis
    const expensesByMonth: Record<string, any> = {};
    const expensesByCategory: Record<string, number> = {};
    let totalExpenses = 0;

    expenses?.forEach((expense: any) => {
      const month = new Date(expense.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      if (!expensesByMonth[month]) {
        expensesByMonth[month] = { total: 0, fixed: 0, variable: 0, categories: {} };
      }
      
      const amount = Number(expense.amount);
      expensesByMonth[month].total += amount;
      
      if (expense.is_fixed) {
        expensesByMonth[month].fixed += amount;
      } else {
        expensesByMonth[month].variable += amount;
      }
      
      if (!expensesByMonth[month].categories[expense.category]) {
        expensesByMonth[month].categories[expense.category] = 0;
      }
      expensesByMonth[month].categories[expense.category] += amount;
      
      if (!expensesByCategory[expense.category]) {
        expensesByCategory[expense.category] = 0;
      }
      expensesByCategory[expense.category] += amount;
      totalExpenses += amount;
    });

    const totalIncome = income?.reduce((sum: number, inc: any) => sum + Number(inc.amount || 0), 0) || 0;
    const avgMonthlyExpenses = totalExpenses / Math.max(Object.keys(expensesByMonth).length, 1);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Prepare prompt for AI
    const prompt = `Sebagai ahli keuangan, analisis data berikut dan berikan:

1. **PREDIKSI PENGELUARAN BULAN DEPAN**: Prediksi pengeluaran untuk bulan depan berdasarkan pola 6 bulan terakhir
2. **SARAN OPTIMASI BUDGET**: Berikan 3-5 saran konkret untuk mengoptimalkan pengeluaran

DATA HISTORIS (6 Bulan Terakhir):
${JSON.stringify(expensesByMonth, null, 2)}

STATISTIK:
- Total Pengeluaran 6 Bulan: Rp ${totalExpenses.toLocaleString('id-ID')}
- Rata-rata Pengeluaran Bulanan: Rp ${avgMonthlyExpenses.toLocaleString('id-ID')}
- Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}
- Tingkat Tabungan: ${savingsRate.toFixed(1)}%
${budget ? `- Target Budget Bulan Ini: Rp ${Number(budget.target_belanja).toLocaleString('id-ID')}` : ''}

PENGELUARAN PER KATEGORI:
${Object.entries(expensesByCategory).map(([cat, amount]) => 
  `- ${cat}: Rp ${Number(amount).toLocaleString('id-ID')} (${((Number(amount) / totalExpenses) * 100).toFixed(1)}%)`
).join('\n')}

FORMAT JAWABAN:
## 📊 Prediksi Pengeluaran Bulan Depan

[Berikan prediksi dengan breakdown per kategori dan total]

## 💡 Saran Optimasi Budget

1. **[Judul Saran 1]**: [Penjelasan detail dan estimasi penghematan]
2. **[Judul Saran 2]**: [Penjelasan detail dan estimasi penghematan]
3. **[Judul Saran 3]**: [Penjelasan detail dan estimasi penghematan]

## 🎯 Kesimpulan

[Ringkasan singkat dan rekomendasi prioritas]

Gunakan format rupiah Indonesia (Rp) untuk semua angka dan berikan saran yang praktis dan actionable.`;

    let aiResponse;
    let aiData;

    if (provider === "deepseek") {
      aiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "Anda adalah ahli keuangan profesional yang memberikan analisis mendalam dan saran praktis untuk optimasi budget. Gunakan data historis untuk membuat prediksi akurat dan berikan saran yang spesifik dengan estimasi penghematan." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });
    } else if (provider === "claude") {
      aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 2000,
          messages: [
            { role: "user", content: `Anda adalah ahli keuangan profesional yang memberikan analisis mendalam dan saran praktis untuk optimasi budget. Gunakan data historis untuk membuat prediksi akurat dan berikan saran yang spesifik dengan estimasi penghematan.\n\n${prompt}` }
          ],
          temperature: 0.7,
        }),
      });
    } else {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: "Anda adalah ahli keuangan profesional yang memberikan analisis mendalam dan saran praktis untuk optimasi budget. Gunakan data historis untuk membuat prediksi akurat dan berikan saran yang spesifik dengan estimasi penghematan."
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
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    aiData = await aiResponse.json();
    
    let analysis;
    let usage;

    if (provider === "claude") {
      analysis = aiData.content[0].text;
      usage = {
        prompt_tokens: aiData.usage?.input_tokens || 0,
        completion_tokens: aiData.usage?.output_tokens || 0,
        total_tokens: (aiData.usage?.input_tokens || 0) + (aiData.usage?.output_tokens || 0)
      };
    } else {
      analysis = aiData.choices[0].message.content;
      usage = aiData.usage || {};
    }

    console.log("AI Budget analysis completed successfully");

    // Log usage to analytics
    const responseTime = Date.now() - startTime;
    await supabaseClient.from("ai_usage_analytics").insert({
      user_id: user.id,
      ai_provider: provider,
      model_name: model,
      tokens_used: usage.total_tokens,
      request_tokens: usage.prompt_tokens,
      response_tokens: usage.completion_tokens,
      cost_estimate: calculateCost(provider, usage),
      response_time_ms: responseTime,
      status: "success",
      function_name: "ai-budget-advisor"
    });

    return new Response(
      JSON.stringify({
        analysis,
        summary: {
          totalExpenses,
          avgMonthlyExpenses,
          totalIncome,
          savingsRate: savingsRate.toFixed(1),
          monthsAnalyzed: Object.keys(expensesByMonth).length,
          expensesByCategory
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-budget-advisor:", error);
    
    // Log failed attempt
    const responseTime = Date.now() - startTime;
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseClient.auth.getUser();
      
        if (user) {
          await supabaseClient.from("ai_usage_analytics").insert({
            user_id: user.id,
            ai_provider: "unknown",
            model_name: "unknown",
            status: "error",
            error_message: error instanceof Error ? error.message : "Unknown error",
            response_time_ms: responseTime,
            function_name: "ai-budget-advisor"
          });
        }
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateCost(provider: string, usage: any): number {
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;

  if (provider === "deepseek") {
    return (promptTokens * 0.00000014 + completionTokens * 0.00000028);
  } else if (provider === "claude") {
    return (promptTokens * 0.000003 + completionTokens * 0.000015);
  } else {
    return (promptTokens * 0.0000001 + completionTokens * 0.0000003);
  }
}