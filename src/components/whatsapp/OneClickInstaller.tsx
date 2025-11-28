import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Rocket } from 'lucide-react';
import { VPSCredentials } from '@/hooks/useVPSCredentials';
import { InstallProgress } from './InstallProgress';

interface OneClickInstallerProps {
  credentials: VPSCredentials;
  onSuccess?: () => void;
}

interface InstallSession {
  id: string;
  install_token: string;
  status: string;
  current_step: string;
  steps_completed: Array<{ step: string; message: string; timestamp: string }>;
  total_steps: number;
  error_message?: string;
  last_output?: string;
  ssh_method?: string;
  command_log?: string[];
}


export const OneClickInstaller = ({ credentials, onSuccess }: OneClickInstallerProps) => {
  const [installing, setInstalling] = useState(false);
  const [session, setSession] = useState<InstallSession | null>(null);
  const [oneLineCommand, setOneLineCommand] = useState('');
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

  const startFullAutoInstall = async () => {
    setInstalling(true);

    try {
      const { data, error } = await supabase.functions.invoke('vps-full-setup', {
        body: {
          vps_credential_id: credentials.id,
          vps_host: credentials.host,
          vps_port: credentials.port,
          vps_username: credentials.username,
          vps_password: credentials.password,
          waha_port: credentials.waha_port || 3000,
          waha_session_name: credentials.waha_session_name || 'default',
          waha_api_key: credentials.waha_api_key
        }
      });

      if (error) throw error;

      setOneLineCommand(data.one_line_command);
      setSession({
        id: data.session_id,
        install_token: data.install_token,
        status: 'pending',
        current_step: 'pending',
        steps_completed: [],
        total_steps: 8,
        ssh_method: 'one_click'
      });

      toast({
        title: '✅ Ready to Install!',
        description: 'Copy and run the command below from your terminal.',
      });

    } catch (error: any) {
      console.error('Error generating install command:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setInstalling(false);
    }
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(oneLineCommand);
    toast({
      title: 'Copied!',
      description: 'Command copied to clipboard. Paste in your terminal!',
    });
  };


  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Rocket className="w-6 h-6 text-blue-500" />
        <div>
          <h3 className="text-lg font-semibold">🚀 One-Click Auto Installer</h3>
          <p className="text-sm text-muted-foreground">
            Satu command, full automation! ✨
          </p>
        </div>
      </div>

      {!oneLineCommand ? (
        <div className="text-center py-8 space-y-4">
          <Rocket className="w-20 h-20 mx-auto text-blue-500 animate-bounce" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">Ready to Install WAHA</p>
            <p className="text-sm text-muted-foreground">
              Target: <strong className="text-foreground">{credentials.host}:{credentials.port}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              User: <strong className="text-foreground">{credentials.username}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              WAHA Port: <strong className="text-foreground">{credentials.waha_port || 3000}</strong>
            </p>
          </div>
          <Button 
            onClick={startFullAutoInstall} 
            disabled={installing} 
            size="lg"
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {installing && <Loader2 className="w-5 h-5 animate-spin" />}
            <Rocket className="w-5 h-5" />
            Generate One-Click Command
          </Button>
          <div className="max-w-md mx-auto space-y-2 text-left bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">✨ Super Simple:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>🖥️ Run 1 command dari terminal lokal Anda</li>
              <li>🤖 System otomatis SSH & install semua</li>
              <li>📊 Progress tracking real-time</li>
              <li>✅ Zero manual work!</li>
            </ul>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ⏱️ <strong>Est. Time:</strong> 3-5 menit
            </p>
          </div>
        </div>
      ) : !session || session.status === 'pending' ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg border-2 border-green-500">
            <div className="flex items-center gap-2 mb-3">
              <Rocket className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-700 dark:text-green-300">🎯 Run This Command:</p>
            </div>
            <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-xs break-all mb-3">
              {oneLineCommand}
            </div>
            <Button onClick={copyCommand} className="w-full gap-2" variant="outline">
              <Rocket className="w-4 h-4" />
              Copy Command
            </Button>
          </div>

          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <Rocket className="w-4 h-4 text-blue-500" />
            <AlertDescription className="text-sm space-y-2">
              <p className="font-semibold text-blue-700 dark:text-blue-300">📝 Cara Install:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li>Copy command di atas (klik Copy Command)</li>
                <li>Buka terminal lokal Anda (Mac/Linux/Windows WSL)</li>
                <li>Paste & Enter</li>
                <li>Command akan auto-SSH ke VPS & install semua!</li>
                <li>Progress muncul otomatis di bawah ⬇️</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <InstallProgress
          status={session.status}
          currentStep={session.current_step}
          stepsCompleted={session.steps_completed}
          totalSteps={session.total_steps}
          errorMessage={session.error_message}
          commandLog={session.command_log}
        />
      )}
    </Card>
  );
};
