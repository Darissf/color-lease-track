import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const VPS_PDF_URL = 'http://194.163.144.205:3000/generate-pdf';
const PDF_API_KEY = 'rahasia123';
const VPS_TIMEOUT_MS = 90000; // 90 seconds timeout

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📡 [generate-pdf-proxy] Request received");
    
    const { htmlContent, fileName } = await req.json();
    
    if (!htmlContent) {
      console.error("❌ [generate-pdf-proxy] htmlContent is empty");
      return new Response(
        JSON.stringify({ error: 'htmlContent is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📡 [generate-pdf-proxy] HTML length: ${htmlContent.length} chars, fileName: ${fileName}`);
    console.log("📡 [generate-pdf-proxy] Forwarding to VPS:", VPS_PDF_URL);
    console.log(`📡 [generate-pdf-proxy] Timeout set to ${VPS_TIMEOUT_MS / 1000} seconds`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("⏰ [generate-pdf-proxy] Timeout reached, aborting request...");
      controller.abort();
    }, VPS_TIMEOUT_MS);

    try {
      // Forward request to VPS PDF server with timeout
      const response = await fetch(VPS_PDF_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/pdf',
        },
        body: JSON.stringify({
          htmlContent,
          apiKey: PDF_API_KEY,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📡 [generate-pdf-proxy] VPS response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [generate-pdf-proxy] VPS error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: `VPS error: ${response.status} - ${errorText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get PDF as array buffer
      const pdfBuffer = await response.arrayBuffer();
      console.log(`✅ [generate-pdf-proxy] PDF received, size: ${pdfBuffer.byteLength} bytes`);

      // Return PDF blob to client
      return new Response(pdfBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName || 'document'}.pdf"`,
        },
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error("❌ [generate-pdf-proxy] Request timed out after", VPS_TIMEOUT_MS / 1000, "seconds");
        return new Response(
          JSON.stringify({ error: `Request timeout after ${VPS_TIMEOUT_MS / 1000} seconds. Server is busy, please try again.` }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("❌ [generate-pdf-proxy] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
