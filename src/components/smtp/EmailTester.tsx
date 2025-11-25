import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, CheckCircle, XCircle, Zap } from "lucide-react";

interface EmailTemplate {
  id: string;
  template_type: string;
  template_name: string;
  subject_template: string;
  body_template: string;
}

interface EmailProvider {
  id: string;
  provider_name: string;
  display_name: string;
  is_active: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  provider?: {
    id: string;
    name: string;
    display_name: string;
  };
  response_time_ms?: number;
  message_id?: string;
  fallback_attempts?: number;
}

const EmailTester = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("auto");
  const [testEmail, setTestEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchProviders();
  }, []);

  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== "none") {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        setSubject(template.subject_template);
        setMessage(template.body_template);
      }
    } else if (selectedTemplate === "none") {
      setSubject("");
      setMessage("");
    }
  }, [selectedTemplate, templates]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("email_providers")
        .select("id, provider_name, display_name, is_active")
        .eq("is_active", true)
        .order("priority", { ascending: true });

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      console.error("Error fetching providers:", error);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !subject || !message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const requestBody: any = {
        to: testEmail,
        subject: subject,
        html: message,
        template_type: "test",
      };

      if (selectedProvider !== "auto") {
        requestBody.provider_id = selectedProvider;
      }

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: requestBody,
      });

      if (error) throw error;

      setResult({
        success: true,
        message: "Test email sent successfully!",
        provider: data.provider,
        response_time_ms: data.response_time_ms,
        message_id: data.message_id,
        fallback_attempts: data.fallback_attempts,
      });

      toast({
        title: "Success",
        description: `Email sent via ${data.provider?.display_name || data.provider?.name}`,
      });
    } catch (error: any) {
      console.error("Send test error:", error);
      setResult({
        success: false,
        message: error.message || "Failed to send test email",
      });

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
        <h3 className="text-lg font-semibold">Test Email Sending</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Custom Email</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Provider (Optional)</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto (Rotation)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Auto (Rotation)
                    </div>
                  </SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.display_name || provider.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_email">Recipient Email</Label>
            <Input
              id="test_email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Test Email Subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (HTML)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="<h1>Test Email</h1><p>This is a test email.</p>"
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {result && (
            <Card
              className={`p-4 space-y-3 ${
                result.success
                  ? "bg-green-50 border-green-200"
                  : "bg-destructive/10 border-destructive/20"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <p
                    className={`font-medium ${
                      result.success ? "text-green-800" : "text-destructive"
                    }`}
                  >
                    {result.message}
                  </p>
                  
                  {result.success && result.provider && (
                    <div className="space-y-2 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          Provider: {result.provider.display_name || result.provider.name}
                        </Badge>
                        {result.response_time_ms && (
                          <Badge variant="secondary">
                            Response: {result.response_time_ms}ms
                          </Badge>
                        )}
                        {result.fallback_attempts !== undefined && result.fallback_attempts > 0 && (
                          <Badge variant="outline">
                            Fallback attempts: {result.fallback_attempts}
                          </Badge>
                        )}
                      </div>
                      {result.message_id && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Message ID: {result.message_id}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Button onClick={handleSendTest} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default EmailTester;
