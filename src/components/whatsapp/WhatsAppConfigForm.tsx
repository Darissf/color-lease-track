import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Loader2, Save, TestTube, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Copy, Info } from 'lucide-react';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { useToast } from '@/hooks/use-toast';

export const WhatsAppConfigForm = () => {
  const { settings, loading, saveSettings, testConnection, fetchSettings } = useWhatsAppSettings();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    waha_api_url: '',
    waha_api_key: '',
    waha_session_name: 'default',
    is_active: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Berhasil',
      description: 'API Key berhasil disalin',
    });
  };

  // Auto-refresh settings when component mounts (in case settings were just saved)
  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData({
        waha_api_url: settings.waha_api_url || '',
        waha_api_key: settings.waha_api_key || '',
        waha_session_name: settings.waha_session_name || 'default',
        is_active: settings.is_active || false,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    await saveSettings(formData);
    setIsSaving(false);
  };

  const handleTest = async () => {
    setIsTesting(true);
    // Save first before testing to ensure latest config is in database
    const saved = await saveSettings(formData);
    if (saved) {
      await testConnection();
    }
    setIsTesting(false);
  };

  const getStatusIcon = () => {
    if (!settings?.connection_status || settings.connection_status === 'unknown') {
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
    if (settings.connection_status === 'connected') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (!settings?.connection_status || settings.connection_status === 'unknown') {
      return 'Belum dicek';
    }
    if (settings.connection_status === 'connected') {
      return 'Terhubung';
    }
    if (settings.connection_status === 'disconnected') {
      return 'Terputus';
    }
    return 'Error';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state - belum ada konfigurasi
  const isEmpty = !settings || !settings.waha_api_url;

  return (
    <div className="space-y-6">
      {/* WAHA Information Card - Always visible when settings exist */}
      {!isEmpty && settings && (
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Info className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">Informasi WAHA</h3>
              <p className="text-sm text-green-700 dark:text-green-300">Kredensial yang sudah terkonfigurasi</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">WAHA URL</p>
              <p className="font-mono text-sm">{settings.waha_api_url}</p>
            </div>

            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">API Key</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm flex-1 break-all">
                  {showApiKey ? settings.waha_api_key : '••••••••••••••••••••••••••••••••'}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(settings.waha_api_key)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Session Name</p>
              <p className="font-mono text-sm">{settings.waha_session_name}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Connection Status */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium">Status Koneksi</p>
              <p className="text-sm text-muted-foreground">{getStatusText()}</p>
            </div>
          </div>
          {settings?.last_connection_test && (
            <p className="text-xs text-muted-foreground">
              Terakhir dicek: {new Date(settings.last_connection_test).toLocaleString('id-ID')}
            </p>
          )}
        </div>
        {settings?.error_message && (
          <p className="text-xs text-red-500 mt-2">{settings.error_message}</p>
        )}
      </Card>

      {/* Configuration Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="waha_api_url">WAHA API URL</Label>
          <Input
            id="waha_api_url"
            placeholder="http://your-vps-ip:3000"
            value={formData.waha_api_url}
            onChange={(e) => setFormData({ ...formData, waha_api_url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            URL WAHA API di VPS Anda (contoh: http://123.45.67.89:3000)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waha_api_key">WAHA API Key</Label>
          <div className="relative">
            <Input
              id="waha_api_key"
              type={showApiKey ? 'text' : 'password'}
              placeholder="API Key dari WAHA"
              value={formData.waha_api_key}
              onChange={(e) => setFormData({ ...formData, waha_api_key: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            API key untuk autentikasi dengan WAHA (opsional, kosongkan jika tidak diset)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waha_session_name">WhatsApp Session Name</Label>
          <Input
            id="waha_session_name"
            placeholder="default"
            value={formData.waha_session_name}
            onChange={(e) => setFormData({ ...formData, waha_session_name: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Nama session WhatsApp di WAHA
          </p>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="is_active">Aktifkan Notifikasi WhatsApp</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Semua notifikasi otomatis akan dinonaktifkan jika OFF
            </p>
          </div>
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleTest}
          disabled={isTesting || !formData.waha_api_url}
          variant="outline"
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !formData.waha_api_url}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Simpan Konfigurasi
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
