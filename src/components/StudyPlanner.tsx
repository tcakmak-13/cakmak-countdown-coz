import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Pencil, Clock, Target, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

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

export default function StudyPlanner({ studentId, readOnly = false }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ subject: '', topic: '', estimatedMinutes: 30, description: '' });

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('study_tasks')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at');
    if (data) setTasks(data);
  };

  useEffect(() => { fetchTasks(); }, [studentId]);

  const dayTasks = tasks.filter(t => t.day_of_week === selectedDay);
  const targetMinutes = dayTasks.reduce((sum, t) => sum + t.estimated_minutes, 0);
  const completedMinutes = dayTasks.filter(t => t.completed).reduce((sum, t) => sum + t.estimated_minutes, 0);
  const progressPercent = targetMinutes > 0 ? Math.round((completedMinutes / targetMinutes) * 100) : 0;

  const handleSave = async () => {
    if (editingTask) {
      await supabase.from('study_tasks').update({
        subject: form.subject,
        topic: form.topic,
        estimated_minutes: form.estimatedMinutes,
        description: form.description,
      }).eq('id', editingTask.id);
    } else {
      await supabase.from('study_tasks').insert({
        student_id: studentId,
        day_of_week: selectedDay,
        subject: form.subject,
        topic: form.topic,
        estimated_minutes: form.estimatedMinutes,
        description: form.description,
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

  return (
    <div>
      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-5 scrollbar-hide">
        {DAYS.map((day, i) => {
          const dayTaskCount = tasks.filter(t => t.day_of_week === i).length;
          const dayCompleted = tasks.filter(t => t.day_of_week === i && t.completed).length;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={`relative px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedDay === i
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              {day}
              {dayTaskCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                  dayCompleted === dayTaskCount
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {dayTaskCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary panel */}
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

      {/* Task list */}
      <div className="space-y-3">
        {dayTasks.length === 0 && (
          <div className="text-center py-12">
            <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Bu gün için görev yok.</p>
            {!readOnly && <p className="text-xs text-muted-foreground/60 mt-1">Aşağıdaki butona tıklayarak görev ekleyebilirsin.</p>}
          </div>
        )}
        {dayTasks.map(task => (
          <div
            key={task.id}
            className={`glass-card rounded-xl p-4 flex items-start gap-4 transition-all duration-300 ${
              task.completed ? 'opacity-50' : ''
            }`}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleComplete(task.id, task.completed)}
              disabled={readOnly}
              className="mt-1.5 h-5 w-5 border-2 border-primary data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`text-base font-bold font-display ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.subject}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  {task.topic}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{formatDuration(task.estimated_minutes)}</span>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground/80 mt-1.5">{task.description}</p>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(task)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(task.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingTask(null); setForm({ subject: '', topic: '', estimatedMinutes: 30, description: '' }); } }}>
          <DialogTrigger asChild>
            <Button className="w-full mt-5 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base font-bold">
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
