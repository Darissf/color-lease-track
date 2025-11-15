import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function: Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

// Helper function: Find best match from a list of strings
function findBestMatch(input: string, candidates: string[], threshold: number = 3): string | null {
  if (!input || candidates.length === 0) return null;
  
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(input, candidate);
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

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
      
      // Fuzzy matching untuk kategori
      if (args.category) {
        // First try exact match
        const exactQuery = supabaseClient
          .from("expenses")
          .select("category")
          .eq("user_id", userId);
        
        const { data: allCategories } = await exactQuery;
        const uniqueCategories = [...new Set(allCategories?.map((e: any) => e.category).filter(Boolean) || [])] as string[];
        
        // Find best match using fuzzy matching
        const bestMatch = findBestMatch(args.category, uniqueCategories, 3);
        const categoryToUse = bestMatch || args.category;
        
        console.log(`Category fuzzy match: "${args.category}" -> "${categoryToUse}"`);
        query = query.eq("category", categoryToUse);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    
    case "query_income": {
      let query = supabaseClient
        .from("income_sources")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(limit);
      
      if (args.start_date) query = query.gte("date", args.start_date);
      if (args.end_date) query = query.lte("date", args.end_date);
      
      // Fuzzy matching untuk source name
      if (args.source) {
        const { data: allSources } = await supabaseClient
          .from("income_sources")
          .select("source_name")
          .eq("user_id", userId);
        
        const uniqueSources = [...new Set(allSources?.map((s: any) => s.source_name).filter(Boolean) || [])] as string[];
        const bestMatch = findBestMatch(args.source, uniqueSources, 3);
        
        if (bestMatch) {
          console.log(`Source fuzzy match: "${args.source}" -> "${bestMatch}"`);
          query = query.eq("source_name", bestMatch);
        } else {
          // Fallback to partial match if no fuzzy match found
          query = query.ilike("source_name", `%${args.source}%`);
        }
      }
      
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
    
    case "query_client_groups": {
      // Improve search: treat "client" as "kelompok" and ignore honorifics like bu/ibu/pak/ny/mas/mba
      const sanitize = (s: string) =>
        (s || "")
          .toLowerCase()
          .replaceAll(".", " ")
          .replace(/^(bu|ibu|pak|bapak|bp|bpk|ny|nyonya|mba|mbak|mas|tuan)\s+/i, "")
          .trim();

      const nameTerm: string | undefined = args.name;
      const phoneTerm: string | undefined = args.phone;

      let query = supabaseClient
        .from("client_groups")
        .select("id, nama, nomor_telepon, has_whatsapp, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (nameTerm || phoneTerm) {
        const filters: string[] = [];
        
        if (nameTerm) {
          // Try fuzzy matching first
          const { data: allClients } = await supabaseClient
            .from("client_groups")
            .select("nama")
            .eq("user_id", userId);
          
          const uniqueNames = [...new Set(allClients?.map((c: any) => c.nama).filter(Boolean) || [])] as string[];
          const bestMatch = findBestMatch(nameTerm, uniqueNames, 4);
          
          if (bestMatch) {
            console.log(`Client name fuzzy match: "${nameTerm}" -> "${bestMatch}"`);
            filters.push(`nama.eq.${bestMatch}`);
          } else {
            // Fallback to original flexible matching
            const raw = nameTerm;
            const clean = sanitize(nameTerm);
            filters.push(`nama.ilike.%${raw}%`);
            if (clean && clean !== raw.toLowerCase()) {
              filters.push(`nama.ilike.%${clean}%`);
            }
          }
        }
        
        if (phoneTerm) {
          filters.push(`nomor_telepon.ilike.%${phoneTerm}%`);
        }
        
        if (filters.length > 0) {
          // Combine OR filters for broader matching
          query = query.or(filters.join(","));
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    
    case "count_client_group_orders": {
      const sanitize = (s: string) =>
        (s || "")
          .toLowerCase()
          .replaceAll(".", " ")
          .replace(/^(bu|ibu|pak|bapak|bp|bpk|ny|nyonya|mba|mbak|mas|tuan)\s+/i, "")
          .trim();

      const nameTerm: string = args.name || "";
      const clean = sanitize(nameTerm);

      // 1) find matching client groups
      let cgQuery = supabaseClient
        .from("client_groups")
        .select("id, nama, nomor_telepon")
        .eq("user_id", userId)
        .limit(100);

      const cgFilters: string[] = [];
      if (nameTerm) {
        cgFilters.push(`nama.ilike.%${nameTerm}%`);
        if (clean && clean !== nameTerm.toLowerCase()) {
          cgFilters.push(`nama.ilike.%${clean}%`);
        }
      }
      if (cgFilters.length > 0) cgQuery = cgQuery.or(cgFilters.join(","));

      const { data: groups, error: groupsError } = await cgQuery;
      if (groupsError) throw groupsError;
      if (!groups || groups.length === 0) {
        return { matches: [], total_orders: 0 };
      }

      const ids = groups.map((g: any) => g.id);

      // 2) fetch rental contracts for these groups
      let rcQuery = supabaseClient
        .from("rental_contracts")
        .select("id, client_group_id, status, tanggal_lunas")
        .eq("user_id", userId)
        .in("client_group_id", ids);

      if (args.status) {
        if (args.status === "lunas") {
          rcQuery = rcQuery.not("tanggal_lunas", "is", null);
        } else if (args.status === "belum_lunas") {
          rcQuery = rcQuery.is("tanggal_lunas", null);
        } else {
          rcQuery = rcQuery.eq("status", args.status);
        }
      }

      const { data: contracts, error: rcError } = await rcQuery;
      if (rcError) throw rcError;

      const byGroup: Record<string, { orders_total: number; orders_lunas: number; orders_belum_lunas: number; }> = {};
      for (const g of groups) {
        byGroup[g.id] = { orders_total: 0, orders_lunas: 0, orders_belum_lunas: 0 };
      }
      for (const rc of contracts ?? []) {
        const entry = byGroup[rc.client_group_id];
        if (!entry) continue;
        entry.orders_total += 1;
        if (rc.tanggal_lunas) entry.orders_lunas += 1;
        else entry.orders_belum_lunas += 1;
      }

      const matches = groups.map((g: any) => ({
        group_id: g.id,
        nama: g.nama,
        nomor_telepon: g.nomor_telepon,
        ...byGroup[g.id],
      }));
      const total_orders = matches.reduce((acc: number, m: any) => acc + m.orders_total, 0);
      return { matches, total_orders };
    }
    
    case "top_client_income": {
      // Hitung total pemasukan dari client_groups berdasarkan jumlah_lunas di rental_contracts
      // Optional: filter by date range (tanggal_lunas)
      
      // 1) Fetch all rental contracts with jumlah_lunas > 0
      let rcQuery = supabaseClient
        .from("rental_contracts")
        .select("client_group_id, jumlah_lunas, tanggal_lunas, client_group_id(nama, nomor_telepon)")
        .eq("user_id", userId)
        .not("jumlah_lunas", "is", null)
        .gt("jumlah_lunas", 0);
      
      // Filter by date if provided
      if (args.start_date) rcQuery = rcQuery.gte("tanggal_lunas", args.start_date);
      if (args.end_date) rcQuery = rcQuery.lte("tanggal_lunas", args.end_date);
      
      const { data: contracts, error: rcError } = await rcQuery;
      if (rcError) throw rcError;
      
      if (!contracts || contracts.length === 0) {
        return { ranking: [], top_client: null, total_income: 0 };
      }
      
      // 2) Aggregate by client_group_id
      const incomeByClient: Record<string, { 
        client_group_id: string; 
        nama: string; 
        nomor_telepon: string; 
        total_income: number; 
        order_count: number;
      }> = {};
      
      for (const rc of contracts) {
        const clientId = rc.client_group_id;
        const clientData = rc.client_group_id as any;
        const income = Number(rc.jumlah_lunas) || 0;
        
        if (!incomeByClient[clientId]) {
          incomeByClient[clientId] = {
            client_group_id: clientId,
            nama: clientData?.nama || "Unknown",
            nomor_telepon: clientData?.nomor_telepon || "",
            total_income: 0,
            order_count: 0,
          };
        }
        
        incomeByClient[clientId].total_income += income;
        incomeByClient[clientId].order_count += 1;
      }
      
      // 3) Sort by total_income descending
      const ranking = Object.values(incomeByClient).sort((a, b) => b.total_income - a.total_income);
      const top_client = ranking.length > 0 ? ranking[0] : null;
      const total_income = ranking.reduce((sum, c) => sum + c.total_income, 0);
      
      return { ranking, top_client, total_income };
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
6. **DILARANG KERAS menampilkan tool_calls, tool__sep, atau markup function calling ke user**

**KEMAMPUAN FUZZY MATCHING:**
Sistem ini dapat mendeteksi dan memperbaiki typo/kesalahan ketik secara otomatis:
- "Lawang Bhuana" akan dikenali sebagai "Lawang Buana"
- "Perawtan" akan dikenali sebagai "Perawatan"
- "Transfortasi" akan dikenali sebagai "Transportasi"
Jika user salah ketik, sistem akan otomatis mencari kategori/nama yang paling mirip.

**TERMINOLOGI PENTING:**
- "client" / "klien" / "pelanggan" / "kelompok" = client_groups (tabel kelompok client)
- "orderan" / "pesanan" / "kontrak sewa" = rental_contracts (tabel kontrak)
- Ketika user tanya "berapa orderan [nama]", gunakan count_client_group_orders
- Ketika user tanya "siapa aja client" atau "cari client", gunakan query_client_groups
- Ketika user tanya "client paling banyak pemasukan" atau "client terbesar", gunakan top_client_income

Anda memiliki akses ke database finansial user melalui function calling:
      - query_expenses: Data pengeluaran (dengan fuzzy matching untuk kategori)
      - query_income: Data pemasukan (dengan fuzzy matching untuk source_name)
      - query_rental_contracts: Data kontrak sewa/invoice
      - query_payments: Data pembayaran tracking
      - query_client_groups: Data client/kelompok (nama dan nomor telepon, dengan fuzzy matching)
      - count_client_group_orders: Hitung total orderan untuk sebuah kelompok client
      - top_client_income: Ranking client berdasarkan total pemasukan (jumlah_lunas)

**CARA MENJAWAB:**
1. Gunakan function call untuk query data
2. HANYA tampilkan data yang BENAR-BENAR dikembalikan dari database
3. Jika data kosong: "Tidak ada data [x] untuk periode [y]"
4. Tampilkan detail spesifik: invoice number, nama client sebenarnya, jumlah exact
5. JANGAN tampilkan markup function calling (tool__calls__begin, tool__sep, dll)
6. Jika sistem mengoreksi typo, sebutkan dengan natural (contoh: "Saya menemukan data untuk kategori 'Lawang Buana'...")

**LARANGAN KERAS:**
❌ Jangan buat nama client palsu
❌ Jangan buat angka dari asumsi
❌ Jangan tambah detail yang tidak ada di hasil query
❌ Jangan kasih contoh/ilustrasi data
❌ Jangan tampilkan tool_calls atau markup function calling

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
      },
      {
        type: "function",
        function: {
          name: "query_client_groups",
          description: "Query data client (grup/kelompok) berdasarkan nama atau nomor telepon. Mengabaikan gelar seperti bu/ibu/pak/mas/mba secara otomatis.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nama client (bisa partial, ignores honorifics)" },
              phone: { type: "string", description: "Nomor telepon (opsional, bisa partial)" },
              limit: { type: "number", description: "Jumlah maksimal hasil (default 50)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "count_client_group_orders",
          description: "Hitung total orderan (rental contracts) untuk sebuah kelompok client berdasarkan nama. Gunakan ini ketika user menanyakan 'berapa orderan', 'jumlah pesanan', atau 'count orders' untuk client/kelompok tertentu.",
          parameters: {
            type: "object",
            properties: {
              name: { 
                type: "string", 
                description: "Nama kelompok client yang dicari (e.g., 'bu nabila', 'nabila'). Gelar seperti bu/pak akan diabaikan otomatis." 
              },
              status: { 
                type: "string", 
                description: "Opsional: filter berdasarkan status - 'lunas' (sudah dibayar), 'belum_lunas' (belum dibayar), 'aktif', 'selesai', 'dibatalkan'" 
              }
            },
            required: ["name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "top_client_income",
          description: "Dapatkan ranking client berdasarkan total pemasukan (jumlah_lunas dari rental_contracts). Gunakan ketika user tanya 'client paling banyak pemasukan', 'client terbesar', 'siapa client tertinggi', dll. Bisa filter berdasarkan periode tanggal.",
          parameters: {
            type: "object",
            properties: {
              start_date: { 
                type: "string", 
                description: "Tanggal mulai filter (YYYY-MM-DD), opsional. Filter berdasarkan tanggal_lunas" 
              },
              end_date: { 
                type: "string", 
                description: "Tanggal akhir filter (YYYY-MM-DD), opsional. Filter berdasarkan tanggal_lunas" 
              }
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
