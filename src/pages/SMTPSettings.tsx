import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import SMTPConfigForm from "@/components/smtp/SMTPConfigForm";
import EmailTemplateEditor from "@/components/smtp/EmailTemplateEditor";
import EmailLogsPanel from "@/components/smtp/EmailLogsPanel";
import EmailSignatureManager from "@/components/smtp/EmailSignatureManager";
import EmailTester from "@/components/smtp/EmailTester";
import EmailRotationTester from "@/components/smtp/EmailRotationTester";
import UnifiedNotificationCenter from "@/components/smtp/UnifiedNotificationCenter";
import EmailProviderManager from "@/components/smtp/EmailProviderManager";
import EmailUsageDashboard from "@/components/smtp/EmailUsageDashboard";
import EmailAddressManager from "@/components/mail/EmailAddressManager";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";

const SMTPSettings = () => {
  const { activeTheme } = useAppTheme();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "providers");

  // Redirect if not super admin
  if (!isSuperAdmin) {
    navigate("/vip/");
    return null;
  }

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col px-4 md:px-6 py-4 md:py-6">
      <div className="shrink-0 flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/vip/settings")}
          className="hover:bg-primary/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className={cn(
            "text-xl md:text-3xl font-bold",
            activeTheme === 'japanese'
              ? "bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"
              : "text-foreground"
          )}>
            SMTP Email Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Kelola pengiriman email otomatis dengan Resend
          </p>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-base md:text-lg">Email Management System</CardTitle>
          </div>
          <CardDescription className="text-xs md:text-sm">
            Konfigurasi SMTP, template, signature, dan unified notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <div className="shrink-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4">
              <TabsList className="inline-flex w-max md:grid md:w-full md:grid-cols-9 gap-1">
                <TabsTrigger value="providers" className="text-xs md:text-sm whitespace-nowrap">Providers</TabsTrigger>
                <TabsTrigger value="config" className="text-xs md:text-sm whitespace-nowrap">Config</TabsTrigger>
                <TabsTrigger value="templates" className="text-xs md:text-sm whitespace-nowrap">Templates</TabsTrigger>
                <TabsTrigger value="signatures" className="text-xs md:text-sm whitespace-nowrap">Signatures</TabsTrigger>
                <TabsTrigger value="unified" className="text-xs md:text-sm whitespace-nowrap">Unified</TabsTrigger>
                <TabsTrigger value="usage" className="text-xs md:text-sm whitespace-nowrap">Usage</TabsTrigger>
                <TabsTrigger value="logs" className="text-xs md:text-sm whitespace-nowrap">Logs</TabsTrigger>
                <TabsTrigger value="monitored" className="text-xs md:text-sm whitespace-nowrap">Monitored</TabsTrigger>
                <TabsTrigger value="test" className="text-xs md:text-sm whitespace-nowrap">Test</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="providers" className="space-y-4 mt-0">
                <EmailProviderManager />
              </TabsContent>

              <TabsContent value="config" className="space-y-4 mt-0">
                <SMTPConfigForm />
              </TabsContent>

              <TabsContent value="templates" className="space-y-4 mt-0">
                <EmailTemplateEditor />
              </TabsContent>

              <TabsContent value="signatures" className="space-y-4 mt-0">
                <EmailSignatureManager />
              </TabsContent>

              <TabsContent value="unified" className="space-y-4 mt-0">
                <UnifiedNotificationCenter />
              </TabsContent>

              <TabsContent value="usage" className="space-y-4 mt-0">
                <EmailUsageDashboard />
              </TabsContent>

              <TabsContent value="logs" className="space-y-4 mt-0">
                <EmailLogsPanel />
              </TabsContent>

              <TabsContent value="monitored" className="space-y-4 mt-0">
                <EmailAddressManager />
              </TabsContent>

              <TabsContent value="test" className="space-y-4 mt-0">
                <div className="space-y-6">
                  <EmailTester />
                  <EmailRotationTester />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SMTPSettings;
