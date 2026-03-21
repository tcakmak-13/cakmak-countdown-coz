import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Zap, Save, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import SearchableCombobox from '@/components/SearchableCombobox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import tytMufredat from '@/data/tyt_mufredat.json';
import aytMufredat from '@/data/ayt_mufredat.json';

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

type Mode = 'stopwatch' | 'pomodoro';

const POMODORO_PRESETS = [
  { label: '25 / 5', work: 25, break: 5 },
  { label: '50 / 10', work: 50, break: 10 },
  { label: '90 / 15', work: 90, break: 15 },
];

const PERSIST_KEY = 'study-room-state';

function getPersistedState() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

interface Props {
  studentId: string;
}

export default function StudyRoom({ studentId }: Props) {
  const [mode, setMode] = useState<Mode>('stopwatch');

  // Stopwatch state
  const [swElapsed, setSwElapsed] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const swRef = useRef(0);
  const swInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pomodoro state
  const [pomPreset, setPomPreset] = useState(0);
  const [pomPhase, setPomPhase] = useState<'work' | 'break'>('work');
  const [pomRemaining, setPomRemaining] = useState(POMODORO_PRESETS[0].work * 60);
  const [pomRunning, setPomRunning] = useState(false);
  const [pomSessions, setPomSessions] = useState(0);
  const [pomTotalWork, setPomTotalWork] = useState(0);
  const pomInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pomRemainingRef = useRef(POMODORO_PRESETS[0].work * 60);
  const pomTotalWorkRef = useRef(0);

  // Save dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveSeconds, setSaveSeconds] = useState(0);
  const [saveExamType, setSaveExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [saveSubject, setSaveSubject] = useState('');
  const [saving, setSaving] = useState(false);

  // Restore persisted state
  useEffect(() => {
    const saved = getPersistedState();
    if (!saved) return;
    if (saved.mode === 'stopwatch' && saved.swStartedAt) {
      const bg = Math.floor((Date.now() - saved.swStartedAt) / 1000);
      const total = saved.swElapsed + bg;
      setSwElapsed(total);
      swRef.current = total;
      setSwRunning(true);
      setMode('stopwatch');
    } else if (saved.mode === 'stopwatch' && saved.swElapsed > 0) {
      setSwElapsed(saved.swElapsed);
      swRef.current = saved.swElapsed;
      setMode('stopwatch');
    }
    if (saved.pomTotalWork) {
      setPomTotalWork(saved.pomTotalWork);
      pomTotalWorkRef.current = saved.pomTotalWork;
    }
    if (saved.pomSessions) setPomSessions(saved.pomSessions);
  }, []);

  const persistState = useCallback((overrides?: any) => {
    const state = {
      mode,
      swElapsed: swRef.current,
      swStartedAt: swRunning ? Date.now() : null,
      pomTotalWork: pomTotalWorkRef.current,
      pomSessions,
      ...overrides,
    };
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state));
  }, [mode, swRunning, pomSessions]);

  // --- Stopwatch ---
  const swStart = useCallback(() => {
    if (swInterval.current) return;
    setSwRunning(true);
    const base = swRef.current;
    const start = Date.now();
    localStorage.setItem(PERSIST_KEY, JSON.stringify({
      mode: 'stopwatch', swElapsed: base, swStartedAt: start,
      pomTotalWork: pomTotalWorkRef.current, pomSessions,
    }));
    swInterval.current = setInterval(() => {
      const next = base + Math.floor((Date.now() - start) / 1000);
      swRef.current = next;
      setSwElapsed(next);
    }, 1000);
  }, [pomSessions]);

  const swStop = useCallback(() => {
    if (swInterval.current) { clearInterval(swInterval.current); swInterval.current = null; }
    setSwRunning(false);
    persistState({ swStartedAt: null, swElapsed: swRef.current });
    if (swRef.current > 0) {
      setSaveSeconds(swRef.current);
      setSaveOpen(true);
    }
  }, [persistState]);

  const swReset = useCallback(() => {
    if (swInterval.current) { clearInterval(swInterval.current); swInterval.current = null; }
    setSwRunning(false);
    setSwElapsed(0);
    swRef.current = 0;
    persistState({ swElapsed: 0, swStartedAt: null });
  }, [persistState]);

  // --- Pomodoro ---
  const pomStart = useCallback(() => {
    if (pomInterval.current) return;
    setPomRunning(true);
    pomInterval.current = setInterval(() => {
      setPomRemaining(prev => {
        const next = prev - 1;
        pomRemainingRef.current = next;
        if (next <= 0) {
          // Phase complete
          if (pomInterval.current) { clearInterval(pomInterval.current); pomInterval.current = null; }
          setPomRunning(false);

          setPomPhase(p => {
            if (p === 'work') {
              const workSecs = POMODORO_PRESETS[pomPreset].work * 60;
              pomTotalWorkRef.current += workSecs;
              setPomTotalWork(pomTotalWorkRef.current);
              setPomSessions(s => s + 1);
              // Auto switch to break
              const breakSecs = POMODORO_PRESETS[pomPreset].break * 60;
              setPomRemaining(breakSecs);
              pomRemainingRef.current = breakSecs;
              toast.success('Mola zamanı! ☕');
              return 'break';
            } else {
              // Break over, back to work
              const workSecs = POMODORO_PRESETS[pomPreset].work * 60;
              setPomRemaining(workSecs);
              pomRemainingRef.current = workSecs;
              toast.success('Çalışma zamanı! 🔥');
              return 'work';
            }
          });
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [pomPreset]);

  const pomStop = useCallback(() => {
    if (pomInterval.current) { clearInterval(pomInterval.current); pomInterval.current = null; }
    setPomRunning(false);
  }, []);

  const pomReset = useCallback(() => {
    pomStop();
    setPomPhase('work');
    const secs = POMODORO_PRESETS[pomPreset].work * 60;
    setPomRemaining(secs);
    pomRemainingRef.current = secs;
  }, [pomStop, pomPreset]);

  const pomSaveTotal = useCallback(() => {
    if (pomTotalWorkRef.current > 0) {
      setSaveSeconds(pomTotalWorkRef.current);
      setSaveOpen(true);
    }
  }, []);

  const changePreset = (idx: number) => {
    pomStop();
    setPomPreset(idx);
    setPomPhase('work');
    const secs = POMODORO_PRESETS[idx].work * 60;
    setPomRemaining(secs);
    pomRemainingRef.current = secs;
  };

  // --- Save to subject ---
  const handleSave = async () => {
    if (!saveSubject) { toast.error('Lütfen bir ders seçin.'); return; }
    setSaving(true);
    const minutes = Math.ceil(saveSeconds / 60);
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;

    const { error } = await supabase.from('study_tasks').insert({
      student_id: studentId,
      day_of_week: dow,
      week_start_date: weekStartStr,
      subject: saveSubject,
      topic: 'Serbest Çalışma',
      estimated_minutes: minutes,
      actual_minutes: minutes,
      completed: true,
      description: 'Çalışma Odası kronometresiyle kaydedildi',
    });

    if (error) {
      toast.error('Kayıt başarısız.');
    } else {
      toast.success(`${formatDuration(minutes)} ${saveSubject} dersine kaydedildi! ✅`);
      // Reset after save
      swReset();
      pomTotalWorkRef.current = 0;
      setPomTotalWork(0);
      setPomSessions(0);
    }
    setSaving(false);
    setSaveOpen(false);
    setSaveSubject('');
  };

  // Cleanup
  useEffect(() => () => {
    if (swInterval.current) clearInterval(swInterval.current);
    if (pomInterval.current) clearInterval(pomInterval.current);
  }, []);

  const allSubjects = [
    ...tytMufredat.mufredat.map(d => d.ders),
    ...aytMufredat.mufredat.map(d => d.ders),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const pomProgress = pomPhase === 'work'
    ? ((POMODORO_PRESETS[pomPreset].work * 60 - pomRemaining) / (POMODORO_PRESETS[pomPreset].work * 60)) * 100
    : ((POMODORO_PRESETS[pomPreset].break * 60 - pomRemaining) / (POMODORO_PRESETS[pomPreset].break * 60)) * 100;

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 rounded-2xl bg-secondary">
        <button
          onClick={() => setMode('stopwatch')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
            mode === 'stopwatch' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          )}
        >
          <Timer className="h-4 w-4" /> Kronometre
        </button>
        <button
          onClick={() => setMode('pomodoro')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
            mode === 'pomodoro' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          )}
        >
          <Coffee className="h-4 w-4" /> Pomodoro
        </button>
      </div>

      {mode === 'stopwatch' ? (
        <div className="flex flex-col items-center gap-8 py-8">
          {/* Big stopwatch display */}
          <div className="relative">
            <div className={cn(
              'w-56 h-56 rounded-full border-4 flex items-center justify-center transition-all duration-500',
              swRunning
                ? 'border-emerald-500/60 shadow-[0_0_40px_hsl(142,71%,45%,0.2)]'
                : swElapsed > 0
                  ? 'border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.15)]'
                  : 'border-border'
            )}>
              <span className={cn(
                'font-mono text-4xl font-bold tabular-nums tracking-tight transition-colors',
                swRunning ? 'text-emerald-400' : 'text-foreground'
              )}>
                {formatTime(swElapsed)}
              </span>
            </div>
            {swRunning && (
              <div className="absolute inset-0 rounded-full border-4 border-emerald-400/20 animate-ping" style={{ animationDuration: '2s' }} />
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {swElapsed > 0 && !swRunning && (
              <button
                onClick={swReset}
                className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={swRunning ? swStop : swStart}
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all shadow-lg active:scale-95',
                swRunning
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              )}
            >
              {swRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
            </button>
            {swElapsed > 0 && !swRunning && (
              <button
                onClick={() => { setSaveSeconds(swRef.current); setSaveOpen(true); }}
                className="w-14 h-14 rounded-full border-2 border-primary/40 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
              >
                <Save className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 py-6">
          {/* Preset selector */}
          <div className="flex gap-2">
            {POMODORO_PRESETS.map((p, i) => (
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

          {/* Phase indicator */}
          <div className={cn(
            'flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold',
            pomPhase === 'work' ? 'bg-primary/15 text-primary' : 'bg-emerald-500/15 text-emerald-400'
          )}>
            {pomPhase === 'work' ? <Zap className="h-3.5 w-3.5" /> : <Coffee className="h-3.5 w-3.5" />}
            {pomPhase === 'work' ? 'Çalışma' : 'Mola'}
          </div>

          {/* Circular timer */}
          <div className="relative w-56 h-56">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke={pomPhase === 'work' ? 'hsl(var(--primary))' : 'hsl(142, 71%, 45%)'}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - pomProgress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                'font-mono text-4xl font-bold tabular-nums',
                pomRunning && pomPhase === 'work' ? 'text-primary' : pomRunning ? 'text-emerald-400' : 'text-foreground'
              )}>
                {formatTime(pomRemaining)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={pomReset}
              className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={pomRunning ? pomStop : pomStart}
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center text-white font-bold transition-all shadow-lg active:scale-95',
                pomRunning
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : pomPhase === 'work'
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-emerald-500 hover:bg-emerald-600'
              )}
            >
              {pomRunning ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current ml-1" />}
            </button>
            {pomTotalWork > 0 && (
              <button
                onClick={pomSaveTotal}
                className="w-14 h-14 rounded-full border-2 border-primary/40 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
              >
                <Save className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Session stats */}
          {pomSessions > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{pomSessions}</span> oturum
              <span>•</span>
              <span className="font-bold text-primary">{formatDuration(Math.ceil(pomTotalWork / 60))}</span> çalışma
            </div>
          )}
        </div>
      )}

      {/* Save Dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Süreyi Kaydet ⏱</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="text-center py-3 glass-card rounded-xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Toplam Süre</p>
              <p className="font-mono text-2xl font-bold text-primary">{formatTime(saveSeconds)}</p>
              <p className="text-sm text-muted-foreground mt-1">{formatDuration(Math.ceil(saveSeconds / 60))}</p>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Sınav Tipi</Label>
              <div className="flex gap-2">
                {(['TYT', 'AYT'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => { setSaveExamType(type); setSaveSubject(''); }}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
                      saveExamType === type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Bu süreyi hangi derse kaydetmek istersin?</Label>
              <SearchableCombobox
                options={(saveExamType === 'AYT' ? aytMufredat : tytMufredat).mufredat.map(d => d.ders)}
                value={saveSubject}
                onChange={setSaveSubject}
                placeholder="Ders seçin..."
                allowCustom
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !saveSubject}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-0 h-12 text-base font-bold rounded-2xl"
            >
              <Save className="h-5 w-5 mr-2" /> {saving ? 'Kaydediliyor...' : 'Derse Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
