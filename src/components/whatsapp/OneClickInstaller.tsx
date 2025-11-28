import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Rocket, CheckCircle2 } from 'lucide-react';
import { VPSCredentials } from '@/hooks/useVPSCredentials';
import { InstallProgress } from './InstallProgress';

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

  const startDirectSSHInstall = async () => {
    setInstalling(true);
    setProgress(null);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        throw new Error('Not authenticated');
      }

      toast({
        title: "🚀 Memulai Instalasi",
        description: "Connecting to VPS dan installing WAHA...",
      });

      // Call waha-auto-install edge function
      const response = await supabase.functions.invoke('waha-auto-install', {
        body: {
          host: credentials.host,
          port: credentials.port,
          username: credentials.username,
          password: credentials.password,
          waha_port: credentials.waha_port || 3000,
          waha_api_key: credentials.waha_api_key,
          waha_session_name: credentials.waha_session_name || 'default',
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { progress_id, success } = response.data;

      if (!success) {
        throw new Error('Installation failed');
      }

      // Start polling for progress updates
      const interval = setInterval(async () => {
        const { data: progressData } = await supabase
          .from('vps_installation_progress')
          .select('*')
          .eq('id', progress_id)
          .single();

        if (progressData) {
          setProgress({
            ...progressData,
            step_outputs: Array.isArray(progressData.step_outputs) 
              ? progressData.step_outputs as any 
              : []
          } as InstallProgressData);
        }
      }, 2000);

      setPollingInterval(interval);

      // Fetch initial progress
      const { data: initialProgress } = await supabase
        .from('vps_installation_progress')
        .select('*')
        .eq('id', progress_id)
        .single();

      if (initialProgress) {
        setProgress({
          ...initialProgress,
          step_outputs: Array.isArray(initialProgress.step_outputs) 
            ? initialProgress.step_outputs as any 
            : []
        } as InstallProgressData);
      }

    } catch (error: any) {
      console.error('Error starting installation:', error);
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
      {/* Direct SSH Installation Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Install WAHA - Full Automation</h3>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">True One-Click Installation</p>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
            Instalasi sepenuhnya otomatis melalui SSH langsung. Tidak perlu akses terminal VPS!
          </p>
          <p className="text-xs text-blue-500 dark:text-blue-500">
            VPS: {credentials.host}:{credentials.port} | User: {credentials.username}
          </p>
        </div>

        <Button
          onClick={startDirectSSHInstall}
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
              🚀 Install WAHA Sekarang (Full Otomatis)
            </>
          )}
        </Button>

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
