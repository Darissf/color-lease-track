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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Scheduled WhatsApp] Processing scheduled messages...');

    // Get all scheduled messages that are due
    const now = new Date().toISOString();
    const { data: scheduledMessages, error } = await supabase
      .from('whatsapp_scheduled_messages')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (error) {
      throw error;
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      console.log('[Scheduled WhatsApp] No messages to process');
      return new Response(JSON.stringify({ 
        success: true, 
        processed: 0,
        message: 'No scheduled messages due'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Scheduled WhatsApp] Found ${scheduledMessages.length} messages to process`);

    let processed = 0;
    let failed = 0;

    for (const scheduled of scheduledMessages) {
      try {
        // Mark as processing
        await supabase
          .from('whatsapp_scheduled_messages')
          .update({ status: 'processing' })
          .eq('id', scheduled.id);

        // Get the WhatsApp number configuration
        let waNumber;
        if (scheduled.whatsapp_number_id) {
          const { data } = await supabase
            .from('whatsapp_numbers')
            .select('*')
            .eq('id', scheduled.whatsapp_number_id)
            .eq('is_active', true)
            .single();
          waNumber = data;
        }

        if (!waNumber) {
          // Try to find by notification type or default
          const { data: numbers } = await supabase
            .from('whatsapp_numbers')
            .select('*')
            .eq('user_id', scheduled.user_id)
            .eq('is_active', true)
            .order('priority', { ascending: false });

          if (numbers && numbers.length > 0) {
            // Find by notification type
            waNumber = numbers.find(n => 
              scheduled.notification_type && 
              n.notification_types?.includes(scheduled.notification_type)
            ) || numbers.find(n => n.is_default) || numbers[0];
          }
        }

        if (!waNumber) {
          // Try legacy settings
          const { data: legacySettings } = await supabase
            .from('whatsapp_settings')
            .select('*')
            .eq('user_id', scheduled.user_id)
            .eq('is_active', true)
            .single();

          if (legacySettings) {
            waNumber = {
              id: null,
              provider: 'waha',
              waha_api_url: legacySettings.waha_api_url,
              waha_api_key: legacySettings.waha_api_key,
              waha_session_name: legacySettings.waha_session_name
            };
          }
        }

        if (!waNumber) {
          throw new Error('No active WhatsApp number configured');
        }

        // Check business hours if enabled
        if (waNumber.business_hours_enabled) {
          const now = new Date();
          const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
          const currentHour = jakartaTime.getHours();
          const currentMinute = jakartaTime.getMinutes();
          const currentDay = jakartaTime.getDay() || 7;

          const [startHour, startMinute] = (waNumber.business_hours_start || '08:00').split(':').map(Number);
          const [endHour, endMinute] = (waNumber.business_hours_end || '17:00').split(':').map(Number);
          
          const currentTimeMinutes = currentHour * 60 + currentMinute;
          const startTimeMinutes = startHour * 60 + startMinute;
          const endTimeMinutes = endHour * 60 + endMinute;

          const isBusinessDay = (waNumber.business_days || [1,2,3,4,5]).includes(currentDay);
          const isBusinessHour = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;

          if (!isBusinessDay || !isBusinessHour) {
            // Reschedule for next business hour
            const nextBusinessTime = calculateNextBusinessTime(
              jakartaTime,
              waNumber.business_days || [1,2,3,4,5],
              waNumber.business_hours_start || '08:00'
            );

            await supabase
              .from('whatsapp_scheduled_messages')
              .update({ 
                status: 'scheduled',
                scheduled_at: nextBusinessTime.toISOString()
              })
              .eq('id', scheduled.id);

            console.log(`[Scheduled WhatsApp] Rescheduled message ${scheduled.id} to ${nextBusinessTime.toISOString()}`);
            continue;
          }
        }

        // Send the message
        let sendResult;
        if (waNumber.provider === 'meta_cloud') {
          sendResult = await sendViaMeta(waNumber, scheduled);
        } else {
          sendResult = await sendViaWaha(waNumber, scheduled);
        }

        if (sendResult.success) {
          // Update scheduled message status
          await supabase
            .from('whatsapp_scheduled_messages')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', scheduled.id);

          // Create message record
          const { data: conversation } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .eq('user_id', scheduled.user_id)
            .eq('customer_phone', scheduled.recipient_phone)
            .single();

          await supabase.from('whatsapp_messages').insert({
            user_id: scheduled.user_id,
            conversation_id: conversation?.id,
            whatsapp_number_id: waNumber.id,
            external_message_id: sendResult.messageId,
            direction: 'outbound',
            message_type: scheduled.message_type,
            message_content: scheduled.message_content,
            media_url: scheduled.media_url,
            notification_type: scheduled.notification_type,
            contract_id: scheduled.contract_id,
            is_scheduled: true,
            scheduled_at: scheduled.scheduled_at,
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider: waNumber.provider,
            provider_response: sendResult.response
          });

          // Log to notifications_log
          await supabase.from('whatsapp_notifications_log').insert({
            user_id: scheduled.user_id,
            whatsapp_number_id: waNumber.id,
            notification_type: scheduled.notification_type || 'scheduled',
            recipient_phone: scheduled.recipient_phone,
            recipient_name: scheduled.recipient_name,
            message_content: scheduled.message_content,
            status: 'sent',
            provider: waNumber.provider,
            sent_at: new Date().toISOString(),
            waha_response: sendResult.response
          });

          // Update analytics
          await updateAnalytics(supabase, scheduled.user_id, waNumber.id, 'sent');

          processed++;
          console.log(`[Scheduled WhatsApp] Sent message ${scheduled.id} to ${scheduled.recipient_phone}`);
        } else {
          throw new Error(sendResult.error || 'Send failed');
        }

      } catch (msgError: any) {
        console.error(`[Scheduled WhatsApp] Error processing message ${scheduled.id}:`, msgError);
        
        await supabase
          .from('whatsapp_scheduled_messages')
          .update({ 
            status: 'failed',
            error_message: msgError?.message || 'Unknown error'
          })
          .eq('id', scheduled.id);

        failed++;
      }
    }

    console.log(`[Scheduled WhatsApp] Completed: ${processed} sent, ${failed} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed,
      failed,
      message: `Processed ${processed} messages, ${failed} failed`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[Scheduled WhatsApp] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendViaWaha(number: any, scheduled: any) {
  try {
    const formattedPhone = formatPhoneNumber(scheduled.recipient_phone);
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
      text: scheduled.message_content
    };

    if (scheduled.media_url) {
      endpoint = `${number.waha_api_url}/api/sendFile`;
      body = {
        session: number.waha_session_name || 'default',
        chatId,
        file: { url: scheduled.media_url },
        caption: scheduled.message_content
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
  } catch (error) {
    return {
      success: false,
      error: error.message,
      response: null
    };
  }
}

async function sendViaMeta(number: any, scheduled: any) {
  try {
    const formattedPhone = formatPhoneNumber(scheduled.recipient_phone);

    const body: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: { body: scheduled.message_content }
    };

    if (scheduled.media_url) {
      const isImage = scheduled.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const isDocument = scheduled.media_url.match(/\.(pdf|doc|docx|xls|xlsx)$/i);

      if (isImage) {
        body.type = 'image';
        body.image = { link: scheduled.media_url, caption: scheduled.message_content };
        delete body.text;
      } else if (isDocument) {
        body.type = 'document';
        body.document = { link: scheduled.media_url, caption: scheduled.message_content };
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
  } catch (error) {
    return {
      success: false,
      error: error.message,
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

function calculateNextBusinessTime(currentTime: Date, businessDays: number[], startTime: string): Date {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const result = new Date(currentTime);
  
  result.setDate(result.getDate() + 1);
  result.setHours(startHour, startMinute, 0, 0);

  let attempts = 0;
  while (!businessDays.includes(result.getDay() || 7) && attempts < 7) {
    result.setDate(result.getDate() + 1);
    attempts++;
  }

  return result;
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
    const updates: any = { messages_sent: (existing.messages_sent || 0) + 1 };
    await supabase.from('whatsapp_analytics').update(updates).eq('id', existing.id);
  } else if (numberId) {
    await supabase.from('whatsapp_analytics').insert({
      user_id: userId,
      whatsapp_number_id: numberId,
      date: today,
      messages_sent: 1
    });
  }
}
