import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, FileText, History, TestTube } from 'lucide-react';
import { WhatsAppConfigForm } from '@/components/whatsapp/WhatsAppConfigForm';
import { MessageTemplates } from '@/components/whatsapp/MessageTemplates';
import { NotificationHistory } from '@/components/whatsapp/NotificationHistory';
import { WhatsAppTester } from '@/components/whatsapp/WhatsAppTester';

const WhatsAppSettings = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/vip/');
    }
  }, [isSuperAdmin, navigate]);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/vip/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">WhatsApp Settings</h1>
            <p className="text-muted-foreground mt-1">
              Kelola konfigurasi, template, dan monitoring WhatsApp notifications
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Card className="p-6">
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Konfigurasi</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden md:inline">Template</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden md:inline">Riwayat</span>
              </TabsTrigger>
              <TabsTrigger value="testing" className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                <span className="hidden md:inline">Testing</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config">
              <WhatsAppConfigForm />
            </TabsContent>

            <TabsContent value="templates">
              <MessageTemplates />
            </TabsContent>

            <TabsContent value="history">
              <NotificationHistory />
            </TabsContent>

            <TabsContent value="testing">
              <WhatsAppTester />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
