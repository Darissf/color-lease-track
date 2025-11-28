import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Rocket, CheckCircle2, AlertTriangle } from 'lucide-react';
import { VPSCredentials } from '@/hooks/useVPSCredentials';
import { InstallProgress } from './InstallProgress';
import { AgentSetup } from './AgentSetup';

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
    setProgress(null);

    try {
      toast({
        title: "🚀 Starting Installation via Agent",
        description: "Sending commands to VPS agent...",
      });

      // TODO: Implement agent-based installation
      // This will send commands through vps-agent-controller
      // For now, fallback to direct SSH if agent not ready

      toast({
        title: "🚧 Agent Installation Coming Soon",
        description: "Agent communication system is being finalized",
      });
      setInstalling(false);

    } catch (error: any) {
      console.error('Error starting agent installation:', error);
      toast({
        title: "❌ Error",
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

        {progress && (
          <InstallProgress
            status={progress.status}
            currentStep={progress.current_step.toString()}
            stepsCompleted={progress.step_outputs.map((step) => ({
              step: step.name,
              message: step.description,
              timestamp: step.timestamp,
            }))}
            totalSteps={progress.total_steps}
            errorMessage={progress.error_message}
            commandLog={progress.step_outputs.map((step) => 
              `[${step.name}] ${step.success ? '✅' : '❌'} ${step.output || step.error}`
            )}
          />
        )}
      </Card>
    </div>
  );
};