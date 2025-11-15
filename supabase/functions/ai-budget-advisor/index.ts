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

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Calling Lovable AI for budget analysis...");

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

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;

    console.log("AI Budget analysis completed successfully");

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
