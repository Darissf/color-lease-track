import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to execute database queries based on AI function calls
async function executeDatabaseFunction(functionName: string, args: any, supabaseClient: any, userId: string) {
  console.log("Executing function:", functionName, "with args:", args);
  
  const limit = args.limit || 50;
  
  switch (functionName) {
    case "query_expenses": {
      let query = supabaseClient
        .from("expenses")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(limit);
      
      if (args.start_date) query = query.gte("date", args.start_date);
      if (args.end_date) query = query.lte("date", args.end_date);
      if (args.category) query = query.eq("category", args.category);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    
    case "query_income": {
      let query = supabaseClient
        .from("income_sources")
        .select("*")
        .eq("user_id", userId)
        .order("received_at", { ascending: false })
        .limit(limit);
      
      if (args.start_date) query = query.gte("received_at", args.start_date);
      if (args.end_date) query = query.lte("received_at", args.end_date);
      if (args.source) query = query.ilike("source", `%${args.source}%`);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    
    case "query_payments": {
      let query = supabaseClient
        .from("payments_tracking")
        .select("*")
        .eq("user_id", userId)
        .order("due_date", { ascending: false })
        .limit(limit);
      
      // Filter berdasarkan paid_date (tanggal dibayar/lunas)
      if (args.start_date) query = query.gte("paid_date", args.start_date);
      if (args.end_date) query = query.lte("paid_date", args.end_date);
      if (args.status) query = query.eq("status", args.status);
      
      const { data, error} = await query;
      if (error) throw error;
      return data;
    }
    
    case "query_rental_contracts": {
      let query = supabaseClient
        .from("rental_contracts")
        .select(`
          *,
          client_group_id (
            nama,
            nomor_telepon
          )
        `)
        .eq("user_id", userId)
        .order("start_date", { ascending: false })
        .limit(limit);
      
      if (args.start_date) query = query.gte("tanggal_lunas", args.start_date);
      if (args.end_date) query = query.lte("tanggal_lunas", args.end_date);
      if (args.status) {
        if (args.status === "lunas") {
          query = query.not("tanggal_lunas", "is", null);
        } else if (args.status === "belum_lunas") {
          query = query.is("tanggal_lunas", null);
        } else {
          query = query.eq("status", args.status);
        }
      }
      if (args.property_name) query = query.ilike("invoice", `%${args.property_name}%`);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

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
      content: `Anda adalah asisten AI yang membantu mengelola keuangan dan properti sewa. 
      
Anda memiliki akses ke database finansial user melalui function calling. Anda bisa:
- Mencari data pengeluaran (expenses)
- Mencari data pemasukan (income_sources, recurring_income)
- Mencari data kontrak sewa (rental_contracts)
- Mencari data pembayaran/invoice (payments_tracking)

Ketika user bertanya tentang data finansial (invoice, pengeluaran, pemasukan, dll), gunakan fungsi yang tersedia untuk mengquery database.

Jawab dalam bahasa Indonesia dengan ramah dan profesional. Sertakan detail spesifik dari data yang Anda temukan.`
    };

    // Define available functions for the AI
    const tools = [
      {
        type: "function",
        function: {
          name: "query_expenses",
          description: "Query data pengeluaran dari database. Bisa filter berdasarkan tanggal, kategori, atau jumlah.",
          parameters: {
            type: "object",
            properties: {
              start_date: { type: "string", description: "Tanggal mulai (YYYY-MM-DD)" },
              end_date: { type: "string", description: "Tanggal akhir (YYYY-MM-DD)" },
              category: { type: "string", description: "Kategori pengeluaran (optional)" },
              limit: { type: "number", description: "Jumlah maksimal hasil (default 50)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_income",
          description: "Query data pemasukan dari database. Bisa filter berdasarkan tanggal, sumber, atau jumlah.",
          parameters: {
            type: "object",
            properties: {
              start_date: { type: "string", description: "Tanggal mulai (YYYY-MM-DD)" },
              end_date: { type: "string", description: "Tanggal akhir (YYYY-MM-DD)" },
              source: { type: "string", description: "Sumber pemasukan (optional)" },
              limit: { type: "number", description: "Jumlah maksimal hasil (default 50)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_rental_contracts",
          description: "Query data kontrak sewa properti/invoice. Bisa filter berdasarkan status lunas/belum lunas atau tanggal lunas. Untuk mencari invoice yang sudah lunas di bulan tertentu, gunakan start_date dan end_date dengan status 'lunas'.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Status: lunas, belum_lunas, atau masa sewa (optional)" },
              property_name: { type: "string", description: "Nama invoice/properti (optional)" },
              start_date: { type: "string", description: "Tanggal lunas mulai untuk filter (YYYY-MM-DD)" },
              end_date: { type: "string", description: "Tanggal lunas akhir untuk filter (YYYY-MM-DD)" },
              limit: { type: "number", description: "Jumlah maksimal hasil (default 50)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "query_payments",
          description: "Query data pembayaran tracking. Bisa filter berdasarkan tanggal paid_date (tanggal dibayar) atau status pembayaran.",
          parameters: {
            type: "object",
            properties: {
              start_date: { type: "string", description: "Tanggal dibayar mulai (YYYY-MM-DD)" },
              end_date: { type: "string", description: "Tanggal dibayar akhir (YYYY-MM-DD)" },
              status: { type: "string", description: "Status pembayaran: paid, pending, overdue (optional)" },
              limit: { type: "number", description: "Jumlah maksimal hasil (default 50)" }
            }
          }
        }
      }
    ];

    // Only lovable provider supports function calling with streaming
    if (provider === "lovable") {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) throw new Error("LOVABLE_API_KEY not configured");

      // First, make a non-streaming call to check for function calls
      const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [systemMessage, ...messages],
          tools: tools,
          tool_choice: "auto",
          stream: false
        }),
      });

      if (!initialResponse.ok) {
        const errorText = await initialResponse.text();
        console.error("Lovable AI error:", initialResponse.status, errorText);
        
        if (initialResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (initialResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        throw new Error(`AI API error: ${initialResponse.status}`);
      }

      const initialData = await initialResponse.json();
      const firstChoice = initialData.choices?.[0];
      
      // Check if AI wants to call functions
      if (firstChoice?.message?.tool_calls && firstChoice.message.tool_calls.length > 0) {
        console.log("AI requested function calls:", firstChoice.message.tool_calls);
        
        // Execute all requested functions
        const functionResults: any[] = [];
        for (const toolCall of firstChoice.message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          try {
            const result = await executeDatabaseFunction(functionName, functionArgs, supabaseClient, user.id);
            functionResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify(result)
            });
          } catch (error: any) {
            console.error("Function execution error:", error);
            functionResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify({ error: error.message })
            });
          }
        }
        
        // Now make a second streaming call with the function results
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              systemMessage,
              ...messages,
              firstChoice.message,
              ...functionResults
            ],
            stream: true
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Lovable AI streaming error:", response.status, errorText);
          throw new Error(`AI API error: ${response.status}`);
        }

        return new Response(response.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } else {
        // No function calls needed, stream directly
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [systemMessage, ...messages],
            stream: true
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Lovable AI streaming error:", response.status, errorText);
          throw new Error(`AI API error: ${response.status}`);
        }

        return new Response(response.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }
    }

    // For other providers, fall back to basic streaming without function calling
    let response;

    switch (provider) {
      case "openai": {
        if (!apiKey) throw new Error("OpenAI API key not configured");
        
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
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
            model: selectedModel,
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
            "Authorization": `Bearer ${apiKey}`,
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
            "Authorization": `Bearer ${apiKey}`,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
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
