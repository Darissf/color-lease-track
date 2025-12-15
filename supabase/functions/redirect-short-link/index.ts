import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const slug = pathParts[pathParts.length - 1];

    if (!slug || slug === 'redirect-short-link') {
      return new Response(
        JSON.stringify({ error: 'Slug tidak ditemukan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Short Link] Looking up slug: ${slug}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lookup the short link
    const { data: link, error } = await supabase
      .from('short_links')
      .select('id, destination_url, is_active')
      .eq('slug', slug)
      .single();

    if (error || !link) {
      console.log(`[Short Link] Slug not found: ${slug}`);
      return new Response(
        JSON.stringify({ error: 'Link tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!link.is_active) {
      console.log(`[Short Link] Slug inactive: ${slug}`);
      return new Response(
        JSON.stringify({ error: 'Link tidak aktif' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment click count (fire and forget)
    supabase
      .from('short_links')
      .update({ click_count: supabase.rpc('increment_click_count', { link_id: link.id }) })
      .eq('id', link.id)
      .then(() => console.log(`[Short Link] Click count incremented for: ${slug}`));

    // Actually just do a simple increment
    await supabase.rpc('increment_short_link_clicks', { link_id: link.id });

    console.log(`[Short Link] Redirecting ${slug} to: ${link.destination_url}`);

    // Return redirect
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': link.destination_url,
      },
    });

  } catch (error: any) {
    console.error('[Short Link] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
