import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, MessageCircle, Download, Monitor, Smartphone, X, Share, Plus } from 'lucide-react';
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useIsMobile } from '@/hooks/use-mobile';
import YKSCountdown from '@/components/YKSCountdown';

export default function Landing() {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, promptInstall } = useInstallPrompt();
  const isMobile = useIsMobile();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Determine if we should show install button
  // Show for: installable browsers OR iOS (which needs manual instructions)
  const shouldShowInstallButton = (isInstallable || isIOS) && !isInstalled;

  // Dynamic button text based on device
  const getInstallButtonText = () => {
    if (isIOS) return 'iPhone\'a Yükle';
    if (isMobile) return 'Telefona Yükle';
    return 'Bilgisayara Kur';
  };

  // Dynamic tooltip text
  const getTooltipText = () => {
    if (isIOS) return 'Safari ile Ana Ekrana Ekle';
    if (isMobile) return 'Ana ekranına ekle, uygulama gibi kullan';
    return 'Masaüstüne kısayol olarak ekle';
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    
    const success = await promptInstall();
    if (success) {
      toast({
        title: "Başarıyla Yüklendi! 🎉",
        description: "Uygulama ana ekranınıza eklendi.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/50 pt-safe">
        <div className="flex items-center gap-2">
          <AppLogo size="sm" />
          <span className="font-display text-xl font-bold tracking-tight">
            Çakmak<span className="text-primary">Koçluk</span>
          </span>
        </div>
        <Button
          onClick={() => navigate('/login')}
          className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90"
        >
          Giriş Yap
        </Button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
            <AppLogo size="xs" />
            YKS 2026'ya Hazır mısın?
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
            Hedefine{' '}
            <span className="text-gradient-orange">Birlikte</span>
            <br />
            Ulaşalım
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Kişiselleştirilmiş çalışma planı, birebir koçluk desteği ve canlı takip ile YKS'de fark yarat.
          </p>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="glass-card rounded-2xl p-6 sm:p-10 mb-12 shadow-orange relative z-10"
        >
          <p className="text-center text-sm text-muted-foreground mb-4 uppercase tracking-widest">
            YKS'ye Kalan Süre
          </p>
          <YKSCountdown />
          <p className="text-center text-xs text-muted-foreground mt-4">
            20 Haziran 2026 — 10:15
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative z-10 flex flex-col sm:flex-row items-center gap-3"
        >
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 text-lg px-8 py-6 h-auto shadow-orange"
          >
            Hemen Başla <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          {/* Cross-Browser Install Button */}
          {shouldShowInstallButton && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleInstall}
                    className="h-auto py-6 px-6 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
                  >
                    {isMobile || isIOS ? (
                      <Smartphone className="h-5 w-5 mr-2 group-hover:animate-bounce" />
                    ) : (
                      <Monitor className="h-5 w-5 mr-2 group-hover:animate-bounce" />
                    )}
                    <span className="text-lg">{getInstallButtonText()}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  side="bottom" 
                  className="bg-card border-primary/20"
                >
                  <p className="text-sm">{getTooltipText()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-4xl w-full relative z-10"
        >
          {[
            { icon: BookOpen, title: 'Kişisel Program', desc: 'Sana özel haftalık çalışma planı' },
            { icon: Clock, title: 'Canlı Takip', desc: 'İlerleme ve hedef kontrolü' },
            { icon: MessageCircle, title: 'Anlık İletişim', desc: 'Koçunla direkt mesajlaşma' },
          ].map((f, i) => (
            <div key={i} className="glass-card rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
              <f.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-display font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        © 2026 ÇakmakKoçluk. Tüm hakları saklıdır.
      </footer>

      {/* iOS Install Instructions Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-primary/20 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_40px_rgba(249,115,22,0.15)] mb-4 sm:mb-0"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <AppLogo size="sm" />
                  </div>
                  <h3 className="font-display font-bold text-lg">iPhone'a Yükle</h3>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Safari'de Paylaş butonuna dokun</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Share className="h-3.5 w-3.5" /> Ekranın alt kısmında
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">"Ana Ekrana Ekle" seçeneğini bul</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Plus className="h-3.5 w-3.5" /> Listede aşağı kaydır
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">"Ekle" butonuna dokun</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Uygulama ana ekranına eklenecek ✨
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowIOSModal(false)}
                className="w-full mt-6 bg-gradient-to-r from-primary to-orange-600 text-primary-foreground hover:opacity-90"
              >
                Anladım
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
