import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========== SECURITY: Verify API Key ==========
    const requestApiKey = req.headers.get('X-Api-Key') || req.headers.get('x-api-key');
    
    // Fetch valid API keys from database
    const { data: wahaSettings } = await supabase
      .from('whatsapp_settings')
      .select('waha_api_key')
      .not('waha_api_key', 'is', null);

    const { data: vpsCredentials } = await supabase
      .from('vps_credentials')
      .select('waha_api_key')
      .not('waha_api_key', 'is', null);

    // Collect all valid API keys
    const validApiKeys: string[] = [];
    if (wahaSettings) {
      wahaSettings.forEach((s: any) => {
        if (s.waha_api_key) validApiKeys.push(s.waha_api_key);
      });
    }
    if (vpsCredentials) {
      vpsCredentials.forEach((v: any) => {
        if (v.waha_api_key) validApiKeys.push(v.waha_api_key);
      });
    }

    // If we have API keys configured, require verification
    if (validApiKeys.length > 0) {
      if (!requestApiKey) {
        console.log('[WAHA Webhook] Missing X-Api-Key header');
        return new Response(JSON.stringify({ error: 'Unauthorized - API key required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!validApiKeys.includes(requestApiKey)) {
        console.log('[WAHA Webhook] Invalid API key provided');
        return new Response(JSON.stringify({ error: 'Unauthorized - Invalid API key' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('[WAHA Webhook] API key verified successfully');
    } else {
      console.log('[WAHA Webhook] Warning: No API keys configured, allowing request');
    }
    // ========== END SECURITY ==========

    const body = await req.json();
    console.log('[WAHA Webhook] Received event:', JSON.stringify(body, null, 2));

    const { event, payload, session } = body;

    // Find the WhatsApp number configuration by session name
    const { data: waNumber } = await supabase
      .from('whatsapp_numbers')
      .select('*, user_id')
      .eq('waha_session_name', session)
      .eq('provider', 'waha')
      .single();

    // If not found by session, try to find by checking all WAHA numbers
    let activeNumber = waNumber;
    if (!activeNumber) {
      const { data: wahaNumbers } = await supabase
        .from('whatsapp_numbers')
        .select('*, user_id')
        .eq('provider', 'waha')
        .eq('is_active', true);

      if (wahaNumbers && wahaNumbers.length > 0) {
        activeNumber = wahaNumbers[0];
      }
    }

    // Also check legacy whatsapp_settings
    if (!activeNumber) {
      const { data: legacySettings } = await supabase
        .from('whatsapp_settings')
        .select('*, user_id')
        .eq('waha_session_name', session)
        .single();

      if (legacySettings) {
        activeNumber = {
          id: null,
          user_id: legacySettings.user_id,
          provider: 'waha',
          phone_number: 'legacy'
        };
      }
    }

    if (!activeNumber) {
      console.log('[WAHA Webhook] No matching WhatsApp configuration found for session:', session);
      return new Response(JSON.stringify({ success: true, message: 'No config found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle different event types
    switch (event) {
      case 'message':
      case 'message.any':
        await handleIncomingMessage(supabase, payload, activeNumber);
        break;
      
      case 'message.ack':
        await handleMessageAck(supabase, payload, activeNumber);
        break;

      case 'session.status':
        await handleSessionStatus(supabase, payload, activeNumber);
        break;

      default:
        console.log('[WAHA Webhook] Unhandled event type:', event);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[WAHA Webhook] Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleIncomingMessage(supabase: any, payload: any, waNumber: any) {
  // Only process incoming messages (not our own outgoing messages)
  if (payload.fromMe) {
    console.log('[WAHA Webhook] Ignoring outgoing message');
    return;
  }

  const senderPhone = payload.from?.replace('@c.us', '') || payload.chatId?.replace('@c.us', '');
  const senderName = payload.notifyName || payload.pushName || senderPhone;
  const timestamp = payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString();

  // Extract message content
  let messageContent = '';
  let messageType = 'text';
  let mediaUrl = '';
  let mediaMimeType = '';

  if (payload.body) {
    messageContent = payload.body;
  } else if (payload.text) {
    messageContent = payload.text;
  } else if (payload.caption) {
    messageContent = payload.caption;
  }

  if (payload.hasMedia || payload.mediaUrl) {
    mediaUrl = payload.mediaUrl || '';
    mediaMimeType = payload.mimetype || '';
    
    if (payload.type === 'image' || mediaMimeType?.startsWith('image/')) {
      messageType = 'image';
      messageContent = messageContent || '[Image]';
    } else if (payload.type === 'document' || mediaMimeType?.startsWith('application/')) {
      messageType = 'document';
      messageContent = messageContent || `[Document: ${payload.filename || 'file'}]`;
    } else if (payload.type === 'audio' || mediaMimeType?.startsWith('audio/')) {
      messageType = 'audio';
      messageContent = '[Audio message]';
    } else if (payload.type === 'video' || mediaMimeType?.startsWith('video/')) {
      messageType = 'video';
      messageContent = messageContent || '[Video]';
    } else if (payload.type === 'sticker') {
      messageType = 'sticker';
      messageContent = '[Sticker]';
    }
  } else if (payload.type === 'location') {
    messageType = 'location';
    messageContent = `[Location: ${payload.lat}, ${payload.lng}]`;
  } else if (payload.type === 'vcard' || payload.type === 'contact') {
    messageType = 'contact';
    messageContent = `[Contact]`;
  }

  console.log('[WAHA Webhook] Processing message from:', senderPhone, 'content:', messageContent.substring(0, 50));

  // Get or create conversation
  let conversation;
  const { data: existingConv } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('user_id', waNumber.user_id)
    .eq('customer_phone', senderPhone)
    .single();

  if (existingConv) {
    conversation = existingConv;

    // Calculate response time
    const { data: lastOutbound } = await supabase
      .from('whatsapp_messages')
      .select('sent_at')
      .eq('conversation_id', conversation.id)
      .eq('direction', 'outbound')
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (lastOutbound?.sent_at) {
      const responseTime = Math.floor(
        (new Date(timestamp).getTime() - new Date(lastOutbound.sent_at).getTime()) / 1000
      );
      
      await supabase
        .from('whatsapp_messages')
        .update({ response_time_seconds: responseTime })
        .eq('conversation_id', conversation.id)
        .eq('direction', 'outbound')
        .is('response_time_seconds', null)
        .order('sent_at', { ascending: false })
        .limit(1);
    }
  } else {
    const { data: newConv } = await supabase
      .from('whatsapp_conversations')
      .insert({
        user_id: waNumber.user_id,
        whatsapp_number_id: waNumber.id,
        customer_phone: senderPhone,
        customer_name: senderName
      })
      .select()
      .single();
    conversation = newConv;
  }

  // Insert message
  await supabase.from('whatsapp_messages').insert({
    user_id: waNumber.user_id,
    conversation_id: conversation?.id,
    whatsapp_number_id: waNumber.id,
    external_message_id: payload.id?.id || payload.id || payload.key?.id,
    direction: 'inbound',
    message_type: messageType,
    message_content: messageContent,
    media_url: mediaUrl,
    media_mime_type: mediaMimeType,
    status: 'received',
    sent_at: timestamp,
    provider: 'waha',
    provider_response: payload
  });

  // Update conversation
  await supabase
    .from('whatsapp_conversations')
    .update({
      customer_name: senderName,
      unread_count: (conversation?.unread_count || 0) + 1
    })
    .eq('id', conversation?.id);

  // Update analytics
  await updateAnalytics(supabase, waNumber.user_id, waNumber.id, 'received');

  console.log('[WAHA Webhook] Message saved for conversation:', conversation?.id);
}

async function handleMessageAck(supabase: any, payload: any, waNumber: any) {
  // ACK levels: 0 = error, 1 = pending, 2 = server, 3 = device, 4 = read, 5 = played
  const ackLevel = payload.ack;
  const messageId = payload.id?.id || payload.id;

  let status = 'sent';
  const updates: any = { status };

  switch (ackLevel) {
    case 0:
      status = 'failed';
      updates.status = status;
      break;
    case 1:
    case 2:
      status = 'sent';
      updates.status = status;
      updates.sent_at = new Date().toISOString();
      break;
    case 3:
      status = 'delivered';
      updates.status = status;
      updates.delivered_at = new Date().toISOString();
      break;
    case 4:
    case 5:
      status = 'read';
      updates.status = status;
      updates.read_at = new Date().toISOString();
      break;
  }

  console.log('[WAHA Webhook] ACK update:', { messageId, ackLevel, status });

  await supabase
    .from('whatsapp_messages')
    .update(updates)
    .eq('external_message_id', messageId);

  await supabase
    .from('whatsapp_notifications_log')
    .update({
      status,
      delivered_at: updates.delivered_at,
      read_at: updates.read_at
    })
    .or(`waha_response->id->id.eq.${messageId},waha_response->key->id.eq.${messageId}`);

  // Update analytics
  if (status !== 'sent') {
    await updateAnalytics(supabase, waNumber.user_id, waNumber.id, status);
  }
}

async function handleSessionStatus(supabase: any, payload: any, waNumber: any) {
  const status = payload.status;
  console.log('[WAHA Webhook] Session status:', status);

  if (waNumber.id) {
    await supabase
      .from('whatsapp_numbers')
      .update({
        connection_status: status === 'WORKING' ? 'connected' : status.toLowerCase(),
        last_connection_test: new Date().toISOString(),
        error_message: status !== 'WORKING' ? `Session status: ${status}` : null
      })
      .eq('id', waNumber.id);
  }
}

async function updateAnalytics(supabase: any, userId: string, numberId: string | null, eventType: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('whatsapp_analytics')
    .select('*')
    .eq('user_id', userId)
    .eq('whatsapp_number_id', numberId)
    .eq('date', today)
    .single();

  if (existing) {
    const updates: any = {};
    
    switch (eventType) {
      case 'delivered':
        updates.messages_delivered = (existing.messages_delivered || 0) + 1;
        break;
      case 'read':
        updates.messages_read = (existing.messages_read || 0) + 1;
        break;
      case 'failed':
        updates.messages_failed = (existing.messages_failed || 0) + 1;
        break;
      case 'received':
        updates.messages_received = (existing.messages_received || 0) + 1;
        break;
    }

    const sent = existing.messages_sent || 0;
    const delivered = updates.messages_delivered || existing.messages_delivered || 0;
    const read = updates.messages_read || existing.messages_read || 0;
    const received = updates.messages_received || existing.messages_received || 0;

    if (sent > 0) {
      updates.delivery_rate = Math.round((delivered / sent) * 100 * 100) / 100;
      updates.read_rate = Math.round((read / sent) * 100 * 100) / 100;
      updates.response_rate = Math.round((received / sent) * 100 * 100) / 100;
    }

    await supabase
      .from('whatsapp_analytics')
      .update(updates)
      .eq('id', existing.id);
  } else if (numberId) {
    await supabase.from('whatsapp_analytics').insert({
      user_id: userId,
      whatsapp_number_id: numberId,
      date: today,
      messages_delivered: eventType === 'delivered' ? 1 : 0,
      messages_read: eventType === 'read' ? 1 : 0,
      messages_failed: eventType === 'failed' ? 1 : 0,
      messages_received: eventType === 'received' ? 1 : 0
    });
  }
}
