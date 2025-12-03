import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendRequest {
  recipientPhone: string;
  recipientName?: string;
  message: string;
  notificationType: string;
  contractId?: string;
  mediaUrl?: string;
  mediaType?: string;
  scheduledAt?: string;
  preferredNumberId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: SendRequest = await req.json();
    const { recipientPhone, recipientName, message, notificationType, contractId, mediaUrl, mediaType, scheduledAt, preferredNumberId } = body;

    console.log('[WhatsApp Unified] Processing request:', { notificationType, recipientPhone });

    // Reset daily counts if needed
    await supabase.rpc('reset_whatsapp_daily_counts');

    // Smart routing: Select the best number based on notification type
    let selectedNumber;
    
    if (preferredNumberId) {
      // Use preferred number if specified
      const { data } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('id', preferredNumberId)
        .eq('is_active', true)
        .single();
      selectedNumber = data;
    }
    
    if (!selectedNumber) {
      // Find number by notification type
      const { data: allNumbers } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .contains('notification_types', [notificationType])
        .order('priority', { ascending: false });

      // Filter by daily limit in JavaScript
      const matchingNumbers = (allNumbers || []).filter(
        (n: any) => (n.messages_sent_today || 0) < (n.daily_limit || 1000)
      );

      if (matchingNumbers && matchingNumbers.length > 0) {
        selectedNumber = matchingNumbers[0];
      } else {
        // Fallback to default number
        const { data: defaultNumber } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .eq('is_active', true)
          .single();
        selectedNumber = defaultNumber;
      }
    }

    // If still no number, try legacy whatsapp_settings
    if (!selectedNumber) {
      const { data: legacySettings } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (legacySettings) {
        selectedNumber = {
          id: null,
          provider: 'waha',
          waha_api_url: legacySettings.waha_api_url,
          waha_api_key: legacySettings.waha_api_key,
          waha_session_name: legacySettings.waha_session_name,
          business_hours_enabled: false,
          phone_number: 'legacy'
        };
      }
    }

    if (!selectedNumber) {
      throw new Error('No active WhatsApp number configured');
    }

    console.log('[WhatsApp Unified] Selected number:', { 
      provider: selectedNumber.provider, 
      phone: selectedNumber.phone_number 
    });

    // Check business hours if enabled
    if (selectedNumber.business_hours_enabled) {
      const now = new Date();
      const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const currentHour = jakartaTime.getHours();
      const currentMinute = jakartaTime.getMinutes();
      const currentDay = jakartaTime.getDay() || 7; // Convert Sunday from 0 to 7

      const [startHour, startMinute] = selectedNumber.business_hours_start.split(':').map(Number);
      const [endHour, endMinute] = selectedNumber.business_hours_end.split(':').map(Number);
      
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;

      const isBusinessDay = selectedNumber.business_days.includes(currentDay);
      const isBusinessHour = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;

      if (!isBusinessDay || !isBusinessHour) {
        // Schedule for next business hour
        const nextBusinessTime = calculateNextBusinessTime(
          jakartaTime,
          selectedNumber.business_days,
          selectedNumber.business_hours_start
        );

        // Create scheduled message
        await supabase.from('whatsapp_scheduled_messages').insert({
          user_id: user.id,
          whatsapp_number_id: selectedNumber.id,
          recipient_phone: recipientPhone,
          recipient_name: recipientName,
          message_type: mediaUrl ? 'media' : 'text',
          message_content: message,
          media_url: mediaUrl,
          notification_type: notificationType,
          contract_id: contractId,
          scheduled_at: nextBusinessTime.toISOString(),
          status: 'scheduled'
        });

        return new Response(JSON.stringify({
          success: true,
          scheduled: true,
          scheduledAt: nextBusinessTime.toISOString(),
          message: 'Message scheduled for next business hour'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // If scheduledAt is provided, create scheduled message
    if (scheduledAt) {
      await supabase.from('whatsapp_scheduled_messages').insert({
        user_id: user.id,
        whatsapp_number_id: selectedNumber.id,
        recipient_phone: recipientPhone,
        recipient_name: recipientName,
        message_type: mediaUrl ? 'media' : 'text',
        message_content: message,
        media_url: mediaUrl,
        notification_type: notificationType,
        contract_id: contractId,
        scheduled_at: scheduledAt,
        status: 'scheduled'
      });

      return new Response(JSON.stringify({
        success: true,
        scheduled: true,
        scheduledAt,
        message: 'Message scheduled successfully'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process link tracking
    let processedMessage = message;
    const trackedLinks: any[] = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    if (urls) {
      for (const url of urls) {
        const shortCode = generateShortCode();
        trackedLinks.push({ original: url, shortCode, clicks: 0 });
        const shortUrl = `${supabaseUrl}/functions/v1/track-whatsapp-link/${shortCode}`;
        processedMessage = processedMessage.replace(url, shortUrl);
      }
    }

    // Get or create conversation
    let conversation;
    const { data: existingConv } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('customer_phone', recipientPhone)
      .single();

    if (existingConv) {
      conversation = existingConv;
    } else {
      const { data: newConv } = await supabase
        .from('whatsapp_conversations')
        .insert({
          user_id: user.id,
          whatsapp_number_id: selectedNumber.id,
          customer_phone: recipientPhone,
          customer_name: recipientName
        })
        .select()
        .single();
      conversation = newConv;
    }

    // Send the message based on provider
    let sendResult;
    if (selectedNumber.provider === 'meta_cloud') {
      sendResult = await sendViaMeta(selectedNumber, recipientPhone, processedMessage, mediaUrl);
    } else {
      sendResult = await sendViaWaha(selectedNumber, recipientPhone, processedMessage, mediaUrl);
    }

    // Create message record
    const messageRecord = await supabase.from('whatsapp_messages').insert({
      user_id: user.id,
      conversation_id: conversation?.id,
      whatsapp_number_id: selectedNumber.id,
      external_message_id: sendResult.messageId,
      direction: 'outbound',
      message_type: mediaUrl ? 'media' : 'text',
      message_content: message,
      media_url: mediaUrl,
      notification_type: notificationType,
      contract_id: contractId,
      tracked_links: trackedLinks,
      status: sendResult.success ? 'sent' : 'failed',
      sent_at: sendResult.success ? new Date().toISOString() : null,
      provider: selectedNumber.provider,
      provider_response: sendResult.response,
      error_message: sendResult.error
    }).select().single();

    // Create tracked links records
    if (trackedLinks.length > 0 && messageRecord.data) {
      for (const link of trackedLinks) {
        await supabase.from('whatsapp_tracked_links').insert({
          user_id: user.id,
          message_id: messageRecord.data.id,
          original_url: link.original,
          short_code: link.shortCode
        });
      }
    }

    // Update daily count
    if (selectedNumber.id) {
      await supabase
        .from('whatsapp_numbers')
        .update({ 
          messages_sent_today: (selectedNumber.messages_sent_today || 0) + 1,
          consecutive_errors: sendResult.success ? 0 : (selectedNumber.consecutive_errors || 0) + 1,
          error_message: sendResult.error || null
        })
        .eq('id', selectedNumber.id);
    }

    // Log to notifications_log
    await supabase.from('whatsapp_notifications_log').insert({
      user_id: user.id,
      whatsapp_number_id: selectedNumber.id,
      message_id: messageRecord.data?.id,
      notification_type: notificationType,
      recipient_phone: recipientPhone,
      recipient_name: recipientName,
      message_content: message,
      status: sendResult.success ? 'sent' : 'failed',
      provider: selectedNumber.provider,
      sender_phone: selectedNumber.phone_number,
      error_message: sendResult.error,
      sent_at: sendResult.success ? new Date().toISOString() : null,
      waha_response: sendResult.response
    });

    // If failed and has alternative number, try failover
    if (!sendResult.success && selectedNumber.consecutive_errors >= 2) {
      console.log('[WhatsApp Unified] Attempting failover...');
      
      const { data: alternativeNumbers } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('id', selectedNumber.id)
        .contains('notification_types', [notificationType])
        .order('priority', { ascending: false })
        .limit(1);

      if (alternativeNumbers && alternativeNumbers.length > 0) {
        const altNumber = alternativeNumbers[0];
        let altResult;
        
        if (altNumber.provider === 'meta_cloud') {
          altResult = await sendViaMeta(altNumber, recipientPhone, processedMessage, mediaUrl);
        } else {
          altResult = await sendViaWaha(altNumber, recipientPhone, processedMessage, mediaUrl);
        }

        if (altResult.success) {
          // Update the message record
          await supabase.from('whatsapp_messages')
            .update({
              whatsapp_number_id: altNumber.id,
              status: 'sent',
              sent_at: new Date().toISOString(),
              provider: altNumber.provider,
              provider_response: altResult.response,
              error_message: null
            })
            .eq('id', messageRecord.data?.id);

          return new Response(JSON.stringify({
            success: true,
            messageId: altResult.messageId,
            failover: true,
            provider: altNumber.provider,
            message: 'Sent via failover number'
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    return new Response(JSON.stringify({
      success: sendResult.success,
      messageId: sendResult.messageId,
      provider: selectedNumber.provider,
      error: sendResult.error
    }), { 
      status: sendResult.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('[WhatsApp Unified] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

async function sendViaWaha(number: any, recipient: string, message: string, mediaUrl?: string) {
  try {
    const formattedPhone = formatPhoneNumber(recipient);
    const chatId = `${formattedPhone}@c.us`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (number.waha_api_key) {
      headers['X-Api-Key'] = number.waha_api_key;
    }

    let endpoint = `${number.waha_api_url}/api/sendText`;
    let body: any = {
      session: number.waha_session_name || 'default',
      chatId,
      text: message
    };

    if (mediaUrl) {
      endpoint = `${number.waha_api_url}/api/sendFile`;
      body = {
        session: number.waha_session_name || 'default',
        chatId,
        file: { url: mediaUrl },
        caption: message
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageId: result.id || result.key?.id,
        response: result
      };
    } else {
      return {
        success: false,
        error: result.message || 'WAHA send failed',
        response: result
      };
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      response: null
    };
  }
}

async function sendViaMeta(number: any, recipient: string, message: string, mediaUrl?: string) {
  try {
    const formattedPhone = formatPhoneNumber(recipient);

    const body: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: { body: message }
    };

    if (mediaUrl) {
      const isImage = mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const isDocument = mediaUrl.match(/\.(pdf|doc|docx|xls|xlsx)$/i);

      if (isImage) {
        body.type = 'image';
        body.image = { link: mediaUrl, caption: message };
        delete body.text;
      } else if (isDocument) {
        body.type = 'document';
        body.document = { link: mediaUrl, caption: message };
        delete body.text;
      }
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${number.meta_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${number.meta_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    const result = await response.json();

    if (response.ok && result.messages?.[0]?.id) {
      return {
        success: true,
        messageId: result.messages[0].id,
        response: result
      };
    } else {
      return {
        success: false,
        error: result.error?.message || 'Meta Cloud send failed',
        response: result
      };
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      response: null
    };
  }
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function calculateNextBusinessTime(currentTime: Date, businessDays: number[], startTime: string): Date {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const result = new Date(currentTime);
  
  // Start from tomorrow
  result.setDate(result.getDate() + 1);
  result.setHours(startHour, startMinute, 0, 0);

  // Find next business day
  let attempts = 0;
  while (!businessDays.includes(result.getDay() || 7) && attempts < 7) {
    result.setDate(result.getDate() + 1);
    attempts++;
  }

  return result;
}
