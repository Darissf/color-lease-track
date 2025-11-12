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
    const { phoneNumber, test, test_api_key, test_provider } = await req.json();
    
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let aiSettings;
    
    // If this is a test call, use provided credentials
    if (test && test_api_key && test_provider) {
      aiSettings = {
        ai_provider: test_provider,
        api_key: test_api_key,
      };
    } else {
      // Get user's AI settings from database
      const { data, error: settingsError } = await supabase
        .from("user_ai_settings")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (settingsError || !data) {
        return new Response(
          JSON.stringify({ 
            error: "AI settings not configured. Please configure your AI API key in settings." 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      aiSettings = data;
    }

    // Prepare prompt for AI
    const prompt = `Analisis nomor telepon Indonesia ini dan prediksi apakah kemungkinan memiliki WhatsApp terinstal.

Nomor telepon: ${phoneNumber}

Pertimbangkan faktor-faktor berikut:
1. Operator seluler Indonesia (Telkomsel, Indosat, XL, Tri, Smartfren, dll)
2. Format dan validitas nomor
3. Pola nomor seluler vs telepon rumah
4. Pola penggunaan WhatsApp yang umum di Indonesia

Berikan response dalam format JSON dengan penjelasan dalam BAHASA INDONESIA:
{
  "has_whatsapp": true/false,
  "confidence": "high"/"medium"/"low",
  "reason": "penjelasan singkat dalam bahasa Indonesia"
}`;

    let aiResponse;
    let hasWhatsApp = false;
    let confidence = "low";
    let reason = "";

    // Call appropriate AI API based on provider
    if (aiSettings.ai_provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${aiSettings.api_key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 200,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        
        if (response.status === 429) {
          throw new Error("Gemini API quota exceeded. Please check your API key quota at ai.google.dev/usage or try a different provider.");
        }
        throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      aiResponse = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));

    } else if (aiSettings.ai_provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${aiSettings.api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Kamu adalah analis nomor telepon. Berikan response hanya dalam format JSON yang valid." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", errorText);
        
        if (response.status === 429) {
          throw new Error("OpenAI API rate limit exceeded. Please check your API key quota or try again later.");
        }
        if (response.status === 401) {
          throw new Error("OpenAI API key invalid. Please check your API key in settings.");
        }
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      aiResponse = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));

    } else if (aiSettings.ai_provider === "claude") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": aiSettings.api_key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 200,
          temperature: 0.3,
          messages: [{
            role: "user",
            content: prompt
          }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Claude API error:", errorText);
        
        if (response.status === 429) {
          throw new Error("Claude API rate limit exceeded. Please check your API key quota or try again later.");
        }
        if (response.status === 401) {
          throw new Error("Claude API key invalid. Please check your API key in settings.");
        }
        throw new Error(`Claude API error (${response.status}): ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || "{}";
      aiResponse = JSON.parse(text.replace(/```json\n?|\n?```/g, ""));
    }

    hasWhatsApp = aiResponse?.has_whatsapp || false;
    confidence = aiResponse?.confidence || "low";
    reason = aiResponse?.reason || "No analysis available";

    console.log("AI Analysis:", { phoneNumber, hasWhatsApp, confidence, reason });

    return new Response(
      JSON.stringify({ 
        has_whatsapp: hasWhatsApp,
        confidence,
        reason,
        checked_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in validate-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});