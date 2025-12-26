import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Loader2, Save, TestTube, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';

export const WhatsAppConfigForm = () => {
  const { settings, loading, saveSettings, testConnection, fetchSettings } = useWhatsAppSettings();
  const [formData, setFormData] = useState({
    is_active: false,
    auto_retry_enabled: true,
    max_retry_attempts: 3,
    retry_delay_minutes: 5,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Auto-refresh settings when component mounts
  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData({
        is_active: settings.is_active || false,
        auto_retry_enabled: settings.auto_retry_enabled || true,
        max_retry_attempts: settings.max_retry_attempts || 3,
        retry_delay_minutes: settings.retry_delay_minutes || 5,
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

  return (
    <div className="space-y-6">
      {/* Meta Cloud API Info */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Meta Cloud API</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Sistem ini menggunakan Meta Cloud API (Official WhatsApp Business API) untuk mengirim notifikasi.
              Konfigurasi API dapat dilakukan di tab "Meta Cloud".
            </p>
          </div>
        </div>
      </Card>

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
          <div className="mt-3">
            <p className="text-xs text-red-500">{settings.error_message}</p>
          </div>
        )}
      </Card>

      {/* Configuration Form */}
      <div className="space-y-4">
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

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="auto_retry">Auto Retry Jika Gagal</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Otomatis mencoba ulang jika pengiriman gagal
            </p>
          </div>
          <Switch
            id="auto_retry"
            checked={formData.auto_retry_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, auto_retry_enabled: checked })}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleTest}
          disabled={isTesting}
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
          disabled={isSaving}
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
