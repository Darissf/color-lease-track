import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { SakuraConfetti } from '@/components/SakuraConfetti';

type SessionStatus = 'WORKING' | 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'FAILED' | 'UNKNOWN';

interface ErrorInfo {
  code: string;
  message: string;
  tips: string[];
}

export const WAHAQRScanner = () => {
  const { toast } = useToast();
  const { settings } = useWhatsAppSettings();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'connected' | 'error' | 'needs-start'>('loading');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('UNKNOWN');
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const previousStatusRef = useRef<SessionStatus>('UNKNOWN');
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getErrorInfo = (errorMessage: string): ErrorInfo => {
    const errorMappings: Record<string, ErrorInfo> = {
      'session not found': {
        code: 'SESSION_NOT_FOUND',
        message: 'Session tidak ditemukan',
        tips: [
          'Pastikan nama session di Konfigurasi sudah benar',
          'Coba klik "Start Session" di tab Session Manager',
          'Pastikan WAHA server berjalan dengan baik',
        ]
      },
      'connection refused': {
        code: 'CONNECTION_REFUSED',
        message: 'Koneksi ke WAHA server ditolak',
        tips: [
          'Periksa apakah WAHA server berjalan di VPS',
          'Pastikan URL WAHA benar (contoh: http://IP:3000)',
          'Cek firewall VPS apakah port 3000 terbuka',
          'Jalankan: docker ps untuk melihat status container',
        ]
      },
      'timeout': {
        code: 'TIMEOUT',
        message: 'Koneksi timeout',
        tips: [
          'Periksa koneksi internet Anda',
          'Pastikan VPS dapat diakses dari internet',
          'Cek resource VPS (CPU/Memory) tidak overload',
        ]
      },
      'unauthorized': {
        code: 'UNAUTHORIZED',
        message: 'API Key tidak valid',
        tips: [
          'Periksa API Key di Konfigurasi',
          'Pastikan API Key sesuai dengan yang di-set di WAHA',
          'Cek environment variable WHATSAPP_API_KEY di Docker',
        ]
      },
      'qr code not available': {
        code: 'QR_NOT_READY',
        message: 'QR Code belum tersedia',
        tips: [
          'Session sedang dalam proses starting',
          'Tunggu beberapa detik dan coba refresh',
          'Jika masih gagal, coba restart session',
        ]
      },
    };

    const lowerError = errorMessage.toLowerCase();
    for (const [key, info] of Object.entries(errorMappings)) {
      if (lowerError.includes(key)) {
        return info;
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: errorMessage,
      tips: [
        'Coba refresh QR Code',
        'Periksa log di VPS dengan: docker logs waha',
        'Restart container WAHA jika diperlukan',
        'Hubungi admin jika masalah berlanjut',
      ]
    };
  };

  const startRetryCountdown = (seconds: number) => {
    setRetryCountdown(seconds);
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
    }
    retryIntervalRef.current = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
          }
          fetchQRCode();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const checkSessionStatus = async () => {
    if (!settings?.waha_api_url || !settings?.waha_session_name) {
      setError(getErrorInfo('Konfigurasi WAHA belum lengkap. Silakan isi di tab Konfigurasi.'));
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

      if (currentStatus === 'WORKING') {
        setStatus('connected');
        setQrCode(null);
        setAutoRefresh(false);
        setError(null);
        
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

      if (currentStatus === 'STOPPED') {
        setStatus('needs-start');
        setError({
          code: 'SESSION_STOPPED',
          message: 'Session belum dimulai',
          tips: [
            'Klik "Start Session" di tab Session Manager',
            'Tunggu hingga status berubah menjadi "SCAN_QR_CODE"',
            'Kemudian kembali ke tab ini untuk scan QR',
          ]
        });
        setAutoRefresh(false);
        return false;
      }

      if (currentStatus === 'SCAN_QR_CODE' || currentStatus === 'STARTING') {
        setError(null);
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Error checking session:', err);
      setError(getErrorInfo(err.message || 'Gagal mengecek status session'));
      setStatus('error');
      return false;
    }
  };

  const fetchQRCode = async () => {
    setStatus('loading');
    setError(null);

    const canFetchQR = await checkSessionStatus();
    if (!canFetchQR) return;

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('waha-session-control', {
        body: {
          action: 'get-qr',
          sessionName: settings?.waha_session_name
        }
      });

      if (invokeError) throw invokeError;

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setStatus('ready');
        setError(null);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Error fetching QR:', err);
      const errorInfo = getErrorInfo(err.message || 'Gagal mengambil QR code');
      setError(errorInfo);
      setStatus('error');
      setAutoRefresh(false);
      
      // Auto-retry after 10 seconds for recoverable errors
      if (['QR_NOT_READY', 'TIMEOUT'].includes(errorInfo.code)) {
        startRetryCountdown(10);
      }
    }
  };

  useEffect(() => {
    fetchQRCode();
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
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
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-600">Session Belum Aktif</AlertTitle>
            <AlertDescription className="text-yellow-600 mt-2">
              {error?.message || 'Session belum dimulai.'}
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
            <AlertTitle className="text-red-600">Error: {error?.code}</AlertTitle>
            <AlertDescription className="text-red-600 mt-2">
              {error?.message}
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

      {/* Troubleshooting Tips for Errors */}
      {error && error.tips.length > 0 && status !== 'connected' && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="tips" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Troubleshooting Tips</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ul className="space-y-2">
                {error.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-bold">{idx + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Auto-retry countdown */}
      {retryCountdown > 0 && (
        <Alert className="border-blue-500/20 bg-blue-500/5">
          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
          <AlertDescription className="text-blue-500">
            Mencoba ulang dalam {retryCountdown} detik...
          </AlertDescription>
        </Alert>
      )}

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
          onClick={() => {
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current);
              setRetryCountdown(0);
            }
            fetchQRCode();
          }} 
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
          <li>• Jika gagal terus, coba restart session di tab Session Manager</li>
        </ul>
      </Card>
    </div>
  );
};
