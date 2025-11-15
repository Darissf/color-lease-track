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

    const { image, prompt } = await req.json();
    console.log("Analyzing image with prompt:", prompt);

    const { data: aiSettings } = await supabaseClient
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!aiSettings || !aiSettings.api_key) {
      throw new Error("AI Settings belum dikonfigurasi");
    }

    const provider = aiSettings.ai_provider;
    const apiKey = aiSettings.api_key;

    if (!apiKey) {
      throw new Error("API key tidak ditemukan. Silakan setup di Settings > AI Settings");
    }

    let aiResponse;

    if (provider === "openai") {
      aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt || "What's in this image?" },
                { type: "image_url", image_url: { url: image } }
              ]
            }
          ],
          max_tokens: 1000,
        }),
      });
    } else if (provider === "gemini") {
      aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt || "What's in this image?" },
              { 
                inline_data: {
                  mime_type: image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
                  data: image.split(',')[1]
                }
              }
            ]
          }]
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
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
                    data: image.split(',')[1]
                  }
                },
                {
                  type: "text",
                  text: prompt || "What's in this image?"
                }
              ]
            }
          ]
        }),
      });
    } else {
      throw new Error(`Provider ${provider} belum support vision. Gunakan OpenAI, Gemini, atau Claude.`);
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let analysis;

    if (provider === "gemini") {
      analysis = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    } else if (provider === "claude") {
      analysis = aiData.content?.[0]?.text || "No response";
    } else {
      analysis = aiData.choices[0].message.content;
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
