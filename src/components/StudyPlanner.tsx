import { useState, useEffect } from 'react';
import { StudyTask } from '@/lib/types';
import { getTasks, saveTasks } from '@/lib/mockData';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

interface Props {
  studentId: string;
  readOnly?: boolean;
}

export default function StudyPlanner({ studentId, readOnly = false }: Props) {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [form, setForm] = useState({ subject: '', topic: '', estimatedMinutes: 30, description: '' });

  useEffect(() => {
    setTasks(getTasks().filter(t => t.studentId === studentId));
  }, [studentId]);

  const dayTasks = tasks.filter(t => t.dayOfWeek === selectedDay);

  const handleSave = () => {
    const allTasks = getTasks();
    if (editingTask) {
      const updated = allTasks.map(t =>
        t.id === editingTask.id ? { ...t, ...form } : t
      );
      saveTasks(updated);
      setTasks(updated.filter(t => t.studentId === studentId));
    } else {
      const newTask: StudyTask = {
        id: `task-${Date.now()}`,
        studentId,
        dayOfWeek: selectedDay,
        ...form,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      const updated = [...allTasks, newTask];
      saveTasks(updated);
      setTasks(updated.filter(t => t.studentId === studentId));
    }
    setForm({ subject: '', topic: '', estimatedMinutes: 30, description: '' });
    setEditingTask(null);
    setDialogOpen(false);
  };

  const handleDelete = (taskId: string) => {
    const allTasks = getTasks().filter(t => t.id !== taskId);
    saveTasks(allTasks);
    setTasks(allTasks.filter(t => t.studentId === studentId));
  };

  const toggleComplete = (taskId: string) => {
    const allTasks = getTasks().map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    saveTasks(allTasks);
    setTasks(allTasks.filter(t => t.studentId === studentId));
  };

  const openEdit = (task: StudyTask) => {
    setEditingTask(task);
    setForm({ subject: task.subject, topic: task.topic, estimatedMinutes: task.estimatedMinutes, description: task.description });
    setDialogOpen(true);
  };

  return (
    <div>
      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedDay === i
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {dayTasks.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Bu gün için görev yok.
          </p>
        )}
        {dayTasks.map(task => (
          <div
            key={task.id}
            className={`glass-card rounded-xl p-4 flex items-start gap-3 transition-opacity ${
              task.completed ? 'opacity-60' : ''
            }`}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleComplete(task.id)}
              className="mt-1 border-primary data-[state=checked]:bg-primary"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold ${task.completed ? 'line-through' : ''}`}>
                  {task.subject}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {task.topic}
                </span>
                <span className="text-xs text-muted-foreground">{task.estimatedMinutes} dk</span>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(task.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add button */}
      {!readOnly && (
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingTask(null); setForm({ subject: '', topic: '', estimatedMinutes: 30, description: '' }); } }}>
          <DialogTrigger asChild>
            <Button className="w-full mt-4 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" /> Görev Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">{editingTask ? 'Görevi Düzenle' : 'Yeni Görev'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Ders</Label>
                <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Matematik" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Konu</Label>
                <Input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="Türev" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Tahmini Süre (dk)</Label>
                <Input type="number" value={form.estimatedMinutes} onChange={e => setForm(f => ({ ...f, estimatedMinutes: Number(e.target.value) }))} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notlar..." className="bg-secondary border-border" />
              </div>
              <Button onClick={handleSave} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
                {editingTask ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
