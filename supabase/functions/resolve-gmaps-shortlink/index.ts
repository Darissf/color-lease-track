import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse coordinates from full Google Maps URL
function parseFullUrl(url: string): { lat: number; lng: number; address?: string } | null {
  try {
    // Pattern 1: ?q=lat,lng or ?q=lat%2Clng
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*)[,%2C]+(-?\d+\.?\d*)/i);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }

    // Pattern 2: /@lat,lng,zoom
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),?\d*\.?\d*z?/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Pattern 3: /place/name/@lat,lng
    const placeMatch = url.match(/\/place\/([^/]+)\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (placeMatch) {
      const address = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      return { 
        lat: parseFloat(placeMatch[2]), 
        lng: parseFloat(placeMatch[3]),
        address 
      };
    }

    // Pattern 4: ll=lat,lng
    const llMatch = url.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    }

    // Pattern 5: !3d-lat!4d-lng (embedded format)
    const embeddedMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (embeddedMatch) {
      return { lat: parseFloat(embeddedMatch[1]), lng: parseFloat(embeddedMatch[2]) };
    }

    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shortUrl } = await req.json();

    if (!shortUrl) {
      return new Response(
        JSON.stringify({ error: 'shortUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resolving short link:', shortUrl);

    // Fetch the short URL and follow redirects to get the final URL
    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const finalUrl = response.url;
    console.log('Resolved to:', finalUrl);

    // Parse coordinates from the final URL
    const result = parseFullUrl(finalUrl);

    if (result) {
      console.log('Parsed coordinates:', result);
      return new Response(
        JSON.stringify({ 
          success: true, 
          ...result,
          fullUrl: finalUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('Could not parse coordinates from URL');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract coordinates from URL',
          fullUrl: finalUrl 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error resolving short link:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
