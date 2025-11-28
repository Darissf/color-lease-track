import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, Zap, Rocket, Terminal, Copy, Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VPSCredentials } from '@/hooks/useVPSCredentials';
import { LiveTerminalOutput } from './LiveTerminalOutput';

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
}

const STEP_LABELS: Record<string, string> = {
  checking_system: 'Memeriksa sistem',
  installing_docker: 'Menginstall Docker',
  docker_installed: 'Docker terinstall',
  docker_exists: 'Docker sudah ada',
  cleanup: 'Membersihkan container lama',
  pulling_image: 'Mendownload WAHA image',
  creating_container: 'Membuat WAHA container',
  waiting_start: 'Menunggu WAHA start',
  verifying: 'Memverifikasi instalasi',
  success: 'Instalasi berhasil!',
  error: 'Error'
};

export const OneClickInstaller = ({ credentials, onSuccess }: OneClickInstallerProps) => {
  const [installing, setInstalling] = useState(false);
  const [installScript, setInstallScript] = useState('');
  const [session, setSession] = useState<InstallSession | null>(null);
  const [progress, setProgress] = useState(0);
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
          
          // Calculate progress
          const completedSteps = updated.steps_completed?.length || 0;
          const progressPercent = (completedSteps / updated.total_steps) * 100;
          setProgress(progressPercent);

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

      setInstallScript(data.script);
      setSession({
        id: data.session_id,
        install_token: data.install_token,
        status: 'pending',
        current_step: 'pending',
        steps_completed: [],
        total_steps: 8,
        ssh_method: 'script'
      });

      toast({
        title: '✅ Script Generated!',
        description: 'Copy script dan jalankan di VPS untuk instalasi otomatis.',
      });
    } catch (error: any) {
      console.error('Error generating script:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setInstalling(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(installScript);
    toast({
      title: 'Copied!',
      description: 'Script berhasil dicopy ke clipboard.',
    });
  };

  const downloadScript = () => {
    const blob = new Blob([installScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waha-auto-install-${credentials.host}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded!',
      description: 'Script berhasil didownload.',
    });
  };


  const getStatusIcon = () => {
    if (!session) return null;
    if (session.status === 'success') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (session.status === 'failed') return <XCircle className="w-5 h-5 text-red-500" />;
    if (session.status === 'running') return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    return null;
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Rocket className="w-6 h-6 text-blue-500" />
        <div>
          <h3 className="text-lg font-semibold">🚀 Full Auto Installer</h3>
          <p className="text-sm text-muted-foreground">
            Install WAHA sepenuhnya otomatis - tidak perlu copy-paste!
          </p>
        </div>
      </div>

      {!installScript ? (
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
            Generate Auto-Install Script
          </Button>
          <div className="max-w-md mx-auto space-y-2">
            <p className="text-xs text-muted-foreground">
              ⚡ <strong>Full Automation:</strong> Script akan otomatis install Docker, download WAHA, dan setup container
            </p>
            <p className="text-xs text-muted-foreground">
              📊 <strong>Real-time Progress:</strong> Monitor instalasi langsung dari sini
            </p>
            <p className="text-xs text-muted-foreground">
              ⏱️ <strong>Est. Time:</strong> 3-5 menit (tergantung kecepatan internet VPS)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Installation Script */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Auto-Install Script
              </label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyScript} className="gap-2">
                  <Copy className="w-3 h-3" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" onClick={downloadScript} className="gap-2">
                  <Download className="w-3 h-3" />
                  Download
                </Button>
              </div>
            </div>
            <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto border-2 border-green-500/20">
              <pre>{installScript}</pre>
            </div>
          </div>

          {/* Quick Instructions */}
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <Zap className="w-4 h-4 text-blue-500" />
            <AlertDescription className="text-sm space-y-2">
              <p className="font-semibold text-blue-700 dark:text-blue-300">🚀 Cara Install (Super Simple!):</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li>
                  SSH ke VPS: <code className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs">
                    ssh {credentials.username}@{credentials.host}
                  </code>
                </li>
                <li>Copy script di atas (klik tombol Copy)</li>
                <li>Paste di terminal VPS dan Enter</li>
                <li>Script akan auto-install semua! Progress muncul di bawah ⬇️</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Progress Tracking */}
          {session.status !== 'pending' && (
            <Card className="p-4 space-y-4 border-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <div>
                    <p className="font-semibold">Installation Progress</p>
                    <p className="text-sm text-muted-foreground">
                      {session.status === 'running' && 'Installing...'}
                      {session.status === 'success' && 'Completed successfully!'}
                      {session.status === 'failed' && 'Failed'}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{Math.round(progress)}%</span>
              </div>

              <Progress value={progress} className="h-2" />

              {/* Steps */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {session.steps_completed?.map((step, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{STEP_LABELS[step.step] || step.step}</p>
                      <p className="text-muted-foreground">{step.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(step.timestamp).toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                ))}
                
                {session.status === 'running' && session.current_step && (
                  <div className="flex items-start gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 mt-0.5 shrink-0" />
                    <p className="font-medium text-blue-500">
                      {STEP_LABELS[session.current_step] || session.current_step}
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {session.status === 'failed' && session.error_message && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>{session.error_message}</AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {session.status === 'success' && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    <strong>🎉 WAHA berhasil terinstall!</strong>
                    <br />
                    WhatsApp notification system siap digunakan. Konfigurasi telah disimpan otomatis.
                  </AlertDescription>
                </Alert>
              )}
            </Card>
          )}
        </div>
      )}
    </Card>
  );
};
