import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileEdit, Copy, Download, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfigFileEditorProps {
  wahaPort: number;
  sessionName: string;
}

export const ConfigFileEditor = ({ wahaPort, sessionName }: ConfigFileEditorProps) => {
  const { toast } = useToast();
  const [dockerCompose, setDockerCompose] = useState(getDefaultDockerCompose());
  const [envFile, setEnvFile] = useState(getDefaultEnvFile());

  function getDefaultDockerCompose() {
    return `version: '3.8'
services:
  waha:
    image: devlikeapro/waha:latest
    container_name: waha
    restart: unless-stopped
    ports:
      - "${wahaPort}:3000"
    environment:
      - WHATSAPP_HOOK_URL=
      - WHATSAPP_HOOK_EVENTS=*
      - WHATSAPP_DEFAULT_ENGINE=WEBJS
      - WAHA_PRINT_QR=True
    volumes:
      - ./sessions:/app/.sessions
      - ./storage:/app/.storage
    networks:
      - waha_network

networks:
  waha_network:
    driver: bridge
`;
  }

  function getDefaultEnvFile() {
    return `# WAHA Environment Configuration
WHATSAPP_HOOK_URL=
WHATSAPP_HOOK_EVENTS=*
WHATSAPP_DEFAULT_ENGINE=WEBJS
WAHA_PRINT_QR=True

# Optional: Session Configuration
WAHA_SESSION_NAME=${sessionName}

# Optional: API Configuration
WAHA_API_PORT=3000
WAHA_API_HOSTNAME=0.0.0.0

# Optional: Logging
WAHA_LOG_LEVEL=info
WAHA_LOG_FORMAT=pretty
`;
  }

  const copyToClipboard = (text: string, filename: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '✅ Copied!',
      description: `${filename} copied to clipboard`,
    });
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: '✅ Downloaded!',
      description: `${filename} has been downloaded`,
    });
  };

  const resetToDefault = (type: 'compose' | 'env') => {
    if (type === 'compose') {
      setDockerCompose(getDefaultDockerCompose());
    } else {
      setEnvFile(getDefaultEnvFile());
    }
    toast({
      title: 'Reset Complete',
      description: 'Configuration reset to default',
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileEdit className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Config File Editor</h3>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <p className="text-sm font-medium">📝 How to use:</p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Edit configuration sesuai kebutuhan</li>
          <li>Download atau copy file yang sudah di-edit</li>
          <li>Upload ke VPS Anda di direktori <code className="bg-background px-2 py-0.5 rounded">/opt/waha/</code></li>
          <li>Restart container untuk apply perubahan</li>
        </ol>
      </div>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">docker-compose.yml</TabsTrigger>
          <TabsTrigger value="env">.env file</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Textarea
            value={dockerCompose}
            onChange={(e) => setDockerCompose(e.target.value)}
            className="font-mono text-xs h-[400px] resize-none"
            placeholder="Edit docker-compose.yml..."
          />
          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard(dockerCompose, 'docker-compose.yml')}
              className="flex-1"
              variant="outline"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              onClick={() => downloadFile(dockerCompose, 'docker-compose.yml')}
              className="flex-1"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={() => resetToDefault('compose')}
              className="flex-1"
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="env" className="space-y-4">
          <Textarea
            value={envFile}
            onChange={(e) => setEnvFile(e.target.value)}
            className="font-mono text-xs h-[400px] resize-none"
            placeholder="Edit .env file..."
          />
          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard(envFile, '.env')}
              className="flex-1"
              variant="outline"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              onClick={() => downloadFile(envFile, '.env')}
              className="flex-1"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={() => resetToDefault('env')}
              className="flex-1"
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Syntax Highlighting Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>💡 <strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-0.5 ml-4">
          <li>Gunakan 2 spaces untuk indentation di YAML</li>
          <li>Port format: "host:container" (contoh: "3000:3000")</li>
          <li>Environment variables bisa di-override dengan .env file</li>
          <li>Pastikan tidak ada trailing spaces di akhir line</li>
        </ul>
      </div>
    </Card>
  );
};