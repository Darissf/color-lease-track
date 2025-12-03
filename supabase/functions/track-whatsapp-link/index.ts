import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const shortCode = pathParts[pathParts.length - 1];

  if (!shortCode || shortCode === 'track-whatsapp-link') {
    return new Response('Invalid link', { status: 400 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the tracked link
    const { data: link, error } = await supabase
      .from('whatsapp_tracked_links')
      .select('*')
      .eq('short_code', shortCode)
      .single();

    if (error || !link) {
      console.log('[Link Tracker] Link not found:', shortCode);
      return new Response('Link not found', { status: 404 });
    }

    // Extract click info
    const clickInfo = {
      timestamp: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      referer: req.headers.get('referer') || 'direct'
    };

    // Update click count and log click
    const clicks = link.clicks || [];
    clicks.push(clickInfo);

    await supabase
      .from('whatsapp_tracked_links')
      .update({
        click_count: (link.click_count || 0) + 1,
        first_click_at: link.first_click_at || clickInfo.timestamp,
        last_click_at: clickInfo.timestamp,
        clicks: clicks.slice(-100) // Keep last 100 clicks
      })
      .eq('id', link.id);

    // Update analytics
    if (link.user_id) {
      const today = new Date().toISOString().split('T')[0];
      
      // Get message to find whatsapp_number_id
      let numberId = null;
      if (link.message_id) {
        const { data: message } = await supabase
          .from('whatsapp_messages')
          .select('whatsapp_number_id')
          .eq('id', link.message_id)
          .single();
        numberId = message?.whatsapp_number_id;
      }

      const { data: analytics } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .eq('user_id', link.user_id)
        .eq('whatsapp_number_id', numberId)
        .eq('date', today)
        .single();

      if (analytics) {
        await supabase
          .from('whatsapp_analytics')
          .update({
            total_link_clicks: (analytics.total_link_clicks || 0) + 1
          })
          .eq('id', analytics.id);
      }
    }

    console.log('[Link Tracker] Click recorded for:', shortCode, '-> redirecting to:', link.original_url);

    // Redirect to original URL
    return new Response(null, {
      status: 302,
      headers: {
        'Location': link.original_url
      }
    });

  } catch (error) {
    console.error('[Link Tracker] Error:', error);
    return new Response('Error processing link', { status: 500 });
  }
});
