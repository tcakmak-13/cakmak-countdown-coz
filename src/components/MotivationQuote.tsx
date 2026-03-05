import { useState, useEffect } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDailyQuote, getRandomQuote, Quote } from '@/lib/quotes';
import { motion, AnimatePresence } from 'framer-motion';

export default function MotivationQuote() {
  const [quote, setQuote] = useState<Quote>(getDailyQuote());
  const [adminOverride, setAdminOverride] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

  // Check for admin daily quote override
  useEffect(() => {
    supabase
      .from('coach_info')
      .select('daily_quote')
      .limit(1)
      .single()
      .then(({ data }) => {
        const dq = (data as any)?.daily_quote;
        if (dq && dq.trim().length > 0) {
          setAdminOverride(dq.trim());
        }
      });
  }, []);

  const handleRefresh = () => {
    if (adminOverride) return; // Don't allow refresh when admin has set a quote
    setSpinning(true);
    setTimeout(() => {
      setQuote(getRandomQuote());
      setSpinning(false);
    }, 300);
  };

  const displayText = adminOverride || quote.text;
  const displayAuthor = adminOverride ? 'Koçunuz' : quote.author;

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden border border-primary/10">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Motivasyon
          </h2>
          {!adminOverride && (
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
              title="Yeni söz"
            >
              <RefreshCw className={`h-4 w-4 transition-transform duration-300 ${spinning ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={displayText}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-base sm:text-lg italic leading-relaxed text-foreground/90 font-medium">
              "{displayText}"
            </p>
            <p className="text-sm text-muted-foreground mt-3 text-right">
              — {displayAuthor}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
