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
  provider_id?: string; // Optional: force specific provider for testing
}

interface EmailProvider {
  id: string;
  provider_name: string;
  api_key_encrypted: string;
  sender_email: string;
  sender_name: string;
  priority: number;
  daily_limit: number;
  emails_sent_today: number;
  monthly_limit: number;
  emails_sent_month: number;
  user_id: string;
  health_status: string;
  consecutive_errors: number;
  last_used_at: string | null;
  auto_disabled_at: string | null;
}

// Provider-specific send functions
async function sendViaResend(provider: EmailProvider, to: string, subject: string, html: string, replyTo?: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.api_key_encrypted}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${provider.sender_name || "No Reply"} <${provider.sender_email}>`,
      to: [to],
      subject: subject,
      html: html,
      reply_to: replyTo,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Resend API error");
  }
  return data;
}

async function sendViaBrevo(provider: EmailProvider, to: string, subject: string, html: string) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": provider.api_key_encrypted,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: provider.sender_name || "No Reply", email: provider.sender_email },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Brevo API error");
  }
  return data;
}

async function sendViaMailgun(provider: EmailProvider, to: string, subject: string, html: string) {
  const domain = provider.sender_email.split("@")[1];
  const formData = new URLSearchParams();
  formData.append("from", `${provider.sender_name || "No Reply"} <${provider.sender_email}>`);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`api:${provider.api_key_encrypted}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Mailgun API error");
  }
  return data;
}

async function sendViaMailjet(provider: EmailProvider, to: string, subject: string, html: string) {
  const [apiKey, secretKey] = provider.api_key_encrypted.includes(":") 
    ? provider.api_key_encrypted.split(":")
    : [provider.api_key_encrypted, ""];

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [{
        From: {
          Email: provider.sender_email,
          Name: provider.sender_name || "No Reply",
        },
        To: [{
          Email: to,
        }],
        Subject: subject,
        HTMLPart: html,
      }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.ErrorMessage || data.Messages?.[0]?.Errors?.[0]?.ErrorMessage || "Mailjet API error");
  }
  return data;
}

async function sendViaSendGrid(provider: EmailProvider, to: string, subject: string, html: string) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.api_key_encrypted}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: to }],
      }],
      from: {
        email: provider.sender_email,
        name: provider.sender_name || "No Reply",
      },
      subject: subject,
      content: [{
        type: "text/html",
        value: html,
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "SendGrid API error");
  }
  
  // SendGrid returns 202 with no body on success
  return { id: response.headers.get("x-message-id") || "success" };
}

async function sendWithProvider(provider: EmailProvider, to: string, subject: string, html: string, replyTo?: string) {
  console.log(`[send-email] Attempting to send via ${provider.provider_name} (ID: ${provider.id})`);

  switch (provider.provider_name) {
    case "resend":
      return await sendViaResend(provider, to, subject, html, replyTo);
    case "brevo":
      return await sendViaBrevo(provider, to, subject, html);
    case "mailgun":
      return await sendViaMailgun(provider, to, subject, html);
    case "mailjet":
      return await sendViaMailjet(provider, to, subject, html);
    case "sendgrid":
      return await sendViaSendGrid(provider, to, subject, html);
    default:
      throw new Error(`Unknown provider: ${provider.provider_name}`);
  }
}

