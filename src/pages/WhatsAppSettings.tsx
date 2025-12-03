import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ArrowLeft, Phone, MessageSquare, Clock, BarChart3, Tag, FileText, BookOpen, History, TestTube, Settings, Cloud } from 'lucide-react';
import { WhatsAppConfigForm } from '@/components/whatsapp/WhatsAppConfigForm';
import { MessageTemplates } from '@/components/whatsapp/MessageTemplates';
import { NotificationHistory } from '@/components/whatsapp/NotificationHistory';
import { WhatsAppTester } from '@/components/whatsapp/WhatsAppTester';
import { WAHASetupGuide } from '@/components/whatsapp/WAHASetupGuide';
import { WAHASessionManager } from '@/components/whatsapp/WAHASessionManager';
import { WAHAQRScanner } from '@/components/whatsapp/WAHAQRScanner';
import { WhatsAppNumberManager } from '@/components/whatsapp/WhatsAppNumberManager';
import { WhatsAppConversations } from '@/components/whatsapp/WhatsAppConversations';
import { WhatsAppChatPanel } from '@/components/whatsapp/WhatsAppChatPanel';
import { WhatsAppScheduledMessages } from '@/components/whatsapp/WhatsAppScheduledMessages';
import { WhatsAppAnalyticsDashboard } from '@/components/whatsapp/WhatsAppAnalyticsDashboard';
import { WhatsAppCustomerTags } from '@/components/whatsapp/WhatsAppCustomerTags';
import { MetaCloudSetupGuide } from '@/components/whatsapp/MetaCloudSetupGuide';
import { MetaTemplateMapping } from '@/components/whatsapp/MetaTemplateMapping';
import { WhatsAppExportReports } from '@/components/whatsapp/WhatsAppExportReports';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { cn } from '@/lib/utils';

const WhatsAppSettings = () => {
  const { activeTheme } = useAppTheme();
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/vip/');
    }
  }, [isSuperAdmin, navigate]);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-full bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/vip/settings/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={cn(
              "text-3xl font-bold",
              activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            )}>WhatsApp Settings</h1>
            <p className="text-muted-foreground mt-1">
              Advanced WhatsApp Package - Multi-Number, Analytics, Conversations
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Card className="p-6">
          <Tabs defaultValue="numbers" className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="inline-flex w-max mb-6">
                <TabsTrigger value="numbers" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="hidden md:inline">Nomor</span>
                </TabsTrigger>
                <TabsTrigger value="conversations" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden md:inline">Percakapan</span>
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="hidden md:inline">Terjadwal</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden md:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="tags" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="hidden md:inline">Tags</span>
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden md:inline">Template</span>
                </TabsTrigger>
                <TabsTrigger value="meta" className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  <span className="hidden md:inline">Meta Cloud</span>
                </TabsTrigger>
                <TabsTrigger value="setup" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden md:inline">Setup WAHA</span>
                </TabsTrigger>
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline">Config</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <span className="hidden md:inline">Riwayat</span>
                </TabsTrigger>
                <TabsTrigger value="export" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden md:inline">Export</span>
                </TabsTrigger>
                <TabsTrigger value="testing" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  <span className="hidden md:inline">Testing</span>
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value="numbers">
              <WhatsAppNumberManager />
            </TabsContent>

            <TabsContent value="conversations">
              <div className="grid md:grid-cols-[350px_1fr] gap-4 h-[600px]">
                <Card className="overflow-hidden">
                  <WhatsAppConversations 
                    onSelectConversation={setSelectedConversationId}
                    selectedConversationId={selectedConversationId}
                  />
                </Card>
                <Card className="overflow-hidden">
                  <WhatsAppChatPanel conversationId={selectedConversationId} />
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="scheduled">
              <WhatsAppScheduledMessages />
            </TabsContent>

            <TabsContent value="analytics">
              <WhatsAppAnalyticsDashboard />
            </TabsContent>

            <TabsContent value="tags">
              <WhatsAppCustomerTags />
            </TabsContent>

            <TabsContent value="templates">
              <MessageTemplates />
            </TabsContent>

            <TabsContent value="meta" className="space-y-6">
              <MetaCloudSetupGuide />
              <MetaTemplateMapping />
            </TabsContent>

            <TabsContent value="setup">
              <WAHASetupGuide />
            </TabsContent>

            <TabsContent value="config" className="space-y-6">
              <WhatsAppConfigForm />
              <WAHASessionManager />
              <WAHAQRScanner />
            </TabsContent>

            <TabsContent value="history">
              <NotificationHistory />
            </TabsContent>

            <TabsContent value="export">
              <WhatsAppExportReports />
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
