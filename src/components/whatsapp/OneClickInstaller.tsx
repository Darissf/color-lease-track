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

      // WAHA Installation Script
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
  devlikeapro/waha:latest

echo "✅ WAHA container started"

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

      // Send command to agent
      const { data: executeData, error: executeError } = await supabase.functions.invoke(
        'vps-agent-controller',
        {
          body: {
            action: 'execute',
            agent_id: agentId,
            command: installScript
          }
        }
      );

      if (executeError) throw executeError;

      if (!executeData?.command_id) {
        throw new Error("Failed to send command to agent");
      }

      const commandId = executeData.command_id;
      setTerminalOutput(`📡 Command sent to agent (ID: ${commandId})\n⏳ Waiting for agent to start execution...\n\n`);

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
          const { data: outputData, error: outputError } = await supabase.functions.invoke(
            'vps-agent-controller',
            {
              body: {
                action: 'get_output',
                agent_id: agentId,
                command_id: commandId
              }
            }
          );

          if (outputError) {
            console.error("Error fetching output:", outputError);
            return;
          }

          if (outputData?.output) {
            setTerminalOutput(prev => prev + outputData.output);

            // Check for completion
            if (outputData.output.includes("WAHA Installation Complete!")) {
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
              setInstalling(false);
              setInstallComplete(true);
              
              toast({
                title: "✅ Installation Complete!",
                description: `WAHA is running at http://${credentials.host}:3000`,
              });

              if (onSuccess) onSuccess();
            }

            // Check for errors
            if (outputData.output.toLowerCase().includes("error") || 
                outputData.output.toLowerCase().includes("failed")) {
              console.warn("Installation may have errors:", outputData.output);
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
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">🎉 Installation Complete!</p>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mb-2">
              WAHA has been successfully installed and is running on your VPS.
            </p>
            <a 
              href={`http://${credentials.host}:3000`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-green-700 dark:text-green-300 hover:underline"
            >
              🔗 Access WAHA Dashboard: http://{credentials.host}:3000
            </a>
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

            <Button
              onClick={startAgentInstall}
              disabled={installing || !agentConnected}
              className="w-full"
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
                  🚀 Install WAHA Now (via Agent)
                </>
              )}
            </Button>
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