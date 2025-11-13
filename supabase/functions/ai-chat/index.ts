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

**ATURAN PENTING - WAJIB DIPATUHI:**
1. HANYA gunakan data ASLI dari hasil function call
2. JANGAN PERNAH membuat/mengada-ada nama, angka, atau detail yang tidak ada di database
3. Jika data kosong atau tidak ditemukan, katakan dengan jelas "Tidak ada data ditemukan"
4. JANGAN mengarang contoh atau ilustrasi data
5. Jika hasil query kosong, STOP dan beritahu user bahwa data tidak tersedia

Anda memiliki akses ke database finansial user melalui function calling:
- query_expenses: Data pengeluaran
- query_income: Data pemasukan  
- query_rental_contracts: Data kontrak sewa/invoice
- query_payments: Data pembayaran tracking

**CARA MENJAWAB:**
1. Gunakan function call untuk query data
2. HANYA tampilkan data yang BENAR-BENAR dikembalikan dari database
3. Jika data kosong: "Tidak ada data [x] untuk periode [y]"
4. Tampilkan detail spesifik: invoice number, nama client sebenarnya, jumlah exact

**LARANGAN KERAS:**
❌ Jangan buat nama client palsu
❌ Jangan buat angka dari asumsi
❌ Jangan tambah detail yang tidak ada di hasil query
❌ Jangan kasih contoh/ilustrasi data

