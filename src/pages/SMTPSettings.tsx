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
import UnifiedNotificationCenter from "@/components/smtp/UnifiedNotificationCenter";

const SMTPSettings = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("config");

  // Redirect if not super admin
  if (!isSuperAdmin) {
    navigate("/vip/");
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/vip/settings")}
          className="hover:bg-primary/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            SMTP Email Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola pengiriman email otomatis dengan Resend
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Email Management System</CardTitle>
          </div>
          <CardDescription>
            Konfigurasi SMTP, template, signature, dan unified notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="signatures">Signatures</TabsTrigger>
              <TabsTrigger value="unified">Unified</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <SMTPConfigForm />
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <EmailTemplateEditor />
            </TabsContent>

            <TabsContent value="signatures" className="space-y-4">
              <EmailSignatureManager />
            </TabsContent>

            <TabsContent value="unified" className="space-y-4">
              <UnifiedNotificationCenter />
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <EmailLogsPanel />
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <EmailTester />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SMTPSettings;
