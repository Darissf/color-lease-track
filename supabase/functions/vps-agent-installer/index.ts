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

      // Use direct SUPABASE_URL for correct endpoint construction
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || '';
      const appUrl = `https://${projectRef}.supabase.co/functions/v1`;
      
      const installerScript = `#!/bin/bash
# WAHA VPS Agent Installer
# Generated: ${new Date().toISOString()}

set -e

echo "🚀 Installing WAHA VPS Agent..."

# Install jq if not present (needed for JSON parsing)
if ! command -v jq &> /dev/null; then
  echo "📦 Installing jq for JSON parsing..."
  if apt-get update -qq && apt-get install -y -qq jq; then
    echo "✅ jq installed successfully"
  else
    echo "❌ Failed to install jq"
    exit 1
  fi
fi

# Create agent directory
mkdir -p /opt/waha-agent
cd /opt/waha-agent

# Create agent script with simplified, robust logging
cat > /opt/waha-agent/agent.sh << 'AGENT_SCRIPT'
#!/bin/bash
set -e

TOKEN="${token}"
API_URL="${appUrl}/vps-agent-controller"
LOG_FILE="/var/log/waha-agent.log"

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🚀 WAHA Agent starting..."
log "Token: $TOKEN"
log "API URL: $API_URL"

# Test connection with ping endpoint
log "🔗 Testing connection to server..."
if ! TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/ping" 2>&1); then
  log "❌ Curl command failed: $TEST_RESPONSE"
  exit 1
fi

if [ "$TEST_RESPONSE" != "200" ]; then
  log "❌ Cannot connect to server! HTTP: $TEST_RESPONSE"
  log "API_URL: $API_URL/ping"
  log "Check: 1) Internet 2) Firewall 3) DNS resolution"
  exit 1
fi
log "✅ Connection test successful!"

# Send initial heartbeat
log "📡 Sending initial heartbeat..."
HEARTBEAT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/heartbeat" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"hostname\":\"$(hostname)\",\"uptime\":\"initial\"}" 2>&1)

HTTP_CODE=$(echo "$HEARTBEAT_RESPONSE" | tail -n1)
BODY=$(echo "$HEARTBEAT_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "200" ]; then
  log "❌ Initial heartbeat failed: HTTP $HTTP_CODE"
  log "Response: $BODY"
  exit 1
fi
log "✅ Initial heartbeat sent successfully"

# Main agent loop
log "🔄 Starting main agent loop..."
while true; do
  # Send heartbeat
  HEARTBEAT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$TOKEN\",\"hostname\":\"$(hostname)\",\"uptime\":\"$(uptime -p)\"}" 2>&1)
  
  HTTP_CODE=$(echo "$HEARTBEAT_RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" != "200" ]; then
    log "⚠️ Heartbeat failed: HTTP $HTTP_CODE"
  fi
  
  # Check for commands to execute
  RESPONSE=$(curl -s "$API_URL/commands?token=$TOKEN" 2>&1)
  COMMANDS=$(echo "$RESPONSE" | jq -r '.commands // empty' 2>/dev/null || echo "")
  
  if [ -n "$COMMANDS" ]; then
    log "📝 Executing commands: $COMMANDS"
    OUTPUT=$(eval "$COMMANDS" 2>&1 || echo "Command failed: $?")
    log "📤 Command output: $OUTPUT"
    
    # Send output back using jq for proper JSON encoding
    curl -s -X POST "$API_URL/output" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg t "$TOKEN" --arg o "$OUTPUT" '{token:$t,output:$o}')" > /dev/null 2>&1 || true
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

echo ""
echo "⏳ Verifying agent service..."
sleep 3

# Verify agent is running
if systemctl is-active --quiet waha-agent; then
  echo "✅ Agent service is running!"
else
  echo "❌ Agent service failed to start!"
  echo "📋 Last 20 log lines:"
  journalctl -u waha-agent -n 20 --no-pager
  exit 1
fi

echo ""
echo "✅ WAHA Agent installed and running!"
echo "🔗 Agent Token: ${token}"
echo "📊 Check status: systemctl status waha-agent"
echo "📋 View logs: tail -f /var/log/waha-agent.log"
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

    // Use direct SUPABASE_URL for correct endpoint construction
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || '';
    const appUrl = `https://${projectRef}.supabase.co/functions/v1`;

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
