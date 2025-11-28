import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Download, CheckCircle2, XCircle, Loader2, Terminal, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VPSCredentials } from '@/hooks/useVPSCredentials';

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
  const [loading, setLoading] = useState(false);
  const [installCommand, setInstallCommand] = useState('');
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

  const generateInstallCommand = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('install-script-generator', {
        body: {
          vps_credential_id: credentials.id,
          vps_host: credentials.host,
          waha_port: credentials.waha_port || 3000
        }
      });

      if (error) throw error;

      setInstallCommand(data.script);
      setSession({
        id: data.session_id,
        install_token: data.install_token,
        status: 'pending',
        current_step: '',
        steps_completed: [],
        total_steps: 6
      });

      toast({
        title: 'Script Generated!',
        description: 'Copy dan jalankan script di VPS Anda.',
      });
    } catch (error: any) {
      console.error('Error generating script:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(installCommand);
    toast({
      title: 'Copied!',
      description: 'Script telah dicopy ke clipboard.',
    });
  };

  const downloadScript = () => {
    const blob = new Blob([installCommand], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waha-install-${credentials.host}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded!',
      description: 'Script telah didownload.',
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
        <Zap className="w-6 h-6 text-yellow-500" />
        <div>
          <h3 className="text-lg font-semibold">One-Click Installer</h3>
          <p className="text-sm text-muted-foreground">
            Install WAHA otomatis dengan satu command
          </p>
        </div>
      </div>

      {!installCommand ? (
        <div className="text-center py-8 space-y-4">
          <Terminal className="w-16 h-16 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Generate install script untuk VPS: <strong>{credentials.host}</strong>
          </p>
          <Button onClick={generateInstallCommand} disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Zap className="w-4 h-4" />
            Generate Install Command
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Install Script */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Installation Script</label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyToClipboard} className="gap-2">
                  <Copy className="w-3 h-3" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" onClick={downloadScript} className="gap-2">
                  <Download className="w-3 h-3" />
                  Download
                </Button>
              </div>
            </div>
            <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
              <pre>{installCommand}</pre>
            </div>
          </div>

          {/* Instructions */}
          <Alert>
            <Terminal className="w-4 h-4" />
            <AlertDescription>
              <strong>Cara Install:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>SSH ke VPS Anda: <code className="bg-muted px-1 rounded">ssh {credentials.username}@{credentials.host}</code></li>
                <li>Copy script di atas dan paste ke terminal</li>
                <li>Atau download script dan jalankan: <code className="bg-muted px-1 rounded">bash waha-install-*.sh</code></li>
                <li>Progress akan muncul secara real-time di bawah</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Progress Tracking */}
          {session && session.status !== 'pending' && (
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
                    <strong>WAHA berhasil terinstall!</strong> Anda dapat langsung menggunakan WhatsApp notification sekarang.
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
