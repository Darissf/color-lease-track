import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComposeEmailRequest {
  from_address: string;
  from_name?: string;
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  reply_to_id?: string;
  save_to_sent?: boolean;
  add_signature?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin or super_admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['admin', 'super_admin'].includes(userRole.role)) {
      throw new Error('Insufficient permissions');
    }

    const body: ComposeEmailRequest = await req.json();
    console.log('Compose email request:', { from: body.from_address, to: body.to, subject: body.subject });

    // Validate from_address is in monitored_email_addresses
    const { data: monitoredAddress, error: addrError } = await supabase
      .from('monitored_email_addresses')
      .select('*')
      .eq('email_address', body.from_address)
      .eq('can_send_from', true)
      .eq('is_active', true)
      .single();

    if (addrError || !monitoredAddress) {
      throw new Error('Invalid or unauthorized FROM address');
    }

    // Get best email provider for compose (prefer Resend for custom FROM)
    // Only select providers with purpose 'compose' or 'all'
    const { data: providers, error: providersError } = await supabase
      .from('email_providers')
      .select('*')
      .eq('is_active', true)
      .eq('health_status', 'healthy')
      .in('purpose', ['compose', 'all'])
      .order('priority', { ascending: false });

    if (providersError || !providers || providers.length === 0) {
      throw new Error('No active email providers available');
    }

    // Prefer Resend for custom FROM
    let selectedProvider = providers.find(p => p.provider_name === 'Resend') || providers[0];

    // Add signature if requested
    let finalHtml = body.html;
    if (body.add_signature) {
      const { data: signature } = await supabase
        .from('email_signatures')
        .select('signature_html')
        .eq('is_default', true)
        .single();

      if (signature) {
        finalHtml += `<br><br>${signature.signature_html}`;
      }
    }

    // Send email via Resend
    const resendApiKey = selectedProvider.api_key_encrypted;
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: body.from_name 
          ? `${body.from_name} <${body.from_address}>`
          : body.from_address,
        to: [body.to],
        cc: body.cc || [],
        subject: body.subject,
        html: finalHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData);
      throw new Error(`Failed to send email: ${resendData.message || 'Unknown error'}`);
    }

    console.log('Email sent via Resend:', resendData);

    // Save to mail_inbox if requested
    if (body.save_to_sent !== false) {
      const { error: insertError } = await supabase
        .from('mail_inbox')
        .insert({
          email_id: resendData.id || crypto.randomUUID(),
          from_address: body.from_address,
          from_name: body.from_name || monitoredAddress.display_name,
          to_address: body.to,
          cc: body.cc || [],
          subject: body.subject,
          body_html: finalHtml,
          mail_type: 'outbound',
          reply_to_id: body.reply_to_id || null,
          is_read: true,
        });

      if (insertError) {
        console.error('Error saving to sent items:', insertError);
      }
    }

    // Log to email_logs
    await supabase
      .from('email_logs')
      .insert({
        user_id: user.id,
        provider_id: selectedProvider.id,
        provider_name: selectedProvider.provider_name,
        recipient_email: body.to,
        subject: body.subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_message_id: resendData.id,
      });

    // Update provider stats
    await supabase.rpc('increment', {
      row_id: selectedProvider.id,
      x: 1,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email_id: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in compose-email function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});