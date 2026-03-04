import { useState } from 'react';
import { Award, Trophy, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CoachInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full glass-card rounded-xl p-4 flex items-center justify-between border border-primary/20 hover:border-primary/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange">
            <Award className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold">Koçumun Bilgileri</span>
        </div>
        <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-xl p-5 mt-3 border border-primary/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">Talha Çakmak</h3>
                  <p className="text-xs text-muted-foreground">YKS Koçu • tcakmak1355</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary rounded-lg p-3 text-center border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">YKS Sıralaması</p>
                  <p className="font-display text-xl font-bold text-primary mt-1">Top 1000</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">TYT Net</p>
                  <p className="font-display text-xl font-bold text-primary mt-1">112.5</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center border border-border col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">AYT Net</p>
                  <p className="font-display text-xl font-bold text-primary mt-1">75.25</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
