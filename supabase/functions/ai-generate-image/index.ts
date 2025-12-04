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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, model = "imagen-3.0-generate-002" } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Gemini API key
    const { data: aiSettings, error: settingsError } = await supabaseClient
      .from("user_ai_settings")
      .select("api_key")
      .eq("user_id", user.id)
      .eq("ai_provider", "gemini")
      .maybeSingle();

    if (settingsError || !aiSettings?.api_key) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured. Please add it in AI Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = aiSettings.api_key;
    let imageBase64: string | null = null;

    console.log(`Generating image with model: ${model}, prompt: ${prompt.substring(0, 50)}...`);

    if (model === "imagen-3.0-generate-002") {
      // Use Imagen 3 API
      const imagenResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
              personGeneration: "ALLOW_ADULT",
            },
          }),
        }
      );

      if (!imagenResponse.ok) {
        const errorText = await imagenResponse.text();
        console.error("Imagen API error:", errorText);
        
        // Fallback to Gemini if Imagen fails
        console.log("Falling back to Gemini 2.0 Flash...");
        const geminiResult = await generateWithGemini(apiKey, prompt);
        if (geminiResult) {
          imageBase64 = geminiResult;
        } else {
          throw new Error(`Imagen API error: ${errorText}`);
        }
      } else {
        const imagenData = await imagenResponse.json();
        console.log("Imagen response structure:", JSON.stringify(Object.keys(imagenData)));
        
        if (imagenData.predictions && imagenData.predictions[0]?.bytesBase64Encoded) {
          imageBase64 = `data:image/png;base64,${imagenData.predictions[0].bytesBase64Encoded}`;
        } else {
          console.error("Unexpected Imagen response:", JSON.stringify(imagenData));
          throw new Error("No image data in Imagen response");
        }
      }
    } else {
      // Use Gemini 2.0 Flash with image output
      const geminiResult = await generateWithGemini(apiKey, prompt);
      if (geminiResult) {
        imageBase64 = geminiResult;
      } else {
        throw new Error("Failed to generate image with Gemini");
      }
    }

    return new Response(
      JSON.stringify({ 
        imageBase64,
        model,
        prompt 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateWithGemini(apiKey: string, prompt: string): Promise<string | null> {
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate an image based on this description: ${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    console.error("Gemini API error:", errorText);
    return null;
  }

  const geminiData = await geminiResponse.json();
  console.log("Gemini response structure:", JSON.stringify(Object.keys(geminiData)));

  // Look for inline data in response
  if (geminiData.candidates && geminiData.candidates[0]?.content?.parts) {
    for (const part of geminiData.candidates[0].content.parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  console.error("No image found in Gemini response:", JSON.stringify(geminiData));
  return null;
}
