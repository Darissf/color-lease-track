import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configurations per endpoint
const RATE_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  'heartbeat': { maxRequests: 60, windowSeconds: 300 }, // 60 per 5 min
  'commands': { maxRequests: 30, windowSeconds: 60 },   // 30 per 1 min
  'output': { maxRequests: 60, windowSeconds: 60 },     // 60 per 1 min
  'execute': { maxRequests: 20, windowSeconds: 60 },    // 20 per 1 min
  'get-output': { maxRequests: 120, windowSeconds: 60 }, // 120 per 1 min (polling)
};

// Check rate limit and update counter
async function checkRateLimit(
  supabase: any,
  identifier: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    return { allowed: true, remaining: 999, resetIn: 0 };
  }

  const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

  // Get current count within window
  const { data: existing } = await supabase
    .from('security_rate_limits')
    .select('id, request_count, window_start')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const currentCount = existing.request_count || 0;
    const remaining = Math.max(0, config.maxRequests - currentCount - 1);
    const windowAge = Date.now() - new Date(existing.window_start).getTime();
    const resetIn = Math.max(0, config.windowSeconds * 1000 - windowAge);

    if (currentCount >= config.maxRequests) {
      console.log(`[Rate Limit] BLOCKED: ${identifier} on ${endpoint} (${currentCount}/${config.maxRequests})`);
      return { allowed: false, remaining: 0, resetIn };
    }

    // Update counter
    await supabase
      .from('security_rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('id', existing.id);

    return { allowed: true, remaining, resetIn };
  }

  // Create new window
  await supabase.from('security_rate_limits').insert({
    identifier,
    endpoint,
    request_count: 1,
    window_start: new Date().toISOString(),
  });

  return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowSeconds * 1000 };
}

