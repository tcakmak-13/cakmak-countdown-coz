import { motion } from 'framer-motion';
import { useCountdown } from '@/hooks/useCountdown';

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="countdown-digit text-4xl sm:text-7xl md:text-8xl font-bold text-gradient-orange"
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-widest mt-2">
        {label}
      </span>
    </div>
  );
}

export default function YKSCountdown({ compact = false }: { compact?: boolean }) {
  const { days, hours, minutes, seconds } = useCountdown();

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-1">
          <span className="countdown-digit text-2xl font-bold text-primary">{days}</span>
          <span className="text-xs text-muted-foreground">gün</span>
        </div>
        <span className="text-muted-foreground">:</span>
        <div className="flex items-baseline gap-1">
          <span className="countdown-digit text-2xl font-bold text-primary">
            {String(hours).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">saat</span>
        </div>
        <span className="text-muted-foreground">:</span>
        <div className="flex items-baseline gap-1">
          <span className="countdown-digit text-2xl font-bold text-primary">
            {String(minutes).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">dk</span>
        </div>
        <span className="text-muted-foreground">:</span>
        <div className="flex items-baseline gap-1">
          <span className="countdown-digit text-2xl font-bold text-primary">
            {String(seconds).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">sn</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-12">
      <CountdownUnit value={days} label="Gün" />
      <div className="text-4xl sm:text-6xl text-primary font-light">:</div>
      <CountdownUnit value={hours} label="Saat" />
      <div className="text-4xl sm:text-6xl text-primary font-light">:</div>
      <CountdownUnit value={minutes} label="Dakika" />
      <div className="text-4xl sm:text-6xl text-primary font-light">:</div>
      <CountdownUnit value={seconds} label="Saniye" />
    </div>
  );
}
