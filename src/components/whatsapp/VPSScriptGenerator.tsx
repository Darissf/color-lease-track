import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Download, Copy, FileCode, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ScriptGeneratorProps {
  host: string;
  wahaPort: number;
  sessionName: string;
  apiKey: string;
}

export const VPSScriptGenerator = ({ host, wahaPort, sessionName, apiKey }: ScriptGeneratorProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const generateSetupScript = () => {
    return `#!/bin/bash
# WAHA Auto Setup Script
# Generated for VPS: ${host}
# Port: ${wahaPort}
# Session: ${sessionName}

set -e

echo "🚀 Starting WAHA Installation..."
echo "================================="
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Cannot detect OS"
    exit 1
fi

echo "📋 Detected OS: $OS"
echo ""

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "📦 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Create WAHA directory
echo "📁 Creating WAHA directory..."
mkdir -p /opt/waha
cd /opt/waha

# Create docker-compose.yml
echo "📝 Creating docker-compose configuration..."
cat > docker-compose.yml <<EOF
version: '3.8'
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
EOF

echo "✅ Configuration created"

# Pull and start WAHA
echo "⬇️  Pulling WAHA Docker image..."
docker-compose pull

echo "🚀 Starting WAHA container..."
docker-compose up -d

# Wait for WAHA to start
echo "⏳ Waiting for WAHA to start..."
sleep 10

# Check if container is running
if docker ps | grep -q waha; then
    echo "✅ WAHA is running!"
else
    echo "❌ WAHA failed to start. Check logs with: docker logs waha"
    exit 1
fi

# Configure firewall
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow ${wahaPort}/tcp
    echo "✅ UFW firewall configured"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=${wahaPort}/tcp
    firewall-cmd --reload
    echo "✅ Firewalld configured"
else
    echo "⚠️  No firewall detected, skipping..."
fi

# Final status
echo ""
echo "================================="
echo "✅ WAHA Installation Complete!"
echo "================================="
echo ""
echo "📍 Access WAHA at: http://${host}:${wahaPort}"
echo "🔑 API Key: ${apiKey}"
echo "📱 Session: ${sessionName}"
echo ""
echo "Useful commands:"
echo "  - View logs: docker logs -f waha"
echo "  - Restart: docker-compose restart"
echo "  - Stop: docker-compose down"
echo "  - Update: docker-compose pull && docker-compose up -d"
echo ""
`;
  };

  const generateDockerComposeOnly = () => {
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
  };

  const generateQuickCommands = () => {
    return `# Quick Commands for WAHA Management

# View logs
docker logs -f waha

# Restart container
docker restart waha

# Stop container
docker stop waha

# Start container
docker start waha

# View container status
docker ps -a | grep waha

# Update WAHA to latest version
cd /opt/waha
docker-compose pull
docker-compose up -d

# Backup sessions
tar -czf waha-backup-$(date +%Y%m%d).tar.gz /opt/waha/sessions

# View resource usage
docker stats waha --no-stream

# Clean up old images
docker image prune -a
`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: '✅ Copied!',
      description: 'Script copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = (content: string, filename: string) => {
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

  const setupScript = generateSetupScript();
  const dockerCompose = generateDockerComposeOnly();
  const quickCommands = generateQuickCommands();

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileCode className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Script Generator</h3>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <p className="text-sm font-medium">📥 How to use:</p>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Download atau copy script di bawah</li>
          <li>SSH ke VPS Anda: <code className="bg-background px-2 py-0.5 rounded">ssh {host}</code></li>
          <li>Jalankan script: <code className="bg-background px-2 py-0.5 rounded">bash setup-waha.sh</code></li>
          <li>Tunggu hingga selesai (~5-10 menit)</li>
        </ol>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Setup Script</TabsTrigger>
          <TabsTrigger value="compose">Docker Compose</TabsTrigger>
          <TabsTrigger value="commands">Quick Commands</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Textarea
            value={setupScript}
            readOnly
            className="font-mono text-xs h-[400px] resize-none"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard(setupScript)}
              className="flex-1"
              variant={copied ? "default" : "outline"}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Script
                </>
              )}
            </Button>
            <Button
              onClick={() => downloadScript(setupScript, 'setup-waha.sh')}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download .sh
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="compose" className="space-y-4">
          <Textarea
            value={dockerCompose}
            readOnly
            className="font-mono text-xs h-[400px] resize-none"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => copyToClipboard(dockerCompose)}
              className="flex-1"
              variant="outline"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              onClick={() => downloadScript(dockerCompose, 'docker-compose.yml')}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="commands" className="space-y-4">
          <Textarea
            value={quickCommands}
            readOnly
            className="font-mono text-xs h-[400px] resize-none"
          />
          <Button
            onClick={() => copyToClipboard(quickCommands)}
            className="w-full"
            variant="outline"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy All Commands
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
};