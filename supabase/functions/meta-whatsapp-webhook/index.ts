import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('[Meta Webhook] Verification request:', { mode, token });

    // Get verify token from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: numbers } = await supabase
      .from('whatsapp_numbers')
      .select('meta_webhook_verify_token')
      .eq('provider', 'meta_cloud')
      .not('meta_webhook_verify_token', 'is', null);

    const validTokens = numbers?.map(n => n.meta_webhook_verify_token) || [];

    if (mode === 'subscribe' && validTokens.includes(token)) {
      console.log('[Meta Webhook] Verification successful');
      return new Response(challenge, { status: 200 });
    } else {
      console.log('[Meta Webhook] Verification failed');
      return new Response('Forbidden', { status: 403 });
    }
  }

  // Handle webhook events (POST request from Meta)
  if (req.method === 'POST') {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const body = await req.json();
      console.log('[Meta Webhook] Received event:', JSON.stringify(body, null, 2));

      // Process each entry
      for (const entry of body.entry || []) {
        const phoneNumberId = entry.id;

        // Find the WhatsApp number configuration
        const { data: waNumber } = await supabase
          .from('whatsapp_numbers')
          .select('*, user_id')
          .eq('meta_phone_number_id', phoneNumberId)
          .single();

        if (!waNumber) {
          console.log('[Meta Webhook] Unknown phone number ID:', phoneNumberId);
          continue;
        }

        for (const change of entry.changes || []) {
          if (change.field !== 'messages') continue;

          const value = change.value;

          // Handle message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await handleStatusUpdate(supabase, status, waNumber);
            }
          }

          // Handle incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              await handleIncomingMessage(supabase, message, value.contacts?.[0], waNumber);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error('[Meta Webhook] Error:', error);
      return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});

async function handleStatusUpdate(supabase: any, status: any, waNumber: any) {
  console.log('[Meta Webhook] Status update:', status);

  const messageId = status.id;
  const statusType = status.status; // sent, delivered, read, failed
  const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();

  // Update message status
  const updateData: any = {
    status: statusType,
    [`${statusType}_at`]: timestamp
  };

  if (status.errors) {
    updateData.error_message = status.errors[0]?.title || 'Unknown error';
  }

  await supabase
    .from('whatsapp_messages')
    .update(updateData)
    .eq('external_message_id', messageId);

  // Update notification log
  await supabase
    .from('whatsapp_notifications_log')
    .update({
      status: statusType,
      delivered_at: statusType === 'delivered' ? timestamp : undefined,
      read_at: statusType === 'read' ? timestamp : undefined
    })
    .eq('waha_response->messages->0->id', messageId);

  // Update analytics
  await updateAnalytics(supabase, waNumber.user_id, waNumber.id, statusType);
}

async function handleIncomingMessage(supabase: any, message: any, contact: any, waNumber: any) {
  console.log('[Meta Webhook] Incoming message:', message);

  const senderPhone = message.from;
  const senderName = contact?.profile?.name || contact?.wa_id || senderPhone;
  const messageType = message.type;
  const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

  // Extract message content
  let messageContent = '';
  let mediaUrl = '';
  let mediaMimeType = '';

  switch (messageType) {
    case 'text':
      messageContent = message.text?.body || '';
      break;
    case 'image':
      messageContent = message.image?.caption || '[Image]';
      mediaUrl = message.image?.id; // Need to fetch actual URL
      mediaMimeType = message.image?.mime_type;
      break;
    case 'document':
      messageContent = message.document?.caption || message.document?.filename || '[Document]';
      mediaUrl = message.document?.id;
      mediaMimeType = message.document?.mime_type;
      break;
    case 'audio':
      messageContent = '[Audio message]';
      mediaUrl = message.audio?.id;
      mediaMimeType = message.audio?.mime_type;
      break;
    case 'video':
      messageContent = message.video?.caption || '[Video]';
      mediaUrl = message.video?.id;
      mediaMimeType = message.video?.mime_type;
      break;
    case 'location':
      messageContent = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
      break;
    case 'contacts':
      messageContent = `[Contact: ${message.contacts?.[0]?.name?.formatted_name}]`;
      break;
    default:
      messageContent = `[${messageType}]`;
  }

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
    
    // Calculate response time if this is a reply to our message
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
      
      // Update the outbound message with response time
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
    // Create new conversation
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
    external_message_id: message.id,
    direction: 'inbound',
    message_type: messageType,
    message_content: messageContent,
    media_url: mediaUrl,
    media_mime_type: mediaMimeType,
    status: 'received',
    sent_at: timestamp,
    provider: 'meta_cloud',
    provider_response: message
  });

  // Update conversation (trigger will handle most of this)
  await supabase
    .from('whatsapp_conversations')
    .update({
      customer_name: senderName,
      customer_profile_pic: contact?.profile?.picture,
      unread_count: (conversation?.unread_count || 0) + 1
    })
    .eq('id', conversation?.id);

  // Update analytics
  await updateAnalytics(supabase, waNumber.user_id, waNumber.id, 'received');

  console.log('[Meta Webhook] Message saved for conversation:', conversation?.id);
}

async function updateAnalytics(supabase: any, userId: string, numberId: string, eventType: string) {
  const today = new Date().toISOString().split('T')[0];

  // Get or create today's analytics record
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
      case 'sent':
        updates.messages_sent = (existing.messages_sent || 0) + 1;
        break;
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

    // Recalculate rates
    const sent = updates.messages_sent || existing.messages_sent || 0;
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
  } else {
    await supabase.from('whatsapp_analytics').insert({
      user_id: userId,
      whatsapp_number_id: numberId,
      date: today,
      messages_sent: eventType === 'sent' ? 1 : 0,
      messages_delivered: eventType === 'delivered' ? 1 : 0,
      messages_read: eventType === 'read' ? 1 : 0,
      messages_failed: eventType === 'failed' ? 1 : 0,
      messages_received: eventType === 'received' ? 1 : 0
    });
  }
}
