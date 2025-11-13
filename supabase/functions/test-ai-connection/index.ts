import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, apiKey } = await req.json();
    
    console.log("Testing connection for provider:", provider);

    let testResult = false;
    let errorMessage = "";

    switch (provider) {
      case "lovable":
        testResult = true; // Always valid
        break;

      case "gemini":
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: "test" }]
                }]
              })
            }
          );
          testResult = response.ok;
          if (!response.ok) {
            const error = await response.text();
            errorMessage = error;
          }
        } catch (e: any) {
          errorMessage = e.message;
        }
        break;

      case "openai":
        try {
          const response = await fetch("https://api.openai.com/v1/models", {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            }
          });
          testResult = response.ok;
          if (!response.ok) {
            const error = await response.text();
            errorMessage = error;
          }
        } catch (e: any) {
          errorMessage = e.message;
        }
        break;

      case "claude":
        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "claude-3-5-haiku-20241022",
              max_tokens: 10,
              messages: [{ role: "user", content: "test" }]
            })
          });
          testResult = response.ok;
          if (!response.ok) {
            const error = await response.text();
            errorMessage = error;
          }
        } catch (e: any) {
          errorMessage = e.message;
        }
        break;

      case "deepseek":
        try {
          const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [{ role: "user", content: "test" }],
              max_tokens: 10
            })
          });
          testResult = response.ok;
          if (!response.ok) {
            const error = await response.text();
            errorMessage = error;
          }
        } catch (e: any) {
          errorMessage = e.message;
        }
        break;

      case "groq":
        try {
          const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            }
          });
          testResult = response.ok;
          if (!response.ok) {
            const error = await response.text();
            errorMessage = error;
          }
        } catch (e: any) {
          errorMessage = e.message;
        }
        break;

      default:
        throw new Error("Provider tidak dikenal");
    }

    if (!testResult) {
      console.error("Connection test failed:", errorMessage);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage || "API key tidak valid" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Connection test successful for:", provider);
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Test connection error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
