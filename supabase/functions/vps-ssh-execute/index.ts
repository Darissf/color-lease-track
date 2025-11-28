import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SSHRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  command: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { host, port, username, password, command }: SSHRequest = await req.json();
    
    console.log(`[SSH Execute] Request to ${username}@${host}:${port}`);
    console.log(`[SSH Execute] Command: ${command.substring(0, 100)}...`);

    // NOTE: Direct SSH from Deno Edge Functions is not reliably supported
    // This endpoint serves as a placeholder for future SSH proxy implementation
    // For now, use the script-based installation method with webhook callbacks
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Direct SSH execution not available. Please use the script-based installation method.',
        method: 'script_based',
        note: 'SSH connections from Edge Functions require external proxy service or agent-based approach.'
      }),
      { 
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[SSH Execute] Error:', error);
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