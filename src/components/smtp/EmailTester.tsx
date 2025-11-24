import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, CheckCircle, XCircle } from "lucide-react";

interface EmailTemplate {
  id: string;
  template_type: string;
  template_name: string;
  subject_template: string;
  body_template: string;
}

const EmailTester = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(
    null
  );

  useEffect(() => {
    fetchTemplates();
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
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: testEmail,
          subject: subject,
          html: message,
          template_type: "test",
        },
      });

      if (error) throw error;

      setResult({
        success: true,
        message: "Test email sent successfully!",
      });

      toast({
        title: "Success",
        description: "Test email sent successfully",
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
              className={`p-4 ${
                result.success
                  ? "bg-green-50 border-green-200"
                  : "bg-destructive/10 border-destructive/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span
                  className={
                    result.success ? "text-green-800" : "text-destructive"
                  }
                >
                  {result.message}
                </span>
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
