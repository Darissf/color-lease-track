import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract links from HTML
function extractLinksFromHtml(html: string): string[] {
  const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  const matches = [...html.matchAll(linkRegex)];
  return [...new Set(matches.map(m => m[1]))];
}

// Extract links from plain text
function extractLinksFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

// Find links near keywords (exact match within 200 char radius)
function findLinksNearKeywords(html: string, text: string, keywords: string[]): string[] {
  const matchedLinks: string[] = [];
  const content = html || text;
  
  for (const keyword of keywords) {
    // Find all occurrences of keyword (exact match, case-sensitive)
    let searchIndex = 0;
    while (searchIndex < content.length) {
      const keywordIndex = content.indexOf(keyword, searchIndex);
      if (keywordIndex === -1) break;
      
      // Search within 200 characters before and after keyword
      const searchStart = Math.max(0, keywordIndex - 200);
      const searchEnd = Math.min(content.length, keywordIndex + keyword.length + 200);
      const nearbyContent = content.substring(searchStart, searchEnd);
      
      // Extract links from nearby area
      const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
      const matches = [...nearbyContent.matchAll(linkRegex)];
      matchedLinks.push(...matches.map(m => m[1]));
      
      // Also try plain text URL extraction for text content
      const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
      const textMatches = nearbyContent.match(urlRegex) || [];
      matchedLinks.push(...textMatches);
      
      searchIndex = keywordIndex + keyword.length;
    }
  }
  
  return [...new Set(matchedLinks)];
}

