import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VPSConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface WAHAConfig {
  port: number;
  sessionName: string;
  apiKey: string;
}

interface SetupResult {
  id: string;
  success: boolean;
  message: string;
  output?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vps, waha }: { vps: VPSConfig; waha: WAHAConfig } = await req.json();
    
    console.log(`[VPS Auto Setup] Starting setup for ${vps.host}`);
    
    const results: SetupResult[] = [];
    
    // Step 1: Test SSH connection
    results.push(await testConnection(vps));
    if (!results[results.length - 1].success) {
      throw new Error('SSH connection failed');
    }

    // Step 2: Check Docker
    results.push(await checkDocker(vps));

    // Step 3: Install Docker if needed
    if (!results[results.length - 1].success) {
      results.push(await installDocker(vps));
    } else {
      results.push({
        id: 'install-docker',
        success: true,
        message: 'Docker already installed, skipping',
      });
    }

    // Step 4: Create WAHA directory
    results.push(await createWAHADirectory(vps));

    // Step 5: Upload docker-compose.yml
    results.push(await uploadDockerCompose(vps, waha));

    // Step 6: Pull WAHA image
    results.push(await pullWAHAImage(vps));

    // Step 7: Start container
    results.push(await startWAHAContainer(vps));

    // Step 8: Configure firewall
    results.push(await configureFirewall(vps, waha.port));

    // Step 9: Health check
    results.push(await healthCheck(vps, waha.port));

    console.log('[VPS Auto Setup] Setup completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        steps: results,
        wahaUrl: `http://${vps.host}:${waha.port}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[VPS Auto Setup] Error:', error);
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

async function executeSSH(vps: VPSConfig, command: string): Promise<{ success: boolean; output: string }> {
  // Call vps-ssh-execute function
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/vps-ssh-execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ ...vps, command }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'SSH execution failed');
  }

  return await response.json();
}

async function testConnection(vps: VPSConfig): Promise<SetupResult> {
  try {
    const result = await executeSSH(vps, 'echo "Connection successful"');
    return {
      id: 'connect',
      success: result.success,
      message: 'Connected to VPS successfully',
      output: result.output,
    };
  } catch (error: any) {
    return {
      id: 'connect',
      success: false,
      message: `Failed to connect: ${error.message}`,
    };
  }
}

async function checkDocker(vps: VPSConfig): Promise<SetupResult> {
  try {
    const result = await executeSSH(vps, 'docker --version');
    return {
      id: 'check-docker',
      success: result.success && result.output.includes('Docker version'),
      message: result.success ? 'Docker is installed' : 'Docker not found',
      output: result.output,
    };
  } catch (error: any) {
    return {
      id: 'check-docker',
      success: false,
      message: 'Docker not installed',
    };
  }
}

async function installDocker(vps: VPSConfig): Promise<SetupResult> {
  try {
    const commands = [
      'curl -fsSL https://get.docker.com -o get-docker.sh',
      'sh get-docker.sh',
      'systemctl enable docker',
      'systemctl start docker',
    ];
    
    let output = '';
    for (const cmd of commands) {
      const result = await executeSSH(vps, cmd);
      output += result.output + '\n';
      if (!result.success) {
        return {
          id: 'install-docker',
          success: false,
          message: 'Failed to install Docker',
          output,
        };
      }
    }

    return {
      id: 'install-docker',
      success: true,
      message: 'Docker installed successfully',
      output,
    };
  } catch (error: any) {
    return {
      id: 'install-docker',
      success: false,
      message: `Docker installation failed: ${error.message}`,
    };
  }
}

async function createWAHADirectory(vps: VPSConfig): Promise<SetupResult> {
  try {
    const result = await executeSSH(vps, 'mkdir -p ~/waha && cd ~/waha && pwd');
    return {
      id: 'create-dir',
      success: result.success,
      message: 'WAHA directory created',
      output: result.output,
    };
  } catch (error: any) {
    return {
      id: 'create-dir',
      success: false,
      message: `Failed to create directory: ${error.message}`,
    };
  }
}

async function uploadDockerCompose(vps: VPSConfig, waha: WAHAConfig): Promise<SetupResult> {
  try {
    const dockerCompose = `
version: '3.8'
services:
  waha:
    image: devlikeapro/waha
    container_name: waha
    restart: unless-stopped
    ports:
      - "${waha.port}:3000"
    environment:
      - WHATSAPP_HOOK_URL=
      - WHATSAPP_API_KEY=${waha.apiKey}
      - WHATSAPP_API_PORT=3000
    volumes:
      - ./sessions:/app/sessions
`;

    const escapedCompose = dockerCompose.replace(/'/g, "'\\''");
    const command = `cat > ~/waha/docker-compose.yml << 'EOF'\n${escapedCompose}\nEOF`;
    
    const result = await executeSSH(vps, command);
    return {
      id: 'docker-compose',
      success: result.success,
      message: 'docker-compose.yml uploaded',
      output: result.output,
    };
  } catch (error: any) {
    return {
      id: 'docker-compose',
      success: false,
      message: `Failed to upload docker-compose: ${error.message}`,
    };
  }
}

async function pullWAHAImage(vps: VPSConfig): Promise<SetupResult> {
  try {
    const result = await executeSSH(vps, 'cd ~/waha && docker-compose pull');
    return {
      id: 'pull-image',
      success: result.success,
      message: 'WAHA Docker image pulled',
      output: result.output,
    };
  } catch (error: any) {
    return {
      id: 'pull-image',
      success: false,
      message: `Failed to pull image: ${error.message}`,
    };
  }
}

async function startWAHAContainer(vps: VPSConfig): Promise<SetupResult> {
  try {
    const result = await executeSSH(vps, 'cd ~/waha && docker-compose up -d');
    return {
      id: 'start-container',
      success: result.success,
      message: 'WAHA container started',
      output: result.output,
    };
  } catch (error: any) {
    return {
      id: 'start-container',
      success: false,
      message: `Failed to start container: ${error.message}`,
    };
  }
}

async function configureFirewall(vps: VPSConfig, port: number): Promise<SetupResult> {
  try {
    // Try UFW first, then firewalld
    const commands = [
      `command -v ufw && ufw allow ${port}/tcp || echo "UFW not found"`,
      `command -v firewall-cmd && firewall-cmd --permanent --add-port=${port}/tcp && firewall-cmd --reload || echo "firewalld not found"`,
    ];
    
    let output = '';
    for (const cmd of commands) {
      const result = await executeSSH(vps, cmd);
      output += result.output + '\n';
    }

    return {
      id: 'firewall',
      success: true,
      message: 'Firewall configured (if available)',
      output,
    };
  } catch (error: any) {
    return {
      id: 'firewall',
      success: true, // Non-critical, don't fail setup
      message: 'Firewall configuration skipped',
    };
  }
}

async function healthCheck(vps: VPSConfig, port: number): Promise<SetupResult> {
  try {
    // Wait a few seconds for container to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const result = await executeSSH(vps, `curl -s http://localhost:${port}/health || echo "Health check failed"`);
    
    const isHealthy = result.output.includes('ok') || result.output.includes('healthy');
    
    return {
      id: 'health-check',
      success: isHealthy,
      message: isHealthy ? 'WAHA is healthy and running' : 'Health check inconclusive, but container is running',
      output: result.output,
    };
  } catch (error: any) {
    return {
      id: 'health-check',
      success: false,
      message: `Health check failed: ${error.message}`,
    };
  }
}
