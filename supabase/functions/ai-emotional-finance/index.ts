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

    const { data: expenses } = await supabaseClient
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(100);

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
          { role: "system", content: "Anda adalah clinical psychologist dengan specialty di financial therapy & emotional wellness." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
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
          { role: "system", content: "Anda adalah clinical psychologist dengan specialty di financial therapy & emotional wellness." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
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
