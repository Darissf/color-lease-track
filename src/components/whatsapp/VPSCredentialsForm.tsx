import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVPSCredentials } from '@/hooks/useVPSCredentials';

interface VPSCredentials {
  host: string;
  port: string;
  username: string;
  password: string;
  wahaPort: string;
  wahaSessionName: string;
  wahaApiKey: string;
}

interface VPSCredentialsFormProps {
  onStartSetup: (credentials: VPSCredentials) => void;
  isLoading: boolean;
}

export const VPSCredentialsForm = ({ onStartSetup, isLoading }: VPSCredentialsFormProps) => {
  const { toast } = useToast();
  const { credentials: savedCredentials, saveCredentials, updateCredentials, findByHost } = useVPSCredentials();
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  
  const [credentials, setCredentials] = useState<VPSCredentials>({
    host: '',
    port: '22',
    username: 'root',
    password: '',
    wahaPort: '3000',
    wahaSessionName: 'default',
    wahaApiKey: generateApiKey(),
  });

  // Load default credentials on mount
  useEffect(() => {
    const defaultCred = savedCredentials.find(c => c.is_default);
    if (defaultCred) {
      setCredentials({
        host: defaultCred.host,
        port: defaultCred.port.toString(),
        username: defaultCred.username,
        password: defaultCred.password,
        wahaPort: defaultCred.waha_port.toString(),
        wahaSessionName: defaultCred.waha_session_name,
        wahaApiKey: defaultCred.waha_api_key || generateApiKey(),
      });
    }
  }, [savedCredentials]);

  function generateApiKey() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const handleRegenerateApiKey = () => {
    setCredentials(prev => ({ ...prev, wahaApiKey: generateApiKey() }));
    toast({ title: 'API Key baru dibuat' });
  };

  const validateForm = () => {
    if (!credentials.host) {
      toast({ title: 'Error', description: 'IP Address wajib diisi', variant: 'destructive' });
      return false;
    }
    if (!credentials.password) {
      toast({ title: 'Error', description: 'Password VPS wajib diisi', variant: 'destructive' });
      return false;
    }
    const port = parseInt(credentials.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      toast({ title: 'Error', description: 'Port tidak valid (1-65535)', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('vps-ssh-execute', {
        body: {
          host: credentials.host,
          port: parseInt(credentials.port),
          username: credentials.username,
          password: credentials.password,
          command: 'echo "Connection successful"',
        },
      });

      if (error) throw error;

      if (data.success) {
        setTestResult('success');
        toast({ 
          title: 'Koneksi Berhasil!', 
          description: 'VPS dapat diakses dengan SSH',
        });

        // Auto-save credentials after successful test
        try {
          const existingCred = findByHost(credentials.host);
          const vpsName = `VPS ${credentials.host}`;
          
          if (existingCred) {
            // Update existing credentials
            await updateCredentials(existingCred.id!, {
              port: parseInt(credentials.port),
              username: credentials.username,
              password: credentials.password,
              waha_port: parseInt(credentials.wahaPort),
              waha_session_name: credentials.wahaSessionName,
              waha_api_key: credentials.wahaApiKey,
            });
            toast({ 
              title: 'VPS Diperbarui!', 
              description: 'Kredensial VPS berhasil diperbarui',
            });
          } else {
            // Save new credentials
            await saveCredentials({
              name: vpsName,
              host: credentials.host,
              port: parseInt(credentials.port),
              username: credentials.username,
              password: credentials.password,
              waha_port: parseInt(credentials.wahaPort),
              waha_session_name: credentials.wahaSessionName,
              waha_api_key: credentials.wahaApiKey,
              is_default: savedCredentials.length === 0, // Set as default if it's the first one
            });
            toast({ 
              title: 'VPS Tersimpan!', 
              description: 'Kredensial VPS berhasil disimpan',
            });
          }
        } catch (saveError) {
          console.error('Failed to save VPS credentials:', saveError);
          // Don't block the flow if save fails
        }
      } else {
        setTestResult('error');
        toast({ 
          title: 'Koneksi Gagal', 
          description: data.error || 'Tidak dapat terhubung ke VPS',
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      setTestResult('error');
      toast({ 
        title: 'Error Test Koneksi', 
        description: error.message || 'Gagal menghubungi VPS',
        variant: 'destructive' 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleStartSetup = async () => {
    if (!validateForm()) return;
    onStartSetup(credentials);
  };

  return (
    <div className="space-y-6">
      {/* VPS Credentials */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Kredensial VPS</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">IP Address VPS *</Label>
            <Input
              id="host"
              placeholder="192.168.1.1"
              value={credentials.host}
              onChange={(e) => setCredentials(prev => ({ ...prev, host: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">SSH Port</Label>
            <Input
              id="port"
              type="number"
              placeholder="22"
              value={credentials.port}
              onChange={(e) => setCredentials(prev => ({ ...prev, port: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="root"
              value={credentials.username}
              onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password VPS *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleTestConnection} 
          disabled={testing || isLoading}
          variant="outline"
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : testResult === 'success' ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              Koneksi Berhasil
            </>
          ) : testResult === 'error' ? (
            <>
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
              Koneksi Gagal
            </>
          ) : (
            'Test Koneksi VPS'
          )}
        </Button>
      </Card>

      {/* WAHA Configuration */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Konfigurasi WAHA</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wahaPort">WAHA Port</Label>
            <Input
              id="wahaPort"
              type="number"
              placeholder="3000"
              value={credentials.wahaPort}
              onChange={(e) => setCredentials(prev => ({ ...prev, wahaPort: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wahaSessionName">Session Name</Label>
            <Input
              id="wahaSessionName"
              placeholder="default"
              value={credentials.wahaSessionName}
              onChange={(e) => setCredentials(prev => ({ ...prev, wahaSessionName: e.target.value }))}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="wahaApiKey">API Key</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRegenerateApiKey}
                disabled={isLoading}
              >
                Generate Baru
              </Button>
            </div>
            <Input
              id="wahaApiKey"
              value={credentials.wahaApiKey}
              readOnly
              className="font-mono text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Start Setup Button */}
      <Button 
        onClick={handleStartSetup}
        disabled={isLoading || testResult !== 'success'}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setup Berjalan...
          </>
        ) : (
          '🚀 Setup WAHA Otomatis'
        )}
      </Button>

      {testResult !== 'success' && (
        <p className="text-sm text-muted-foreground text-center">
          Test koneksi VPS terlebih dahulu sebelum memulai setup
        </p>
      )}

      {testResult === 'error' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Koneksi SSH Gagal? Gunakan Setup Manual</p>
              <p className="text-sm">Jika test koneksi gagal, Anda dapat melakukan setup manual di VPS:</p>
              <ol className="text-sm list-decimal list-inside space-y-1">
                <li>Login ke VPS via SSH client (PuTTY, Terminal)</li>
                <li>Jalankan: <code className="bg-muted px-1">docker run -d -p {credentials.wahaPort}:3000 devlikeapro/waha</code></li>
                <li>Akses: <code className="bg-muted px-1">http://{credentials.host}:{credentials.wahaPort}</code></li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
