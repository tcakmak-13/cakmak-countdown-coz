import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Plus, Smartphone, MoreVertical, Chrome, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import AppLogo from '@/components/AppLogo';

export default function InstallBanner() {
  const { isInstallable, isInstalled, isIOS, isAndroid, showIOSInstructions, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    if (isInstallable) {
      const success = await promptInstall();
      if (success) setDismissed(true);
    } else {
      // Show platform-specific instructions
      setShowModal(true);
    }
  };

  if (isInstalled || dismissed) return null;
  if (!isInstallable && !showIOSInstructions && !isAndroid) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(249,115,22,0.12)] relative overflow-hidden">
            {/* Subtle animated gradient border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 via-transparent to-primary/10 animate-pulse pointer-events-none" />
            
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-secondary transition-colors z-10"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-3 relative z-10">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/20">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm text-foreground">
                  📲 Uygulamayı Yükle
                </h3>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  Ana ekranına ekle, uygulama gibi kullan — ücretsiz!
                </p>
              </div>
              <Button
                onClick={handleInstall}
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-primary to-orange-600 text-primary-foreground shrink-0 shadow-lg"
              >
                <Download className="h-4 w-4" />
                Yükle
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Platform-specific Install Instructions Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl mb-4"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <AppLogo size="sm" />
                  </div>
                  <h3 className="font-display font-bold text-lg">
                    {isIOS ? "iPhone'a Yükle" : 'Telefona Yükle'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {isIOS ? (
                <IOSInstructions />
              ) : (
                <AndroidInstructions />
              )}

              <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Uygulama ücretsizdir, mağaza indirmesi gerekmez. 
                    Doğrudan tarayıcınızdan yüklenir ve gerçek bir uygulama gibi çalışır.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setShowModal(false)}
                className="w-full mt-5 bg-gradient-to-r from-primary to-orange-600 text-primary-foreground hover:opacity-90"
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

function IOSInstructions() {
  return (
    <div className="space-y-3">
      <StepCard step={1} title="Safari'de Paylaş butonuna dokun" icon={<Share className="h-3.5 w-3.5" />} subtitle="Ekranın alt kısmındaki paylaş ikonu" />
      <StepCard step={2} title="'Ana Ekrana Ekle' seçeneğini bul" icon={<Plus className="h-3.5 w-3.5" />} subtitle="Listede aşağı kaydırarak bulun" />
      <StepCard step={3} title="'Ekle' butonuna dokun" subtitle="Uygulama ana ekranınıza eklenecek ✨" />
    </div>
  );
}

function AndroidInstructions() {
  return (
    <div className="space-y-3">
      <StepCard step={1} title="Chrome menüsünü açın" icon={<MoreVertical className="h-3.5 w-3.5" />} subtitle="Sağ üst köşedeki üç nokta (⋮) ikonuna dokunun" />
      <StepCard step={2} title="'Ana ekrana ekle' seçeneğini bulun" icon={<Plus className="h-3.5 w-3.5" />} subtitle="Menüde 'Ana ekrana ekle' veya 'Uygulamayı yükle' yazacaktır" />
      <StepCard step={3} title="'Yükle' butonuna dokunun" subtitle="Uygulama ana ekranınıza eklenecek ✨" />
    </div>
  );
}

function StepCard({ step, title, subtitle, icon }: { step: number; title: string; subtitle: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-sm font-bold text-primary">{step}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          {icon} {subtitle}
        </p>
      </div>
    </div>
  );
}
