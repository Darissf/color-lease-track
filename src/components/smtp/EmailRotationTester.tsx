import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, CheckCircle, XCircle, ArrowRight } from "lucide-react";

interface RotationResult {
  attempt: number;
  provider: string;
  status: "success" | "failed";
  responseTime: number;
  messageId?: string;
  error?: string;
}

const EmailRotationTester = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [emailCount, setEmailCount] = useState(4);
  const [results, setResults] = useState<RotationResult[]>([]);
  const [progress, setProgress] = useState(0);

  const handleRotationTest = async () => {
    if (!testEmail || emailCount < 1 || emailCount > 10) {
      toast({
        title: "Validation Error",
        description: "Please enter valid email and count (1-10)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress(0);

    const testResults: RotationResult[] = [];

    for (let i = 0; i < emailCount; i++) {
      try {
        const startTime = Date.now();
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: {
            to: testEmail,
            subject: `Rotation Test ${i + 1}/${emailCount}`,
            html: `<h2>Email Rotation Test - Attempt ${i + 1}</h2><p>Testing round-robin provider rotation logic.</p><p>Timestamp: ${new Date().toISOString()}</p>`,
            template_type: "test",
          },
        });

        const endTime = Date.now();

        if (error) throw error;

        testResults.push({
          attempt: i + 1,
          provider: data.provider?.display_name || data.provider?.name || "Unknown",
          status: "success",
          responseTime: endTime - startTime,
          messageId: data.message_id,
        });
      } catch (error: any) {
        testResults.push({
          attempt: i + 1,
          provider: "Failed",
          status: "failed",
          responseTime: 0,
          error: error.message,
        });
      }

      setResults([...testResults]);
      setProgress(((i + 1) / emailCount) * 100);

      // Delay between sends to respect rate limits (Resend: 2 req/sec max)
      // Using 1500ms = 1.5 seconds to safely stay under limit
      if (i < emailCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setLoading(false);

    const successCount = testResults.filter((r) => r.status === "success").length;
    toast({
      title: "Rotation Test Complete",
      description: `${successCount}/${emailCount} emails sent successfully`,
    });
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      "Resend": "bg-blue-500",
      "Brevo": "bg-green-500",
      "Mailjet": "bg-purple-500",
      "SendGrid": "bg-orange-500",
    };
    return colors[provider] || "bg-gray-500";
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Email Rotation Tester</h3>
          <p className="text-sm text-muted-foreground">
            Test the round-robin rotation logic by sending multiple emails and observing provider distribution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rotation_test_email">Test Email Address</Label>
            <Input
              id="rotation_test_email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_count">Number of Emails (1-10)</Label>
            <Input
              id="email_count"
              type="number"
              min="1"
              max="10"
              value={emailCount}
              onChange={(e) => setEmailCount(parseInt(e.target.value) || 4)}
              disabled={loading}
            />
          </div>
        </div>

        <Button onClick={handleRotationTest} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing ({Math.round(progress)}%)...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Rotation Test
            </>
          )}
        </Button>

        {loading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
      </Card>

      {results.length > 0 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Rotation Results</h3>

          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-2 min-w-[80px]">
                  <span className="text-sm font-medium">#{result.attempt}</span>
                  {index < results.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <div className={`w-3 h-3 rounded-full ${getProviderColor(result.provider)}`} />

                <div className="flex-1">
                  <div className="font-medium">{result.provider}</div>
                  {result.status === "success" && (
                    <div className="text-xs text-muted-foreground">
                      {result.responseTime}ms
                    </div>
                  )}
                  {result.error && (
                    <div className="text-xs text-destructive">{result.error}</div>
                  )}
                </div>

                {result.status === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">Provider Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(results.map((r) => r.provider))).map((provider) => {
                const count = results.filter((r) => r.provider === provider).length;
                return (
                  <Badge key={provider} variant="secondary">
                    {provider}: {count}x
                  </Badge>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EmailRotationTester;
