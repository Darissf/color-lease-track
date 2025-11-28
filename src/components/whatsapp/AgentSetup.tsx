import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, CheckCircle2, AlertCircle, Server } from "lucide-react";

interface AgentSetupProps {
  vpsHost: string;
  vpsCredentialId?: string;
  onAgentConnected?: (agentId: string) => void;
}

export const AgentSetup = ({ vpsHost, vpsCredentialId, onAgentConnected }: AgentSetupProps) => {
  const [loading, setLoading] = useState(false);
  const [installerCommand, setInstallerCommand] = useState<string>("");
  const [agentId, setAgentId] = useState<string>("");
  const [agentStatus, setAgentStatus] = useState<"disconnected" | "connected" | "installing">("disconnected");
  const { toast } = useToast();

  // Check for existing agent
  useEffect(() => {
    checkExistingAgent();
  }, [vpsHost]);

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
          setAgentStatus(newStatus);
          
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
        setAgentStatus(agent.status as "connected" | "disconnected" | "installing");
        
        if (agent.status === 'connected' && onAgentConnected) {
          onAgentConnected(agent.id);
        }
      }
    } catch (error) {
      console.error('Error checking existing agent:', error);
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

      const { one_line_command, agent_id } = response.data;
      setInstallerCommand(one_line_command);
      setAgentId(agent_id);
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

      {agentStatus === 'connected' ? (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">Agent is connected and ready!</p>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            You can now install WAHA with one click.
          </p>
        </div>
      ) : (
        <>
          {!installerCommand ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Install a lightweight agent on your VPS for true one-click automation.
              </p>
              <Button
                onClick={generateInstaller}
                disabled={loading}
                className="w-full"
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
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-sm">Waiting for agent to connect...</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
};
