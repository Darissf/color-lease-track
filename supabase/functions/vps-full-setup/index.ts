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
    
    console.log(`[Full Setup] Starting automatic installation for ${body.vps_host}`);

    // Generate installation script
    const installToken = crypto.randomUUID();
    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '').replace('https://', 'https://');
    const callbackUrl = `${appUrl}/functions/v1/install-progress-webhook`;

    const installScript = `#!/bin/bash
set -e

# WAHA Auto-Install Script
# Generated: ${new Date().toISOString()}
# Target: ${body.vps_host}

INSTALL_TOKEN="${installToken}"
CALLBACK_URL="${callbackUrl}"
WAHA_PORT="${body.waha_port}"
WAHA_API_KEY="${body.waha_api_key || crypto.randomUUID()}"

# Progress reporter
report_progress() {
  local step=$1
  local message=$2
  curl -X POST "$CALLBACK_URL" \\
    -H "Content-Type: application/json" \\
    -d "{\\"token\\":\\"$INSTALL_TOKEN\\",\\"step\\":\\"$step\\",\\"message\\":\\"$message\\"}" \\
    -s || true
}

echo "🚀 Starting WAHA Auto-Installation..."
report_progress "checking_system" "Checking system"

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker..."
  report_progress "installing_docker" "Installing Docker"
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
  report_progress "docker_installed" "Docker installed successfully"
else
  echo "✅ Docker already installed"
  report_progress "docker_exists" "Docker already exists"
fi

# Cleanup old containers
echo "🧹 Cleaning up old containers..."
report_progress "cleanup" "Removing old WAHA containers"
docker stop waha 2>/dev/null || true
docker rm waha 2>/dev/null || true

# Pull WAHA image
echo "⬇️  Downloading WAHA..."
report_progress "pulling_image" "Downloading WAHA image"
docker pull devlikeapro/waha:latest

# Create container
echo "🏗️  Creating WAHA container..."
report_progress "creating_container" "Creating WAHA container"
docker run -d \\
  --name waha \\
  --restart=unless-stopped \\
  -p $WAHA_PORT:3000 \\
  -e WAHA_API_KEY="$WAHA_API_KEY" \\
  devlikeapro/waha:latest

# Wait for startup
echo "⏳ Waiting for WAHA to start..."
report_progress "waiting_start" "Waiting for WAHA to start"
sleep 10

# Verify
echo "✅ Verifying installation..."
report_progress "verifying" "Verifying WAHA installation"
if docker ps | grep -q waha; then
  echo "🎉 WAHA installation completed successfully!"
  report_progress "success" "Installation completed"
else
  echo "❌ Installation failed"
  report_progress "error" "Installation verification failed"
  exit 1
fi
`;

    // Create installation session
    const { data: session, error: sessionError } = await supabase
      .from('vps_installation_sessions')
      .insert({
        user_id: user.id,
        vps_credential_id: body.vps_credential_id,
        vps_host: body.vps_host,
        install_token: installToken,
        status: 'pending',
        ssh_method: 'script',
        current_step: 'pending',
        steps_completed: [],
        total_steps: 8,
        command_log: []
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    console.log(`[Full Setup] Session created: ${session.id}`);
    console.log(`[Full Setup] Script generated. User must execute on VPS.`);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        install_token: installToken,
        script: installScript,
        instructions: {
          step1: `SSH to your VPS: ssh ${body.vps_username}@${body.vps_host}`,
          step2: 'Copy and paste the script below',
          step3: 'Or download and run: bash waha-install.sh',
          step4: 'Progress will update automatically'
        },
        message: 'Installation script generated. Execute on your VPS for automatic installation with real-time progress tracking.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Full Setup] Error:', error);
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