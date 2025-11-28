import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Loader2, XCircle, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface SetupStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  timestamp?: string;
  details?: string;
  output?: string;
  progress?: number;
}

interface SetupProgressLogProps {
  steps: SetupStep[];
  overallStatus: 'idle' | 'running' | 'success' | 'error';
}

export const SetupProgressLog = ({ steps, overallStatus }: SetupProgressLogProps) => {
  const { toast } = useToast();
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleExpand = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const copyAllLogs = () => {
    const logText = steps
      .map(step => {
        let text = `[${step.timestamp || 'N/A'}] ${step.label} - ${step.status.toUpperCase()}`;
        if (step.details) text += `\n  Details: ${step.details}`;
        if (step.output) text += `\n  Output:\n${step.output}`;
        return text;
      })
      .join('\n\n');

    navigator.clipboard.writeText(logText);
    toast({ title: 'Log disalin ke clipboard' });
  };

  const getStatusIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  const getOverallProgress = () => {
    const total = steps.length;
    const completed = steps.filter(s => s.status === 'success').length;
    return Math.round((completed / total) * 100);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Progress Setup</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={copyAllLogs}
          disabled={steps.length === 0}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Log
        </Button>
      </div>

      {/* Overall Progress Bar */}
      {overallStatus === 'running' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Overall Progress</span>
            <span>{getOverallProgress()}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${getOverallProgress()}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      {overallStatus === 'success' && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-600 dark:text-green-400 font-medium">
            ✅ Setup berhasil! WAHA siap digunakan.
          </p>
        </div>
      )}

      {overallStatus === 'error' && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 font-medium">
            ❌ Setup gagal. Periksa log untuk detail error.
          </p>
        </div>
      )}

      {/* Steps Log */}
      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-3">
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada proses berjalan
            </p>
          ) : (
            steps.map((step) => (
              <div key={step.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  {getStatusIcon(step.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{step.label}</p>
                      {step.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {step.timestamp}
                        </span>
                      )}
                    </div>
                    
                    {step.details && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.details}
                      </p>
                    )}

                    {step.progress !== undefined && step.status === 'running' && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.progress}%
                        </p>
                      </div>
                    )}
                  </div>

                  {step.output && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(step.id)}
                      className="shrink-0"
                    >
                      {expandedSteps.has(step.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Expanded Output */}
                {step.output && expandedSteps.has(step.id) && (
                  <div className="ml-8 p-3 bg-muted rounded-md">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {step.output}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
