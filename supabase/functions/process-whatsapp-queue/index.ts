import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing WhatsApp notification queue...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch pending queue items
    const { data: queueItems, error: queueError } = await supabaseClient
      .from('whatsapp_notification_queue')
      .select('*, rental_contracts(*, client_groups(*))')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50);

    if (queueError) {
      console.error("Error fetching queue:", queueError);
      throw queueError;
    }

    console.log(`Found ${queueItems?.length || 0} pending notifications`);

    let processed = 0;
    let failed = 0;

    for (const item of queueItems || []) {
      try {
        // Mark as processing
        await supabaseClient
          .from('whatsapp_notification_queue')
          .update({ 
            status: 'processing', 
            processing_started_at: new Date().toISOString() 
          })
          .eq('id', item.id);

        const contract = item.rental_contracts;
        const client = contract?.client_groups;

        if (!client?.nomor_telepon) {
          throw new Error("No phone number found for client");
        }

        // Get WhatsApp settings
        const { data: settings } = await supabaseClient
          .from('whatsapp_settings')
          .select('*')
          .eq('user_id', item.user_id)
          .eq('is_active', true)
          .single();

        if (!settings) {
          throw new Error("WhatsApp not configured");
        }

        // Get template
        const { data: template } = await supabaseClient
          .from('whatsapp_message_templates')
          .select('template_content')
          .eq('user_id', item.user_id)
          .eq('template_type', item.notification_type)
          .eq('is_active', true)
          .single();

        if (!template) {
          throw new Error(`Template not found for type: ${item.notification_type}`);
        }

        // Build message
        let message = template.template_content;
        const vars = {
          nama: client.nama || '',
          invoice: contract?.invoice || '',
          lokasi: contract?.lokasi_detail || '',
          tanggal_kirim: contract?.tanggal_kirim || '',
          tanggal_ambil: contract?.tanggal_ambil || '',
          tanggal_mulai: contract?.start_date || '',
          tanggal_selesai: contract?.end_date || '',
          jumlah_unit: contract?.jumlah_unit?.toString() || '',
          penanggung_jawab: contract?.penanggung_jawab || '',
        };

        for (const [key, value] of Object.entries(vars)) {
          message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        // Format phone
        let phone = client.nomor_telepon.replace(/\D/g, '');
        if (phone.startsWith('0')) {
          phone = '62' + phone.substring(1);
        } else if (!phone.startsWith('62')) {
          phone = '62' + phone;
        }

        // Send via WAHA
        const wahaUrl = `${settings.waha_api_url}/api/sendText`;
        const wahaResponse = await fetch(wahaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': settings.waha_api_key,
          },
          body: JSON.stringify({
            session: settings.waha_session_name,
            chatId: `${phone}@c.us`,
            text: message,
          }),
        });

        const wahaData = await wahaResponse.json();

        // Log result
        await supabaseClient.from('whatsapp_notifications_log').insert({
          user_id: item.user_id,
          contract_id: item.contract_id,
          notification_type: item.notification_type,
          recipient_phone: client.nomor_telepon,
          recipient_name: client.nama,
          message_content: message,
          status: wahaResponse.ok ? 'sent' : 'failed',
          error_message: wahaResponse.ok ? null : JSON.stringify(wahaData),
          waha_response: wahaData,
          sent_at: wahaResponse.ok ? new Date().toISOString() : null,
        });

        // Update queue status
        await supabaseClient
          .from('whatsapp_notification_queue')
          .update({ status: wahaResponse.ok ? 'completed' : 'failed' })
          .eq('id', item.id);

        if (wahaResponse.ok) {
          processed++;
        } else {
          failed++;
        }

      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);
        
        await supabaseClient
          .from('whatsapp_notification_queue')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', item.id);
        
        failed++;
      }
    }

    console.log(`Queue processing complete: ${processed} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: queueItems?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in queue processor:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
