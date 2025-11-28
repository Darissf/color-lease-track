import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal as TerminalIcon, Maximize2, Minimize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import xterm dynamically to avoid SSR issues
let Terminal: any = null;
let FitAddon: any = null;

if (typeof window !== 'undefined') {
  import('xterm').then(mod => {
    Terminal = mod.Terminal;
  });
  import('xterm-addon-fit').then(mod => {
    FitAddon = mod.FitAddon;
  });
}

interface WebTerminalProps {
  host: string;
  port: number;
  username: string;
  password: string;
}

export const WebTerminal = ({ host, port, username, password }: WebTerminalProps) => {
  const { toast } = useToast();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!Terminal || !FitAddon || !terminalRef.current) return;

    // Initialize terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#00ff00',
        selection: 'rgba(255, 255, 255, 0.3)',
      },
      rows: 24,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('\x1b[1;32mWeb Terminal - Connecting to VPS...\x1b[0m');
    term.writeln('');

    // Connect to backend WebSocket proxy
    connectToVPS(term);

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [host, port, username, password]);

  const connectToVPS = async (term: any) => {
    try {
      // For demo purposes, simulate connection
      // In production, this would connect to vps-terminal-proxy edge function via WebSocket
      
      term.writeln(`Connecting to ${username}@${host}:${port}...`);
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      term.writeln('\x1b[1;32mConnected!\x1b[0m');
      term.writeln('');
      term.write(`${username}@vps:~$ `);
      
      setIsConnected(true);

      // Handle input
      term.onData((data: string) => {
        // For demo, just echo input
        term.write(data);
        
        if (data === '\r') {
          term.writeln('');
          term.write(`${username}@vps:~$ `);
        }
      });

      toast({
        title: 'Terminal Connected',
        description: `Connected to ${host}`,
      });

    } catch (error) {
      term.writeln('\x1b[1;31mConnection failed!\x1b[0m');
      term.writeln('');
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to VPS',
        variant: 'destructive',
      });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 100);
  };

  const quickCommands = [
    { label: 'Check Docker', command: 'docker --version' },
    { label: 'List Containers', command: 'docker ps -a' },
    { label: 'WAHA Logs', command: 'docker logs waha' },
    { label: 'System Info', command: 'uname -a' },
  ];

  const executeQuickCommand = (command: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(command + '\r');
    }
  };

  return (
    <Card className={`p-4 space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-5 w-5" />
          <h3 className="font-semibold">Web Terminal</h3>
          {isConnected && (
            <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded">
              Connected
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Quick Commands */}
      <div className="flex flex-wrap gap-2">
        {quickCommands.map((cmd) => (
          <Button
            key={cmd.label}
            variant="outline"
            size="sm"
            onClick={() => executeQuickCommand(cmd.command)}
            disabled={!isConnected}
          >
            {cmd.label}
          </Button>
        ))}
      </div>

      {/* Terminal Container */}
      <div
        ref={terminalRef}
        className={`rounded-md bg-[#1e1e1e] ${
          isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[500px]'
        }`}
      />

      <p className="text-xs text-muted-foreground">
        💡 Tip: Gunakan quick commands di atas atau ketik command manual
      </p>
    </Card>
  );
};
