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

    const { action, conversationId, messages } = await req.json();
    console.log("Memory action:", action);

    if (action === "extract") {
      // Extract memories from conversation
      const { data: aiSettings } = await supabaseClient
        .from("user_ai_settings")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!aiSettings || !aiSettings.api_key) {
        throw new Error("AI Settings not configured");
      }

      const provider = aiSettings.ai_provider;
      const apiKey = aiSettings.api_key;

      const systemPrompt = `Extract important memories from this conversation. Return a JSON array of memories with format:
[
  {
    "type": "preference|fact|context",
    "content": "memory content",
    "importance": 1-10
  }
]

Focus on:
- User preferences and habits
- Important facts about the user
- Context that would be useful for future conversations`;

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
              { role: "system", content: systemPrompt },
              { role: "user", content: JSON.stringify(messages) }
            ],
            temperature: 0.3,
          }),
        });
      } else if (provider === "deepseek") {
        aiResponse = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: JSON.stringify(messages) }
            ],
            temperature: 0.3,
          }),
        });
      } else {
        throw new Error("Unsupported provider");
      }

      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const memoriesText = aiData.choices[0].message.content;
      
      let memories;
      try {
        memories = JSON.parse(memoriesText);
      } catch {
        memories = [];
      }

      // Save memories to database
      for (const memory of memories) {
        await supabaseClient
          .from("ai_memory")
          .insert({
            user_id: user.id,
            conversation_id: conversationId,
            memory_type: memory.type,
            content: memory.content,
            importance: memory.importance,
          });
      }

      return new Response(
        JSON.stringify({ memories, count: memories.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "retrieve") {
      // Retrieve relevant memories
      const { data: memories } = await supabaseClient
        .from("ai_memory")
        .select("*")
        .eq("user_id", user.id)
        .order("importance", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(
        JSON.stringify({ memories }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
