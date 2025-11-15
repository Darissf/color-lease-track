import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plane, Users, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AIAutoPilot = () => {
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<any>(null);

  const toggleAutoPilot = async (enabled: boolean) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("ai-autopilot", {
        body: { action: enabled ? "enable" : "disable" }
      });
      
      if (error) throw error;
      
      setAutoPilotEnabled(enabled);
      toast.success(enabled ? "Auto-Pilot diaktifkan!" : "Auto-Pilot dinonaktifkan");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal toggle auto-pilot");
    } finally {
      setLoading(false);
    }
  };

  const getAgentStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("ai-multi-agent", {
        body: { action: "status" }
      });
      
      if (error) throw error;
      
      if (data) {
        setAgentStatus(data);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal mendapatkan status agents");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Plane className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Auto-Pilot</h1>
          <p className="text-muted-foreground">Multi-agent system & autonomous financial management</p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-orange-500/50 bg-orange-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-600 dark:text-orange-400">Experimental Feature</p>
              <p className="text-sm text-muted-foreground mt-1">
                Auto-Pilot mode memerlukan approval untuk setiap keputusan. Semua actions akan di-log dan bisa di-review.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Pilot Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Auto-Pilot Mode
          </CardTitle>
          <CardDescription>
            AI akan autonomous manage keuangan dengan approval system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Auto-Pilot</p>
              <p className="text-sm text-muted-foreground">
                AI akan analyze dan suggest actions otomatis
              </p>
            </div>
            <Switch
              checked={autoPilotEnabled}
              onCheckedChange={toggleAutoPilot}
              disabled={loading}
            />
          </div>

          {autoPilotEnabled && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm font-medium text-green-600">Auto-Pilot Active</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI sedang monitoring dan akan memberikan recommendations
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Agent System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Multi-Agent System
          </CardTitle>
          <CardDescription>
            3+ AI agents bekerja sama untuk manage keuangan Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={getAgentStatus} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking Status...
              </>
            ) : (
              "Check Agent Status"
            )}
          </Button>

          {agentStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm font-medium text-blue-600">Analyst Agent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: {agentStatus.analyst || "Active"}
                </p>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-sm font-medium text-purple-600">Planner Agent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: {agentStatus.planner || "Active"}
                </p>
              </div>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm font-medium text-green-600">Executor Agent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: {agentStatus.executor || "Active"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAutoPilot;
