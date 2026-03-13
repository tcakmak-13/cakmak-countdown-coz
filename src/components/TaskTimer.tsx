import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface Props {
  disabled?: boolean;
  initialElapsed?: number;
  onElapsedChange?: (seconds: number) => void;
  onSave?: (seconds: number) => void;
}

export default function TaskTimer({ disabled, initialElapsed = 0, onElapsedChange, onSave }: Props) {
  const [elapsed, setElapsed] = useState(initialElapsed);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(initialElapsed);

  useEffect(() => {
    if (!isRunning) {
      setElapsed(initialElapsed);
      elapsedRef.current = initialElapsed;
    }
  }, [initialElapsed, isRunning]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
    setIsRunning(false);
    onSave?.(elapsedRef.current);
  }, [onSave]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    saveIntervalRef.current = setInterval(() => {
      onSave?.(elapsedRef.current);
    }, 30000);
  }, [onSave]);

  const reset = useCallback(() => {
    stop();
    setElapsed(0);
    elapsedRef.current = 0;
    onSave?.(0);
  }, [stop, onSave]);

  useEffect(() => {
    onElapsedChange?.(elapsed);
  }, [elapsed, onElapsedChange]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Turquoise digital display */}
      <div className={cn(
        'font-mono text-sm sm:text-base font-extrabold tracking-wider px-3 py-2 rounded-xl border transition-all',
        isRunning
          ? 'bg-[hsl(175,80%,40%)]/20 border-[hsl(175,80%,50%)]/50 text-[hsl(175,80%,55%)] shadow-[0_0_18px_hsl(175,80%,50%,0.4)] animate-pulse'
          : elapsed > 0
            ? 'bg-[hsl(175,80%,40%)]/10 border-[hsl(175,80%,40%)]/30 text-[hsl(175,80%,50%)] shadow-[0_0_12px_hsl(175,80%,50%,0.25)]'
            : 'bg-[hsl(175,80%,40%)]/5 border-[hsl(175,80%,40%)]/15 text-[hsl(175,80%,50%)]/60'
      )}>
        ⏱ {formatTime(elapsed)}
      </div>

      {/* Controls */}
      {!disabled && (
        <div className="flex gap-1">
          {!isRunning ? (
            <button
              onClick={start}
              className="p-1.5 rounded-lg bg-[hsl(175,80%,40%)]/15 text-[hsl(175,80%,50%)] hover:bg-[hsl(175,80%,40%)]/25 transition-colors"
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
