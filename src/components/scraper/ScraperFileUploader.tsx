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
import { toast } from "sonner";
import { Upload, Check, X, Loader2, FileCode, RefreshCw, CloudDownload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// List of files that should be in the scraper-files bucket
const SCRAPER_FILES = [
  { name: 'bca-scraper.js', description: 'Main BCA scraper script', required: true },
  { name: 'scheduler.js', description: 'Scheduler daemon script', required: true },
  { name: 'config.env.template', description: 'Configuration template', required: true },
  { name: 'install.sh', description: 'All-in-one installer', required: true },
  { name: 'run.sh', description: 'Manual run script', required: true },
  { name: 'install-service.sh', description: 'Systemd service installer', required: true },
  { name: 'bca-scraper.service', description: 'Systemd service file', required: true },
  { name: 'logrotate-bca-scraper', description: 'Log rotation config', required: false },
  { name: 'setup-openvpn.sh', description: 'OpenVPN setup script', required: false },
  { name: 'setup-split-tunnel.sh', description: 'Split tunnel setup', required: false },
  { name: 'vpn-up.sh', description: 'VPN up hook', required: false },
  { name: 'vpn-down.sh', description: 'VPN down hook', required: false },
  { name: 'README.md', description: 'Documentation (Markdown)', required: false },
  { name: 'README.txt', description: 'Documentation (Text)', required: false },
  { name: 'README-OPENVPN.md', description: 'VPN documentation', required: false },
];

interface FileStatus {
  name: string;
  exists: boolean;
  size?: number;
  lastModified?: string;
}

export function ScraperFileUploader() {
  const [open, setOpen] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const checkFileStatuses = async () => {
    setLoading(true);
    try {
      const { data: files, error } = await supabase.storage
        .from('scraper-files')
        .list();

      if (error) throw error;

      const statuses: FileStatus[] = SCRAPER_FILES.map(f => {
        const found = files?.find(sf => sf.name === f.name);
        return {
          name: f.name,
          exists: !!found,
          size: found?.metadata?.size,
          lastModified: found?.updated_at,
        };
      });

      setFileStatuses(statuses);
    } catch (err) {
      console.error('Error checking file statuses:', err);
      toast.error('Gagal mengecek status file');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetFileName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(targetFileName);
    try {
      // Delete existing file first (upsert)
      await supabase.storage
        .from('scraper-files')
        .remove([targetFileName]);

      // Upload new file
      const { error } = await supabase.storage
        .from('scraper-files')
        .upload(targetFileName, file, {
          cacheControl: '300',
          upsert: true,
        });

      if (error) throw error;

      toast.success(`${targetFileName} berhasil diupload!`);
      checkFileStatuses();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Gagal upload ${targetFileName}`);
    } finally {
      setUploading(null);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    let errorCount = 0;

    for (const file of Array.from(files)) {
      // Check if file name matches any expected file
      const matchedFile = SCRAPER_FILES.find(sf => sf.name === file.name);
      if (!matchedFile) {
        console.log(`Skipping ${file.name} - not in expected files list`);
        continue;
      }

      setUploading(file.name);
      try {
        // Delete existing file first
        await supabase.storage
          .from('scraper-files')
          .remove([file.name]);

        // Upload new file
        const { error } = await supabase.storage
          .from('scraper-files')
          .upload(file.name, file, {
            cacheControl: '300',
            upsert: true,
          });

        if (error) throw error;
        successCount++;
      } catch (err) {
        console.error(`Upload error for ${file.name}:`, err);
        errorCount++;
      }
    }

    setUploading(null);
    
    if (successCount > 0) {
      toast.success(`${successCount} file berhasil diupload!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} file gagal diupload`);
    }
    
    checkFileStatuses();
  };

  const getFileInfo = (fileName: string) => {
    return SCRAPER_FILES.find(f => f.name === fileName);
  };

  const handleSyncFromRepository = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-scraper-files');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`${data.successCount} file berhasil di-sync dari repository!`);
        if (data.errorCount > 0) {
          toast.warning(`${data.errorCount} file gagal di-sync`);
        }
        checkFileStatuses();
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Gagal sync file dari repository');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        checkFileStatuses();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Scraper Files
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Upload Scraper Files ke Storage
          </DialogTitle>
          <DialogDescription>
            Upload file-file scraper ke storage bucket agar bisa didownload dari VPS.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={checkFileStatuses}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={handleSyncFromRepository}
              disabled={syncing}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="h-4 w-4" />
              )}
              Sync dari Repository
            </Button>
            
            <label>
              <input
                type="file"
                multiple
                accept=".js,.sh,.md,.txt,.service,.env,.template"
                onChange={handleBulkUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2 cursor-pointer"
              >
                <span>
                  <Upload className="h-4 w-4" />
                  Upload Manual
                </span>
              </Button>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-2 mt-4">
          {SCRAPER_FILES.map((file) => {
            const status = fileStatuses.find(s => s.name === file.name);
            const isUploading = uploading === file.name;
            
            return (
              <div
                key={file.name}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  status?.exists 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : file.required 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-muted border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  {status?.exists ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className={`h-4 w-4 ${file.required ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
                  )}
                  <div>
                    <div className="font-mono text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {file.description}
                      {file.required && !status?.exists && (
                        <span className="text-red-600 dark:text-red-400 ml-2">(Required)</span>
                      )}
                      {status?.exists && status.size && (
                        <span className="ml-2">({(status.size / 1024).toFixed(1)} KB)</span>
                      )}
                    </div>
                  </div>
                </div>

                <label>
                  <input
                    type="file"
                    accept={file.name.endsWith('.js') ? '.js' : 
                            file.name.endsWith('.sh') ? '.sh' :
                            file.name.endsWith('.md') ? '.md' :
                            file.name.endsWith('.txt') ? '.txt' :
                            '*'}
                    onChange={(e) => handleFileUpload(e, file.name)}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button
                    variant={status?.exists ? "ghost" : "outline"}
                    size="sm"
                    asChild
                    disabled={isUploading}
                    className="cursor-pointer"
                  >
                    <span>
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
          <strong>Tip:</strong> Anda bisa upload file dari folder <code>public/vps-scraper-template/</code> di repository. 
          Pilih semua file yang diperlukan dengan "Upload Multiple Files".
        </div>
      </DialogContent>
    </Dialog>
  );
}
