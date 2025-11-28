import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetupRequest {
  vps_credential_id: string;
  vps_host: string;
  vps_port: number;
  vps_username: string;
  vps_password: string;
  waha_port: number;
  waha_session_name: string;
  waha_api_key?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const body: SetupRequest = await req.json();
    
    console.log(`[One-Click Installer] Generating install command for ${body.vps_host}`);

    // Generate WAHA API key if not provided
    const wahaApiKey = body.waha_api_key || crypto.randomUUID();
    const installToken = crypto.randomUUID();
    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '');
    const callbackUrl = `${appUrl}/functions/v1/install-progress-webhook`;

    // Create the one-liner command that user can run locally
    const oneLineCommand = `curl -sSL "${appUrl}/functions/v1/vps-ssh-execute" -H "Content-Type: application/json" -d '{"host":"${body.vps_host}","port":${body.vps_port},"username":"${body.vps_username}","password":"${body.vps_password}","install_token":"${installToken}","callback_url":"${callbackUrl}","waha_port":${body.waha_port},"waha_api_key":"${wahaApiKey}"}' | bash`;

    // Create installation session
    const { data: session, error: sessionError } = await supabase
      .from('vps_installation_sessions')
      .insert({
        user_id: user.id,
        vps_credential_id: body.vps_credential_id,
        vps_host: body.vps_host,
        install_token: installToken,
        status: 'pending',
        ssh_method: 'one_click',
        current_step: 'pending',
        steps_completed: [],
        total_steps: 8,
        command_log: []
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    console.log(`[One-Click Installer] Session created: ${session.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        install_token: installToken,
        one_line_command: oneLineCommand,
        instructions: {
          method: 'one_click',
          description: 'Run this single command from your local terminal (Mac/Linux/Windows WSL)',
          command: oneLineCommand,
          note: 'This command will SSH to your VPS and automatically install everything'
        },
        waha_config: {
          url: `http://${body.vps_host}:${body.waha_port}`,
          api_key: wahaApiKey,
          session_name: body.waha_session_name
        },
        message: 'One-click install command generated. Run from your local terminal for full automation.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SSH Full Setup] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
