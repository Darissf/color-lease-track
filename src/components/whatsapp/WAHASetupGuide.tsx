import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Settings, QrCode, Power } from 'lucide-react';
import { WAHAInstallationSteps } from './WAHAInstallationSteps';
import { WAHAConfigGenerator } from './WAHAConfigGenerator';
import { WAHAQRScanner } from './WAHAQRScanner';
import { WAHASessionManager } from './WAHASessionManager';

export const WAHASetupGuide = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Panduan Setup WAHA</h3>
        <p className="text-muted-foreground">
          Ikuti panduan lengkap untuk setup WAHA di VPS Anda
        </p>
      </div>

      <Tabs defaultValue="installation" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="installation" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden md:inline">Panduan</span>
          </TabsTrigger>
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Generator</span>
          </TabsTrigger>
          <TabsTrigger value="qr-scanner" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden md:inline">QR Code</span>
          </TabsTrigger>
          <TabsTrigger value="session" className="flex items-center gap-2">
            <Power className="h-4 w-4" />
            <span className="hidden md:inline">Session</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installation" className="mt-6">
          <WAHAInstallationSteps />
        </TabsContent>

        <TabsContent value="generator" className="mt-6">
          <WAHAConfigGenerator />
        </TabsContent>

        <TabsContent value="qr-scanner" className="mt-6">
          <WAHAQRScanner />
        </TabsContent>

        <TabsContent value="session" className="mt-6">
          <WAHASessionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};
