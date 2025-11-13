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
    const { messages, conversationId, model } = await req.json();
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

    console.log("Chat request - user:", user.id, "model:", model, "conversationId:", conversationId);

    const { data: aiSettings } = await supabaseClient
      .from("user_ai_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const provider = aiSettings?.ai_provider || "lovable";
    const apiKey = aiSettings?.api_key;
    const selectedModel = model || "google/gemini-2.5-flash";

    console.log("Using provider:", provider, "model:", selectedModel);

    const systemMessage = {
      role: "system",
      content: "Anda adalah asisten AI yang membantu mengelola keuangan dan properti sewa. Anda bisa menjawab pertanyaan tentang pengeluaran, pemasukan, kontrak sewa, dan memberikan saran finansial. Jawab dalam bahasa Indonesia dengan ramah dan profesional."
    };

    // For Claude, we need to convert the stream format
    if (provider === "claude") {
      if (!apiKey) throw new Error("Claude API key not configured");
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 4096,
          system: systemMessage.content,
          messages: messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Claude API error:", response.status, errorText);
        throw new Error(`Claude API error: ${response.status}`);
      }

      // Create a transform stream to convert Claude SSE to OpenAI format
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        try {
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data:")) {
                const data = line.slice(5).trim();
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  
                  if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                    // Convert Claude format to OpenAI format
                    const openAIFormat = {
                      choices: [{
                        delta: {
                          content: parsed.delta.text
                        }
                      }]
                    };
                    await writer.write(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
                  }
                } catch (e) {
                  console.error("Error parsing Claude SSE:", e);
                }
              }
            }
          }

          await writer.write(encoder.encode("data: [DONE]\n\n"));
          await writer.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          await writer.abort(error);
        }
      })();

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // For other providers (OpenAI format compatible)
    let response;

    switch (provider) {
      case "lovable": {
        const key = Deno.env.get("LOVABLE_API_KEY");
        if (!key) throw new Error("LOVABLE_API_KEY not configured");
        
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [systemMessage, ...messages],
            stream: true,
          }),
        });
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
            model: selectedModel,
            messages: [systemMessage, ...messages],
            stream: true,
          }),
        });
        break;
      }

      case "gemini": {
        if (!apiKey) throw new Error("Gemini API key not configured");
        
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: systemMessage.content + "\n\n" + messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")
              }]
            }]
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
            model: selectedModel,
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
            model: selectedModel,
            messages: [systemMessage, ...messages],
            stream: true,
          }),
        });
        break;
      }

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    if (!response!.ok) {
      const errorText = await response!.text();
      console.error("AI API error:", response!.status, errorText);
      throw new Error(`AI API error: ${response!.status}`);
    }

    return new Response(response!.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });

  } catch (error: any) {
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});