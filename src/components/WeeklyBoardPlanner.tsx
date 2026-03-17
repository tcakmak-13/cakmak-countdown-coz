import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Pencil, Clock, ChevronLeft, ChevronRight, RotateCcw, Copy, CheckCircle2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, addWeeks, isToday, isSameWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import SearchableCombobox from '@/components/SearchableCombobox';
import tytMufredat from '@/data/tyt_mufredat.json';
import aytMufredat from '@/data/ayt_mufredat.json';

const DAY_LABELS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_LABELS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

interface Task {
  id: string;
  student_id: string;
  day_of_week: number;
  week_start_date: string;
  subject: string;
  topic: string;
  estimated_minutes: number;
  actual_minutes: number | null;
  description: string | null;
  completed: boolean;
  created_at: string;
}

interface Props {
  studentId: string;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}sa`;
  return `${h}sa ${m}dk`;
}

export default function WeeklyBoardPlanner({ studentId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addDayIndex, setAddDayIndex] = useState(0);
  const [form, setForm] = useState({ examType: 'TYT' as 'TYT' | 'AYT', subject: '', topic: '', estimatedMinutes: 30, description: '' });
  const [copying, setCopying] = useState(false);

  const weekDates = useMemo(() => {
    const monday = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [selectedDate]);

  const weekStartStr = useMemo(() => format(weekDates[0], 'yyyy-MM-dd'), [weekDates]);
  const isCurrentWeek = isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 });

  const goToPrevWeek = () => setSelectedDate(prev => addWeeks(prev, -1));
  const goToNextWeek = () => setSelectedDate(prev => addWeeks(prev, 1));
  const goToThisWeek = () => setSelectedDate(new Date());

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('study_tasks')
      .select('*')
      .eq('student_id', studentId)
      .eq('week_start_date', weekStartStr)
      .order('created_at');
    if (data) setTasks(data as Task[]);
  }, [studentId, weekStartStr]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    tasks.forEach(t => {
      if (map[t.day_of_week]) map[t.day_of_week].push(t);
    });
    return map;
  }, [tasks]);

  const openAddDialog = (dayIndex: number) => {
    setAddDayIndex(dayIndex);
    setEditingTask(null);
    setForm({ examType: 'TYT', subject: '', topic: '', estimatedMinutes: 30, description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setAddDayIndex(task.day_of_week);
    setForm({ examType: 'TYT', subject: task.subject, topic: task.topic, estimatedMinutes: task.estimated_minutes, description: task.description ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.subject.trim()) { toast.error('Ders seçimi gerekli.'); return; }
    if (editingTask) {
      const { error } = await supabase.from('study_tasks').update({
        subject: form.subject, topic: form.topic,
        estimated_minutes: form.estimatedMinutes, description: form.description,
      }).eq('id', editingTask.id);
      if (error) { console.error('Update error:', error); toast.error('İşlem başarısız. Lütfen tekrar deneyin.'); return; }
      toast.success('Görev güncellendi!');
    } else {
      const { error } = await supabase.from('study_tasks').insert({
        student_id: studentId, day_of_week: addDayIndex,
        week_start_date: weekStartStr,
        subject: form.subject, topic: form.topic,
        estimated_minutes: form.estimatedMinutes, description: form.description,
      });
      if (error) { console.error('Insert error:', error); toast.error('İşlem başarısız. Lütfen tekrar deneyin.'); return; }
      toast.success('Görev eklendi!');
    }
    setDialogOpen(false);
    setEditingTask(null);
    fetchTasks();
  };

  const handleDelete = async (taskId: string) => {
    await supabase.from('study_tasks').delete().eq('id', taskId);
    fetchTasks();
    toast.success('Görev silindi.');
  };

  // Copy a single task to another day (same week)
  const copyTaskToDay = async (task: Task, toDay: number) => {
    setCopying(true);
    const { error } = await supabase.from('study_tasks').insert({
      student_id: studentId,
      day_of_week: toDay,
      week_start_date: weekStartStr,
      subject: task.subject,
      topic: task.topic,
      estimated_minutes: task.estimated_minutes,
      description: task.description,
    });
    if (error) { console.error('Copy error:', error); toast.error('Kopyalama başarısız.'); }
    else { toast.success(`${task.subject} → ${DAY_LABELS_SHORT[toDay]} kopyalandı!`); }
    setCopying(false);
    fetchTasks();
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) { setSelectedDate(date); setCalendarOpen(false); }
  };

  const weekTotalMinutes = tasks.reduce((s, t) => s + t.estimated_minutes, 0);
  const weekCompletedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={goToPrevWeek} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold font-display text-foreground min-w-[150px] text-center">
            {format(weekDates[0], 'd MMM', { locale: tr })} – {format(weekDates[6], 'd MMM yyyy', { locale: tr })}
          </span>
          <button onClick={goToNextWeek} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week summary */}
          <span className="text-xs text-muted-foreground font-medium">
            {tasks.length} görev · {formatDuration(weekTotalMinutes)} · {weekCompletedCount}/{tasks.length} ✓
          </span>
          {!isCurrentWeek && (
            <button onClick={goToThisWeek} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Bu Hafta
            </button>
          )}
          {/* Copy week to next */}
          <button
            onClick={copyWeekToNext}
            disabled={copying || tasks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            <CopyPlus className="h-3.5 w-3.5" /> Haftayı Kopyala →
          </button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
                <CalendarDays className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
              <Calendar mode="single" selected={selectedDate} onSelect={handleCalendarSelect} locale={tr} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Board Grid */}
      <div className="grid grid-cols-7 gap-2 min-h-[400px]">
        {weekDates.map((date, dayIdx) => {
          const dayTasks = tasksByDay[dayIdx] || [];
          const today = isToday(date);
          const dayMinutes = dayTasks.reduce((s, t) => s + t.estimated_minutes, 0);
          const dayCompleted = dayTasks.filter(t => t.completed).length;

          return (
            <div
              key={dayIdx}
              className={cn(
                'flex flex-col rounded-2xl border transition-all min-h-[350px]',
                today
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-card/50'
              )}
            >
              {/* Day Header */}
              <div className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-t-2xl border-b',
                today ? 'bg-primary/10 border-primary/20' : 'bg-secondary/50 border-border'
              )}>
                <div className="min-w-0">
                  <p className={cn(
                    'text-xs font-bold uppercase tracking-wider',
                    today ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {DAY_LABELS_SHORT[dayIdx]}
                  </p>
                  <p className={cn(
                    'text-lg font-display font-bold leading-tight',
                    today ? 'text-primary' : 'text-foreground'
                  )}>
                    {format(date, 'd')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {dayTasks.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Günü kopyala">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border min-w-[160px]">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          {DAY_LABELS_SHORT[dayIdx]} → Kopyala
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {DAY_LABELS_SHORT.map((label, targetIdx) => {
                          if (targetIdx === dayIdx) return null;
                          return (
                            <DropdownMenuItem
                              key={targetIdx}
                              onClick={() => copyDayToDay(dayIdx, targetIdx)}
                              className="text-sm cursor-pointer"
                            >
                              {label} ({format(weekDates[targetIdx], 'd MMM', { locale: tr })})
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <button
                    onClick={() => openAddDialog(dayIdx)}
                    className={cn(
                      'p-1 rounded-lg transition-colors',
                      today
                        ? 'hover:bg-primary/20 text-primary'
                        : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                    title="Görev ekle"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day Stats */}
              {dayTasks.length > 0 && (
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium flex items-center justify-between border-b border-border/50">
                  <span>{dayTasks.length} görev</span>
                  <span>{formatDuration(dayMinutes)}</span>
                  {dayCompleted > 0 && (
                    <span className="text-emerald-500 font-bold">{dayCompleted}✓</span>
                  )}
                </div>
              )}

              {/* Task Cards */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto scrollbar-hide">
                {dayTasks.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[10px] text-muted-foreground/40 text-center">Görev yok</p>
                  </div>
                )}
                {dayTasks.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      'group relative rounded-xl p-2.5 transition-all border cursor-default',
                      task.completed
                        ? 'bg-emerald-500/10 border-emerald-500/20 opacity-70'
                        : 'bg-background border-border hover:border-primary/30 hover:shadow-sm'
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-xs font-bold truncate',
                          task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                        )}>
                          {task.subject}
                        </p>
                        {task.topic && (
                          <p className="text-[10px] text-primary/80 truncate mt-0.5">{task.topic}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground font-medium">{formatDuration(task.estimated_minutes)}</span>
                          {task.completed && <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />}
                        </div>
                      </div>
                    </div>
                    {/* Hover actions */}
                    <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-card/90 backdrop-blur-sm rounded-lg p-0.5 border border-border shadow-sm">
                      <button onClick={() => openEditDialog(task)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingTask(null); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {editingTask ? 'Görevi Düzenle' : `Yeni Görev — ${DAY_LABELS[addDayIndex]}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="font-semibold">Sınav Tipi</Label>
              <div className="flex gap-2">
                {(['TYT', 'AYT'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, examType: type, subject: '', topic: '' }))}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
                      form.examType === type
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Ders</Label>
              <SearchableCombobox
                options={(form.examType === 'AYT' ? aytMufredat : tytMufredat).mufredat.map(d => d.ders)}
                value={form.subject}
                onChange={(val) => setForm(f => ({ ...f, subject: val, topic: '' }))}
                placeholder="Ders seçin..."
                allowCustom
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Konu</Label>
              <SearchableCombobox
                options={(form.examType === 'AYT' ? aytMufredat : tytMufredat).mufredat.find(d => d.ders === form.subject)?.konular ?? []}
                value={form.topic}
                onChange={(val) => setForm(f => ({ ...f, topic: val }))}
                placeholder={form.subject ? 'Konu seçin...' : 'Önce ders seçin'}
                readOnly={!form.subject}
                allowCustom
              />
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
    </div>
  );
}