// Get client IP from request
function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

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
    const pathname = url.pathname;
    const clientIP = getClientIP(req);

    // Simple ping endpoint for connection testing (no rate limit)
    if (pathname.includes('/ping')) {
      return new Response('pong', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }
    
    // Get path from URL
    const path = url.pathname.split('/').pop();
    
    // For POST requests, also check for action in body
    let bodyAction = null;
    let bodyData = null;
    if (req.method === 'POST') {
      try {
        const clonedRequest = req.clone();
        bodyData = await clonedRequest.json();
        bodyAction = bodyData?.action;
      } catch (e) {
        // Not JSON body, continue with path-based routing
      }
    }

    // Test endpoint - public connectivity check (no auth required, no rate limit)
    if (path === 'test' && req.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'VPS Agent Controller is online'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== RATE LIMITED ENDPOINTS ==========

    // Heartbeat endpoint - agent sends regular heartbeats
    if (path === 'heartbeat' && req.method === 'POST') {
      const { token, hostname, uptime } = await req.json();

      if (!token) {
        return new Response(JSON.stringify({ error: 'Token required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Rate limit by token
      const rateLimit = await checkRateLimit(supabase, token, 'heartbeat');
      if (!rateLimit.allowed) {
        console.log(`[VPS Agent] Rate limit exceeded for heartbeat from ${clientIP}, token: ${token.substring(0, 8)}...`);
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          retry_after: Math.ceil(rateLimit.resetIn / 1000)
        }), {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        });
      }

      // Get agent info for logging
      const { data: agent } = await supabase
        .from('vps_agents')
        .select('id, user_id')
        .eq('agent_token', token)
        .single();

      // Update agent status
      const { error } = await supabase
        .from('vps_agents')
        .update({
          status: 'connected',
          last_heartbeat: new Date().toISOString(),
          vps_info: { hostname, uptime, last_ip: clientIP },
        })
        .eq('agent_token', token);

      if (error) {
        console.error('Error updating agent heartbeat:', error);
        
        // Log error to agent_logs
        if (agent) {
          await supabase.from('agent_logs').insert({
            agent_id: agent.id,
            user_id: agent.user_id,
            log_type: 'error',
            message: 'Failed to update agent status',
            metadata: { error: error.message },
          });
        }
        
        return new Response(JSON.stringify({ error: 'Failed to update status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log successful heartbeat (reduce log frequency)
      if (agent && Math.random() < 0.1) { // Log only 10% of heartbeats
        await supabase.from('agent_logs').insert({
          agent_id: agent.id,
          user_id: agent.user_id,
          log_type: 'heartbeat',
          message: 'Agent heartbeat received',
          metadata: { hostname, uptime, ip: clientIP },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
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

      // Rate limit by token
      const rateLimit = await checkRateLimit(supabase, token, 'commands');
      if (!rateLimit.allowed) {
        console.log(`[VPS Agent] Rate limit exceeded for commands from ${clientIP}`);
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          retry_after: Math.ceil(rateLimit.resetIn / 1000)
        }), {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
          },
        });
      }

      // Get pending commands from database
      const { data: pendingCommands, error } = await supabase
        .from('agent_commands')
        .select('id, commands')
        .eq('agent_token', token)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Error fetching commands:', error);
        return new Response(JSON.stringify({ commands: '' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (pendingCommands && pendingCommands.length > 0) {
        const command = pendingCommands[0];
        
        // Update status to executing
        await supabase
          .from('agent_commands')
          .update({ 
            status: 'executing',
            executed_at: new Date().toISOString()
          })
          .eq('id', command.id);

        return new Response(JSON.stringify({ commands: command.commands }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ commands: '' }), {
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

      // Rate limit by token
      const rateLimit = await checkRateLimit(supabase, token, 'output');
      if (!rateLimit.allowed) {
        console.log(`[VPS Agent] Rate limit exceeded for output from ${clientIP}`);
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          retry_after: Math.ceil(rateLimit.resetIn / 1000)
        }), {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
          },
        });
      }

      // Store output in database
      const { error } = await supabase
        .from('agent_command_outputs')
        .insert({
          agent_token: token,
          output: output
        });

      if (error) {
        console.error('Error storing output:', error);
        return new Response(JSON.stringify({ error: 'Failed to store output' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if this is completion output, update command status
      if (output.includes('WAHA Installation Complete!') || output.includes('Installation complete')) {
        await supabase
          .from('agent_commands')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('agent_token', token)
          .eq('status', 'executing');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute endpoint - web app sends commands to execute
    // Support both path-based (/execute) and body-based (action: 'execute')
    if ((path === 'execute' || bodyAction === 'execute') && req.method === 'POST') {
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

      // Rate limit by user ID
      const rateLimit = await checkRateLimit(supabase, user.id, 'execute');
      if (!rateLimit.allowed) {
        console.log(`[VPS Agent] Rate limit exceeded for execute from user ${user.id}`);
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait before sending more commands.',
          retry_after: Math.ceil(rateLimit.resetIn / 1000)
        }), {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
          },
        });
      }

      // Get data from body (either already parsed or parse now)
      const requestData = bodyData || await req.json();
      const { agent_id, commands } = requestData;

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

      // Clear old outputs for this agent before new execution
      await supabase
        .from('agent_command_outputs')
        .delete()
        .eq('agent_token', agent.agent_token);

      // Insert commands into database
      const { error: insertError } = await supabase
        .from('agent_commands')
        .insert({
          agent_token: agent.agent_token,
          commands: commands,
          status: 'pending'
        });

      if (insertError) {
        console.error('Error inserting commands:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to queue commands' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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

      // Rate limit by user ID
      const rateLimit = await checkRateLimit(supabase, user.id, 'get-output');
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          retry_after: Math.ceil(rateLimit.resetIn / 1000)
        }), {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
          },
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

      // Get outputs from database
      const { data: outputRecords, error: outputError } = await supabase
        .from('agent_command_outputs')
        .select('output, created_at')
        .eq('agent_token', agent.agent_token)
        .order('created_at', { ascending: true });

      if (outputError) {
        console.error('Error fetching outputs:', outputError);
        return new Response(JSON.stringify({ outputs: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const outputs = outputRecords?.map(record => record.output) || [];

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
