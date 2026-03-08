import { useState, useEffect } from 'react';
import { Video, Phone, Check, X, Clock, CalendarIcon, Loader2, Repeat, StopCircle, Pencil } from 'lucide-react';
import CoachAvailability from '@/components/CoachAvailability';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { format, nextDay, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface AppointmentRow {
  id: string;
  student_id: string;
  coach_id: string | null;
  type: 'video' | 'voice';
  scheduled_at: string;
  status: string;
  created_at: string;
  recurring: boolean;
  recurring_day: number | null;
  recurring_time: string | null;
  series_ended_at: string | null;
  duration_minutes: number;
  profiles: { full_name: string; username: string | null } | null;
}

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 9);
const MINUTES = [0, 15, 30, 45];

function endTimeStr(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m + (durationMinutes || 60);
  const eh = Math.floor(totalMin / 60) % 24;
  const em = totalMin % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

function getNextOccurrence(recurringDay: number, recurringTime: string): Date {
  const now = new Date();
  const [h, m] = recurringTime.split(':').map(Number);
  const today = now.getDay();
  let target: Date;
  if (today === recurringDay) {
    target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target = addDays(target, 7);
  } else {
    target = nextDay(now, recurringDay as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    target.setHours(h, m, 0, 0);
  }
  return target;
}

interface Props {
  coachProfileId: string;
}

export default function CoachAppointments({ coachProfileId }: Props) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [editDialog, setEditDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<AppointmentRow | null>(null);
  const [editDay, setEditDay] = useState(1);
  const [editHour, setEditHour] = useState(10);
  const [editMinute, setEditMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetch_ = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles!appointments_student_id_fkey(full_name, username)')
      .eq('coach_id', coachProfileId)
      .order('scheduled_at', { ascending: false });
    setAppointments((data as unknown as AppointmentRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch_();
    const channel = supabase
      .channel('coach-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetch_())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coachProfileId]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    setUpdatingId(null);
    if (error) toast.error('Hata: ' + error.message);
    else toast.success(status === 'approved' ? 'Randevu onaylandı!' : 'Randevu reddedildi.');
  };

  const endSeries = async (id: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('appointments').update({ series_ended_at: new Date().toISOString() }).eq('id', id);
    setUpdatingId(null);
    if (error) toast.error('Hata: ' + error.message);
    else toast.success('Haftalık seri sonlandırıldı.');
  };

  const openEditDialog = (a: AppointmentRow) => {
    setEditTarget(a);
    setEditDay(a.recurring_day ?? 1);
    const [h, m] = (a.recurring_time || '10:00').split(':').map(Number);
    setEditHour(h);
    setEditMinute(m);
    setEditDialog(true);
  };

  const handleUpdateTime = async () => {
    if (!editTarget) return;
    setSaving(true);
    const newTime = `${String(editHour).padStart(2, '0')}:${String(editMinute).padStart(2, '0')}`;
    const nextOcc = getNextOccurrence(editDay, newTime);
    const { error } = await supabase.from('appointments').update({
      recurring_day: editDay,
      recurring_time: newTime,
      scheduled_at: nextOcc.toISOString(),
    }).eq('id', editTarget.id);
    setSaving(false);
    if (error) toast.error('Güncelleme hatası: ' + error.message);
    else {
      toast.success('Randevu güncellendi!');
      setEditDialog(false);
      fetch_();
    }
  };

  const pending = appointments.filter(a => a.status === 'pending');
  const activeRecurring = appointments.filter(a => a.status === 'approved' && a.recurring && !a.series_ended_at);
  const rest = appointments.filter(a => !pending.includes(a) && !activeRecurring.includes(a));

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Bekliyor', cls: 'bg-amber-500/20 text-amber-400' },
      approved: { label: 'Onaylandı', cls: 'bg-emerald-500/20 text-emerald-400' },
      rejected: { label: 'Reddedildi', cls: 'bg-destructive/20 text-destructive' },
      completed: { label: 'Tamamlandı', cls: 'bg-primary/20 text-primary' },
    };
    const s = map[status] || map.pending;
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <CalendarIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Randevu Yönetimi</h2>
          <p className="text-sm text-muted-foreground">Öğrencilerinle olan haftalık görüşme taleplerini yönet</p>
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Bekleyen Talepler ({pending.length})
          </h3>
          {pending.map(a => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-5 border border-amber-500/30"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
                  {a.type === 'video' ? <Video className="h-6 w-6 text-primary" /> : <Phone className="h-6 w-6 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-lg">{a.profiles?.full_name || a.profiles?.username || 'Öğrenci'}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.type === 'video' ? 'Görüntülü' : 'Sesli'} ({a.duration_minutes || 60} dk) — Her <span className="font-medium text-foreground">{DAY_NAMES[a.recurring_day ?? 0]}</span> {a.recurring_time}
                    {a.recurring_time ? ` → ${endTimeStr(a.recurring_time, a.duration_minutes)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(a.status)}
                  <Button size="sm" onClick={() => updateStatus(a.id, 'approved')} disabled={updatingId === a.id}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                    {updatingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Onayla
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(a.id, 'rejected')} disabled={updatingId === a.id} className="gap-1">
                    <X className="h-3.5 w-3.5" /> Reddet
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Active recurring */}
      {activeRecurring.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Repeat className="h-4 w-4" /> Aktif Haftalık Seriler ({activeRecurring.length})
          </h3>
          {activeRecurring.map(a => {
            const nextOcc = a.recurring_day != null && a.recurring_time
              ? getNextOccurrence(a.recurring_day, a.recurring_time)
              : new Date(a.scheduled_at);
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-5 border border-emerald-500/20"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
                    {a.type === 'video' ? <Video className="h-6 w-6 text-primary" /> : <Phone className="h-6 w-6 text-emerald-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-lg">{a.profiles?.full_name || 'Öğrenci'}</p>
                    <p className="text-sm text-muted-foreground">
                      Her <span className="font-semibold text-foreground">{DAY_NAMES[a.recurring_day ?? 0]}</span> — {a.recurring_time}
                    </p>
                    <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 inline-block">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sonraki</p>
                      <p className="font-display font-bold text-primary text-lg">
                        {format(nextOcc, 'dd MMM yyyy — HH:mm', { locale: tr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(a)}
                      className="gap-1 border-primary/30 text-primary hover:bg-primary/10">
                      <Pencil className="h-3.5 w-3.5" /> Saati Güncelle
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => endSeries(a.id)} disabled={updatingId === a.id}
                      className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
                      {updatingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />} Seriyi Sonlandır
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Geçmiş / Sonlanan</h3>
          {rest.slice(0, 10).map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4 flex items-center gap-3 opacity-60">
              {a.type === 'video' ? <Video className="h-5 w-5 text-muted-foreground" /> : <Phone className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm flex-1">{a.profiles?.full_name} — {DAY_NAMES[a.recurring_day ?? 0]} {a.recurring_time}</span>
              {a.series_ended_at && <span className="text-xs text-muted-foreground">Sonlandırıldı</span>}
              {statusBadge(a.status)}
            </div>
          ))}
        </div>
      )}

      {appointments.length === 0 && (
        <div className="glass-card rounded-2xl p-10 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Henüz randevu talebi yok.</p>
        </div>
      )}

      {/* Edit time dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Saati Güncelle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Yapılan değişiklik tüm gelecek haftalara yansıyacaktır.</p>
            <div>
              <p className="text-sm font-medium mb-2">Gün</p>
              <select value={editDay} onChange={e => setEditDay(Number(e.target.value))}
                className="w-full h-11 rounded-xl bg-secondary border border-border px-3 text-base font-medium appearance-none cursor-pointer">
                {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Saat</p>
              <div className="flex gap-3">
                <select value={editHour} onChange={e => setEditHour(Number(e.target.value))}
                  className="flex-1 h-11 rounded-xl bg-secondary border border-border text-center text-xl font-display font-bold text-primary appearance-none cursor-pointer">
                  {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
                </select>
                <span className="text-2xl font-bold text-muted-foreground self-center">:</span>
                <select value={editMinute} onChange={e => setEditMinute(Number(e.target.value))}
                  className="flex-1 h-11 rounded-xl bg-secondary border border-border text-center text-xl font-display font-bold text-primary appearance-none cursor-pointer">
                  {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={handleUpdateTime} disabled={saving}
              className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-11 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Kaydediliyor...' : 'Güncelle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
