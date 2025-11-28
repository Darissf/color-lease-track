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

# Create agent script with non-blocking execution and real-time streaming
cat > /opt/waha-agent/agent.sh << 'AGENT_SCRIPT'
#!/bin/bash

TOKEN="${token}"
API_URL="${appUrl}/vps-agent-controller"
LOG_FILE="/var/log/waha-agent.log"
OUTPUT_FILE="/tmp/waha-output.log"
CMD_FILE="/tmp/waha-cmd.sh"
CMD_PID=""
LAST_LINE=0

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Send output incrementally
send_output() {
  local output="$1"
  if [ -n "$output" ]; then
    curl -s -X POST "$API_URL/output" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg t "$TOKEN" --arg o "$output" '{token:$t,output:$o}')" > /dev/null 2>&1 || true
  fi
}

log "🚀 WAHA Agent starting..."
log "Token: $TOKEN"
log "API URL: $API_URL"

# Test connection
log "🔗 Testing connection to server..."
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/ping" 2>&1) || TEST_RESPONSE="000"

if [ "$TEST_RESPONSE" != "200" ]; then
  log "❌ Cannot connect to server! HTTP: $TEST_RESPONSE"
  exit 1
fi
log "✅ Connection test successful!"

# Send initial heartbeat
log "📡 Sending initial heartbeat..."
HEARTBEAT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/heartbeat" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg t "$TOKEN" --arg h "$(hostname)" --arg u "initial" '{token:$t,hostname:$h,uptime:$u}')" 2>&1)

HTTP_CODE=$(echo "$HEARTBEAT_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
  log "❌ Initial heartbeat failed: HTTP $HTTP_CODE"
  exit 1
fi
log "✅ Initial heartbeat sent successfully"

# Main agent loop with non-blocking execution
log "🔄 Starting main agent loop..."
while true; do
  # Send heartbeat (always runs, even during command execution)
  curl -s -X POST "$API_URL/heartbeat" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg t "$TOKEN" --arg h "$(hostname)" --arg u "$(uptime -p)" '{token:$t,hostname:$h,uptime:$u}')" > /dev/null 2>&1 || true
  
  # Check if there's a running command
  if [ -n "$CMD_PID" ]; then
    # Check if command is still running
    if kill -0 "$CMD_PID" 2>/dev/null; then
      # Command still running - stream new output lines
      if [ -f "$OUTPUT_FILE" ]; then
        TOTAL_LINES=$(wc -l < "$OUTPUT_FILE" 2>/dev/null || echo "0")
        if [ "$TOTAL_LINES" -gt "$LAST_LINE" ]; then
          # Get new lines since last check
          NEW_OUTPUT=$(tail -n +$((LAST_LINE + 1)) "$OUTPUT_FILE" 2>/dev/null || echo "")
          if [ -n "$NEW_OUTPUT" ]; then
            log "📤 Streaming output ($TOTAL_LINES lines)"
            send_output "$NEW_OUTPUT"
            LAST_LINE=$TOTAL_LINES
          fi
        fi
      fi
    else
      # Command finished
      log "✅ Command completed (PID: $CMD_PID)"
      
      # Send any remaining output
      if [ -f "$OUTPUT_FILE" ]; then
        TOTAL_LINES=$(wc -l < "$OUTPUT_FILE" 2>/dev/null || echo "0")
        if [ "$TOTAL_LINES" -gt "$LAST_LINE" ]; then
          FINAL_OUTPUT=$(tail -n +$((LAST_LINE + 1)) "$OUTPUT_FILE" 2>/dev/null || echo "")
          if [ -n "$FINAL_OUTPUT" ]; then
            send_output "$FINAL_OUTPUT"
          fi
        fi
      fi
      
      # Cleanup
      CMD_PID=""
      LAST_LINE=0
      rm -f "$OUTPUT_FILE" "$CMD_FILE"
    fi
  else
    # No running command - check for new commands
    RESPONSE=$(curl -s "$API_URL/commands?token=$TOKEN" 2>&1)
    COMMANDS=$(echo "$RESPONSE" | jq -r '.commands // empty' 2>/dev/null || echo "")
    
    if [ -n "$COMMANDS" ]; then
      log "📝 Starting command execution in background"
      
      # Clear old output file
      rm -f "$OUTPUT_FILE"
      LAST_LINE=0
      
      # Write commands to script file
      echo "$COMMANDS" > "$CMD_FILE"
      
      # Execute in background, output to file
      bash "$CMD_FILE" > "$OUTPUT_FILE" 2>&1 &
      CMD_PID=$!
      
      log "🔄 Command running (PID: $CMD_PID)"
    fi
  fi
  
  # Sleep 2 seconds (faster polling for better responsiveness)
  sleep 2
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
