import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VPSCredentialsForm } from './VPSCredentialsForm';
import { SetupProgressLog, SetupStep } from './SetupProgressLog';
import { WebTerminal } from './WebTerminal';
import { SavedVPSList } from './SavedVPSList';
import { Rocket, Terminal as TerminalIcon, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { VPSCredentials as SavedVPSType } from '@/hooks/useVPSCredentials';

interface VPSCredentials {
  host: string;
  port: string;
  username: string;
  password: string;
  wahaPort: string;
  wahaSessionName: string;
  wahaApiKey: string;
}

export const WAHAVPSSetup = () => {
  const { toast } = useToast();
  const [isSetupRunning, setIsSetupRunning] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [credentials, setCredentials] = useState<VPSCredentials | null>(null);
  const [selectedTab, setSelectedTab] = useState('auto-setup');

  const handleSelectSavedVPS = (savedCred: SavedVPSType) => {
    // Convert saved credentials to form format and switch to auto-setup tab
    const formCreds: VPSCredentials = {
      host: savedCred.host,
      port: savedCred.port.toString(),
      username: savedCred.username,
      password: savedCred.password,
      wahaPort: savedCred.waha_port.toString(),
      wahaSessionName: savedCred.waha_session_name,
      wahaApiKey: savedCred.waha_api_key || '',
    };
    setCredentials(formCreds);
    setSelectedTab('auto-setup');
    
    toast({
      title: 'VPS Dipilih',
      description: `${savedCred.name} siap digunakan`,
    });
  };

  const initializeSteps = (): SetupStep[] => [
    { id: 'connect', label: '🔌 Connecting to VPS', status: 'pending' },
    { id: 'check-docker', label: '🐳 Checking Docker installation', status: 'pending' },
    { id: 'install-docker', label: '📦 Installing Docker (if needed)', status: 'pending' },
    { id: 'create-dir', label: '📁 Creating WAHA directory', status: 'pending' },
    { id: 'docker-compose', label: '📝 Uploading docker-compose.yml', status: 'pending' },
    { id: 'pull-image', label: '⬇️ Pulling WAHA Docker image', status: 'pending' },
    { id: 'start-container', label: '🚀 Starting WAHA container', status: 'pending' },
    { id: 'firewall', label: '🔥 Configuring firewall', status: 'pending' },
    { id: 'health-check', label: '✅ Health check', status: 'pending' },
  ];

  const updateStep = (stepId: string, updates: Partial<SetupStep>) => {
    setSteps(prev =>
      prev.map(step =>
        step.id === stepId
          ? { ...step, ...updates, timestamp: new Date().toLocaleTimeString() }
          : step
      )
    );
  };

  const handleStartSetup = async (creds: VPSCredentials) => {
    setCredentials(creds);
    setIsSetupRunning(true);
    setSetupStatus('running');
    
    const initialSteps = initializeSteps();
    setSteps(initialSteps);

    try {
      // Call auto-setup edge function
      updateStep('connect', { status: 'running', details: `Connecting to ${creds.host}:${creds.port}...` });
      
      const { data, error } = await supabase.functions.invoke('vps-auto-setup', {
        body: {
          vps: {
            host: creds.host,
            port: parseInt(creds.port),
            username: creds.username,
            password: creds.password,
          },
          waha: {
            port: parseInt(creds.wahaPort),
            sessionName: creds.wahaSessionName,
            apiKey: creds.wahaApiKey,
          },
        },
      });

      if (error) throw error;

      // Process results
      if (data.success) {
        // Update steps based on results
        data.steps.forEach((stepResult: any) => {
          updateStep(stepResult.id, {
            status: stepResult.success ? 'success' : 'error',
            details: stepResult.message,
            output: stepResult.output,
          });
        });

        setSetupStatus('success');
        
        toast({
          title: '🎉 Setup Berhasil!',
          description: 'WAHA telah terinstall dan berjalan di VPS Anda',
        });

        // Save WAHA settings to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('whatsapp_settings').upsert({
            user_id: user.id,
            waha_api_url: `http://${creds.host}:${creds.wahaPort}`,
            waha_api_key: creds.wahaApiKey,
            waha_session_name: creds.wahaSessionName,
            is_active: true,
          });
        }

      } else {
        throw new Error(data.error || 'Setup failed');
      }

    } catch (error: any) {
      console.error('Setup error:', error);
      setSetupStatus('error');
      
      // Mark current running step as error
      const currentStep = steps.find(s => s.status === 'running');
      if (currentStep) {
        updateStep(currentStep.id, {
          status: 'error',
          details: error.message || 'Setup failed',
        });
      }

      toast({
        title: 'Setup Gagal',
        description: error.message || 'Terjadi kesalahan saat setup',
        variant: 'destructive',
      });
    } finally {
      setIsSetupRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Automatic VPS Setup</h3>
        <p className="text-muted-foreground">
          Setup WAHA otomatis di VPS Anda hanya dengan mengisi kredensial. Tidak perlu akses terminal manual!
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="saved-vps" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span className="hidden md:inline">VPS Tersimpan</span>
          </TabsTrigger>
          <TabsTrigger value="auto-setup" className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            <span className="hidden md:inline">Auto Setup</span>
          </TabsTrigger>
          <TabsTrigger value="terminal" className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4" />
            <span className="hidden md:inline">Web Terminal</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved-vps" className="mt-6">
          <SavedVPSList onSelect={handleSelectSavedVPS} />
        </TabsContent>

        <TabsContent value="auto-setup" className="mt-6 space-y-6">
          {setupStatus === 'idle' ? (
            <VPSCredentialsForm
              onStartSetup={handleStartSetup}
              isLoading={isSetupRunning}
            />
          ) : (
            <SetupProgressLog steps={steps} overallStatus={setupStatus} />
          )}
        </TabsContent>

        <TabsContent value="terminal" className="mt-6">
          {credentials ? (
            <WebTerminal
              host={credentials.host}
              port={parseInt(credentials.port)}
              username={credentials.username}
              password={credentials.password}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Isi kredensial VPS di tab "Auto Setup" terlebih dahulu untuk menggunakan Web Terminal
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
