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

async function sendWithProvider(provider: EmailProvider, to: string, subject: string, html: string, replyTo?: string) {
  console.log(`[send-email] Attempting to send via ${provider.provider_name} (ID: ${provider.id})`);

  switch (provider.provider_name) {
    case "resend":
      return await sendViaResend(provider, to, subject, html, replyTo);
    case "brevo":
      return await sendViaBrevo(provider, to, subject, html);
    case "mailgun":
      return await sendViaMailgun(provider, to, subject, html);
    default:
      throw new Error(`Unknown provider: ${provider.provider_name}`);
  }
}

async function selectBestProvider(supabase: any, forceProviderId?: string) {
  let query = supabase
    .from("email_providers")
    .select("*")
    .eq("is_active", true)
    .eq("health_status", "healthy");

  if (forceProviderId) {
    query = query.eq("id", forceProviderId);
  } else {
    query = query.order("priority", { ascending: true });
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

  // Filter providers with available quota
  const availableProviders = providers.filter(
    (p: EmailProvider) =>
      p.emails_sent_today < p.daily_limit && p.emails_sent_month < p.monthly_limit
  );

  if (availableProviders.length === 0) {
    console.warn("[send-email] All providers exhausted quota");
    return null;
  }

  return availableProviders[0];
}

async function updateProviderSuccess(supabase: any, providerId: string) {
  await supabase.rpc("increment_provider_usage", { p_provider_id: providerId });
}

async function updateProviderError(supabase: any, providerId: string, error: string) {
  await supabase.rpc("update_provider_error", {
    p_provider_id: providerId,
    p_error_message: error,
  });
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

    // Multi-Provider Email Sending with Fallback
    let lastError: Error | null = null;
    let fallbackAttempts = 0;
    let usedProvider: EmailProvider | null = null;
    let emailId: string | null = null;

    // Try to send with available providers
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const provider = await selectBestProvider(supabase, provider_id);

        if (!provider) {
          throw new Error("No available email providers with remaining quota");
        }

        // Attempt to send
        const result = await sendWithProvider(
          provider,
          to,
          subject,
          finalHtml,
          undefined
        );

        // Success!
        await updateProviderSuccess(supabase, provider.id);
        usedProvider = provider;
        emailId = result.id || result.messageId || null;
        console.log(`[send-email] Successfully sent via ${provider.provider_name}`);
        break;
      } catch (error: any) {
        lastError = error;
        fallbackAttempts++;
        console.error(`[send-email] Attempt ${attempt + 1} failed:`, error.message);

        if (usedProvider) {
          await updateProviderError(supabase, usedProvider.id, error.message);
        }

        // Continue to next provider
        continue;
      }
    }

    // If all attempts failed
    if (!usedProvider || lastError) {
      throw new Error(
        `All email providers failed. Last error: ${lastError?.message || "Unknown error"}`
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
        email_id: emailId,
        provider: usedProvider.provider_name,
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
