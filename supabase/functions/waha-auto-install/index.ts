import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstallRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  waha_port: number;
  waha_api_key: string;
  waha_session_name: string;
}

interface InstallStep {
  step_number: number;
  name: string;
  command: string;
  timeout: number;
  description: string;
}

const INSTALL_STEPS: InstallStep[] = [
  {
    step_number: 1,
    name: "system_check",
    command: "apt-get update && apt-get install -y curl jq",
    timeout: 60000,
    description: "Checking system and installing prerequisites"
  },
  {
    step_number: 2,
    name: "install_docker",
    command: "if ! command -v docker &> /dev/null; then curl -fsSL https://get.docker.com | sh && systemctl enable docker && systemctl start docker; else echo 'Docker already installed'; fi",
    timeout: 120000,
    description: "Installing Docker"
  },
  {
    step_number: 3,
    name: "configure_firewall",
    command: "ufw allow {WAHA_PORT}/tcp || firewall-cmd --permanent --add-port={WAHA_PORT}/tcp || echo 'No firewall detected'",
    timeout: 15000,
    description: "Configuring firewall"
  },
  {
    step_number: 4,
    name: "pull_waha",
    command: "docker pull devlikeapro/waha:latest",
    timeout: 180000,
    description: "Pulling WAHA Docker image"
  },
  {
    step_number: 5,
    name: "start_waha",
    command: "docker stop waha 2>/dev/null || true && docker rm waha 2>/dev/null || true && docker run -d --name waha --restart unless-stopped -p {WAHA_PORT}:3000 -e WHATSAPP_API_KEY={WAHA_API_KEY} -e WHATSAPP_SESSION_NAME={WAHA_SESSION_NAME} devlikeapro/waha:latest",
    timeout: 30000,
    description: "Starting WAHA container"
  },
  {
    step_number: 6,
    name: "verify_installation",
    command: "sleep 5 && curl -f http://localhost:{WAHA_PORT}/api/health || (docker logs waha --tail 50 && exit 1)",
    timeout: 20000,
    description: "Verifying WAHA installation"
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for Authorization header first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { host, port, username, password, waha_port, waha_api_key, waha_session_name }: InstallRequest = await req.json();
    
    console.log(`[WAHA Auto Install] Starting installation on ${host}:${port}`);

    // Create installation progress record
    const { data: progressRecord, error: createError } = await supabaseClient
      .from('vps_installation_progress')
      .insert({
        user_id: user.id,
        vps_host: host,
        current_step: 0,
        total_steps: INSTALL_STEPS.length,
        status: 'running',
      })
      .select()
      .single();

    if (createError || !progressRecord) {
      throw new Error('Failed to create progress record');
    }

    console.log(`[WAHA Auto Install] Created progress record: ${progressRecord.id}`);

    // Execute installation steps sequentially
    const stepOutputs: any[] = [];

    for (const step of INSTALL_STEPS) {
      console.log(`[WAHA Auto Install] Executing step ${step.step_number}: ${step.name}`);

      // Update current step
      await supabaseClient
        .from('vps_installation_progress')
        .update({ 
          current_step: step.step_number,
          step_outputs: stepOutputs 
        })
        .eq('id', progressRecord.id);

      // Replace placeholders in command
      const command = step.command
        .replace(/{WAHA_PORT}/g, waha_port.toString())
        .replace(/{WAHA_API_KEY}/g, waha_api_key)
        .replace(/{WAHA_SESSION_NAME}/g, waha_session_name);

      // Execute SSH command
      const sshResponse = await supabaseClient.functions.invoke('ssh-direct-execute', {
        body: {
          host,
          port,
          username,
          password,
          command,
          timeout: step.timeout,
        }
      });

      if (sshResponse.error) {
        throw new Error(`Step ${step.name} failed: ${sshResponse.error.message}`);
      }

      const result = sshResponse.data;

      // Store step output
      stepOutputs.push({
        step: step.step_number,
        name: step.name,
        description: step.description,
        success: result.success,
        output: result.output,
        error: result.error,
        timestamp: new Date().toISOString(),
      });

      // Check if step failed
      if (!result.success) {
        await supabaseClient
          .from('vps_installation_progress')
          .update({ 
            status: 'failed',
            error_message: `Step ${step.name} failed: ${result.error || 'Unknown error'}`,
            step_outputs: stepOutputs,
          })
          .eq('id', progressRecord.id);

        return new Response(
          JSON.stringify({ 
            success: false,
            progress_id: progressRecord.id,
            error: `Installation failed at step ${step.step_number}: ${step.name}`,
            step_outputs: stepOutputs,
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`[WAHA Auto Install] Step ${step.step_number} completed successfully`);
    }

    // Mark installation as completed
    await supabaseClient
      .from('vps_installation_progress')
      .update({ 
        status: 'completed',
        current_step: INSTALL_STEPS.length,
        step_outputs: stepOutputs,
      })
      .eq('id', progressRecord.id);

    console.log(`[WAHA Auto Install] Installation completed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        progress_id: progressRecord.id,
        message: 'WAHA installation completed successfully',
        step_outputs: stepOutputs,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[WAHA Auto Install] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
