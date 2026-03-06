import { useStopwatch, formatStopwatch } from '@/hooks/useStopwatch';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  disabled?: boolean;
  onElapsedChange?: (seconds: number) => void;
}

export default function TaskTimer({ disabled, onElapsedChange }: Props) {
  const { elapsed, isRunning, start, stop, reset } = useStopwatch();

  // Report elapsed changes up
  if (onElapsedChange) {
    // We use a ref-like approach via the parent re-render
    // The parent will read elapsed from the callback
  }

  return (
    <div className="flex items-center gap-2 mt-2.5">
      {/* Timer display */}
      <div className={cn(
        'font-mono text-sm font-bold px-3 py-1.5 rounded-xl transition-all',
        isRunning
          ? 'bg-primary/20 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]'
          : elapsed > 0
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-secondary text-muted-foreground'
      )}>
        {formatStopwatch(elapsed)}
      </div>

      {/* Controls */}
      {!disabled && (
        <div className="flex gap-1">
          {!isRunning ? (
            <button
              onClick={start}
              className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
              title="Başlat"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={stop}
              className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
              title="Durdur"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          )}
          {elapsed > 0 && !isRunning && (
            <button
              onClick={reset}
              className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Sıfırla"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
