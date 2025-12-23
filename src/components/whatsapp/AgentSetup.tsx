import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, CheckCircle2, AlertCircle, Server, Terminal, RefreshCw, Wifi } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentSetupProps {
  vpsHost: string;
  vpsCredentialId?: string;
  onAgentConnected?: (agentId: string) => void;
}

export const AgentSetup = ({ vpsHost, vpsCredentialId, onAgentConnected }: AgentSetupProps) => {
  const [loading, setLoading] = useState(false);
  const [installerCommand, setInstallerCommand] = useState<string>("");
  const [agentId, setAgentId] = useState<string>("");
  const [agentToken, setAgentToken] = useState<string>("");
  const [agentStatus, setAgentStatus] = useState<"disconnected" | "connected" | "installing">("disconnected");
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const { toast } = useToast();

  // Check for existing agent on mount
  useEffect(() => {
    checkExistingAgent();
  }, [vpsHost]);

  // Poll agent status every 30 seconds when installing (reduced from 3s for better performance)
  useEffect(() => {
    if (agentStatus === 'installing' && agentId) {
      const interval = setInterval(() => {
        checkAgentStatus();
      }, 30000); // Changed from 3000ms to 30000ms

      return () => clearInterval(interval);
    }
  }, [agentStatus, agentId]);

  // Subscribe to agent status changes
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel('agent-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vps_agents',
          filter: `id=eq.${agentId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const newLastSeen = payload.new.last_heartbeat;
          
          setAgentStatus(newStatus);
          setLastSeen(newLastSeen);
          
          if (newStatus === 'connected') {
            toast({
              title: "✅ Agent Connected!",
              description: "VPS agent is now connected and ready",
            });
            if (onAgentConnected) {
              onAgentConnected(agentId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const checkExistingAgent = async () => {
    try {
      const { data: agents, error } = await supabase
        .from('vps_agents')
        .select('*')
        .eq('vps_host', vpsHost)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (agents && agents.length > 0) {
        const agent = agents[0];
        setAgentId(agent.id);
        setAgentToken(agent.agent_token);
        setAgentStatus(agent.status as "connected" | "disconnected" | "installing");
        setLastSeen(agent.last_heartbeat);
        
        if (agent.status === 'connected' && onAgentConnected) {
          onAgentConnected(agent.id);
        }
      }
    } catch (error) {
      console.error('Error checking existing agent:', error);
    }
  };

  const checkAgentStatus = async () => {
    if (!agentId) return;

    try {
      const { data: agent } = await supabase
        .from('vps_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agent) {
        setAgentStatus(agent.status as "connected" | "disconnected" | "installing");
        setLastSeen(agent.last_heartbeat);
        
        if (agent.status === 'connected' && onAgentConnected) {
          onAgentConnected(agent.id);
        }
      }
    } catch (error) {
      console.error('Error checking agent status:', error);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || '';
      const testUrl = `https://${projectRef}.supabase.co/functions/v1/vps-agent-controller/ping`;

      const response = await fetch(testUrl);
      
      if (response.ok && await response.text() === 'pong') {
        toast({
          title: "✅ Connection Test Passed",
          description: "Agent controller endpoint is reachable",
        });
      } else {
        throw new Error('Unexpected response from ping');
      }
    } catch (error) {
      toast({
        title: "❌ Connection Test Failed",
        description: "Cannot reach agent controller endpoint",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const generateInstaller = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('vps-agent-installer', {
        body: {
          vps_host: vpsHost,
          vps_credential_id: vpsCredentialId,
        },
      });

      if (response.error) throw response.error;

      const { one_line_command, agent_id, agent_token } = response.data;
      setInstallerCommand(one_line_command);
      setAgentId(agent_id);
      setAgentToken(agent_token);
      setAgentStatus('installing');

      toast({
        title: "Installer Generated",
        description: "Copy and run the command on your VPS",
      });
    } catch (error) {
      console.error('Error generating installer:', error);
      toast({
        title: "Error",
        description: "Failed to generate installer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reinstallAgent = async () => {
    // Reset state and generate new installer
    setInstallerCommand("");
    setAgentStatus("disconnected");
    await generateInstaller();
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(installerCommand);
    toast({
      title: "Copied!",
      description: "Command copied to clipboard",
    });
  };

  const getStatusIcon = () => {
    switch (agentStatus) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'installing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (agentStatus) {
      case 'connected':
        return "🟢 Connected";
      case 'installing':
        return "🔵 Installing...";
      default:
        return "⚫ Disconnected";
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-semibold">VPS Agent Setup</h3>
            <p className="text-sm text-muted-foreground">One-time setup for full automation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
      </div>

      {lastSeen && (
        <p className="text-xs text-muted-foreground">
          Last seen: {formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}
        </p>
      )}

      {agentStatus === 'connected' ? (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">Agent is connected and ready!</p>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            You can now install WAHA with one click.
          </p>
          {agentToken && (
            <p className="text-xs text-green-500 dark:text-green-500 mt-2 font-mono">
              Token: {agentToken.substring(0, 8)}...
            </p>
          )}
        </div>
      ) : (
        <>
          {!installerCommand ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Install a lightweight agent on your VPS for true one-click automation.
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={generateInstaller}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Agent Installer"
                  )}
                </Button>
                
                <Button
                  onClick={testConnection}
                  disabled={testingConnection}
                  variant="outline"
                >
                  {testingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wifi className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Installation Command:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyCommand}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <code className="block bg-background p-3 rounded text-xs break-all">
                  {installerCommand}
                </code>
              </div>

              {agentToken && (
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">
                    Agent Token: <code className="font-mono">{agentToken}</code>
                  </p>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                  📋 Instructions:
                </p>
                <ol className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                  <li>SSH to your VPS: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">ssh root@{vpsHost}</code></li>
                  <li>Paste the command above and press Enter</li>
                  <li>Wait for installation to complete (~30 seconds)</li>
                  <li>Agent will auto-connect and status will turn green</li>
                </ol>
              </div>

              {agentStatus === 'installing' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <p className="text-sm">Waiting for agent to connect...</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={checkAgentStatus}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Refresh Status
                    </Button>
                    
                    <Button
                      onClick={reinstallAgent}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Terminal className="w-4 h-4 mr-1" />
                      Reinstall Agent
                    </Button>
                  </div>

                  {/* Show debug info immediately when installing */}
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                      <Terminal className="w-5 h-5" />
                      <p className="font-medium">🔍 Debug Commands:</p>
                    </div>
                    <div className="space-y-2 text-sm text-yellow-600 dark:text-yellow-400">
                      <p className="font-medium">1. Cek status agent:</p>
                      <code className="block bg-yellow-100 dark:bg-yellow-900 p-2 rounded text-xs">
                        systemctl status waha-agent
                      </code>
                      
                      <p className="font-medium">2. Lihat logs agent:</p>
                      <code className="block bg-yellow-100 dark:bg-yellow-900 p-2 rounded text-xs">
                        tail -f /var/log/waha-agent.log
                      </code>
                      
                      <p className="font-medium">3. Lihat logs systemd:</p>
                      <code className="block bg-yellow-100 dark:bg-yellow-900 p-2 rounded text-xs">
                        journalctl -u waha-agent -f
                      </code>

                      <p className="font-medium">4. Test koneksi manual:</p>
                      <code className="block bg-yellow-100 dark:bg-yellow-900 p-2 rounded text-xs">
                        {(() => {
                          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
                          const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || '';
                          return `curl -v https://${projectRef}.supabase.co/functions/v1/vps-agent-controller/ping`;
                        })()}
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
};