import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token, step, message } = await req.json();

    if (!token || !step) {
      throw new Error('Missing required parameters');
    }

    console.log(`Progress update: ${token} - ${step} - ${message}`);

    // Get existing session
    const { data: session, error: fetchError } = await supabase
      .from('vps_installation_sessions')
      .select('*')
      .eq('install_token', token)
      .single();

    if (fetchError || !session) {
      console.error('Session not found:', token);
      throw new Error('Installation session not found');
    }

    // Parse existing steps
    const stepsCompleted = Array.isArray(session.steps_completed) 
      ? session.steps_completed 
      : [];

    // Add new step if not error
    if (step !== 'error') {
      stepsCompleted.push({
        step,
        message,
        timestamp: new Date().toISOString()
      });
    }

    // Determine status
    let status = session.status;
    let completedAt = session.completed_at;
    let errorMessage = session.error_message;

    if (step === 'error') {
      status = 'failed';
      errorMessage = message;
      completedAt = new Date().toISOString();
    } else if (step === 'success') {
      status = 'success';
      completedAt = new Date().toISOString();
    } else if (status === 'pending') {
      status = 'running';
    }

    // Update session
    const { error: updateError } = await supabase
      .from('vps_installation_sessions')
      .update({
        status,
        current_step: step,
        steps_completed: stepsCompleted,
        completed_at: completedAt,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('install_token', token);

    if (updateError) {
      console.error('Error updating session:', updateError);
      throw new Error('Failed to update installation session');
    }

    // If installation succeeded, auto-save WAHA settings
    if (step === 'success') {
      const { error: settingsError } = await supabase
        .from('whatsapp_settings')
        .upsert({
          user_id: session.user_id,
          api_url: `http://${session.vps_host}:${session.waha_port}`,
          api_key: token, // Use install token as API key
          session_name: 'default',
          is_active: true,
          last_health_check: new Date().toISOString(),
          connection_status: 'connected'
        }, {
          onConflict: 'user_id'
        });

      if (settingsError) {
        console.error('Error saving WAHA settings:', settingsError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
