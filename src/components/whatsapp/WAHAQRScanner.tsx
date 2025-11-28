import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { SakuraConfetti } from '@/components/SakuraConfetti';

type SessionStatus = 'WORKING' | 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'FAILED' | 'UNKNOWN';

export const WAHAQRScanner = () => {
  const { toast } = useToast();
  const { settings } = useWhatsAppSettings();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'connected' | 'error' | 'needs-start'>('loading');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('UNKNOWN');
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const previousStatusRef = useRef<SessionStatus>('UNKNOWN');

  const checkSessionStatus = async () => {
    if (!settings?.waha_api_url || !settings?.waha_session_name) {
      setError('Konfigurasi WAHA belum lengkap. Silakan isi di tab Konfigurasi.');
      setStatus('error');
      return false;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('waha-session-control', {
        body: {
          action: 'status',
          sessionName: settings.waha_session_name
        }
      });

      if (invokeError) throw invokeError;
      
      const currentStatus = data.status as SessionStatus;
      const previousStatus = previousStatusRef.current;
      setSessionStatus(currentStatus);

      // If session is WORKING, already connected
      if (currentStatus === 'WORKING') {
        setStatus('connected');
        setQrCode(null);
        setAutoRefresh(false);
        
        // Show success notification only if status changed
        if (previousStatus !== 'WORKING' && previousStatus !== 'UNKNOWN') {
          toast({
            title: "🎉 WhatsApp Berhasil Terhubung!",
            description: "Session WhatsApp Anda sekarang aktif dan siap digunakan.",
          });
          setShowConfetti(true);
        }
        
        previousStatusRef.current = currentStatus;
        return false;
      }
      
      previousStatusRef.current = currentStatus;

      // If session is STOPPED, need to start first
      if (currentStatus === 'STOPPED') {
        setStatus('needs-start');
        setError('Session belum dimulai. Silakan klik "Start Session" di atas terlebih dahulu.');
        setAutoRefresh(false);
        return false;
      }

      // If session is SCAN_QR_CODE or STARTING, we can fetch QR
      if (currentStatus === 'SCAN_QR_CODE' || currentStatus === 'STARTING') {
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Error checking session:', err);
      setError(err.message || 'Gagal mengecek status session');
      setStatus('error');
      return false;
    }
  };

  const fetchQRCode = async () => {
    setStatus('loading');
    setError(null);

    // First check if session is in correct state
    const canFetchQR = await checkSessionStatus();
    if (!canFetchQR) return;

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('waha-session-control', {
        body: {
          action: 'get-qr',
          sessionName: settings.waha_session_name
        }
      });

      if (invokeError) throw invokeError;

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setStatus('ready');
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Error fetching QR:', err);
      setError(err.message || 'Gagal mengambil QR code');
      setStatus('error');
      setAutoRefresh(false);
    }
  };

  useEffect(() => {
    fetchQRCode();
  }, []);

  useEffect(() => {
    if (!autoRefresh || status === 'connected' || status === 'needs-start') return;

    const interval = setInterval(() => {
      fetchQRCode();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, status]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'loading':
        return (
          <Alert className="border-blue-500/20 bg-blue-500/5">
            <Clock className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-500">
              Memuat QR Code...
            </AlertDescription>
          </Alert>
        );
      case 'needs-start':
        return (
          <Alert className="border-yellow-500/20 bg-yellow-500/5">
            <Clock className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500">
              {error || 'Session belum dimulai. Klik "Start Session" di atas terlebih dahulu.'}
            </AlertDescription>
          </Alert>
        );
      case 'connected':
        return (
          <Alert className="border-green-500/20 bg-green-500/5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              WhatsApp sudah terhubung! Session aktif.
            </AlertDescription>
          </Alert>
        );
      case 'error':
        return (
          <Alert className="border-red-500/20 bg-red-500/5">
            <XCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-500">
              {error}
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {showConfetti && (
        <SakuraConfetti 
          trigger={showConfetti} 
          onComplete={() => setShowConfetti(false)}
          particleCount={50}
          duration={3000}
        />
      )}
      
      {getStatusDisplay()}

      {status === 'ready' && qrCode && (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Buka WhatsApp di ponsel Anda, lalu scan QR code di bawah ini
              </p>
            </div>

            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border-4 border-primary/20">
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 md:w-80 md:h-80"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>1. Buka WhatsApp di ponsel Anda</p>
              <p>2. Tap Menu atau Settings {'>'} Linked Devices</p>
              <p>3. Tap Link a Device</p>
              <p>4. Arahkan kamera ke QR code ini</p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>QR code akan diperbarui otomatis setiap 5 detik</span>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <Button 
          onClick={fetchQRCode} 
          disabled={status === 'loading' || status === 'needs-start'}
          className="flex-1"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`} />
          Refresh QR Code
        </Button>
        
        {status !== 'connected' && status !== 'needs-start' && (
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Stop' : 'Start'} Auto-Refresh
          </Button>
        )}
      </div>

      <Card className="p-4 bg-muted/50">
        <p className="text-sm font-medium mb-2">💡 Tips</p>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• QR code berlaku selama 60 detik sebelum expire</li>
          <li>• Pastikan WhatsApp di ponsel Anda terhubung ke internet</li>
          <li>• Gunakan ponsel yang sama dengan nomor WhatsApp yang akan digunakan</li>
          <li>• Setelah berhasil scan, status akan otomatis berubah menjadi "Connected"</li>
        </ul>
      </Card>
    </div>
  );
};
