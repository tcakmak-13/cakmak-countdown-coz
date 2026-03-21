import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERSIST_KEY = 'study-room-state';

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface PersistedState {
  elapsed: number;
  startedAt: number | null;
  laps: number[];
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { elapsed: 0, startedAt: null, laps: [] };
}

function save(state: PersistedState) {
  localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
}

export default function StudyRoom() {
  const saved = useRef(load());
  const [running, setRunning] = useState(saved.current.startedAt !== null);
  const [elapsed, setElapsed] = useState(() => {
    const s = saved.current;
    if (s.startedAt) return s.elapsed + Math.floor((Date.now() - s.startedAt) / 1000);
    return s.elapsed;
  });
  const [laps, setLaps] = useState<number[]>(saved.current.laps);

  const elapsedRef = useRef(elapsed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    const base = elapsedRef.current;
    const start = Date.now();
    save({ elapsed: base, startedAt: start, laps });
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const next = base + Math.floor((Date.now() - start) / 1000);
      elapsedRef.current = next;
      setElapsed(next);
    }, 250);
  }, [laps]);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
    save({ elapsed: elapsedRef.current, startedAt: null, laps });
  }, [laps]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
    elapsedRef.current = 0;
    setElapsed(0);
    setLaps([]);
    save({ elapsed: 0, startedAt: null, laps: [] });
  }, []);

  const addLap = useCallback(() => {
    setLaps(prev => {
      const next = [...prev, elapsedRef.current];
      const s = load();
      save({ ...s, elapsed: elapsedRef.current, startedAt: s.startedAt, laps: next });
      return next;
    });
  }, []);

  // Restore running timer on mount
  useEffect(() => {
    if (saved.current.startedAt) {
      startTimer();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep laps in sync for persist helpers
  useEffect(() => {
    const s = load();
    save({ ...s, laps });
  }, [laps]);

  const lastLapTime = laps.length > 0 ? laps[laps.length - 1] : 0;
  const currentLapElapsed = elapsed - lastLapTime;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Main display */}
      <div className="relative">
        <div className={cn(
          'w-56 h-56 rounded-full border-[3px] flex flex-col items-center justify-center transition-all duration-500',
          running
            ? 'border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.15)]'
            : elapsed > 0
              ? 'border-muted-foreground/20'
              : 'border-border'
        )}>
          <span className={cn(
            'font-mono text-4xl font-bold tabular-nums tracking-tight',
            running ? 'text-primary' : 'text-foreground'
          )}>
            {formatTime(elapsed)}
          </span>
          {laps.length > 0 && (
            <span className="font-mono text-sm text-muted-foreground mt-1 tabular-nums">
              Tur {laps.length + 1}: {formatTime(currentLapElapsed)}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Left button: Reset or Lap */}
        {elapsed > 0 ? (
          running ? (
            <button
              onClick={addLap}
              className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              title="Tur"
            >
              <Flag className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={resetTimer}
              className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              title="Sıfırla"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          )
        ) : (
          <div className="w-14 h-14" />
        )}

        {/* Center: Start / Pause */}
        <button
          onClick={running ? pauseTimer : startTimer}
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center font-bold text-lg transition-all shadow-lg active:scale-95',
            running
              ? 'bg-muted-foreground/80 hover:bg-muted-foreground text-background'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          )}
        >
          {running ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
        </button>

        {/* Right button: Lap (when running) */}
        {elapsed > 0 && running ? (
          <button
            onClick={resetTimer}
            className="w-14 h-14 rounded-full border-2 border-destructive/30 flex items-center justify-center text-destructive/60 hover:text-destructive hover:border-destructive/50 transition-colors"
            title="Sıfırla"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        ) : !running && elapsed > 0 ? (
          <button
            onClick={addLap}
            className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            title="Tur"
          >
            <Flag className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-14 h-14" />
        )}
      </div>

      {/* Laps list */}
      {laps.length > 0 && (
        <div className="w-full max-w-xs mt-2 space-y-0 border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Tur</span>
            <span className="flex gap-6">
              <span className="w-20 text-right">Tur Süresi</span>
              <span className="w-20 text-right">Toplam</span>
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-border">
            {[...laps].reverse().map((lapTotal, rIdx) => {
              const idx = laps.length - rIdx - 1;
              const prev = idx > 0 ? laps[idx - 1] : 0;
              const lapDuration = lapTotal - prev;
              return (
                <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground font-medium">{idx + 1}. Tur</span>
                  <span className="flex gap-6">
                    <span className="w-20 text-right font-mono tabular-nums text-foreground">{formatTime(lapDuration)}</span>
                    <span className="w-20 text-right font-mono tabular-nums text-muted-foreground">{formatTime(lapTotal)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
