import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

const SMTPConfigForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState({
    api_key_encrypted: "",
    sender_email: "",
    sender_name: "Sewa Scaffolding Bali",
    reply_to_email: "",
    daily_limit: 3000,
    emails_sent_today: 0,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          api_key_encrypted: "••••••••••••••••",
          sender_email: data.sender_email,
          sender_name: data.sender_name,
          reply_to_email: data.reply_to_email || "",
          daily_limit: data.daily_limit,
          emails_sent_today: data.emails_sent_today,
        });
        setIsConnected(true);
      }
    } catch (error: any) {
      console.error("Error fetching SMTP config:", error);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: config.sender_email,
          subject: "Test Email from SMTP Settings",
          html: "<h1>Success!</h1><p>Your SMTP configuration is working correctly.</p>",
          template_type: "test",
        },
      });

      if (error) throw error;

      toast({
        title: "Connection Successful",
        description: "Test email sent successfully!",
      });
      setIsConnected(true);
    } catch (error: any) {
      console.error("Test connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsConnected(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("smtp_settings")
        .upsert({
          user_id: user.id,
          provider: "resend",
          api_key_encrypted: config.api_key_encrypted,
          sender_email: config.sender_email,
          sender_name: config.sender_name,
          reply_to_email: config.reply_to_email || null,
          daily_limit: config.daily_limit,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "SMTP settings saved successfully",
      });

      fetchConfig();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Resend Configuration</h3>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="api_key">Resend API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api_key"
                type={showApiKey ? "text" : "password"}
                value={config.api_key_encrypted}
                onChange={(e) =>
                  setConfig({ ...config, api_key_encrypted: e.target.value })
                }
                placeholder="re_..."
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Resend Dashboard
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender_email">Verified Sender Email</Label>
            <Input
              id="sender_email"
              type="email"
              value={config.sender_email}
              onChange={(e) =>
                setConfig({ ...config, sender_email: e.target.value })
              }
              placeholder="noreply@sewascaffoldingbali.com"
            />
            <p className="text-xs text-muted-foreground">
              Must be verified in your Resend account
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender_name">Sender Name</Label>
            <Input
              id="sender_name"
              value={config.sender_name}
              onChange={(e) =>
                setConfig({ ...config, sender_name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reply_to">Reply-To Email (Optional)</Label>
            <Input
              id="reply_to"
              type="email"
              value={config.reply_to_email}
              onChange={(e) =>
                setConfig({ ...config, reply_to_email: e.target.value })
              }
              placeholder="support@sewascaffoldingbali.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Daily Usage</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${(config.emails_sent_today / config.daily_limit) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {config.emails_sent_today} / {config.daily_limit}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !config.sender_email}
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SMTPConfigForm;
