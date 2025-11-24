import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  template_type?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, template_type, metadata }: EmailRequest =
      await req.json();

    console.log("[send-email] Processing request:", {
      to,
      subject,
      template_type,
    });

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get SMTP configuration
    const { data: config, error: configError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (configError) {
      console.error("[send-email] Config error:", configError);
      throw new Error("Failed to fetch SMTP configuration");
    }

    if (!config) {
      throw new Error("SMTP not configured");
    }

    // Get default signature if exists
    const { data: signature } = await supabase
      .from("email_signatures")
      .select("signature_html")
      .eq("is_default", true)
      .maybeSingle();

    // Append signature to HTML if exists
    let finalHtml = html;
    if (signature?.signature_html) {
      finalHtml = html + signature.signature_html;
    }

    // Check smart scheduling preferences
    const now = new Date();
    const currentHour = now.getHours();
    const currentTime = `${currentHour.toString().padStart(2, "0")}:00:00`;
    
    let scheduledFor = now.toISOString();
    
    if (template_type) {
      const { data: preference } = await supabase
        .from("notification_preferences")
        .select("preferred_time_start, preferred_time_end")
        .eq("notification_type", template_type)
        .maybeSingle();
      
      if (preference) {
        const startHour = parseInt(preference.preferred_time_start.split(":")[0]);
        const endHour = parseInt(preference.preferred_time_end.split(":")[0]);
        
        // If current time is outside preferred window, schedule for next start time
        if (currentHour < startHour || currentHour >= endHour) {
          const tomorrow = new Date(now);
          if (currentHour >= endHour) {
            tomorrow.setDate(tomorrow.getDate() + 1);
          }
          tomorrow.setHours(startHour, 0, 0, 0);
          scheduledFor = tomorrow.toISOString();
          
          console.log("[send-email] Scheduling for later:", scheduledFor);
          
          // Store in queue for later processing
          await supabase.from("email_logs").insert({
            user_id: config.user_id,
            recipient_email: to,
            subject: subject,
            template_type: template_type,
            status: "pending",
            scheduled_for: scheduledFor,
            metadata: metadata,
          });
          
          return new Response(
            JSON.stringify({
              success: true,
              scheduled: true,
              scheduled_for: scheduledFor,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // Check daily limit
    if (config.emails_sent_today >= config.daily_limit) {
      throw new Error(
        `Daily email limit reached (${config.daily_limit}). Try again tomorrow.`
      );
    }

    console.log("[send-email] Sending via Resend...");

    // Send email via Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.sender_name} <${config.sender_email}>`,
        to: [to],
        subject: subject,
        html: finalHtml,
        reply_to: config.reply_to_email || undefined,
        tags: template_type ? [{ name: "type", value: template_type }] : undefined,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("[send-email] Resend error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("[send-email] Email sent successfully:", emailData?.id);

    // Log successful email
    await supabase.from("email_logs").insert({
      user_id: config.user_id,
      recipient_email: to,
      subject: subject,
      template_type: template_type,
      status: "sent",
      resend_email_id: emailData?.id,
      metadata: metadata,
      sent_at: new Date().toISOString(),
    });

    // Update daily counter
    await supabase
      .from("smtp_settings")
      .update({
        emails_sent_today: config.emails_sent_today + 1,
      })
      .eq("id", config.id);

    // Increment template usage if applicable
    if (template_type) {
      await supabase.rpc("increment_template_usage", {
        p_template_type: template_type,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailData?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[send-email] Error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
