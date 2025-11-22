import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversionEvent {
  eventName: string;
  eventData?: Record<string, any>;
  userData?: {
    email?: string;
    phone?: string;
  };
  sourceUrl?: string;
}

// Hash function for user data privacy
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get request body
    const { eventName, eventData, userData, sourceUrl }: ConversionEvent = await req.json();

    if (!eventName) {
      return new Response(
        JSON.stringify({ error: "eventName is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log event to database for tracking
    const { error: logError } = await supabaseClient
      .from("meta_events")
      .insert({
        event_name: eventName,
        event_data: eventData || {},
        user_data: userData || {},
      });

    if (logError) {
      console.error("Error logging event:", logError);
    }

    // Get Meta Pixel settings
    const { data: settings } = await supabaseClient
      .from("meta_ads_settings")
      .select("pixel_id, access_token, is_active")
      .limit(1)
      .single();

    // If no settings or not active, just log and return success
    if (!settings || !settings.is_active || !settings.pixel_id || !settings.access_token) {
      console.log("Meta Ads not configured or inactive, event logged only");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Event logged, Meta API not configured" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Hash user data for privacy
    const hashedUserData: Record<string, any> = {};
    if (userData?.email) {
      hashedUserData.em = await hashString(userData.email);
    }
    if (userData?.phone) {
      hashedUserData.ph = await hashString(userData.phone);
    }

    // Add client info
    hashedUserData.client_ip_address = req.headers.get("x-forwarded-for") || 
                                       req.headers.get("x-real-ip");
    hashedUserData.client_user_agent = req.headers.get("user-agent");

    // Send to Meta Conversion API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${settings.pixel_id}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              user_data: hashedUserData,
              custom_data: eventData || {},
              event_source_url: sourceUrl || req.headers.get("referer"),
              action_source: "website",
            },
          ],
          access_token: settings.access_token,
        }),
      }
    );

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("Meta API error:", metaResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Meta API error",
          details: metaResult 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Event tracked successfully",
        events_received: metaResult.events_received 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in meta-conversion-api:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
