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
    if (!authHeader) throw new Error("Authorization required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { content, action } = await req.json();

    // Fetch user's AI settings
    const { data: aiSettings } = await supabaseClient
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const provider = aiSettings?.ai_provider || "lovable";
    const apiKey = aiSettings?.api_key || Deno.env.get("LOVABLE_API_KEY");
    const model = aiSettings?.model_name || "google/gemini-2.5-flash-lite";

    console.log("Content assistant - Using provider:", provider, "model:", model);

    // Define prompts for different actions
    const prompts: Record<string, string> = {
      grammar: "Fix all grammar, spelling, and punctuation errors in this text. Return ONLY the corrected text.",
      formal: "Rewrite this text in a formal, professional tone. Maintain the same meaning but use more formal language.",
      casual: "Rewrite this text in a casual, friendly tone. Keep it conversational and approachable.",
      translate: "Translate this text to English. If it's already in English, translate to Indonesian.",
      seo: "Optimize this text for SEO. Make it more keyword-rich and engaging while maintaining readability.",
      expand: "Expand this text with more details and context. Make it 50% longer while maintaining the core message.",
      simplify: "Simplify this text. Make it shorter and easier to understand, removing unnecessary complexity."
    };

    const systemPrompt = prompts[action] || prompts.grammar;

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
            { role: "system", content: systemPrompt },
            { role: "user", content: content }
          ]
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
            { role: "user", content: `${systemPrompt}\n\n${content}` }
          ]
        }),
      });
    } else {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: content }
          ]
        }),
      });
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API returned ${aiResponse.status}`);
    }

    aiData = await aiResponse.json();
    
    let suggested;
    let usage;

    if (provider === "claude") {
      suggested = aiData.content[0].text;
      usage = {
        prompt_tokens: aiData.usage?.input_tokens || 0,
        completion_tokens: aiData.usage?.output_tokens || 0,
        total_tokens: (aiData.usage?.input_tokens || 0) + (aiData.usage?.output_tokens || 0)
      };
    } else {
      suggested = aiData.choices[0].message.content;
      usage = aiData.usage || {};
    }

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
      function_name: "ai-content-assistant"
    });

    return new Response(
      JSON.stringify({
        original: content,
        suggested: suggested,
        confidence: 0.85,
        action: action
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    
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
            function_name: "ai-content-assistant"
          });
        }
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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