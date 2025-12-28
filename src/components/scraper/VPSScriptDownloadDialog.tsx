import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Download, Terminal, Check } from "lucide-react";

interface VPSScriptDownloadDialogProps {
  webhookUrl: string;
  secretKey?: string;
}

export function VPSScriptDownloadDialog({ webhookUrl, secretKey }: VPSScriptDownloadDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const baseUrl = window.location.origin;

  const downloadScript = `#!/bin/bash
# =========================================
# BCA Scraper - Download Script
# Generated from: ${baseUrl}
# =========================================

set -e

echo "🚀 Downloading BCA Scraper files..."

# Buat direktori
INSTALL_DIR="/root/bca-scraper"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Backup config.env jika ada
if [ -f "config.env" ]; then
    echo "📦 Backing up existing config.env..."
    cp config.env config.env.backup
fi

# Download semua file
BASE_URL="${baseUrl}/vps-scraper-template"
TIMESTAMP=$(date +%s)

echo "📥 Downloading core files..."
curl -sL "$BASE_URL/bca-scraper.js?v=$TIMESTAMP" -o bca-scraper.js
curl -sL "$BASE_URL/scheduler.js?v=$TIMESTAMP" -o scheduler.js
curl -sL "$BASE_URL/run.sh?v=$TIMESTAMP" -o run.sh
curl -sL "$BASE_URL/install.sh?v=$TIMESTAMP" -o install.sh
curl -sL "$BASE_URL/install-service.sh?v=$TIMESTAMP" -o install-service.sh

echo "📥 Downloading config templates..."
curl -sL "$BASE_URL/config.env.template?v=$TIMESTAMP" -o config.env.template
curl -sL "$BASE_URL/bca-scraper.service?v=$TIMESTAMP" -o bca-scraper.service
curl -sL "$BASE_URL/logrotate-bca-scraper?v=$TIMESTAMP" -o logrotate-bca-scraper

echo "📥 Downloading VPN scripts..."
curl -sL "$BASE_URL/setup-openvpn.sh?v=$TIMESTAMP" -o setup-openvpn.sh
curl -sL "$BASE_URL/setup-split-tunnel.sh?v=$TIMESTAMP" -o setup-split-tunnel.sh
curl -sL "$BASE_URL/vpn-up.sh?v=$TIMESTAMP" -o vpn-up.sh
curl -sL "$BASE_URL/vpn-down.sh?v=$TIMESTAMP" -o vpn-down.sh

echo "📥 Downloading documentation..."
curl -sL "$BASE_URL/README.md?v=$TIMESTAMP" -o README.md
curl -sL "$BASE_URL/README.txt?v=$TIMESTAMP" -o README.txt
curl -sL "$BASE_URL/README-OPENVPN.md?v=$TIMESTAMP" -o README-OPENVPN.md

# Set permissions
echo "🔧 Setting permissions..."
chmod +x run.sh install.sh install-service.sh
chmod +x setup-openvpn.sh setup-split-tunnel.sh vpn-up.sh vpn-down.sh

# Restore config.env backup atau buat baru
if [ -f "config.env.backup" ]; then
    echo "♻️  Restoring config.env from backup..."
    mv config.env.backup config.env
elif [ ! -f "config.env" ]; then
    echo "📝 Creating config.env from template..."
    cp config.env.template config.env
    ${secretKey ? `sed -i 's|SECRET_KEY=.*|SECRET_KEY=${secretKey}|' config.env` : '# Edit config.env dengan secret key Anda'}
    sed -i 's|WEBHOOK_URL=.*|WEBHOOK_URL=${webhookUrl}|' config.env
fi

echo ""
echo "✅ Download selesai!"
echo ""
echo "📂 Files downloaded to: $INSTALL_DIR"
echo ""
echo "🔧 Langkah selanjutnya:"
echo "   1. Edit config.env dengan kredensial Anda"
echo "   2. Jalankan: sudo ./install-service.sh"
echo "   3. Cek status: sudo systemctl status bca-scraper"
echo ""
`;

  const quickInstallScript = `cd /root && curl -sL "${baseUrl}/vps-scraper-template/install.sh?v=$(date +%s)" | bash`;

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Script berhasil disalin ke clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Terminal className="h-4 w-4" />
          Download VPS Scripts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download VPS Scraper Scripts
          </DialogTitle>
          <DialogDescription>
            Copy script di bawah dan paste ke terminal VPS Anda untuk mendownload semua file scraper.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="full" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="full">Script Lengkap</TabsTrigger>
            <TabsTrigger value="quick">Quick Install</TabsTrigger>
          </TabsList>

          <TabsContent value="full" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Script ini akan mendownload semua file ke <code>/root/bca-scraper</code>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(downloadScript, "full")}
                className="gap-2"
              >
                {copied === "full" ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Script
                  </>
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-muted rounded-lg p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
                {downloadScript}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="quick" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-500">
                  ⚠️ Quick install akan langsung menjalankan installer. Pastikan Anda sudah memiliki config.env yang dikonfigurasi.
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">One-liner untuk quick install:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(quickInstallScript, "quick")}
                    className="gap-2"
                  >
                    {copied === "quick" ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <code className="text-sm font-mono text-foreground break-all">
                    {quickInstallScript}
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Setelah download:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Edit <code>config.env</code> dengan kredensial BCA Anda</li>
                  <li>Jalankan <code>sudo ./install-service.sh</code></li>
                  <li>Cek status: <code>sudo systemctl status bca-scraper</code></li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
