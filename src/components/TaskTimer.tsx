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

const STORAGE_KEY = 'task-timer-state';

function getPersistedTimers(): Record<string, { elapsed: number; startedAt: number | null }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function persistTimer(taskId: string, elapsed: number, startedAt: number | null) {
  const timers = getPersistedTimers();
  if (startedAt === null && elapsed === 0) {
    delete timers[taskId];
  } else {
    timers[taskId] = { elapsed, startedAt };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
}

function getRestoredElapsed(taskId: string, dbElapsed: number): { elapsed: number; isRunning: boolean } {
  const timers = getPersistedTimers();
  const saved = timers[taskId];
  if (!saved) return { elapsed: dbElapsed, isRunning: false };
  if (saved.startedAt) {
    // Timer was running — calculate elapsed including background time
    const bgSeconds = Math.floor((Date.now() - saved.startedAt) / 1000);
    return { elapsed: saved.elapsed + bgSeconds, isRunning: true };
  }
  return { elapsed: Math.max(saved.elapsed, dbElapsed), isRunning: false };
}

interface Props {
  taskId?: string;
  disabled?: boolean;
  initialElapsed?: number;
  onElapsedChange?: (seconds: number) => void;
  onSave?: (seconds: number) => void;
}

export default function TaskTimer({ taskId, disabled, initialElapsed = 0, onElapsedChange, onSave }: Props) {
  const id = taskId || 'default';
  const restored = useRef(getRestoredElapsed(id, initialElapsed));
  const [elapsed, setElapsed] = useState(restored.current.elapsed);
  const [isRunning, setIsRunning] = useState(!disabled && restored.current.isRunning);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(restored.current.elapsed);

  // Sync from DB when not running and DB value changes
  useEffect(() => {
    if (!isRunning) {
      const timers = getPersistedTimers();
      const saved = timers[id];
      if (!saved || saved.startedAt === null) {
        setElapsed(initialElapsed);
        elapsedRef.current = initialElapsed;
      }
    }
  }, [initialElapsed, isRunning, id]);

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
    persistTimer(id, elapsedRef.current, null);
    onSave?.(elapsedRef.current);
  }, [onSave, id]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
    const startTime = Date.now();
    const baseElapsed = elapsedRef.current;
    persistTimer(id, baseElapsed, startTime);

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const next = baseElapsed + Math.floor((now - startTime) / 1000);
      elapsedRef.current = next;
      setElapsed(next);
    }, 1000);

    saveIntervalRef.current = setInterval(() => {
      onSave?.(elapsedRef.current);
    }, 30000);
  }, [onSave, id]);

  // Auto-start if restored as running
  useEffect(() => {
    if (isRunning && !intervalRef.current && !disabled) {
      const startTime = Date.now();
      const baseElapsed = elapsedRef.current;

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const next = baseElapsed + Math.floor((now - startTime) / 1000);
        elapsedRef.current = next;
        setElapsed(next);
      }, 1000);

      saveIntervalRef.current = setInterval(() => {
        onSave?.(elapsedRef.current);
      }, 30000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    stop();
    setElapsed(0);
    elapsedRef.current = 0;
    persistTimer(id, 0, null);
    onSave?.(0);
  }, [stop, onSave, id]);

  useEffect(() => {
    onElapsedChange?.(elapsed);
  }, [elapsed, onElapsedChange]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {/* Minimalist stopwatch display */}
      <span className={cn(
        'font-mono text-sm tabular-nums tracking-tight transition-colors',
        isRunning
          ? 'text-emerald-400'
          : elapsed > 0
            ? 'text-foreground'
            : 'text-muted-foreground/50'
      )}>
        {formatTime(elapsed)}
      </span>

      {/* Single control button */}
      {!disabled && (
        <div className="flex gap-0.5">
          {!isRunning ? (
            <button
              onClick={start}
              className="p-1 rounded-full text-muted-foreground hover:text-emerald-400 transition-colors"
              title="Başlat"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={stop}
              className="p-1 rounded-full text-emerald-400 hover:text-amber-400 transition-colors"
              title="Durdur"
            >
              <Pause className="h-3.5 w-3.5 fill-current" />
            </button>
          )}
          {elapsed > 0 && !isRunning && (
            <button
              onClick={reset}
              className="p-1 rounded-full text-muted-foreground/50 hover:text-foreground transition-colors"
              title="Sıfırla"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
