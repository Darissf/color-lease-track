import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface InstallStep {
  step: string;
  message: string;
  timestamp: string;
}

interface InstallProgressProps {
  status: string;
  currentStep: string;
  stepsCompleted: InstallStep[];
  totalSteps: number;
  errorMessage?: string;
  commandLog?: string[];
}

const STEP_LABELS: Record<string, string> = {
  connecting: '🔌 Menghubungkan ke VPS',
  connected: '✅ Terhubung ke VPS',
  checking_docker: '🔍 Memeriksa Docker',
  installing_docker: '📦 Menginstall Docker',
  docker_installed: '✅ Docker terinstall',
  docker_exists: '✅ Docker sudah ada',
  cleanup: '🧹 Membersihkan container lama',
  pulling_image: '⬇️ Mendownload WAHA',
  creating_container: '🏗️ Membuat container',
  waiting_start: '⏳ Menunggu startup',
  verifying: '✅ Memverifikasi',
  saving_config: '💾 Menyimpan konfigurasi',
  success: '🎉 Instalasi berhasil!',
  error: '❌ Error'
};

export const InstallProgress = ({
  status,
  currentStep,
  stepsCompleted,
  totalSteps,
  errorMessage,
  commandLog
}: InstallProgressProps) => {
  const progress = (stepsCompleted.length / totalSteps) * 100;

  const getStatusIcon = () => {
    if (status === 'success') return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    if (status === 'failed') return <XCircle className="w-6 h-6 text-red-500" />;
    if (status === 'running') return <Loader2 className="w-6 h-6 animate-spin text-blue-500" />;
    return null;
  };

  const getStatusText = () => {
    if (status === 'running') return 'Installing...';
    if (status === 'success') return 'Completed!';
    if (status === 'failed') return 'Failed';
    return 'Pending';
  };

  return (
    <Card className="p-6 space-y-4 border-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <p className="font-semibold text-lg">Installation Progress</p>
            <p className="text-sm text-muted-foreground">{getStatusText()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{Math.round(progress)}%</p>
          <p className="text-xs text-muted-foreground">
            {stepsCompleted.length}/{totalSteps} steps
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-3" />

      {/* Steps */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {stepsCompleted.map((step, index) => (
          <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">{STEP_LABELS[step.step] || step.step}</p>
              <p className="text-xs text-muted-foreground">{step.message}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(step.timestamp).toLocaleTimeString('id-ID')}
            </span>
          </div>
        ))}
        
        {status === 'running' && currentStep && (
          <div className="flex items-start gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500 mt-0.5 shrink-0" />
            <p className="font-medium text-sm text-blue-700 dark:text-blue-300">
              {STEP_LABELS[currentStep] || currentStep}
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {status === 'failed' && errorMessage && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>Error:</strong> {errorMessage}
            {commandLog && commandLog.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs">View command log</summary>
                <pre className="mt-2 text-xs overflow-x-auto bg-black/10 p-2 rounded">
                  {commandLog.join('\n\n')}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {status === 'success' && (
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
  );
};
