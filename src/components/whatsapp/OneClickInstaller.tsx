import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Rocket, CheckCircle2 } from 'lucide-react';
import { VPSCredentials } from '@/hooks/useVPSCredentials';
import { InstallProgress } from './InstallProgress';
import { AgentSetup } from './AgentSetup';

interface OneClickInstallerProps {
  credentials: VPSCredentials;
  onSuccess?: () => void;
}

interface InstallSession {
  id: string;
  install_token: string;
  status: string;
  current_step: string;
  completed_steps: Array<{ step: string; message: string; timestamp: string }>;
  total_steps: number;
  error_message?: string;
  last_output?: string;
  ssh_method?: string;
  command_log?: string[];
}


export const OneClickInstaller = ({ credentials, onSuccess }: OneClickInstallerProps) => {
  const [installing, setInstalling] = useState(false);
  const [agentId, setAgentId] = useState<string>("");
  const [agentConnected, setAgentConnected] = useState(false);
  const [session, setSession] = useState<InstallSession | null>(null);
  const { toast } = useToast();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('install-progress')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vps_installation_sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          const updated = payload.new as InstallSession;
          setSession(updated);

          // Show notifications
          if (updated.status === 'success') {
            toast({
              title: '✅ Instalasi Berhasil!',
              description: 'WAHA telah terinstall dan siap digunakan.',
            });
            if (onSuccess) onSuccess();
          } else if (updated.status === 'failed') {
            toast({
              title: '❌ Instalasi Gagal',
              description: updated.error_message || 'Terjadi kesalahan saat instalasi.',
              variant: 'destructive',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, toast, onSuccess]);

  const handleAgentConnected = (connectedAgentId: string) => {
    setAgentId(connectedAgentId);
    setAgentConnected(true);
  };

  const startTrueOneClickInstall = async () => {
    if (!agentId) {
      toast({
        title: "Agent Not Connected",
        description: "Please setup the VPS agent first",
        variant: "destructive",
      });
      return;
    }

    setInstalling(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        throw new Error('Not authenticated');
      }

      // Send WAHA installation commands to agent
      const installCommands = `
        # Check and install Docker
        if ! command -v docker &> /dev/null; then
          echo "Installing Docker..."
          curl -fsSL https://get.docker.com | sh
          systemctl enable docker
          systemctl start docker
        fi

        # Pull and run WAHA
        docker pull devlikeapro/waha:latest
        docker stop waha 2>/dev/null || true
        docker rm waha 2>/dev/null || true
        docker run -d --name waha \\
          --restart unless-stopped \\
          -p ${credentials.waha_port || 3000}:3000 \\
          -e WHATSAPP_API_KEY=${credentials.waha_api_key} \\
          -e WHATSAPP_SESSION_NAME=${credentials.waha_session_name || 'default'} \\
          devlikeapro/waha:latest

        echo "WAHA installation complete!"
      `;

      const response = await supabase.functions.invoke('vps-agent-controller/execute', {
        body: {
          agent_id: agentId,
          commands: installCommands,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "🚀 Installation Started",
        description: "WAHA is being installed via agent...",
      });

      // Poll for outputs
      const pollInterval = setInterval(async () => {
        const outputResponse = await supabase.functions.invoke(
          `vps-agent-controller/get-output?agent_id=${agentId}`
        );

        if (outputResponse.data?.outputs?.length > 0) {
          const latestOutput = outputResponse.data.outputs[outputResponse.data.outputs.length - 1];
          console.log('Installation output:', latestOutput);

          if (latestOutput.includes('complete')) {
            clearInterval(pollInterval);
            setInstalling(false);
            toast({
              title: "✅ Installation Complete!",
              description: "WAHA has been successfully installed",
            });
            if (onSuccess) {
              onSuccess();
            }
          }
        }
      }, 3000);

      // Auto-clear after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setInstalling(false);
      }, 300000);
    } catch (error) {
      console.error('Error starting installation:', error);
      toast({
        title: "Error",
        description: "Failed to start installation",
        variant: "destructive",
      });
      setInstalling(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Agent Setup Section */}
      <AgentSetup
        vpsHost={credentials.host}
        vpsCredentialId={credentials.id}
        onAgentConnected={handleAgentConnected}
      />

      {/* Installation Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Install WAHA</h3>
        </div>

        {agentConnected ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">Ready for True One-Click Installation!</p>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Click the button below to automatically install WAHA on your VPS.
              </p>
            </div>

            <Button
              onClick={startTrueOneClickInstall}
              disabled={installing}
              className="w-full"
              size="lg"
            >
              {installing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Installing WAHA...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  🚀 Install WAHA Sekarang
                </>
              )}
            </Button>

            {session && (
              <InstallProgress
                status={session.status}
                currentStep={session.current_step}
                stepsCompleted={session.completed_steps}
                totalSteps={session.total_steps}
                errorMessage={session.error_message}
                commandLog={session.command_log}
              />
            )}
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Please setup the VPS agent first to enable one-click installation.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
