import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Flame, ArrowRight, BookOpen, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import YKSCountdown from "@/components/YKSCountdown";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
          <span className="font-display text-xl font-bold tracking-tight">
            Çakmak<span className="text-primary">Koçluk</span>
          </span>
        </div>
        <Button
          onClick={() => navigate("/login")}
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
            <Flame className="h-4 w-4" />
            YKS 2026'ya Hazır mısın?
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
            Hedefine <span className="text-gradient-orange">Birlikte</span>
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
          <p className="text-center text-sm text-muted-foreground mb-4 uppercase tracking-widest">YKS'ye Kalan Süre</p>
          <YKSCountdown />
          <p className="text-center text-xs text-muted-foreground mt-4">20 Haziran 2026 — 10:15</p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative z-10"
        >
          <Button
            size="lg"
            onClick={() => navigate("/login")}
            className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 text-lg px-8 py-6 h-auto shadow-orange"
          >
            Hemen Başla <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-4xl w-full relative z-10"
        >
          {[
            { icon: BookOpen, title: "Kişisel Program", desc: "Sana özel haftalık çalışma planı" },
            { icon: Clock, title: "Canlı Takip", desc: "İlerleme ve hedef kontrolü" },
            { icon: MessageCircle, title: "Anlık İletişim", desc: "Koçunla direkt mesajlaşma" },
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
    </div>
  );
}
