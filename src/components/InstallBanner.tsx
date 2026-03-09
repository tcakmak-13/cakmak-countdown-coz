import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export default function InstallBanner() {
  const { isInstallable, isInstalled, isIOS, showIOSInstructions, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Check if user already dismissed
  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      const success = await promptInstall();
      if (success) {
        setDismissed(true);
      }
    }
  };

  // Don't show if installed, dismissed, or not installable (and not iOS)
  if (isInstalled || dismissed) return null;
  if (!isInstallable && !showIOSInstructions) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-card/95 backdrop-blur-lg border border-primary/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-600/20 flex items-center justify-center shrink-0">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm text-foreground">
                  Uygulamayı Yükle
                </h3>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Ana ekranına ekle, uygulama gibi kullan
                </p>
              </div>
              <Button
                onClick={handleInstall}
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-primary to-orange-600 text-primary-foreground shrink-0"
              >
                <Download className="h-4 w-4" />
                Yükle
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* iOS Install Instructions Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl mb-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg">iOS'a Yükle</h3>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-2 rounded-full hover:bg-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Paylaş butonuna dokun</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Share className="h-3 w-3" /> Safari'nin alt çubuğunda
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">"Ana Ekrana Ekle" seç</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Plus className="h-3 w-3" /> Listeden bu seçeneği bul
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">"Ekle" butonuna dokun</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Uygulama ana ekranına eklenecek
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowIOSModal(false)}
                className="w-full mt-6 bg-gradient-to-r from-primary to-orange-600 text-primary-foreground"
              >
                Anladım
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
