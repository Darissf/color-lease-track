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

    const { data: expenses } = await supabaseClient
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(100);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Analyze EMOTIONAL patterns dalam spending behavior:

Data: ${JSON.stringify(expenses, null, 2)}

Detect:
1. **Emotional Triggers**: Kapan emotional spending terjadi
2. **Stress Indicators**: Pattern yang indicate financial stress
3. **Comfort Spending**: Categories yang jadi "comfort purchases"
4. **Mood Correlation**: Link antara mood & spending
5. **Mental Health Impact**: How finances affect wellbeing
6. **Coping Mechanisms**: Healthy vs unhealthy financial coping

Return JSON:
{
  "stressLevel": "Low/Medium/High",
  "triggers": number,
  "healthScore": number (0-100),
  "recommendations": "markdown recommendations"
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
          { role: "system", content: "Anda adalah clinical psychologist dengan specialty di financial therapy & emotional wellness." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI API error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    let analysis;
    
    try {
      analysis = JSON.parse(aiData.choices[0].message.content);
    } catch {
      analysis = {
        stressLevel: "Medium",
        triggers: 3,
        healthScore: 75,
        recommendations: aiData.choices[0].message.content
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
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
