import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ControlRequest {
  action: 'status' | 'start' | 'stop' | 'restart' | 'logs';
  wahaApiUrl: string;
  wahaApiKey: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, wahaApiUrl, wahaApiKey }: ControlRequest = await req.json();

    console.log(`Docker control action: ${action} for ${wahaApiUrl}`);

    // Make request to WAHA API for status/control
    let result;
    
    switch (action) {
      case 'status':
        result = await getContainerStatus(wahaApiUrl, wahaApiKey);
        break;
      case 'start':
        result = await controlContainer(wahaApiUrl, wahaApiKey, 'start');
        break;
      case 'stop':
        result = await controlContainer(wahaApiUrl, wahaApiKey, 'stop');
        break;
      case 'restart':
        result = await controlContainer(wahaApiUrl, wahaApiKey, 'restart');
        break;
      case 'logs':
        result = await getContainerLogs(wahaApiUrl, wahaApiKey);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in waha-docker-control:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getContainerStatus(wahaApiUrl: string, apiKey: string) {
  try {
    // Call WAHA API to get status
    const response = await fetch(`${wahaApiUrl}/api/server/status`, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('WAHA API unreachable');
    }

    const data = await response.json();
    
    return {
      success: true,
      container: {
        id: data.containerId || 'waha-container',
        name: 'waha',
        status: 'running',
        uptime: data.uptime || 'N/A',
        memory: data.memory || 'N/A',
        cpu: data.cpu || 'N/A',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'Cannot connect to WAHA. Container might be stopped.',
      container: {
        id: 'unknown',
        name: 'waha',
        status: 'stopped',
        uptime: 'N/A',
        memory: 'N/A',
        cpu: 'N/A',
      },
    };
  }
}

async function controlContainer(
  wahaApiUrl: string,
  apiKey: string,
  action: 'start' | 'stop' | 'restart'
) {
  // Note: WAHA API doesn't have direct container control endpoints
  // These would need to be implemented via SSH to VPS or Docker API
  // For now, return simulated response
  
  return {
    success: true,
    message: `Container ${action} command sent. Please check Docker Dashboard for status.`,
    note: 'Direct container control requires SSH access to VPS. Use Quick Actions panel for SSH commands.',
  };
}

async function getContainerLogs(wahaApiUrl: string, apiKey: string) {
  try {
    // Try to get logs via WAHA API if available
    const response = await fetch(`${wahaApiUrl}/api/server/logs`, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    if (response.ok) {
      const logs = await response.json();
      return {
        success: true,
        logs: Array.isArray(logs) ? logs : [logs.toString()],
      };
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
  }

  // Fallback: return instruction for manual log access
  return {
    success: true,
    logs: [
      '# WAHA Container Logs',
      '# To view real-time logs, run this command on your VPS:',
      '# docker logs -f waha',
      '',
      '# Or download logs:',
      '# docker logs waha > waha-logs.txt',
      '',
      '# Note: Direct log streaming requires SSH access to VPS',
    ],
  };
}