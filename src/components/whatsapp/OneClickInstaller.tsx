import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Rocket, CheckCircle2, AlertTriangle } from 'lucide-react';
import { VPSCredentials } from '@/hooks/useVPSCredentials';
import { InstallProgress } from './InstallProgress';
import { AgentSetup } from './AgentSetup';
import { LiveTerminalOutput } from './LiveTerminalOutput';

interface OneClickInstallerProps {
  credentials: VPSCredentials;
  onSuccess?: () => void;
}

interface InstallProgressData {
  id: string;
  status: string;
  current_step: number;
  total_steps: number;
  step_outputs: Array<{
    step: number;
    name: string;
    description: string;
    success: boolean;
    output: string;
    error: string;
    timestamp: string;
  }>;
  error_message?: string;
}


export const OneClickInstaller = ({ credentials, onSuccess }: OneClickInstallerProps) => {
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<InstallProgressData | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [agentConnected, setAgentConnected] = useState(false);
  const [agentId, setAgentId] = useState<string>("");
  const [terminalOutput, setTerminalOutput] = useState<string>("");
  const [installComplete, setInstallComplete] = useState(false);
  const [wahaApiKey, setWahaApiKey] = useState<string>("");
  const [wahaUrl, setWahaUrl] = useState<string>("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!progress) return;

    const channel = supabase
      .channel('install-progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vps_installation_progress',
          filter: `id=eq.${progress.id}`
        },
        (payload) => {
          const updated = payload.new as any;
          setProgress({
            ...updated,
            step_outputs: Array.isArray(updated.step_outputs) 
              ? updated.step_outputs 
              : []
          } as InstallProgressData);

          // Show notifications
          if (updated.status === 'completed') {
            toast({
              title: '✅ Instalasi Berhasil!',
              description: 'WAHA telah terinstall dan siap digunakan.',
            });
            setInstalling(false);
            if (pollingInterval) clearInterval(pollingInterval);
            if (onSuccess) onSuccess();
          } else if (updated.status === 'failed') {
            toast({
              title: '❌ Instalasi Gagal',
              description: updated.error_message || 'Terjadi kesalahan saat instalasi.',
              variant: 'destructive',
            });
            setInstalling(false);
            if (pollingInterval) clearInterval(pollingInterval);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [progress, toast, onSuccess, pollingInterval]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const handleAgentConnected = (agentIdParam: string) => {
    setAgentConnected(true);
    setAgentId(agentIdParam);
    toast({
      title: "✅ Agent Ready",
      description: "You can now install WAHA with one click!",
    });
  };

  const reconfigureWaha = async () => {
    if (!agentConnected || !agentId) {
      toast({
        title: "❌ Agent Not Connected",
        description: "Please wait for agent to connect first",
        variant: "destructive",
      });
      return;
    }

    // Fetch existing API key from database
    const { data: vpsData } = await supabase
      .from('vps_credentials')
      .select('waha_api_key')
      .eq('id', credentials.id)
      .single();

    const existingApiKey = vpsData?.waha_api_key;
    if (!existingApiKey) {
      toast({
        title: "❌ No API Key Found",
        description: "Please run full installation first",
        variant: "destructive",
      });
      return;
    }

    setInstalling(true);
    setTerminalOutput("");
    setInstallComplete(false);

    try {
      toast({
        title: "🔄 Reconfiguring WAHA",
        description: "Restarting container with correct API key...",
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // Reconfigure script - restart container with API key
      const reconfigureScript = `#!/bin/bash
set -e

echo "=== Stopping WAHA Container ==="
docker stop waha 2>/dev/null || echo "Container not running"
docker rm waha 2>/dev/null || echo "Container already removed"

echo ""
echo "=== Starting WAHA with API Key ==="
docker run -d --name waha \\
  --restart=always \\
  -p 3000:3000 \\
  -e WHATSAPP_HOOK_EVENTS=* \\
  -e WHATSAPP_API_KEY=${existingApiKey} \\
  devlikeapro/waha:latest

echo "✅ WAHA restarted with API Key"

echo ""
echo "=== Verifying Container ==="
sleep 5
docker ps | grep waha

echo ""
echo "🎉 WAHA Reconfiguration Complete!"
`;

      // Send command to agent
      const executeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vps-agent-controller/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
          },
          body: JSON.stringify({
            agent_id: agentId,
            commands: reconfigureScript
          })
        }
      );

      if (!executeResponse.ok) {
        throw new Error(`HTTP ${executeResponse.status}`);
      }

      setTerminalOutput(`📡 Reconfigure commands queued\n⏳ Waiting for agent...\n\n`);

      // Poll for completion
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const outputResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vps-agent-controller/get-output?agent_id=${agentId}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
              }
            }
          );

          if (outputResponse.ok) {
            const outputData = await outputResponse.json();
            if (outputData?.outputs && outputData.outputs.length > 0) {
              const fullOutput = outputData.outputs.join('\n');
              setTerminalOutput(prev => {
                if (!prev.includes(fullOutput)) {
                  return prev + fullOutput + '\n';
                }
                return prev;
              });

              if (fullOutput.includes("WAHA Reconfiguration Complete!")) {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                setInstalling(false);
                setInstallComplete(true);
                setWahaApiKey(existingApiKey);
                setWahaUrl(`http://${credentials.host}:3000`);
                
                toast({
                  title: "✅ Reconfiguration Complete!",
                  description: "WAHA is now running with the correct API key",
                });
              }
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 2000);

      setPollingInterval(pollingIntervalRef.current);

    } catch (error: any) {
      console.error('Error reconfiguring WAHA:', error);
      toast({
        title: "❌ Reconfiguration Failed",
        description: error.message || "Failed to reconfigure",
        variant: "destructive",
      });
      setInstalling(false);
    }
  };

  const startAgentInstall = async () => {
    if (!agentConnected || !agentId) {
      toast({
        title: "❌ Agent Not Connected",
        description: "Please wait for agent to connect first",
        variant: "destructive",
      });
      return;
    }

    setInstalling(true);
    setTerminalOutput("");
    setInstallComplete(false);

    try {
      toast({
        title: "🚀 Starting WAHA Installation",
        description: "Sending installation commands to VPS agent...",
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // Auto-generate WAHA API Key
      const generatedApiKey = crypto.randomUUID();
      setWahaApiKey(generatedApiKey);
      setWahaUrl(`http://${credentials.host}:3000`);

      // WAHA Installation Script with API Key
      const installScript = `#!/bin/bash
set -e

echo "=== Step 1: Installing Docker ==="
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | bash
  systemctl start docker
  systemctl enable docker
  echo "✅ Docker installed successfully"
else
  echo "✅ Docker already installed"
fi

echo ""
echo "=== Step 2: Pulling WAHA Docker Image ==="
docker pull devlikeapro/waha:latest
echo "✅ WAHA image pulled"

echo ""
echo "=== Step 3: Stopping Old WAHA Container ==="
docker stop waha 2>/dev/null || echo "No old container to stop"
docker rm waha 2>/dev/null || echo "No old container to remove"

echo ""
echo "=== Step 4: Starting WAHA Container ==="
docker run -d --name waha \\
  --restart=always \\
  -p 3000:3000 \\
  -e WHATSAPP_HOOK_EVENTS=* \\
  -e WHATSAPP_API_KEY=${generatedApiKey} \\
  devlikeapro/waha:latest

echo "✅ WAHA container started with API Key"

echo ""
echo "=== Step 5: Opening Firewall Port ==="
if command -v ufw &> /dev/null; then
  ufw allow 3000/tcp
  echo "✅ Firewall configured"
else
  echo "⚠️ UFW not found, skipping firewall config"
fi

echo ""
echo "=== Step 6: Verifying Installation ==="
sleep 10
docker ps | grep waha
echo ""
curl -s http://localhost:3000/api/health || echo "Health check endpoint not responding yet"

echo ""
echo "🎉 WAHA Installation Complete!"
echo "Access WAHA at: http://${credentials.host}:3000"
`;

      // Send command to agent using direct fetch
      const executeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vps-agent-controller/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
          },
          body: JSON.stringify({
            agent_id: agentId,
            commands: installScript  // Changed from "command" to "commands"
          })
        }
      );

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json();
        throw new Error(errorData.error || `HTTP ${executeResponse.status}`);
      }

      const executeData = await executeResponse.json();

      if (!executeData?.success) {
        throw new Error("Failed to queue commands to agent");
      }

      const commandId = `cmd_${Date.now()}_${agentId.substring(0, 8)}`;
      setTerminalOutput(`📡 Commands queued for agent\n⏳ Waiting for agent to poll and execute...\n\n`);

      // Start polling for output
      let attempts = 0;
      const maxAttempts = 300; // 10 minutes max (2s interval)

      pollingIntervalRef.current = setInterval(async () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setInstalling(false);
          toast({
            title: "⏰ Installation Timeout",
            description: "Installation took too long. Check VPS manually.",
            variant: "destructive",
          });
          return;
        }

        try {
          const outputResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vps-agent-controller/get-output?agent_id=${agentId}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
              }
            }
          );

          if (!outputResponse.ok) {
            console.error("Error fetching output:", outputResponse.status);
            return;
          }

          const outputData = await outputResponse.json();

          if (outputData?.outputs && outputData.outputs.length > 0) {
            // Join all outputs and set
            const fullOutput = outputData.outputs.join('\n');
            setTerminalOutput(prev => {
              // Only add new outputs
              if (!prev.includes(fullOutput)) {
                return prev + fullOutput + '\n';
              }
              return prev;
            });

            // Check for completion
            if (fullOutput.includes("WAHA Installation Complete!")) {
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
              setInstalling(false);
              setInstallComplete(true);
              
              // Auto-save WAHA configuration to database
              try {
                // Save to whatsapp_settings
                const { error: settingsError } = await supabase
                  .from('whatsapp_settings')
                  .upsert({
                    user_id: user.id,
                    waha_api_url: `http://${credentials.host}:3000`,
                    waha_api_key: generatedApiKey,
                    waha_session_name: 'default',
                    is_active: true,
                    connection_status: 'pending',
                  }, {
                    onConflict: 'user_id',
                  });

                if (settingsError) {
                  console.error('Error saving whatsapp_settings:', settingsError);
                }

                // Update vps_credentials with waha_api_key
                const { error: credError } = await supabase
                  .from('vps_credentials')
                  .update({ 
                    waha_api_key: generatedApiKey,
                    waha_session_name: 'default',
                  })
                  .eq('id', credentials.id);

                if (credError) {
                  console.error('Error updating vps_credentials:', credError);
                }

                toast({
                  title: "✅ Installation Complete!",
                  description: `WAHA running & configuration saved automatically!`,
                });
              } catch (saveError) {
                console.error('Error auto-saving config:', saveError);
                toast({
                  title: "✅ Installation Complete!",
                  description: `WAHA is running at http://${credentials.host}:3000`,
                });
              }

              if (onSuccess) onSuccess();
            }

            // Check for errors
            if (fullOutput.toLowerCase().includes("error") || 
                fullOutput.toLowerCase().includes("failed")) {
              console.warn("Installation may have errors:", fullOutput);
            }
          }
        } catch (pollError) {
          console.error("Polling error:", pollError);
        }
      }, 2000); // Poll every 2 seconds

      setPollingInterval(pollingIntervalRef.current);

    } catch (error: any) {
      console.error('Error starting agent installation:', error);
      toast({
        title: "❌ Installation Failed",
        description: error.message || "Failed to start installation",
        variant: "destructive",
      });
      setInstalling(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Agent Setup - Step 1 */}
      <AgentSetup
        vpsHost={credentials.host}
        vpsCredentialId={credentials.id}
        onAgentConnected={handleAgentConnected}
      />

      {/* WAHA Installation - Step 2 */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Install WAHA - Full Automation</h3>
        </div>

        {!agentConnected ? (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">Agent Setup Required</p>
            </div>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Please complete the VPS Agent Setup above before installing WAHA.
            </p>
          </div>
        ) : installComplete ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">🎉 Installation Complete!</p>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                WAHA has been successfully installed and configured automatically.
              </p>
              
              {/* Configuration Details */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-3 border border-green-300 dark:border-green-700">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">WAHA URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded flex-1">
                      {wahaUrl}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(wahaUrl);
                        toast({ title: "✅ URL Copied!" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">API Key (Auto-Generated)</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded flex-1 truncate">
                      {wahaApiKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(wahaApiKey);
                        toast({ title: "✅ API Key Copied!" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Session Name</p>
                  <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded block">
                    default
                  </code>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-700">
                <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                  ✅ Configuration saved automatically to database
                </p>
                <a 
                  href={`http://${credentials.host}:3000`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-green-700 dark:text-green-300 hover:underline inline-block"
                >
                  🔗 Access WAHA Dashboard
                </a>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">Ready for Installation</p>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                Agent is connected. Click button below to start WAHA installation.
              </p>
              <p className="text-xs text-green-500 dark:text-green-500">
                VPS: {credentials.host}:{credentials.port} | User: {credentials.username}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={startAgentInstall}
                disabled={installing || !agentConnected}
                className="flex-1"
                size="lg"
              >
                {installing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Installing WAHA via Agent...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    🚀 Install WAHA Now
                  </>
                )}
              </Button>

              <Button
                onClick={reconfigureWaha}
                disabled={installing || !agentConnected}
                variant="outline"
                size="lg"
              >
                🔄 Reconfigure
              </Button>
            </div>
          </>
        )}

        {/* Live Terminal Output */}
        {terminalOutput && (
          <LiveTerminalOutput 
            output={terminalOutput}
            isActive={installing}
          />
        )}
      </Card>
    </div>
  );
};