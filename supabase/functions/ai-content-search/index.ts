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

    const { query, filters } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // First get all content from database
    let dbQuery = supabaseClient.from("editable_content").select("*");
    
    if (filters?.page && filters.page !== "all") {
      dbQuery = dbQuery.eq("page", filters.page);
    }
    if (filters?.category && filters.category !== "all") {
      dbQuery = dbQuery.eq("category", filters.category);
    }

    const { data: contents, error: dbError } = await dbQuery;
    if (dbError) throw dbError;

    // Use AI for semantic search
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a semantic search assistant. Given a search query and a list of content items, return the IDs of the most relevant items in order of relevance. Return ONLY a JSON array of IDs."
          },
          {
            role: "user",
            content: `Search query: "${query}"\n\nContent items:\n${JSON.stringify(contents?.map(c => ({ id: c.id, key: c.content_key, value: c.content_value })))}\n\nReturn the top 10 most relevant item IDs as a JSON array.`
          }
        ]
      }),
    });

    const aiData = await aiResponse.json();
    const relevantIds = JSON.parse(aiData.choices[0].message.content);
    
    // Reorder results based on AI ranking
    const rankedResults = relevantIds
      .map((id: string) => contents?.find(c => c.id === id))
      .filter(Boolean);

    return new Response(
      JSON.stringify({ results: rankedResults }),
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
