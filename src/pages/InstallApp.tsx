import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Apple, Chrome, Share } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("Aplikasi berhasil diinstall!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.info("Gunakan menu browser untuk menginstall aplikasi");
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success("Terima kasih telah menginstall aplikasi!");
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-orange-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Sewa Scaffolding Bali
          </CardTitle>
          <CardDescription className="text-gray-600">
            Install aplikasi untuk akses lebih cepat
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Aplikasi Sudah Terinstall!
              </h3>
              <p className="text-gray-600 text-sm">
                Anda dapat membuka aplikasi dari home screen
              </p>
            </div>
          ) : (
            <>
              {/* Android Install Button */}
              {deferredPrompt && (
                <Button
                  onClick={handleInstallClick}
                  className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Install Sekarang
                </Button>
              )}

              {/* iOS Instructions */}
              {isIOS && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Apple className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">Cara Install di iPhone/iPad</h4>
                  </div>
                  <ol className="text-sm text-blue-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <span>Ketuk tombol <Share className="w-4 h-4 inline" /> Share di Safari</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <span>Scroll ke bawah dan ketuk "Add to Home Screen"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <span>Ketuk "Add" di pojok kanan atas</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Android Manual Instructions */}
              {isAndroid && !deferredPrompt && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Chrome className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">Cara Install di Android</h4>
                  </div>
                  <ol className="text-sm text-green-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <span>Ketuk menu ⋮ di pojok kanan atas Chrome</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <span>Pilih "Install app" atau "Add to Home screen"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <span>Ketuk "Install" untuk konfirmasi</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Desktop Instructions */}
              {!isIOS && !isAndroid && !deferredPrompt && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Chrome className="w-5 h-5 text-gray-600" />
                    <h4 className="font-semibold text-gray-800">Cara Install di Desktop</h4>
                  </div>
                  <ol className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <span>Klik ikon install di address bar browser</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <span>Atau klik menu ⋮ lalu "Install Sewa Scaffolding Bali"</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Features */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-gray-700 mb-3">Keuntungan Install:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Akses cepat dari home screen
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Bisa digunakan offline
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Tampilan fullscreen seperti native app
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Loading lebih cepat
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* Back to Home */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = '/'}
          >
            Kembali ke Beranda
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallApp;
