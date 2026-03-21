import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flag, Coffee, Zap, Timer, Plus, Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PERSIST_KEY = 'study-room-state';
const PERSIST_KEY = 'study-room-state';

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatMM(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(m)}:${pad(s)}`;
}

type Mode = 'stopwatch' | 'pomodoro' | 'custom';

// ── Stopwatch persistence ──
interface StopwatchState {
  elapsed: number;
  startedAt: number | null;
  laps: number[];
}

function loadSW(): StopwatchState {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        elapsed: typeof p.elapsed === 'number' ? p.elapsed : 0,
        startedAt: typeof p.startedAt === 'number' ? p.startedAt : null,
        laps: Array.isArray(p.laps) ? p.laps : [],
      };
    }
  } catch {}
  return { elapsed: 0, startedAt: null, laps: [] };
}
function saveSW(s: StopwatchState) { localStorage.setItem(PERSIST_KEY, JSON.stringify(s)); }

// ── Pomodoro presets ──
const POM_PRESETS = [
  { label: '25 / 5', work: 25, brk: 5 },
  { label: '50 / 10', work: 50, brk: 10 },
  { label: '90 / 15', work: 90, brk: 15 },
];

// ── Custom periods ──
interface CustomPeriod {
  id: string;
  name: string;
  workMin: number;
  breakMin: number;
}

function loadCustomPeriods(): CustomPeriod[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PERIODS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function saveCustomPeriods(p: CustomPeriod[]) { localStorage.setItem(CUSTOM_PERIODS_KEY, JSON.stringify(p)); }

export default function StudyRoom() {
  const [mode, setMode] = useState<Mode>('stopwatch');

  // ═══ STOPWATCH ═══
  const swSaved = useRef(loadSW());
  const [swRunning, setSwRunning] = useState(swSaved.current.startedAt !== null);
  const [swElapsed, setSwElapsed] = useState(() => {
    const s = swSaved.current;
    return s.startedAt ? s.elapsed + Math.floor((Date.now() - s.startedAt) / 1000) : s.elapsed;
  });
  const [laps, setLaps] = useState<number[]>(swSaved.current.laps);
  const swRef = useRef(swElapsed);
  const swInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const swStart = useCallback(() => {
    if (swInterval.current) return;
    const base = swRef.current;
    const start = Date.now();
    saveSW({ elapsed: base, startedAt: start, laps });
    setSwRunning(true);
    swInterval.current = setInterval(() => {
      const next = base + Math.floor((Date.now() - start) / 1000);
      swRef.current = next;
      setSwElapsed(next);
    }, 250);
  }, [laps]);

  const swPause = useCallback(() => {
    if (swInterval.current) { clearInterval(swInterval.current); swInterval.current = null; }
    setSwRunning(false);
    saveSW({ elapsed: swRef.current, startedAt: null, laps });
  }, [laps]);

  const swReset = useCallback(() => {
    if (swInterval.current) { clearInterval(swInterval.current); swInterval.current = null; }
    setSwRunning(false);
    swRef.current = 0;
    setSwElapsed(0);
    setLaps([]);
    saveSW({ elapsed: 0, startedAt: null, laps: [] });
  }, []);

  const swLap = useCallback(() => {
    setLaps(prev => {
      const next = [...prev, swRef.current];
      const s = loadSW();
      saveSW({ ...s, laps: next });
      return next;
    });
  }, []);

  useEffect(() => {
    if (swSaved.current.startedAt) swStart();
    return () => { if (swInterval.current) clearInterval(swInterval.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const s = loadSW(); saveSW({ ...s, laps }); }, [laps]);

  // ═══ POMODORO ═══
  const [pomPreset, setPomPreset] = useState(0);
  const [pomPhase, setPomPhase] = useState<'work' | 'break'>('work');
  const [pomRemaining, setPomRemaining] = useState(POM_PRESETS[0].work * 60);
  const [pomRunning, setPomRunning] = useState(false);
  const [pomSessions, setPomSessions] = useState(0);
  const pomInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pomRemainingRef = useRef(POM_PRESETS[0].work * 60);

  const pomStart = useCallback(() => {
    if (pomInterval.current) return;
    setPomRunning(true);
    pomInterval.current = setInterval(() => {
      const next = pomRemainingRef.current - 1;
      pomRemainingRef.current = next;
      setPomRemaining(next);
      if (next <= 0) {
        if (pomInterval.current) { clearInterval(pomInterval.current); pomInterval.current = null; }
        setPomRunning(false);
        setPomPhase(p => {
          if (p === 'work') {
            setPomSessions(s => s + 1);
            const brkSecs = POM_PRESETS[pomPreset].brk * 60;
            pomRemainingRef.current = brkSecs;
            setPomRemaining(brkSecs);
            toast.success('Mola zamanı! ☕');
            return 'break';
          } else {
            const workSecs = POM_PRESETS[pomPreset].work * 60;
            pomRemainingRef.current = workSecs;
            setPomRemaining(workSecs);
            toast.success('Çalışma zamanı! 🔥');
            return 'work';
          }
        });
      }
    }, 1000);
  }, [pomPreset]);

  const pomStop = useCallback(() => {
    if (pomInterval.current) { clearInterval(pomInterval.current); pomInterval.current = null; }
    setPomRunning(false);
  }, []);

  const pomReset = useCallback(() => {
    pomStop();
    setPomPhase('work');
    const secs = POM_PRESETS[pomPreset].work * 60;
    pomRemainingRef.current = secs;
    setPomRemaining(secs);
  }, [pomStop, pomPreset]);

  const changePreset = (idx: number) => {
    pomStop();
    setPomPreset(idx);
    setPomPhase('work');
    const secs = POM_PRESETS[idx].work * 60;
    pomRemainingRef.current = secs;
    setPomRemaining(secs);
  };

  const pomProgress = pomPhase === 'work'
    ? ((POM_PRESETS[pomPreset].work * 60 - pomRemaining) / (POM_PRESETS[pomPreset].work * 60)) * 100
    : ((POM_PRESETS[pomPreset].brk * 60 - pomRemaining) / (POM_PRESETS[pomPreset].brk * 60)) * 100;

  // ═══ CUSTOM PERIODS ═══
  const [customPeriods, setCustomPeriods] = useState<CustomPeriod[]>(loadCustomPeriods);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWork, setNewWork] = useState(45);
  const [newBreak, setNewBreak] = useState(10);
  const [activePeriod, setActivePeriod] = useState<CustomPeriod | null>(null);
  const [cpPhase, setCpPhase] = useState<'work' | 'break'>('work');
  const [cpRemaining, setCpRemaining] = useState(0);
  const [cpRunning, setCpRunning] = useState(false);
  const [cpSessions, setCpSessions] = useState(0);
  const cpInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const cpRemainingRef = useRef(0);

  const addCustomPeriod = () => {
    if (!newName.trim()) { toast.error('Periyot adı girin.'); return; }
    if (newWork < 1) { toast.error('Çalışma süresi en az 1 dk.'); return; }
    const period: CustomPeriod = { id: Date.now().toString(), name: newName.trim(), workMin: newWork, breakMin: newBreak };
    const updated = [...customPeriods, period];
    setCustomPeriods(updated);
    saveCustomPeriods(updated);
    setNewName('');
    setNewWork(45);
    setNewBreak(10);
    setShowAddForm(false);
    toast.success('Periyot kaydedildi!');
  };

  const deleteCustomPeriod = (id: string) => {
    const updated = customPeriods.filter(p => p.id !== id);
    setCustomPeriods(updated);
    saveCustomPeriods(updated);
    if (activePeriod?.id === id) {
      cpStopTimer();
      setActivePeriod(null);
    }
  };

  const selectPeriod = (p: CustomPeriod) => {
    cpStopTimer();
    setActivePeriod(p);
    setCpPhase('work');
    const secs = p.workMin * 60;
    cpRemainingRef.current = secs;
    setCpRemaining(secs);
    setCpSessions(0);
  };

  const cpStartTimer = useCallback(() => {
    if (cpInterval.current || !activePeriod) return;
    setCpRunning(true);
    cpInterval.current = setInterval(() => {
      const next = cpRemainingRef.current - 1;
      cpRemainingRef.current = next;
      setCpRemaining(next);
      if (next <= 0) {
        if (cpInterval.current) { clearInterval(cpInterval.current); cpInterval.current = null; }
        setCpRunning(false);
        setCpPhase(p => {
          if (p === 'work') {
            setCpSessions(s => s + 1);
            const brkSecs = activePeriod.breakMin * 60;
            cpRemainingRef.current = brkSecs;
            setCpRemaining(brkSecs);
            toast.success('Mola zamanı! ☕');
            return 'break';
          } else {
            const workSecs = activePeriod.workMin * 60;
            cpRemainingRef.current = workSecs;
            setCpRemaining(workSecs);
            toast.success('Çalışma zamanı! 🔥');
            return 'work';
          }
        });
      }
    }, 1000);
  }, [activePeriod]);

  const cpStopTimer = useCallback(() => {
    if (cpInterval.current) { clearInterval(cpInterval.current); cpInterval.current = null; }
    setCpRunning(false);
  }, []);

  const cpResetTimer = useCallback(() => {
    cpStopTimer();
    if (activePeriod) {
      setCpPhase('work');
      const secs = activePeriod.workMin * 60;
      cpRemainingRef.current = secs;
      setCpRemaining(secs);
    }
  }, [cpStopTimer, activePeriod]);

  const cpTotalSecs = activePeriod
    ? (cpPhase === 'work' ? activePeriod.workMin * 60 : activePeriod.breakMin * 60)
    : 1;
  const cpProgress = ((cpTotalSecs - cpRemaining) / cpTotalSecs) * 100;

  useEffect(() => () => {
    if (pomInterval.current) clearInterval(pomInterval.current);
    if (cpInterval.current) clearInterval(cpInterval.current);
  }, []);

  const lastLap = laps.length > 0 ? laps[laps.length - 1] : 0;
  const currentLapElapsed = swElapsed - lastLap;

  // ── Circular timer renderer ──
  const renderCircularTimer = (
    remaining: number,
    progress: number,
    phase: 'work' | 'break',
    isRunning: boolean
  ) => (
    <div className="relative w-52 h-52">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3.5" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke={phase === 'work' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
          strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          'font-mono text-4xl font-bold tabular-nums',
          isRunning && phase === 'work' ? 'text-primary' : isRunning ? 'text-muted-foreground' : 'text-foreground'
        )}>
          {formatMM(remaining)}
        </span>
        <div className={cn(
          'flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold',
          phase === 'work' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {phase === 'work' ? <Zap className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
          {phase === 'work' ? 'Çalışma' : 'Mola'}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Mode Tabs ── */}
      <div className="flex gap-1 p-1 rounded-2xl bg-secondary">
        {([
          { key: 'stopwatch' as Mode, icon: Timer, label: 'Kronometre' },
          { key: 'pomodoro' as Mode, icon: Coffee, label: 'Pomodoro' },
          { key: 'custom' as Mode, icon: Settings, label: 'Periyotlar' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all',
              mode === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════ STOPWATCH ═══════ */}
      {mode === 'stopwatch' && (
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative">
            <div className={cn(
              'w-52 h-52 rounded-full border-[3px] flex flex-col items-center justify-center transition-all duration-500',
              swRunning
                ? 'border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.15)]'
                : swElapsed > 0 ? 'border-muted-foreground/20' : 'border-border'
            )}>
              <span className={cn(
                'font-mono text-4xl font-bold tabular-nums tracking-tight',
                swRunning ? 'text-primary' : 'text-foreground'
              )}>
                {formatTime(swElapsed)}
              </span>
              {laps.length > 0 && (
                <span className="font-mono text-sm text-muted-foreground mt-1 tabular-nums">
                  Tur {laps.length + 1}: {formatTime(currentLapElapsed)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {swElapsed > 0 ? (
              swRunning ? (
                <button onClick={swLap} className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors" title="Tur">
                  <Flag className="h-5 w-5" />
                </button>
              ) : (
                <button onClick={swReset} className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors" title="Sıfırla">
                  <RotateCcw className="h-5 w-5" />
                </button>
              )
            ) : <div className="w-14 h-14" />}

            <button
              onClick={swRunning ? swPause : swStart}
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center font-bold transition-all shadow-lg active:scale-95',
                swRunning ? 'bg-muted-foreground/80 hover:bg-muted-foreground text-background' : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              )}
            >
              {swRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
            </button>

            {swElapsed > 0 && swRunning ? (
              <button onClick={swReset} className="w-14 h-14 rounded-full border-2 border-destructive/30 flex items-center justify-center text-destructive/60 hover:text-destructive hover:border-destructive/50 transition-colors" title="Sıfırla">
                <RotateCcw className="h-5 w-5" />
              </button>
            ) : !swRunning && swElapsed > 0 ? (
              <button onClick={swLap} className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors" title="Tur">
                <Flag className="h-5 w-5" />
              </button>
            ) : <div className="w-14 h-14" />}
          </div>

          {laps.length > 0 && (
            <div className="w-full max-w-xs mt-2 border border-border rounded-2xl overflow-hidden">
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
                  return (
                    <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground font-medium">{idx + 1}. Tur</span>
                      <span className="flex gap-6">
                        <span className="w-20 text-right font-mono tabular-nums text-foreground">{formatTime(lapTotal - prev)}</span>
                        <span className="w-20 text-right font-mono tabular-nums text-muted-foreground">{formatTime(lapTotal)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ POMODORO ═══════ */}
      {mode === 'pomodoro' && (
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="flex gap-2">
            {POM_PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => changePreset(i)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  pomPreset === i ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {renderCircularTimer(pomRemaining, pomProgress, pomPhase, pomRunning)}

          <div className="flex items-center gap-4">
            <button onClick={pomReset} className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={pomRunning ? pomStop : pomStart}
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center font-bold transition-all shadow-lg active:scale-95',
                pomRunning ? 'bg-muted-foreground/80 hover:bg-muted-foreground text-background' : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              )}
            >
              {pomRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
            </button>
            <div className="w-14 h-14" />
          </div>

          {pomSessions > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{pomSessions}</span> oturum tamamlandı
            </p>
          )}
        </div>
      )}

      {/* ═══════ CUSTOM PERIODS ═══════ */}
      {mode === 'custom' && (
        <div className="space-y-5">
          {/* Active period timer */}
          {activePeriod && (
            <div className="flex flex-col items-center gap-5 py-4">
              <p className="text-sm font-bold text-foreground">{activePeriod.name}</p>
              {renderCircularTimer(cpRemaining, cpProgress, cpPhase, cpRunning)}

              <div className="flex items-center gap-4">
                <button onClick={cpResetTimer} className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  onClick={cpRunning ? cpStopTimer : cpStartTimer}
                  className={cn(
                    'w-20 h-20 rounded-full flex items-center justify-center font-bold transition-all shadow-lg active:scale-95',
                    cpRunning ? 'bg-muted-foreground/80 hover:bg-muted-foreground text-background' : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  )}
                >
                  {cpRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
                </button>
                <div className="w-14 h-14" />
              </div>

              {cpSessions > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{cpSessions}</span> oturum tamamlandı
                </p>
              )}
            </div>
          )}

          {/* Saved periods list */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground px-1">Kayıtlı Periyotlar</h3>
            {customPeriods.length === 0 && !showAddForm && (
              <p className="text-xs text-muted-foreground px-1">Henüz özel periyot oluşturmadınız.</p>
            )}
            {customPeriods.map(p => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer',
                  activePeriod?.id === p.id ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-foreground/20'
                )}
                onClick={() => selectPeriod(p)}
              >
                <div>
                  <p className="text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.workMin} dk çalışma · {p.breakMin} dk mola</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCustomPeriod(p.id); }}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Add form */}
            {showAddForm ? (
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Periyot adı (ör: Matematik Maratonu)"
                  className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border-0"
                />
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Çalışma (dk)</label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={newWork}
                      onChange={e => setNewWork(Number(e.target.value))}
                      className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border-0"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Mola (dk)</label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={newBreak}
                      onChange={e => setNewBreak(Number(e.target.value))}
                      className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border-0"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addCustomPeriod}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-bold hover:text-foreground transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 text-sm font-bold transition-colors"
              >
                <Plus className="h-4 w-4" /> Yeni Periyot Oluştur
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