// Click link using Browserless.io (executes JavaScript like a real browser)
async function clickLinkWithBrowser(url: string): Promise<{status: number, content: string, method: string}> {
  const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY');
  
  if (!browserlessKey) {
    console.log('No BROWSERLESS_API_KEY, falling back to simple fetch');
    // Fallback to simple fetch if no key
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return { status: response.status, content: await response.text(), method: 'fetch' };
  }

  console.log(`Using Browserless.io to click: ${url}`);
  
  // Use Browserless /content API to load page and execute JavaScript
  const response = await fetch(
    `https://chrome.browserless.io/content?token=${browserlessKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        waitFor: 8000, // Wait 8 seconds for JS to execute
        gotoOptions: { 
          waitUntil: 'networkidle2', // Wait until network is idle
          timeout: 30000 
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Browserless API error:', response.status, errorText);
    throw new Error(`Browserless API error: ${response.status} - ${errorText}`);
  }

  return { 
    status: response.status, 
    content: await response.text(),
    method: 'browserless'
  };
}

// Auto-click links in background
async function autoClickLinks(
  supabase: any, 
  mailInboxId: string, 
  bodyHtml: string, 
  bodyText: string
) {
  try {
    // Check if auto-click is enabled and get keywords
    const { data: settings } = await supabase
      .from('mail_settings')
      .select('auto_click_links, auto_click_keywords')
      .limit(1)
      .maybeSingle();

    if (!settings?.auto_click_links) {
      console.log('Auto-click is disabled');
      return;
    }

    const keywords = settings.auto_click_keywords || ['Follow this link to verify your email address.'];
    console.log('Keywords for filtering:', keywords);

    // Find links near keywords
    const links = findLinksNearKeywords(bodyHtml, bodyText, keywords);

    // Limit to max 10 links per email
    const linksToClick = links.slice(0, 10);

    if (linksToClick.length === 0) {
      console.log('No links found near keywords in email');
      return;
    }

    console.log(`Found ${linksToClick.length} links to auto-click (near keywords):`, linksToClick);

    // Click each link using Browserless (with JS execution)
    for (const url of linksToClick) {
      try {
        const result = await clickLinkWithBrowser(url);
        const responsePreview = result.content.substring(0, 500);

        // Log successful click
        await supabase.from('mail_auto_clicked_links').insert({
          mail_inbox_id: mailInboxId,
          url: url,
          status_code: result.status,
          response_preview: `[${result.method}] ${responsePreview}`,
          clicked_at: new Date().toISOString(),
        });

        console.log(`Successfully clicked via ${result.method}: ${url} (status: ${result.status})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Log failed click
        await supabase.from('mail_auto_clicked_links').insert({
          mail_inbox_id: mailInboxId,
          url: url,
          error_message: errorMessage,
          clicked_at: new Date().toISOString(),
        });

        console.error(`Failed to click: ${url}`, errorMessage);
      }
    }

    // Mark email as read after all links have been clicked
    console.log(`All links clicked for inbox ${mailInboxId}. Marking as read...`);
    const { error: updateError } = await supabase
      .from('mail_inbox')
      .update({ is_read: true })
      .eq('id', mailInboxId);
    
    if (updateError) {
      console.error(`Failed to mark email as read:`, updateError);
    } else {
      console.log(`Email ${mailInboxId} marked as read after auto-click`);
    }
  } catch (error) {
    console.error('Error in autoClickLinks:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    
    // Log FULL payload for debugging
    console.log('=== FULL WEBHOOK PAYLOAD ===');
    console.log(JSON.stringify(payload, null, 2));
    console.log('=== END PAYLOAD ===');

    // Only process email.received events
    if (payload.type !== 'email.received') {
      console.log('Ignored event type:', payload.type);
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailData = payload.data;

    // Parse from address
    const parseEmailAddress = (emailString: string) => {
      // Handle formats like "John Doe <john@example.com>" or "john@example.com"
      const match = emailString.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        return {
          name: match[1].trim().replace(/^["']|["']$/g, ''),
          email: match[2].trim(),
        };
      }
      return {
        name: null,
        email: emailString.trim(),
      };
    };

    const fromParsed = parseEmailAddress(emailData.from);
    const toAddress = Array.isArray(emailData.to) ? emailData.to[0] : emailData.to;

    // Get email content from webhook payload
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let bodyHtml = emailData.html || '';
    let bodyText = emailData.text || '';
    
    // Log webhook payload for debugging
    console.log('Email data fields:', {
      email_id: emailData.email_id,
      id: emailData.id,
      hasHtml: !!emailData.html,
      hasText: !!emailData.text,
      subject: emailData.subject
    });

    // Try to fetch full email content from Resend API using email_id
    // Use /emails/receiving/{id} endpoint for INBOUND emails (not /emails/{id} which is for outbound)
    const emailId = emailData.email_id || emailData.id || payload.email_id || payload.id;
    if (resendApiKey && emailId) {
      try {
        console.log('Fetching INBOUND email content for ID:', emailId);
        const emailDetailResponse = await fetch(
          `https://api.resend.com/emails/receiving/${emailId}`,
          {
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              Accept: 'application/json',
            },
          }
        );

        console.log('Resend API response status:', emailDetailResponse.status);
        
        if (emailDetailResponse.ok) {
          const emailDetail = await emailDetailResponse.json();
          console.log('Email detail response:', {
            hasHtml: !!emailDetail.html,
            hasText: !!emailDetail.text,
            htmlLength: emailDetail.html?.length || 0,
            textLength: emailDetail.text?.length || 0
          });
          bodyHtml = emailDetail.html || bodyHtml;
          bodyText = emailDetail.text || bodyText;
        } else {
          const errorText = await emailDetailResponse.text();
          console.error('Failed to fetch email from Resend:', errorText);
        }
      } catch (error) {
        console.error('Error fetching email from Resend API:', error);
      }
    } else {
      console.log('Skipping Resend API fetch - missing API key or email ID');
    }

    // Insert into database
    const { data, error } = await supabase.from('mail_inbox').insert({
      email_id: emailData.email_id || emailData.id || `webhook-${Date.now()}`,
      from_address: fromParsed.email,
      from_name: fromParsed.name,
      to_address: toAddress,
      cc: emailData.cc || [],
      bcc: emailData.bcc || [],
      subject: emailData.subject || '(No Subject)',
      body_text: bodyText,
      body_html: bodyHtml,
      attachments: emailData.attachments || [],
      is_read: false,
      is_starred: false,
      received_at: emailData.created_at || new Date().toISOString(),
    }).select('id').single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Email saved successfully:', data);

    // Auto-click links in background (fire and forget to avoid slowing down webhook response)
    if (data?.id) {
      autoClickLinks(supabase, data.id, bodyHtml, bodyText)
        .catch(e => console.error('Background auto-click error:', e));
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email received and stored' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});