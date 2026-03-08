import { useState, useEffect } from 'react';
import { Video, Phone, CalendarIcon, Loader2, Repeat, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { format, nextDay, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';

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
  student_profile: { full_name: string } | null;
  coach_profile: { full_name: string } | null;
}

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

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

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, student_profile:profiles!appointments_student_id_fkey(full_name), coach_profile:profiles!appointments_coach_id_fkey(full_name)')
      .order('scheduled_at', { ascending: false });
    setAppointments((data as unknown as AppointmentRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch_();
    const channel = supabase
      .channel('admin-appointments-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetch_())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeRecurring = appointments.filter(a => a.status === 'approved' && a.recurring && !a.series_ended_at);
  const pending = appointments.filter(a => a.status === 'pending');
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

  const renderCard = (a: AppointmentRow, border: string) => {
    const nextOcc = a.recurring_day != null && a.recurring_time
      ? getNextOccurrence(a.recurring_day, a.recurring_time)
      : new Date(a.scheduled_at);

    return (
      <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className={`glass-card rounded-2xl p-5 border ${border}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
            {a.type === 'video' ? <Video className="h-6 w-6 text-primary" /> : <Phone className="h-6 w-6 text-emerald-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-lg">{a.student_profile?.full_name || 'Öğrenci'}</p>
            <p className="text-xs text-muted-foreground">
              Koç: <span className="text-foreground font-medium">{a.coach_profile?.full_name || '—'}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {a.type === 'video' ? 'Görüntülü' : 'Sesli'} — Her <span className="font-medium text-foreground">{DAY_NAMES[a.recurring_day ?? 0]}</span> {a.recurring_time}
            </p>
            {a.status === 'approved' && a.recurring && !a.series_ended_at && (
              <div className="mt-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 inline-block">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sonraki</p>
                <p className="font-display font-bold text-primary text-lg">
                  {format(nextOcc, 'dd MMM yyyy — HH:mm', { locale: tr })}
                </p>
              </div>
            )}
          </div>
          <div className="shrink-0">
            {statusBadge(a.status)}
            {a.series_ended_at && <span className="text-xs text-muted-foreground ml-2">Sonlandırıldı</span>}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Eye className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Randevu İzleme</h2>
          <p className="text-sm text-muted-foreground">Tüm koç-öğrenci randevularını salt okunur olarak görüntüle</p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" /> Bekleyen Talepler ({pending.length})
          </h3>
          {pending.map(a => renderCard(a, 'border-amber-500/30'))}
        </div>
      )}

      {activeRecurring.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Repeat className="h-4 w-4" /> Aktif Haftalık Seriler ({activeRecurring.length})
          </h3>
          {activeRecurring.map(a => renderCard(a, 'border-emerald-500/20'))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Geçmiş / Sonlanan</h3>
          {rest.slice(0, 10).map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4 flex items-center gap-3 opacity-60">
              {a.type === 'video' ? <Video className="h-5 w-5 text-muted-foreground" /> : <Phone className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm flex-1">
                {a.student_profile?.full_name} → {a.coach_profile?.full_name || '—'} — {DAY_NAMES[a.recurring_day ?? 0]} {a.recurring_time}
              </span>
              {statusBadge(a.status)}
            </div>
          ))}
        </div>
      )}

      {appointments.length === 0 && (
        <div className="glass-card rounded-2xl p-10 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Sistemde henüz randevu bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}
