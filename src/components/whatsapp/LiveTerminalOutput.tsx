import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal } from 'lucide-react';

interface LiveTerminalOutputProps {
  output: string;
  isActive: boolean;
}

export const LiveTerminalOutput = ({ output, isActive }: LiveTerminalOutputProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  if (!output && !isActive) return null;

  return (
    <Card className="border-2 border-slate-700 bg-slate-950">
      <div className="p-3 border-b border-slate-700 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-green-500" />
        <span className="text-sm font-mono text-green-500">Live Terminal Output</span>
        {isActive && (
          <span className="ml-auto flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-green-500">Running</span>
          </span>
        )}
      </div>
      <ScrollArea className="h-64">
        <div ref={scrollRef} className="p-4 font-mono text-xs text-green-400 whitespace-pre-wrap">
          {output || 'Waiting for output...'}
        </div>
      </ScrollArea>
    </Card>
  );
};