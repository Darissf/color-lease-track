import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const WAHAConfigGenerator = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    port: '3000',
    sessionName: 'default',
    apiKey: generateApiKey()
  });

  function generateApiKey() {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  const regenerateApiKey = () => {
    setConfig(prev => ({ ...prev, apiKey: generateApiKey() }));
    toast({ title: 'API Key baru', description: 'API Key berhasil di-generate ulang' });
  };

  const dockerComposeYml = `version: '3.8'

services:
  waha:
    image: devlikeapro/waha:latest
    container_name: waha
    restart: unless-stopped
    ports:
      - "${config.port}:3000"
    environment:
      - WHATSAPP_HOOK_URL=
      - WAHA_API_KEY=${config.apiKey}
      - WHATSAPP_DEFAULT_SESSION=${config.sessionName}
      - WHATSAPP_RESTART_ALL_SESSIONS=true
    volumes:
      - ./waha-data:/app/sessions
    networks:
      - waha-network

networks:
  waha-network:
    driver: bridge`;

  const setupScript = `#!/bin/bash

# WAHA Setup Script - Auto-generated
# Generated on: ${new Date().toLocaleString('id-ID')}

echo "🚀 Starting WAHA Setup..."

# Create directory
echo "📁 Creating WAHA directory..."
mkdir -p ~/waha
cd ~/waha

# Create docker-compose.yml
echo "📝 Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
${dockerComposeYml}
EOF

# Pull WAHA image
echo "📥 Pulling WAHA Docker image..."
docker-compose pull

# Start WAHA
echo "▶️  Starting WAHA container..."
docker-compose up -d

# Wait for container to be ready
echo "⏳ Waiting for WAHA to start..."
sleep 5

# Check status
echo "✅ Checking WAHA status..."
docker-compose ps

echo ""
echo "✨ WAHA Setup Complete!"
echo ""
echo "📋 Configuration Summary:"
echo "   API URL: http://YOUR_VPS_IP:${config.port}"
echo "   API Key: ${config.apiKey}"
echo "   Session: ${config.sessionName}"
echo ""
echo "🔗 Next Steps:"
echo "   1. Make sure port ${config.port} is open in your firewall"
echo "   2. Test connection: curl http://localhost:${config.port}/api/health"
echo "   3. Configure credentials in the application"
echo "   4. Scan QR code to connect WhatsApp"
echo ""
`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Disalin!', description: `${label} berhasil disalin` });
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded!', description: `${filename} berhasil didownload` });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Konfigurasi Generator</h3>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="port">Port WAHA</Label>
              <Input
                id="port"
                value={config.port}
                onChange={(e) => setConfig(prev => ({ ...prev, port: e.target.value }))}
                placeholder="3000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Port untuk mengakses WAHA API
              </p>
            </div>
            <div>
              <Label htmlFor="session">Session Name</Label>
              <Input
                id="session"
                value={config.sessionName}
                onChange={(e) => setConfig(prev => ({ ...prev, sessionName: e.target.value }))}
                placeholder="default"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nama session WhatsApp Anda
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="apikey">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="apikey"
                value={config.apiKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={regenerateApiKey}
                title="Generate ulang API Key"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              API Key untuk autentikasi (simpan dengan aman!)
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">docker-compose.yml</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(dockerComposeYml, 'docker-compose.yml')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              size="sm"
              onClick={() => downloadFile(dockerComposeYml, 'docker-compose.yml')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
        <Textarea
          value={dockerComposeYml}
          readOnly
          className="font-mono text-xs h-64 resize-none"
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Setup Script (waha-setup.sh)</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(setupScript, 'Setup script')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              size="sm"
              onClick={() => downloadFile(setupScript, 'waha-setup.sh')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
        <Textarea
          value={setupScript}
          readOnly
          className="font-mono text-xs h-96 resize-none"
        />
        <div className="mt-3 p-3 bg-muted rounded-md">
          <p className="text-sm font-medium mb-2">Cara menggunakan:</p>
          <ol className="text-xs space-y-1 text-muted-foreground">
            <li>1. Download file waha-setup.sh</li>
            <li>2. Upload ke VPS Anda (via SCP/SFTP)</li>
            <li>3. Jalankan: <code className="bg-background px-1 py-0.5 rounded">chmod +x waha-setup.sh && ./waha-setup.sh</code></li>
          </ol>
        </div>
      </Card>

      <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
        <p className="text-sm font-medium text-yellow-500 mb-2">⚠️ Catatan Keamanan</p>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• Simpan API Key di tempat yang aman</li>
          <li>• Jangan share docker-compose.yml yang sudah ada API Key</li>
          <li>• Gunakan firewall untuk membatasi akses ke port WAHA</li>
          <li>• Pertimbangkan menggunakan reverse proxy (nginx) dengan SSL</li>
        </ul>
      </Card>
    </div>
  );
};