async function selectBestProvider(
  supabase: any,
  excludeProviders: string[] = [],
  forceProviderId?: string
) {
  let query = supabase
    .from("email_providers")
    .select("*")
    .eq("is_active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true });

  if (forceProviderId) {
    query = query.eq("id", forceProviderId);
  }

  const { data: providers, error } = await query;

  if (error) {
    console.error("[send-email] Error fetching providers:", error);
    return null;
  }

  if (!providers || providers.length === 0) {
    console.warn("[send-email] No active providers found");
    return null;
  }

  // Filter out excluded providers (failed in previous attempts)
  let availableProviders = providers.filter(
    (p: EmailProvider) => !excludeProviders.includes(p.id)
  );

  // Filter providers with available quota and healthy status
  availableProviders = availableProviders.filter((p: EmailProvider) => {
    const dailyAvailable = p.emails_sent_today < p.daily_limit;
    const monthlyAvailable = p.emails_sent_month < p.monthly_limit;
    const isHealthy = p.health_status === "healthy" && (p.consecutive_errors || 0) < 3;
    
    return dailyAvailable && monthlyAvailable && isHealthy;
  });

  if (availableProviders.length === 0) {
    console.warn("[send-email] All providers exhausted quota or unhealthy");
    return null;
  }

  // True round-robin: return provider that was used longest ago (or never used)
  return availableProviders[0];
}

async function updateProviderSuccess(supabase: any, providerId: string) {
  await supabase.rpc("increment_provider_usage", { p_provider_id: providerId });
  
  // Update last_used_at for round-robin and reset error tracking
  await supabase
    .from("email_providers")
    .update({
      last_used_at: new Date().toISOString(),
      consecutive_errors: 0,
      auto_disabled_at: null,
      health_status: "healthy",
    })
    .eq("id", providerId);
}

async function updateProviderError(supabase: any, providerId: string, errorMsg: string) {
  // Get current consecutive errors
  const { data: provider } = await supabase
    .from("email_providers")
    .select("consecutive_errors")
    .eq("id", providerId)
    .single();

  const consecutiveErrors = (provider?.consecutive_errors || 0) + 1;
  
  // Auto-disable if 3 consecutive errors
  const updates: any = {
    last_error: errorMsg,
    consecutive_errors: consecutiveErrors,
    health_status: consecutiveErrors >= 3 ? "unhealthy" : "degraded",
  };

  if (consecutiveErrors >= 3) {
    updates.is_active = false;
    updates.auto_disabled_at = new Date().toISOString();
    console.log(`[send-email] Auto-disabled provider ${providerId} after 3 consecutive errors`);
  }

  await supabase
    .from("email_providers")
    .update(updates)
    .eq("id", providerId);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, template_type, metadata, provider_id }: EmailRequest =
      await req.json();

    console.log("[send-email] Processing request:", {
      to,
      subject,
      template_type,
      forced_provider: provider_id || "auto-select",
    });

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
    let scheduledFor = now.toISOString();

    if (template_type) {
      const { data: preference } = await supabase
        .from("notification_preferences")
        .select("preferred_time_start, preferred_time_end, user_id")
        .eq("notification_type", template_type)
        .maybeSingle();

      if (preference) {
        const startHour = parseInt(preference.preferred_time_start.split(":")[0]);
        const endHour = parseInt(preference.preferred_time_end.split(":")[0]);

        // If current time is outside preferred window, schedule for later
        if (currentHour < startHour || currentHour >= endHour) {
          const tomorrow = new Date(now);
          if (currentHour >= endHour) {
            tomorrow.setDate(tomorrow.getDate() + 1);
          }
          tomorrow.setHours(startHour, 0, 0, 0);
          scheduledFor = tomorrow.toISOString();

          console.log("[send-email] Scheduling for later:", scheduledFor);

          await supabase.from("email_logs").insert({
            user_id: preference.user_id,
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

    // Smart Multi-Provider Email Sending with Fallback
    let lastError: Error | null = null;
    let fallbackAttempts = 0;
    let usedProvider: EmailProvider | null = null;
    let emailId: string | null = null;
    let responseTimeMs: number | null = null;
    const failedProviders: string[] = [];
    const startTime = Date.now();

    // Try to send with available providers (up to 4 attempts for 4 providers)
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const provider = await selectBestProvider(supabase, failedProviders, provider_id);

        if (!provider) {
          console.log(`[send-email] No more available providers after ${attempt} attempts`);
          break;
        }

        console.log(`[send-email] Attempt ${attempt + 1}: Using ${provider.provider_name} (ID: ${provider.id})`);

        // Attempt to send with response time tracking
        const attemptStartTime = Date.now();
        const result = await sendWithProvider(
          provider,
          to,
          subject,
          finalHtml,
          undefined
        );
        const attemptEndTime = Date.now();
        responseTimeMs = attemptEndTime - attemptStartTime;

        // Success!
        await updateProviderSuccess(supabase, provider.id);
        usedProvider = provider;
        emailId = result.id || result.messageId || null;
        console.log(`[send-email] ✅ Successfully sent via ${provider.provider_name} in ${responseTimeMs}ms`);
        break;
      } catch (error: any) {
        lastError = error;
        fallbackAttempts++;
        console.error(`[send-email] ❌ Attempt ${attempt + 1} failed:`, error.message);

        if (usedProvider) {
          await updateProviderError(supabase, usedProvider.id, error.message);
          failedProviders.push(usedProvider.id);
        }

        // Continue to next provider
        continue;
      }
    }

    // If all email providers failed, try WhatsApp fallback
    if (!usedProvider || lastError) {
      console.log("[send-email] 📱 All email providers failed, attempting WhatsApp fallback...");

      try {
        // Try to find WhatsApp number from client_groups
        const { data: clients } = await supabase
          .from("client_groups")
          .select("nomor_telepon, nama")
          .or(`nama.ilike.%${to.split("@")[0]}%`)
          .limit(1);

        if (clients && clients.length > 0 && clients[0].nomor_telepon) {
          const client = clients[0];
          console.log(`[send-email] Found WhatsApp for ${client.nama}: ${client.nomor_telepon}`);

          const whatsappMessage = `⚠️ *Email Gagal Terkirim*\n\nHalo ${client.nama},\n\nKami tidak dapat mengirim email ke ${to}.\n\n*Subject:* ${subject}\n\nSilakan hubungi admin untuk info lebih lanjut.\n\n_Pesan otomatis - Email Fallback System_`;

          const { error: whatsappError } = await supabase.functions.invoke("send-whatsapp", {
            body: {
              phone: client.nomor_telepon,
              message: whatsappMessage,
              notificationType: "email_fallback",
            },
          });

          if (!whatsappError) {
            console.log("[send-email] ✅ WhatsApp fallback successful");

            // Log fallback
            await supabase.from("email_logs").insert({
              recipient_email: to,
              subject: subject,
              template_type: template_type,
              status: "fallback_whatsapp",
              fallback_attempts: fallbackAttempts,
              metadata: { ...metadata, fallback_reason: "all_email_providers_failed" },
              sent_at: new Date().toISOString(),
            });

            return new Response(
              JSON.stringify({
                success: true,
                fallback: "whatsapp",
                message: "Email failed but notification sent via WhatsApp",
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }

        console.log("[send-email] ❌ WhatsApp fallback also failed or no number found");
      } catch (whatsappError: any) {
        console.error("[send-email] WhatsApp fallback error:", whatsappError.message);
      }

      // Both email and WhatsApp failed
      throw new Error(
        `All email providers and WhatsApp fallback failed. Last error: ${lastError?.message || "Unknown error"}`
      );
    }

    // Log successful email
    await supabase.from("email_logs").insert({
      user_id: usedProvider.user_id,
      recipient_email: to,
      subject: subject,
      template_type: template_type,
      status: "sent",
      resend_email_id: emailId,
      provider_id: usedProvider.id,
      provider_name: usedProvider.provider_name,
      fallback_attempts: fallbackAttempts,
      metadata: metadata,
      sent_at: new Date().toISOString(),
      response_time_ms: responseTimeMs,
      external_message_id: emailId,
    });

    // Increment template usage if applicable
    if (template_type) {
      await supabase.rpc("increment_template_usage", {
        p_template_type: template_type,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: emailId,
        provider: {
          id: usedProvider.id,
          name: usedProvider.provider_name,
          display_name: usedProvider.sender_name,
        },
        response_time_ms: responseTimeMs,
        fallback_attempts: fallbackAttempts,
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
