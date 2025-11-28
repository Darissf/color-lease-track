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

    const url = new URL(req.url);
    
    // Handle script download endpoint (no auth required for agent)
    if (url.searchParams.get('script') === 'true') {
      const token = url.searchParams.get('token');
      
      if (!token) {
        return new Response('Error: Token required', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        });
      }

      const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co') || '';
      
      const installerScript = `#!/bin/bash
# WAHA VPS Agent Installer
# Generated: ${new Date().toISOString()}

set -e

echo "🚀 Installing WAHA VPS Agent..."

# Install jq if not present (needed for JSON parsing)
if ! command -v jq &> /dev/null; then
  echo "📦 Installing jq for JSON parsing..."
  apt-get update -qq && apt-get install -y -qq jq
fi

# Create agent directory
mkdir -p /opt/waha-agent
cd /opt/waha-agent

# Create agent script
cat > /opt/waha-agent/agent.sh << AGENT_SCRIPT
#!/bin/bash
TOKEN="${token}"
API_URL="${appUrl}/vps-agent-controller"

while true; do
  # Send heartbeat and get commands
  curl -s -X POST "\\$API_URL/heartbeat" \\\\
    -H "Content-Type: application/json" \\\\
    -d "{\\\\"token\\\\":\\\\"\\$TOKEN\\\\",\\\\"hostname\\\\":\\\\"\\$(hostname)\\\\",\\\\"uptime\\\\":\\\\"\\$(uptime -p)\\\\"}" > /dev/null 2>&1
  
  # Check for commands to execute
  RESPONSE=\\$(curl -s "\\$API_URL/commands?token=\\$TOKEN" 2>&1)
  COMMANDS=\\$(echo "\\$RESPONSE" | jq -r '.commands // empty' 2>/dev/null)
  
  if [ -n "\\$COMMANDS" ]; then
    echo "Executing commands..."
    OUTPUT=\\$(eval "\\$COMMANDS" 2>&1)
    
    # Send output back using jq for proper JSON encoding
    curl -s -X POST "\\$API_URL/output" \\\\
      -H "Content-Type: application/json" \\\\
      -d "\\$(jq -n --arg t "\\$TOKEN" --arg o "\\$OUTPUT" '{token:\\$t,output:\\$o}')" > /dev/null 2>&1
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
echo "🔗 Agent Token: ${token}"
echo "📊 Check status: systemctl status waha-agent"
`;

      return new Response(installerScript, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Handle agent creation (requires auth)
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

    return new Response(
      JSON.stringify({
        success: true,
        agent_id: agent.id,
        agent_token: agentToken,
        one_line_command: `curl -sSL "${appUrl}/vps-agent-installer?script=true&token=${agentToken}" | bash`,
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
