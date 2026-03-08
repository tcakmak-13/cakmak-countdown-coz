import { useState, useEffect, useMemo } from 'react';
import { Video, Phone, CalendarIcon, Clock, Check, X, Loader2, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { format, addDays, nextDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  type: 'video' | 'voice';
  scheduled_at: string;
  status: string;
  created_at: string;
  recurring: boolean;
  recurring_day: number | null;
  recurring_time: string | null;
  series_ended_at: string | null;
  duration_minutes: number;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ApprovedSlot {
  recurring_day: number;
  recurring_time: string;
  duration_minutes: number;
}

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAY_NAMES_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
const DURATION = { video: 60, voice: 20 };

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

/**
 * Given availability windows and approved appointments for a specific day,
 * compute available start times for a given duration.
 */
function computeAvailableSlots(
  availability: AvailabilitySlot[],
  approved: ApprovedSlot[],
  dayOfWeek: number,
  durationMinutes: number
): string[] {
  // Get availability windows for this day
  const windows = availability
    .filter(a => a.day_of_week === dayOfWeek)
    .map(a => ({
      start: timeToMinutes(a.start_time),
      end: a.end_time === '00:00:00' || a.end_time === '00:00' ? 1440 : timeToMinutes(a.end_time),
    }));

  if (windows.length === 0) return [];

  // Get blocked ranges from approved appointments on this day
  const blocked = approved
    .filter(a => a.recurring_day === dayOfWeek)
    .map(a => ({
      start: timeToMinutes(a.recurring_time),
      end: timeToMinutes(a.recurring_time) + a.duration_minutes,
    }));

  const slots: string[] = [];

  for (const w of windows) {
    // Generate candidate start times every 10 minutes within the window
    for (let t = w.start; t + durationMinutes <= w.end; t += 10) {
      const candidateEnd = t + durationMinutes;
      // Check if this candidate overlaps with any blocked range
      const isBlocked = blocked.some(b => t < b.end && candidateEnd > b.start);
      if (!isBlocked) {
        slots.push(minutesToTime(t));
      }
    }
  }

  return [...new Set(slots)]; // deduplicate
}

export default function AppointmentBooking({ studentId, coachId }: { studentId: string; coachId?: string | null }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'video' | 'voice'>('video');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Coach availability & approved slots
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [approvedSlots, setApprovedSlots] = useState<ApprovedSlot[]>([]);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('student_id', studentId)
      .order('scheduled_at', { ascending: true });
    setAppointments((data as unknown as Appointment[]) || []);
    setLoading(false);
  };

  const fetchAvailabilityAndApproved = async () => {
    if (!coachId) return;
    const [availRes, approvedRes] = await Promise.all([
      supabase
        .from('coach_availability')
        .select('day_of_week, start_time, end_time')
        .eq('coach_id', coachId),
      supabase
        .from('appointments')
        .select('recurring_day, recurring_time, duration_minutes')
        .eq('coach_id', coachId)
        .eq('status', 'approved')
        .eq('recurring', true)
        .is('series_ended_at', null),
    ]);
    setAvailability((availRes.data as AvailabilitySlot[]) || []);
    setApprovedSlots((approvedRes.data as ApprovedSlot[]) || []);
  };

  useEffect(() => {
    fetchAppointments();
    fetchAvailabilityAndApproved();
    const channel = supabase
      .channel('student-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `student_id=eq.${studentId}` }, () => fetchAppointments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [studentId, coachId]);

  const openDialog = (type: 'video' | 'voice') => {
    setSelectedType(type);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setDialogOpen(true);
    // Refresh availability when opening
    fetchAvailabilityAndApproved();
  };

  // Compute available days (days that have at least one availability window)
  const availableDays = useMemo(() => {
    return new Set(availability.map(a => a.day_of_week));
  }, [availability]);

  // Compute available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfWeek = selectedDate.getDay();
    return computeAvailableSlots(availability, approvedSlots, dayOfWeek, DURATION[selectedType]);
  }, [selectedDate, availability, approvedSlots, selectedType]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) { toast.error('Lütfen tarih ve saat seçin.'); return; }
    const [h, m] = selectedTime.split(':').map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(h, m, 0, 0);
    if (scheduledAt <= new Date()) { toast.error('Geçmiş bir tarih seçemezsiniz.'); return; }

    const dayOfWeek = scheduledAt.getDay();
    const duration = DURATION[selectedType];

    setSubmitting(true);
    const { error } = await supabase.from('appointments').insert({
      student_id: studentId,
      coach_id: coachId || null,
      type: selectedType,
      scheduled_at: scheduledAt.toISOString(),
      recurring: true,
      recurring_day: dayOfWeek,
      recurring_time: selectedTime,
      duration_minutes: duration,
    });
    setSubmitting(false);
    if (error) { toast.error('Randevu oluşturulamadı: ' + error.message); return; }
    toast.success('Randevu talebin koçuna iletildi!');
    setDialogOpen(false);
    fetchAppointments();
    fetchAvailabilityAndApproved();
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) toast.error('İptal edilemedi.');
    else { toast.success('Randevu iptal edildi.'); fetchAppointments(); fetchAvailabilityAndApproved(); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Onay Bekliyor', cls: 'bg-amber-500/20 text-amber-400' },
      approved: { label: 'Onaylandı', cls: 'bg-emerald-500/20 text-emerald-400' },
      rejected: { label: 'Reddedildi', cls: 'bg-destructive/20 text-destructive' },
      completed: { label: 'Tamamlandı', cls: 'bg-primary/20 text-primary' },
    };
    const s = map[status] || map.pending;
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
  };

  const activeRecurring = appointments.filter(a => a.status === 'approved' && a.recurring && !a.series_ended_at);
  const pending = appointments.filter(a => a.status === 'pending');
  const ended = appointments.filter(a => a.series_ended_at || a.status === 'rejected' || a.status === 'completed');

  const durationLabel = selectedType === 'video' ? '60 dk' : '20 dk';
  const endTimeLabel = selectedTime
    ? minutesToTime(timeToMinutes(selectedTime) + DURATION[selectedType])
    : '';

  return (
    <div className="space-y-6 pb-24">
      {/* Booking buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openDialog('video')}
          className="glass-card rounded-2xl p-6 flex flex-col items-center gap-4 border border-primary/20 hover:border-primary/50 transition-all group cursor-pointer"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-display font-semibold text-lg">Görüntülü Görüşme</p>
            <p className="text-sm text-muted-foreground mt-1">60 dakika · Yüz yüze koçluk seansı</p>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openDialog('voice')}
          className="glass-card rounded-2xl p-6 flex flex-col items-center gap-4 border border-emerald-500/20 hover:border-emerald-500/50 transition-all group cursor-pointer"
        >
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
            <Phone className="h-8 w-8 text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="font-display font-semibold text-lg">Sesli Görüşme</p>
            <p className="text-sm text-muted-foreground mt-1">20 dakika · Telefon ile koçluk seansı</p>
          </div>
        </motion.button>
      </div>

      {/* Active recurring appointments */}
      {activeRecurring.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Repeat className="h-4 w-4" /> Haftalık Tekrarlanan Görüşmeler
          </h3>
          {activeRecurring.map(a => {
            const nextOccurrence = a.recurring_day != null && a.recurring_time
              ? getNextOccurrence(a.recurring_day, a.recurring_time)
              : new Date(a.scheduled_at);
            const endTime = a.recurring_time
              ? minutesToTime(timeToMinutes(a.recurring_time) + (a.duration_minutes || 60))
              : '';

            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6 border border-emerald-500/30 relative overflow-hidden"
              >
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <Repeat className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Haftalık Tekrar</span>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
                    {a.type === 'video' ? <Video className="h-7 w-7 text-primary" /> : <Phone className="h-7 w-7 text-emerald-400" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-display font-bold text-lg">
                      {a.type === 'video' ? 'Görüntülü' : 'Sesli'} Görüşme
                      <span className="text-sm font-normal text-muted-foreground ml-2">({a.duration_minutes || 60} dk)</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Her <span className="font-semibold text-foreground">{DAY_NAMES[a.recurring_day ?? 0]}</span> — {a.recurring_time}{endTime ? ` → ${endTime}` : ''}
                    </p>

                    <div className="mt-4 rounded-xl bg-primary/10 border border-primary/25 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bir Sonraki Görüşme</p>
                      <p className="font-display font-black text-2xl text-primary">
                        {format(nextOccurrence, 'dd MMMM yyyy', { locale: tr })}
                      </p>
                      <p className="font-display font-black text-3xl text-foreground">
                        {format(nextOccurrence, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {statusBadge(a.status)}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Bekleyen Talepler
          </h3>
          {pending.map(a => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-5 flex items-center gap-4 border border-amber-500/20"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
                {a.type === 'video' ? <Video className="h-6 w-6 text-primary" /> : <Phone className="h-6 w-6 text-emerald-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold">
                  {a.type === 'video' ? 'Görüntülü' : 'Sesli'} Görüşme
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">({a.duration_minutes || 60} dk)</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Her <span className="font-medium text-foreground">{DAY_NAMES[a.recurring_day ?? new Date(a.scheduled_at).getDay()]}</span> — {a.recurring_time || format(new Date(a.scheduled_at), 'HH:mm')}
                </p>
                <p className="text-amber-400 font-bold text-lg mt-1">{format(new Date(a.scheduled_at), 'dd MMMM yyyy — HH:mm', { locale: tr })}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(a.status)}
                <Button variant="ghost" size="icon" onClick={() => handleCancel(a.id)} className="text-destructive hover:text-destructive h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ended / Past */}
      {ended.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Sona Eren / Geçmiş</h3>
          {ended.slice(0, 5).map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4 flex items-center gap-3 opacity-60">
              {a.type === 'video' ? <Video className="h-5 w-5 text-muted-foreground" /> : <Phone className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm flex-1">
                {DAY_NAMES[a.recurring_day ?? 0]} — {a.recurring_time || format(new Date(a.scheduled_at), 'HH:mm')}
              </span>
              {a.series_ended_at && <span className="text-xs text-muted-foreground">Seri sonlandırıldı</span>}
              {statusBadge(a.status)}
            </div>
          ))}
        </div>
      )}

      {!loading && appointments.length === 0 && (
        <div className="glass-card rounded-2xl p-10 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Henüz randevu talebin yok. Yukarıdaki butonlardan görüşme planla!</p>
        </div>
      )}

      {/* Booking dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {selectedType === 'video' ? <Video className="h-5 w-5 text-primary" /> : <Phone className="h-5 w-5 text-emerald-400" />}
              {selectedType === 'video' ? 'Görüntülü Görüşme Planla' : 'Sesli Görüşme Planla'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Duration info */}
            <div className="rounded-xl bg-secondary/50 border border-border p-3 flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium">
                Süre: <span className="text-primary font-bold">{durationLabel}</span>
                {selectedType === 'video' ? ' (Görüntülü)' : ' (Sesli)'}
              </p>
            </div>

            {/* Recurring notice */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2.5">
              <Repeat className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300 font-medium leading-snug">
                Bu randevu <span className="font-bold">her hafta aynı gün ve saatte</span> tekrarlanacaktır.
              </p>
            </div>

            {/* Date picker */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /> Tarih Seç</p>
              {availability.length === 0 ? (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center">
                  <p className="text-sm text-destructive font-medium">Koçunuz henüz müsaitlik aralığı belirlememiş.</p>
                  <p className="text-xs text-muted-foreground mt-1">Randevu almak için koçunuzun müsaitlik saatlerini ayarlaması gerekiyor.</p>
                </div>
              ) : (
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                    disabled={(date) => {
                      if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                      return !availableDays.has(date.getDay());
                    }}
                    locale={tr}
                    className={cn("p-3 pointer-events-auto rounded-xl border border-border bg-secondary")}
                  />
                </div>
              )}
            </div>

            {/* Time slot picker */}
            {selectedDate && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Müsait Saatler</p>
                {availableTimeSlots.length === 0 ? (
                  <div className="rounded-xl bg-secondary p-4 text-center">
                    <p className="text-sm text-muted-foreground">Bu gün için müsait saat bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {availableTimeSlots.map(t => {
                      const end = minutesToTime(timeToMinutes(t) + DURATION[selectedType]);
                      return (
                        <button
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          className={`rounded-xl p-2.5 text-center border transition-all ${
                            selectedTime === t
                              ? 'border-primary bg-primary/10 text-primary font-bold'
                              : 'border-border bg-secondary hover:border-primary/40 hover:bg-primary/5 text-foreground'
                          }`}
                        >
                          <span className="text-sm font-medium">{t}</span>
                          <span className="block text-[10px] text-muted-foreground">{t}–{end}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected summary */}
            {selectedDate && selectedTime && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-center"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Haftalık Randevu</p>
                <p className="font-display font-bold text-lg text-foreground">
                  Her <span className="text-primary">{DAY_NAMES[selectedDate.getDay()]}</span>
                </p>
                <p className="font-display font-bold text-3xl text-primary">
                  {selectedTime} — {endTimeLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedType === 'video' ? 'Görüntülü' : 'Sesli'} · {durationLabel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  İlk görüşme: {format(selectedDate, 'dd MMMM yyyy', { locale: tr })}
                </p>
              </motion.div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedDate || !selectedTime}
              className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base gap-2"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              {submitting ? 'Gönderiliyor...' : 'Haftalık Randevu Al'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
