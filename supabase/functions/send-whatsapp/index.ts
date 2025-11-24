import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendWhatsAppRequest {
  phone: string;
  message?: string;
  contractId?: string;
  notificationType: 'delivery' | 'pickup' | 'invoice' | 'payment' | 'reminder' | 'manual' | 'test';
  templateVariables?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const requestData: SendWhatsAppRequest = await req.json();
    const { phone, message, contractId, notificationType, templateVariables } = requestData;

    console.log("Processing WhatsApp notification:", { notificationType, phone, contractId });

    // Fetch WhatsApp settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('whatsapp_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error("WhatsApp not configured or inactive");
    }

    // Get contract data if contractId provided
    let contractData: any = null;
    let clientData: any = null;
    if (contractId) {
      const { data: contract } = await supabaseClient
        .from('rental_contracts')
        .select('*, client_groups(*), bank_accounts(*)')
        .eq('id', contractId)
        .single();
      
      contractData = contract;
      clientData = contract?.client_groups;
    }

    // Get or build message content
    let messageContent = message;
    if (!messageContent && contractData) {
      // Fetch template
      const { data: template } = await supabaseClient
        .from('whatsapp_message_templates')
        .select('template_content')
        .eq('user_id', user.id)
        .eq('template_type', notificationType)
        .eq('is_active', true)
        .single();

      if (template) {
        messageContent = template.template_content;
        
        // Replace variables
        const vars = {
          nama: clientData?.nama || '',
          invoice: contractData?.invoice || '',
          lokasi: contractData?.lokasi_detail || '',
          tanggal_kirim: contractData?.tanggal_kirim || '',
          tanggal_ambil: contractData?.tanggal_ambil || '',
          tanggal_mulai: contractData?.start_date || '',
          tanggal_selesai: contractData?.end_date || '',
          jumlah_unit: contractData?.jumlah_unit?.toString() || '',
          penanggung_jawab: contractData?.penanggung_jawab || '',
          jumlah_tagihan: contractData?.tagihan_belum_bayar?.toLocaleString('id-ID') || '',
          jumlah_lunas: contractData?.jumlah_lunas?.toLocaleString('id-ID') || '',
          tanggal_lunas: contractData?.tanggal_lunas || '',
          bank_name: contractData?.bank_accounts?.bank_name || '',
          sisa_tagihan: contractData?.tagihan_belum_bayar?.toLocaleString('id-ID') || '',
          ...templateVariables
        };

        for (const [key, value] of Object.entries(vars)) {
          if (messageContent) {
            messageContent = messageContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
          }
        }
      }
    }

    if (!messageContent) {
      throw new Error("No message content provided");
    }

    // Format phone number for WhatsApp
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }

    // Send to WAHA API
    const wahaUrl = `${settings.waha_api_url}/api/sendText`;
    console.log("Sending to WAHA:", wahaUrl);

    const startTime = Date.now();
    const wahaResponse = await fetch(wahaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': settings.waha_api_key,
      },
      body: JSON.stringify({
        session: settings.waha_session_name,
        chatId: `${formattedPhone}@c.us`,
        text: messageContent,
      }),
    });

    const responseTime = Date.now() - startTime;
    const wahaData = await wahaResponse.json();

    console.log("WAHA Response:", { status: wahaResponse.status, data: wahaData });

    // Log notification
    const logData = {
      user_id: user.id,
      contract_id: contractId || null,
      notification_type: notificationType,
      recipient_phone: phone,
      recipient_name: clientData?.nama || null,
      message_content: messageContent,
      status: wahaResponse.ok ? 'sent' : 'failed',
      error_message: wahaResponse.ok ? null : JSON.stringify(wahaData),
      waha_response: wahaData,
      sent_at: wahaResponse.ok ? new Date().toISOString() : null,
    };

    const { error: logError } = await supabaseClient
      .from('whatsapp_notifications_log')
      .insert(logData);

    if (logError) {
      console.error("Failed to log notification:", logError);
    }

    if (!wahaResponse.ok) {
      throw new Error(`WAHA API Error: ${JSON.stringify(wahaData)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
        response_time_ms: responseTime,
        waha_response: wahaData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
