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

    const { content, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const suggested = aiData.choices[0].message.content;

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
