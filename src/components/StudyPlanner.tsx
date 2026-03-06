import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Pencil, Clock, Target, CheckCircle2, CalendarDays, ChevronLeft, Archive, Timer } from 'lucide-react';
import TaskTimer from '@/components/TaskTimer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, isToday, isBefore, startOfDay, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const DAY_LABELS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

interface Task {
  id: string;
  student_id: string;
  day_of_week: number;
  subject: string;
  topic: string;
  estimated_minutes: number;
  description: string | null;
  completed: boolean;
  created_at: string;
}

interface Props {
  studentId: string;
  readOnly?: boolean;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

/** Convert JS Date.getDay() (0=Sun) to our 0=Mon index */
function jsDayToIndex(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 6 : day - 1; // Mon=0 … Sun=6
}

export default function StudyPlanner({ studentId, readOnly = false }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ subject: '', topic: '', estimatedMinutes: 30, description: '' });

  const isArchive = isBefore(startOfDay(selectedDate), startOfDay(new Date())) && !isToday(selectedDate);
  const selectedDayIndex = jsDayToIndex(selectedDate);

  // Week dates (Mon-Sun) for the strip
  const weekDates = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('study_tasks')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at');
    if (data) setTasks(data);
  };

  useEffect(() => { fetchTasks(); }, [studentId]);

  const dayTasks = tasks.filter(t => t.day_of_week === selectedDayIndex);
  const targetMinutes = dayTasks.reduce((sum, t) => sum + t.estimated_minutes, 0);
  const completedMinutes = dayTasks.filter(t => t.completed).reduce((sum, t) => sum + t.estimated_minutes, 0);
  const progressPercent = targetMinutes > 0 ? Math.round((completedMinutes / targetMinutes) * 100) : 0;

  const handleSave = async () => {
    if (editingTask) {
      await supabase.from('study_tasks').update({
        subject: form.subject, topic: form.topic,
        estimated_minutes: form.estimatedMinutes, description: form.description,
      }).eq('id', editingTask.id);
    } else {
      await supabase.from('study_tasks').insert({
        student_id: studentId, day_of_week: selectedDayIndex,
        subject: form.subject, topic: form.topic,
        estimated_minutes: form.estimatedMinutes, description: form.description,
      });
    }
    setForm({ subject: '', topic: '', estimatedMinutes: 30, description: '' });
    setEditingTask(null);
    setDialogOpen(false);
    fetchTasks();
    toast.success(editingTask ? 'Görev güncellendi!' : 'Görev eklendi!');
  };

  const handleDelete = async (taskId: string) => {
    await supabase.from('study_tasks').delete().eq('id', taskId);
    fetchTasks();
    toast.success('Görev silindi.');
  };

  const toggleComplete = async (taskId: string, current: boolean) => {
    await supabase.from('study_tasks').update({ completed: !current }).eq('id', taskId);
    fetchTasks();
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({ subject: task.subject, topic: task.topic, estimatedMinutes: task.estimated_minutes, description: task.description ?? '' });
    setDialogOpen(true);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  const backToToday = () => setSelectedDate(new Date());

  return (
    <div>
      {/* ── Weekly Strip + Calendar Icon ── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 w-max px-0.5">
          {weekDates.map((date, i) => {
            const dayIdx = jsDayToIndex(date);
            const isActive = isSameDay(date, selectedDate);
            const today = isToday(date);
            const dayTaskCount = tasks.filter(t => t.day_of_week === dayIdx).length;
            const dayCompleted = tasks.filter(t => t.day_of_week === dayIdx && t.completed).length;

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2.5 transition-all min-w-[52px] shrink-0',
                  isActive
                    ? 'bg-[hsl(45,100%,50%)] text-[hsl(0,0%,4%)] shadow-[0_0_20px_hsl(45,100%,50%,0.4)] scale-110 font-black'
                    : today
                      ? 'bg-primary/20 text-primary font-bold'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium'
                )}
              >
                <span className="text-[10px] uppercase tracking-wider">{DAY_LABELS_SHORT[i]}</span>
                <span className={cn('text-lg font-display', isActive ? 'text-[hsl(0,0%,4%)]' : '')}>{format(date, 'd')}</span>
                {/* Today dot / active underline */}
                {(isActive || today) && (
                  <span className={cn(
                    'mt-0.5 rounded-full transition-all',
                    isActive
                      ? 'w-5 h-[3px] bg-[hsl(0,0%,4%)]'
                      : 'w-1.5 h-1.5 bg-primary'
                  )} />
                )}
                {dayTaskCount > 0 && (
                  <span className={cn(
                    'absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center',
                    dayCompleted === dayTaskCount ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    {dayTaskCount}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>

        {/* Calendar icon */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button className="shrink-0 p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
              <CalendarDays className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              locale={tr}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Archive Banner ── */}
      {isArchive && (
        <div className="flex items-center gap-3 glass-card rounded-2xl p-4 mb-5 border-l-4 border-l-amber-500/80">
          <Archive className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-400 font-display">Arşiv Modu</p>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })} — Bu gün geçmişte, sadece görüntüleyebilirsiniz.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={backToToday} className="shrink-0 text-xs gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Bugüne Dön
          </Button>
        </div>
      )}

      {/* ── Date Title ── */}
      <p className="text-sm font-semibold text-muted-foreground mb-4 font-display tracking-wide">
        {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
      </p>

      {/* ── Summary Panel ── */}
      {dayTasks.length > 0 && (
        <div className="glass-card rounded-2xl p-5 mb-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/15">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hedeflenen</p>
                <p className="text-lg font-bold text-primary font-display">{formatDuration(targetMinutes)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Çalışılan</p>
                <p className="text-lg font-bold text-emerald-400 font-display">{formatDuration(completedMinutes)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">İlerleme</p>
              <p className="text-lg font-bold font-display" style={{ color: progressPercent === 100 ? 'hsl(142, 71%, 45%)' : 'hsl(var(--primary))' }}>
                %{progressPercent}
              </p>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3 bg-secondary" />
        </div>
      )}

      {/* ── Task Cards ── */}
      <div className="space-y-3">
        {dayTasks.length === 0 && (
          <div className="text-center py-14">
            <Clock className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-base font-semibold text-muted-foreground font-display">Bu gün için görev yok</p>
            {!readOnly && !isArchive && <p className="text-sm text-muted-foreground/60 mt-1">Aşağıdaki butona tıklayarak görev ekleyebilirsin.</p>}
          </div>
        )}
        {dayTasks.map(task => (
          <div
            key={task.id}
            className={cn(
              'glass-card rounded-2xl p-5 flex items-start gap-4 transition-all duration-300',
              task.completed && 'opacity-50'
            )}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleComplete(task.id, task.completed)}
              disabled={readOnly || isArchive}
              className="mt-1 h-6 w-6 rounded-lg border-2 border-primary data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={cn(
                  'text-lg font-bold font-display',
                  task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                )}>
                  {task.subject}
                </span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/15 text-primary">
                  {task.topic}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{formatDuration(task.estimated_minutes)}</span>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground/80 mt-2 leading-relaxed">{task.description}</p>
              )}
            </div>
            {!readOnly && !isArchive && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(task)} className="p-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(task.id)} className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Add Task Button + Dialog ── */}
      {!readOnly && !isArchive && (
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingTask(null); setForm({ subject: '', topic: '', estimatedMinutes: 30, description: '' }); } }}>
          <DialogTrigger asChild>
            <Button className="w-full mt-5 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base font-bold rounded-2xl">
              <Plus className="h-5 w-5 mr-2" /> Görev Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">{editingTask ? 'Görevi Düzenle' : 'Yeni Görev'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label className="font-semibold">Ders</Label>
                <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Matematik" className="bg-secondary border-border h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Konu</Label>
                <Input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="Türev" className="bg-secondary border-border h-11" />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Tahmini Süre (dakika)</Label>
                <Input type="number" value={form.estimatedMinutes} onChange={e => setForm(f => ({ ...f, estimatedMinutes: Number(e.target.value) }))} className="bg-secondary border-border h-11" />
                {form.estimatedMinutes > 0 && (
                  <p className="text-xs text-primary font-medium">{formatDuration(form.estimatedMinutes)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Açıklama (isteğe bağlı)</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notlar..." className="bg-secondary border-border h-11" />
              </div>
              <Button onClick={handleSave} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base font-bold">
                {editingTask ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
