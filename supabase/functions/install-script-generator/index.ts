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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { vps_credential_id, vps_host, waha_port = 3000 } = await req.json();

    if (!vps_credential_id || !vps_host) {
      throw new Error('Missing required parameters');
    }

    // Generate unique install token
    const installToken = crypto.randomUUID();

    // Create installation session
    const { data: session, error: sessionError } = await supabase
      .from('vps_installation_sessions')
      .insert({
        user_id: user.id,
        vps_credential_id,
        install_token: installToken,
        vps_host,
        waha_port,
        status: 'pending'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw new Error('Failed to create installation session');
    }

    // Get app URL for callback
    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('/supabase', '') || '';
    const callbackUrl = `${appUrl}/functions/v1/install-progress-webhook`;

    // Generate bash installation script with progress callbacks
    const installScript = `#!/bin/bash
# WAHA Auto-Installer Script
# Generated: ${new Date().toISOString()}
# VPS: ${vps_host}
# Port: ${waha_port}

set -e

INSTALL_TOKEN="${installToken}"
CALLBACK_URL="${callbackUrl}"
WAHA_PORT=${waha_port}

# Color codes
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Function to send progress
send_progress() {
    local step=$1
    local message=$2
    echo -e "\${GREEN}[✓]\${NC} \${message}"
    curl -s -X POST "\${CALLBACK_URL}" \\
        -H "Content-Type: application/json" \\
        -d "{\\"token\\":\\"\${INSTALL_TOKEN}\\",\\"step\\":\\"\${step}\\",\\"message\\":\\"\${message}\\"}" || true
}

# Function to send error
send_error() {
    local message=$1
    echo -e "\${RED}[✗]\${NC} \${message}"
    curl -s -X POST "\${CALLBACK_URL}" \\
        -H "Content-Type: application/json" \\
        -d "{\\"token\\":\\"\${INSTALL_TOKEN}\\",\\"step\\":\\"error\\",\\"message\\":\\"\${message}\\"}" || true
}

echo "========================================="
echo "🚀 WAHA Auto-Installer"
echo "========================================="
echo ""

# Step 1: Check system
send_progress "checking_system" "Checking system requirements..."
if ! command -v curl &> /dev/null; then
    send_error "curl not found. Please install curl first."
    exit 1
fi

# Step 2: Install Docker
send_progress "installing_docker" "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    send_progress "docker_installed" "Docker installed successfully"
else
    send_progress "docker_exists" "Docker already installed"
fi

# Step 3: Stop existing WAHA container if any
send_progress "cleanup" "Cleaning up old containers..."
docker stop waha 2>/dev/null || true
docker rm waha 2>/dev/null || true

# Step 4: Pull WAHA image
send_progress "pulling_image" "Pulling WAHA Docker image..."
docker pull devlikeapro/waha:latest

# Step 5: Create WAHA container
send_progress "creating_container" "Creating WAHA container..."
docker run -d \\
  --name waha \\
  --restart unless-stopped \\
  -p \${WAHA_PORT}:3000 \\
  -v waha_data:/app/data \\
  -e WAHA_API_KEY=\${INSTALL_TOKEN} \\
  devlikeapro/waha:latest

# Step 6: Wait for WAHA to start
send_progress "waiting_start" "Waiting for WAHA to start..."
sleep 10

# Step 7: Verify installation
send_progress "verifying" "Verifying installation..."
if curl -s http://localhost:\${WAHA_PORT}/api/version > /dev/null; then
    send_progress "success" "WAHA installed successfully!"
    echo ""
    echo -e "\${GREEN}========================================="
    echo "✅ Installation Complete!"
    echo "=========================================\${NC}"
    echo ""
    echo "WAHA is now running at:"
    echo "  http://${vps_host}:\${WAHA_PORT}"
    echo ""
    echo "API Key: \${INSTALL_TOKEN}"
    echo ""
else
    send_error "WAHA failed to start. Check logs with: docker logs waha"
    exit 1
fi
`;

    // Generate one-line install command
    const oneLineCommand = `curl -fsSL "data:text/plain;base64,${btoa(installScript)}" | bash`;
    
    // Alternative direct download method
    const wgetCommand = `bash <(curl -fsSL "${appUrl}/functions/v1/install-script-generator?token=${installToken}&raw=true")`;

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        install_token: installToken,
        script: installScript,
        one_line_command: oneLineCommand,
        wget_command: wgetCommand,
        callback_url: callbackUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
