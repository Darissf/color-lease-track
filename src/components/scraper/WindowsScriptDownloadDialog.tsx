import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Terminal, Monitor, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface WindowsScriptDownloadDialogProps {
  webhookUrl: string;
  secretKey?: string;
}

export function WindowsScriptDownloadDialog({ webhookUrl, secretKey }: WindowsScriptDownloadDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Direct download from public folder (bypasses edge function)
  const baseUrl = "https://132e95d2-c3e7-435a-8b4e-be3ead18be0b.lovableproject.com/windows-scraper-template";

  // PowerShell download script - direct from public folder (Desktop location)
  const downloadScript = `# BCA Scraper Windows - Download Script (Latest Version)
# Download langsung dari repository (selalu versi terbaru)
# Folder akan dibuat di Desktop agar mudah ditemukan

$scraperDir = "$env:USERPROFILE\\Desktop\\bca-scraper"
New-Item -ItemType Directory -Force -Path $scraperDir | Out-Null
Set-Location $scraperDir

$baseUrl = "${baseUrl}"
$v = Get-Date -UFormat %s

# Download semua files
$files = @("bca-scraper-windows.js", "config.env.template", "install-windows.bat", "run-windows.bat", "setup-autostart.bat", "README-WINDOWS.md")
foreach ($file in $files) {
    Invoke-WebRequest -Uri "$baseUrl/$file?v=$v" -OutFile $file
    Write-Host "[OK] Downloaded: $file"
}

# Create config.env dengan secret key
Copy-Item "config.env.template" "config.env" -Force
(Get-Content "config.env") -replace "SECRET_KEY=YOUR_SECRET_KEY_HERE", "SECRET_KEY=${secretKey || 'YOUR_SECRET_KEY_HERE'}" | Set-Content "config.env"
Write-Host "[OK] Created config.env"

Write-Host ""
Write-Host "Download complete! Next steps:"
Write-Host "1. Edit config.env dengan BCA credentials"
Write-Host "2. Jalankan install-windows.bat"
Write-Host "3. Jalankan run-windows.bat"`;

  // Quick update script - only main scraper file (Desktop location)
  const quickUpdateScript = `# Quick Update bca-scraper-windows.js (Latest Version)
$v = Get-Date -UFormat %s
cd "$env:USERPROFILE\\Desktop\\bca-scraper"
Invoke-WebRequest -Uri "${baseUrl}/bca-scraper-windows.js?v=$v" -OutFile "bca-scraper-windows.js"
Write-Host "[OK] Updated bca-scraper-windows.js to latest version!"`;

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Script disalin ke clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Monitor className="h-4 w-4" />
          PowerShell Script
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-500" />
            Windows PowerShell Scripts
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="update" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="update" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Quick Update
            </TabsTrigger>
            <TabsTrigger value="full" className="gap-2">
              <Terminal className="h-4 w-4" />
              Full Download
            </TabsTrigger>
          </TabsList>

          <TabsContent value="update" className="flex-1 overflow-auto mt-4 space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Update hanya file <code className="bg-blue-500/20 px-1 rounded">bca-scraper-windows.js</code> ke versi terbaru.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">PowerShell One-liner</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(quickUpdateScript, "update")}
                  className="gap-2"
                >
                  {copied === "update" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied === "update" ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <code className="text-xs font-mono text-foreground whitespace-pre-wrap">{quickUpdateScript}</code>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="full" className="flex-1 overflow-auto mt-4 space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-sm text-primary">
                Jalankan script ini di PowerShell untuk download semua file Windows scraper.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">PowerShell Download Script</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(downloadScript, "full")}
                  className="gap-2"
                >
                  {copied === "full" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied === "full" ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4 max-h-64 overflow-auto">
                <code className="text-xs font-mono text-foreground whitespace-pre-wrap">{downloadScript}</code>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
