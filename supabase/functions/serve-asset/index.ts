import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Support two URL patterns:
    // 1. ?bucket=avatars&path=user-id/file.jpg
    // 2. /bucket-name/path/to/file.jpg (path after function name)
    
    let bucket = url.searchParams.get('bucket');
    let filePath = url.searchParams.get('path');
    
    // If no query params, try to parse from pathname
    if (!bucket || !filePath) {
      // pathname will be like: /serve-asset/bucket-name/path/to/file.jpg
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      // Remove 'serve-asset' from the beginning if present
      if (pathParts[0] === 'serve-asset') {
        pathParts.shift();
      }
      
      if (pathParts.length >= 2) {
        bucket = pathParts[0];
        filePath = pathParts.slice(1).join('/');
      }
    }
    
    if (!bucket || !filePath) {
      console.error('Missing bucket or path parameters');
      return new Response(
        JSON.stringify({ error: 'Missing bucket or path parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Construct the storage URL
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
    
    console.log(`Fetching asset: ${storageUrl}`);

    // Fetch the file from storage
    const response = await fetch(storageUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch asset: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Asset not found' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the content type from the original response
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const cacheControl = response.headers.get('Cache-Control') || 'public, max-age=31536000'; // 1 year cache
    
    // Stream the response body
    const body = await response.arrayBuffer();

    console.log(`Serving asset: ${bucket}/${filePath} (${contentType}, ${body.byteLength} bytes)`);

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    console.error('Error serving asset:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
