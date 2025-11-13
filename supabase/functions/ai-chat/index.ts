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
    const { messages } = await req.json();
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("Received chat request from user:", user.id, "with", messages.length, "messages");

    // Get active AI provider settings
    const { data: aiSettings, error: settingsError } = await supabaseClient
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching AI settings:", settingsError);
    }

    // Default to Lovable AI if no settings or provider is lovable
    const provider = aiSettings?.ai_provider || "lovable";
    const apiKey = aiSettings?.api_key;

    console.log("Using AI provider:", provider);

    // Route to appropriate provider
    let response;
    const systemMessage = {
      role: "system",
      content: "Anda adalah asisten AI yang membantu mengelola keuangan dan properti sewa. Anda bisa menjawab pertanyaan tentang pengeluaran, pemasukan, kontrak sewa, dan memberikan saran finansial. Jawab dalam bahasa Indonesia dengan ramah dan profesional."
    };

    switch (provider) {
      case "lovable":
      case "gemini": {
        const endpoint = provider === "lovable" 
          ? "https://ai.gateway.lovable.dev/v1/chat/completions"
          : "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent";
        
        const key = provider === "lovable" 
          ? Deno.env.get("LOVABLE_API_KEY")
          : apiKey;

        if (!key) {
          throw new Error(`${provider === "lovable" ? "LOVABLE_API_KEY" : "Gemini API key"} is not configured`);
        }

        if (provider === "lovable") {
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [systemMessage, ...messages],
              stream: true,
            }),
          });
        } else {
          // Gemini native API
          const geminiMessages = messages.map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }));
          
          response = await fetch(`${endpoint}?key=${key}&alt=sse`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                { role: "user", parts: [{ text: systemMessage.content }] },
                ...geminiMessages
              ],
            }),
          });
        }
        break;
      }

      case "openai": {
        if (!apiKey) throw new Error("OpenAI API key not configured");
        
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [systemMessage, ...messages],
            stream: true,
          }),
        });
        break;
      }

      case "claude": {
        if (!apiKey) throw new Error("Claude API key not configured");
        
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 4096,
            system: systemMessage.content,
            messages: messages,
            stream: true,
          }),
        });
        break;
      }

      case "deepseek": {
        if (!apiKey) throw new Error("DeepSeek API key not configured");
        
        response = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [systemMessage, ...messages],
            stream: true,
          }),
        });
        break;
      }

      case "groq": {
        if (!apiKey) throw new Error("Groq API key not configured");
        
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [systemMessage, ...messages],
            stream: true,
          }),
        });
        break;
      }

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Terlalu banyak request, coba lagi nanti." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        console.error("Payment required - credits depleted");
        return new Response(
          JSON.stringify({ error: "Kredit AI habis, silakan isi ulang." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Terjadi kesalahan pada AI API" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Streaming response from AI provider:", provider);
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error" 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
