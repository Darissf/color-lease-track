import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SSHExecuteRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  command: string;
  timeout?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { host, port, username, password, command, timeout = 60000 }: SSHExecuteRequest = await req.json();
    
    console.log(`[SSH Execute] Connecting to ${username}@${host}:${port}`);
    console.log(`[SSH Execute] Command: ${command.substring(0, 100)}...`);

    // Use openssh client via subprocess (more reliable than SSH libraries in Deno)
    const sshCommand = new Deno.Command("sshpass", {
      args: [
        "-p", password,
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "ConnectTimeout=30",
        "-p", port.toString(),
        `${username}@${host}`,
        command
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const process = sshCommand.spawn();
      const { code, stdout, stderr } = await process.output();
      clearTimeout(timeoutId);

      const output = new TextDecoder().decode(stdout);
      const error = new TextDecoder().decode(stderr);

      console.log(`[SSH Execute] Exit code: ${code}`);
      console.log(`[SSH Execute] Output: ${output.substring(0, 500)}`);
      
      if (error) {
        console.log(`[SSH Execute] Error: ${error.substring(0, 500)}`);
      }

      return new Response(
        JSON.stringify({ 
          success: code === 0,
          output: output,
          error: error,
          exit_code: code
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (execError: any) {
      if (execError.name === 'AbortError') {
        throw new Error(`Command timeout after ${timeout}ms`);
      }
      throw execError;
    }

  } catch (error: any) {
    console.error('[SSH Execute] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        output: '',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
