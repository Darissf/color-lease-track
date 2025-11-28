import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { vps_host, vps_credential_id } = await req.json();

    if (!vps_host) {
      return new Response(JSON.stringify({ error: 'VPS host required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique agent token
    const agentToken = crypto.randomUUID();

    // Insert agent record
    const { data: agent, error: insertError } = await supabase
      .from('vps_agents')
      .insert({
        user_id: user.id,
        vps_credential_id: vps_credential_id || null,
        agent_token: agentToken,
        vps_host: vps_host,
        status: 'disconnected',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating agent:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create agent' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co') || '';
    
    // Generate agent installer script
    const installerScript = `#!/bin/bash
# WAHA VPS Agent Installer
# Generated: ${new Date().toISOString()}

set -e

echo "🚀 Installing WAHA VPS Agent..."

# Create agent directory
mkdir -p /opt/waha-agent
cd /opt/waha-agent

# Create agent script
cat > /opt/waha-agent/agent.sh << 'AGENT_SCRIPT'
#!/bin/bash
TOKEN="${agentToken}"
API_URL="${appUrl}/vps-agent-controller"

while true; do
  # Send heartbeat and get commands
  RESPONSE=$(curl -s -X POST "$API_URL/heartbeat" \\
    -H "Content-Type: application/json" \\
    -d "{\\"token\\":\\"$TOKEN\\",\\"hostname\\":\\"$(hostname)\\",\\"uptime\\":\\"$(uptime -p)\\"}" 2>&1)
  
  # Check for commands to execute
  COMMANDS=$(curl -s "$API_URL/commands?token=$TOKEN" 2>&1)
  
  if [ ! -z "$COMMANDS" ] && [ "$COMMANDS" != "null" ] && [ "$COMMANDS" != "{}" ]; then
    # Execute commands and send output
    OUTPUT=$(eval "$COMMANDS" 2>&1)
    curl -s -X POST "$API_URL/output" \\
      -H "Content-Type: application/json" \\
      -d "{\\"token\\":\\"$TOKEN\\",\\"output\\":\\"$(echo $OUTPUT | sed 's/"/\\\\"/g')\\"}" > /dev/null
  fi
  
  sleep 5
done
AGENT_SCRIPT

chmod +x /opt/waha-agent/agent.sh

# Create systemd service
cat > /etc/systemd/system/waha-agent.service << 'SERVICE'
[Unit]
Description=WAHA VPS Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/waha-agent
ExecStart=/opt/waha-agent/agent.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

# Enable and start service
systemctl daemon-reload
systemctl enable waha-agent
systemctl start waha-agent

echo "✅ WAHA Agent installed and running!"
echo "🔗 Agent Token: ${agentToken}"
echo "📊 Check status: systemctl status waha-agent"
`;

    return new Response(
      JSON.stringify({
        success: true,
        agent_id: agent.id,
        agent_token: agentToken,
        installer_script: installerScript,
        one_line_command: `curl -sSL ${appUrl}/vps-agent-installer/script?token=${agentToken} | bash`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in vps-agent-installer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
