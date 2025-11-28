import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store pending commands and outputs in memory
const pendingCommands = new Map<string, string>();
const commandOutputs = new Map<string, string[]>();

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
    const path = url.pathname.split('/').pop();

    // Heartbeat endpoint - agent sends regular heartbeats
    if (path === 'heartbeat' && req.method === 'POST') {
      const { token, hostname, uptime } = await req.json();

      if (!token) {
        return new Response(JSON.stringify({ error: 'Token required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update agent status
      const { error } = await supabase
        .from('vps_agents')
        .update({
          status: 'connected',
          last_heartbeat: new Date().toISOString(),
          vps_info: { hostname, uptime },
        })
        .eq('agent_token', token);

      if (error) {
        console.error('Error updating agent heartbeat:', error);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get commands endpoint - agent polls for commands to execute
    if (path === 'commands' && req.method === 'GET') {
      const token = url.searchParams.get('token');

      if (!token) {
        return new Response(JSON.stringify({ error: 'Token required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const commands = pendingCommands.get(token) || '';
      if (commands) {
        pendingCommands.delete(token); // Clear after sending
      }

      return new Response(JSON.stringify({ commands }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Output endpoint - agent sends command execution output
    if (path === 'output' && req.method === 'POST') {
      const { token, output } = await req.json();

      if (!token) {
        return new Response(JSON.stringify({ error: 'Token required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store output
      const outputs = commandOutputs.get(token) || [];
      outputs.push(output);
      commandOutputs.set(token, outputs);

      // Keep only last 100 outputs
      if (outputs.length > 100) {
        commandOutputs.set(token, outputs.slice(-100));
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute endpoint - web app sends commands to execute
    if (path === 'execute' && req.method === 'POST') {
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

      const { agent_id, commands } = await req.json();

      if (!agent_id || !commands) {
        return new Response(JSON.stringify({ error: 'Agent ID and commands required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get agent token
      const { data: agent, error: agentError } = await supabase
        .from('vps_agents')
        .select('agent_token, status')
        .eq('id', agent_id)
        .eq('user_id', user.id)
        .single();

      if (agentError || !agent) {
        return new Response(JSON.stringify({ error: 'Agent not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (agent.status !== 'connected') {
        return new Response(JSON.stringify({ error: 'Agent not connected' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Queue commands
      pendingCommands.set(agent.agent_token, commands);

      return new Response(JSON.stringify({ success: true, message: 'Commands queued' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get output endpoint - web app polls for command outputs
    if (path === 'get-output' && req.method === 'GET') {
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

      const agentId = url.searchParams.get('agent_id');

      if (!agentId) {
        return new Response(JSON.stringify({ error: 'Agent ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get agent token
      const { data: agent, error: agentError } = await supabase
        .from('vps_agents')
        .select('agent_token')
        .eq('id', agentId)
        .eq('user_id', user.id)
        .single();

      if (agentError || !agent) {
        return new Response(JSON.stringify({ error: 'Agent not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const outputs = commandOutputs.get(agent.agent_token) || [];

      return new Response(JSON.stringify({ outputs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in vps-agent-controller:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
