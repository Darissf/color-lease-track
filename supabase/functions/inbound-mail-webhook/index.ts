import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Email saved successfully:', data);

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