Jawab dalam bahasa Indonesia dengan ramah dan profesional.`
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
          description: "Query data kontrak sewa properti/invoice dari DATABASE. WAJIB gunakan data exact dari hasil query. JANGAN tambah/ubah informasi. Untuk mencari invoice yang sudah lunas di bulan tertentu, gunakan start_date dan end_date dengan status 'lunas'.",
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

    // Function calling support for compatible providers
    const supportsFunctionCalling = ["lovable", "openai", "claude", "deepseek"].includes(provider);

    if (supportsFunctionCalling) {
      // Step 1: Make initial non-streaming call to check for function calls
      let initialResponse;
      
      if (provider === "lovable") {
        const key = Deno.env.get("LOVABLE_API_KEY");
        if (!key) throw new Error("LOVABLE_API_KEY not configured");
        
        initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [systemMessage, ...messages],
            tools: tools,
            tool_choice: "auto",
            stream: false
          })
        });
      } else if (provider === "openai") {
        if (!apiKey) throw new Error("OpenAI API key not configured");
        
        initialResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [systemMessage, ...messages],
            tools: tools,
            tool_choice: "auto",
            stream: false
          })
        });
      } else if (provider === "claude") {
        if (!apiKey) throw new Error("Claude API key not configured");
        
        const claudeTools = tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters
        }));
        
        initialResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: selectedModel,
            max_tokens: 4096,
            system: systemMessage.content,
            messages: messages,
            tools: claudeTools
          })
        });
      } else if (provider === "deepseek") {
        if (!apiKey) throw new Error("DeepSeek API key not configured");
        
        initialResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [systemMessage, ...messages],
            tools: tools,
            tool_choice: "auto",
            stream: false
          })
        });
      }

      if (!initialResponse || !initialResponse.ok) {
        const errorText = await initialResponse?.text();
        console.error(`${provider} AI error:`, initialResponse?.status, errorText);
        
        if (initialResponse?.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        throw new Error(`AI API error: ${initialResponse?.status}`);
      }

      const initialData = await initialResponse.json();
      
      // Step 2: Parse function calls based on provider format
      let toolCalls: any[] = [];
      let assistantMessage: any;
      
      if (provider === "claude") {
        if (initialData.content) {
          for (const block of initialData.content) {
            if (block.type === "tool_use") {
              toolCalls.push({
                id: block.id,
                name: block.name,
                input: block.input
              });
            }
          }
        }
        assistantMessage = initialData;
      } else {
        const firstChoice = initialData.choices?.[0];
        if (firstChoice?.message?.tool_calls) {
          toolCalls = firstChoice.message.tool_calls;
        }
        assistantMessage = firstChoice?.message;
      }
      
      // Step 3: Execute function calls if any
      if (toolCalls.length > 0) {
        console.log(`${provider} requested ${toolCalls.length} function calls`);
        
        const functionResults: any[] = [];
        for (const toolCall of toolCalls) {
          const functionName = provider === "claude" ? toolCall.name : toolCall.function.name;
          const functionArgs = provider === "claude" ? toolCall.input : JSON.parse(toolCall.function.arguments);
          
          try {
            const result = await executeDatabaseFunction(functionName, functionArgs, supabaseClient, user.id);
            console.log(`Function ${functionName} returned ${result?.length || 0} rows`);
            
            if (provider === "claude") {
              functionResults.push({
                type: "tool_result",
                tool_use_id: toolCall.id,
                content: JSON.stringify(result)
              });
            } else {
              functionResults.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: functionName,
                content: JSON.stringify(result)
              });
            }
          } catch (error: any) {
            console.error("Function execution error:", error);
            
            if (provider === "claude") {
              functionResults.push({
                type: "tool_result",
                tool_use_id: toolCall.id,
                content: JSON.stringify({ error: error.message }),
                is_error: true
              });
            } else {
              functionResults.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: functionName,
                content: JSON.stringify({ error: error.message })
              });
            }
          }
        }
        
        // Step 4: Make second streaming call with function results
        let streamResponse;
        
        if (provider === "lovable") {
          const key = Deno.env.get("LOVABLE_API_KEY");
          streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [systemMessage, ...messages, assistantMessage, ...functionResults],
              stream: true
            })
          });
        } else if (provider === "openai") {
          streamResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [systemMessage, ...messages, assistantMessage, ...functionResults],
              stream: true
            })
          });
        } else if (provider === "claude") {
          const claudeMessages = [...messages, {
            role: "assistant",
            content: initialData.content
          }, {
            role: "user",
            content: functionResults
          }];
          
          streamResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: selectedModel,
              max_tokens: 4096,
              system: systemMessage.content,
              messages: claudeMessages,
              stream: true
            })
          });
        } else if (provider === "deepseek") {
          streamResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [systemMessage, ...messages, assistantMessage, ...functionResults],
              stream: true
            })
          });
        }

        if (!streamResponse || !streamResponse.ok) {
          throw new Error(`Streaming error: ${streamResponse?.status}`);
        }

        return new Response(streamResponse.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      } else {
        // No function calls, stream directly
        let streamResponse;
        
        if (provider === "lovable") {
          const key = Deno.env.get("LOVABLE_API_KEY");
          streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [systemMessage, ...messages],
              stream: true
            })
          });
        } else if (provider === "openai") {
          streamResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [systemMessage, ...messages],
              stream: true
            })
          });
        } else if (provider === "claude") {
          streamResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: selectedModel,
              max_tokens: 4096,
              system: systemMessage.content,
              messages: messages,
              stream: true
            })
          });
        } else if (provider === "deepseek") {
          streamResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [systemMessage, ...messages],
              stream: true
            })
          });
        }

        if (!streamResponse || !streamResponse.ok) {
          throw new Error(`Streaming error: ${streamResponse?.status}`);
        }

        return new Response(streamResponse.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      }
    }

    // For providers without function calling (gemini, groq)
    let response;

    if (provider === "gemini") {
      if (!apiKey) throw new Error("Gemini API key not configured");
      
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: systemMessage.content + "\n\n" + messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")
            }]
          }]
        })
      });
    } else if (provider === "groq") {
      if (!apiKey) throw new Error("Groq API key not configured");
      
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [systemMessage, ...messages],
          stream: true
        })
      });
    } else {
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
        "Connection": "keep-alive"
      }
    });

  } catch (error: any) {
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
