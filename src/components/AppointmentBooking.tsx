import { useState, useEffect, useMemo } from 'react';
import { Video, Phone, CalendarIcon, Clock, Check, X, Loader2, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
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
const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun display order
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

function getNextOccurrenceForDay(dayOfWeek: number, time: string): Date {
  const now = new Date();
  const [h, m] = time.split(':').map(Number);
  const today = now.getDay();
  let target: Date;
  if (today === dayOfWeek) {
    target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target = addDays(target, 7);
  } else {
    target = nextDay(now, dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    target.setHours(h, m, 0, 0);
  }
  return target;
}

function computeAvailableSlots(
  availability: AvailabilitySlot[],
  approved: ApprovedSlot[],
  dayOfWeek: number,
  durationMinutes: number
): string[] {
  const windows = availability
    .filter(a => a.day_of_week === dayOfWeek)
    .map(a => ({
      start: timeToMinutes(a.start_time),
      end: a.end_time === '00:00:00' || a.end_time === '00:00' ? 1440 : timeToMinutes(a.end_time),
    }));
  if (windows.length === 0) return [];

  const blocked = approved
    .filter(a => a.recurring_day === dayOfWeek)
    .map(a => ({
      start: timeToMinutes(a.recurring_time),
      end: timeToMinutes(a.recurring_time) + a.duration_minutes,
    }));

  const slots: string[] = [];
  for (const w of windows) {
    for (let t = w.start; t + durationMinutes <= w.end; t += 10) {
      const candidateEnd = t + durationMinutes;
      const isBlocked = blocked.some(b => t < b.end && candidateEnd > b.start);
      if (!isBlocked) slots.push(minutesToTime(t));
    }
  }
  return [...new Set(slots)];
}

export default function AppointmentBooking({ studentId, coachId }: { studentId: string; coachId?: string | null }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'video' | 'voice'>('video');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      supabase.from('coach_availability').select('day_of_week, start_time, end_time').eq('coach_id', coachId),
      supabase.from('appointments').select('recurring_day, recurring_time, duration_minutes')
        .eq('coach_id', coachId).eq('status', 'approved').eq('recurring', true).is('series_ended_at', null),
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

  // Check if type already has an active or pending appointment
  const hasActiveOrPending = (type: 'video' | 'voice') => {
    return appointments.some(a => 
      a.type === type && 
      (a.status === 'approved' || a.status === 'pending') && 
      !a.series_ended_at
    );
  };

  const openDialog = (type: 'video' | 'voice') => {
    if (hasActiveOrPending(type)) {
      toast.error(
        type === 'video'
          ? 'Zaten aktif veya bekleyen bir görüntülü görüşme randevun var.'
          : 'Zaten aktif veya bekleyen bir sesli görüşme randevun var.'
      );
      return;
    }
    setSelectedType(type);
    setSelectedDay(null);
    setSelectedTime(null);
    setDialogOpen(true);
    fetchAvailabilityAndApproved();
  };

  const availableDays = useMemo(() => new Set(availability.map(a => a.day_of_week)), [availability]);

  // Compute slots per day for the column view
  const slotsPerDay = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const dow of DAY_ORDER) {
      map[dow] = computeAvailableSlots(availability, approvedSlots, dow, DURATION[selectedType]);
    }
    return map;
  }, [availability, approvedSlots, selectedType]);

  const handleSubmit = async () => {
    if (selectedDay === null || !selectedTime) { toast.error('Lütfen gün ve saat seçin.'); return; }
    const scheduledAt = getNextOccurrenceForDay(selectedDay, selectedTime);
    if (scheduledAt <= new Date()) { toast.error('Geçmiş bir tarih seçemezsiniz.'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('appointments').insert({
      student_id: studentId,
      coach_id: coachId || null,
      type: selectedType,
      scheduled_at: scheduledAt.toISOString(),
      recurring: true,
      recurring_day: selectedDay,
      recurring_time: selectedTime,
      duration_minutes: DURATION[selectedType],
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
  

  return (
    <div className="space-y-6 pb-24">
      {/* Booking buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(['video', 'voice'] as const).map(type => {
          const blocked = hasActiveOrPending(type);
          const isVideo = type === 'video';
          return (
            <motion.button key={type} whileHover={blocked ? {} : { scale: 1.02 }} whileTap={blocked ? {} : { scale: 0.98 }}
              onClick={() => openDialog(type)}
              className={`glass-card rounded-2xl p-6 flex flex-col items-center gap-4 border transition-all ${
                blocked
                  ? 'opacity-50 cursor-not-allowed border-border'
                  : isVideo
                    ? 'border-primary/20 hover:border-primary/50 group cursor-pointer'
                    : 'border-emerald-500/20 hover:border-emerald-500/50 group cursor-pointer'
              }`}
            >
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-colors ${
                isVideo ? 'bg-primary/15 group-hover:bg-primary/25' : 'bg-emerald-500/15 group-hover:bg-emerald-500/25'
              }`}>
                {isVideo ? <Video className="h-8 w-8 text-primary" /> : <Phone className="h-8 w-8 text-emerald-400" />}
              </div>
              <div className="text-center">
                <p className="font-display font-semibold text-lg">{isVideo ? 'Görüntülü Görüşme' : 'Sesli Görüşme'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {blocked ? 'Mevcut randevun var' : isVideo ? 'Yüz yüze koçluk seansı' : 'Telefon ile koçluk seansı'}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Active recurring */}
      {activeRecurring.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Repeat className="h-4 w-4" /> Haftalık Tekrarlanan Görüşmeler
          </h3>
          {activeRecurring.map(a => {
            const nextOcc = a.recurring_day != null && a.recurring_time
              ? getNextOccurrenceForDay(a.recurring_day, a.recurring_time) : new Date(a.scheduled_at);
            
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-4 sm:p-6 border border-emerald-500/30 relative overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 w-fit mb-3 sm:mb-0 sm:absolute sm:top-3 sm:right-3">
                  <Repeat className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Haftalık Tekrar</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
                    {a.type === 'video' ? <Video className="h-6 w-6 sm:h-7 sm:w-7 text-primary" /> : <Phone className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-base sm:text-lg">
                      {a.type === 'video' ? 'Görüntülü' : 'Sesli'} Görüşme
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Her <span className="font-semibold text-foreground">{DAY_NAMES[a.recurring_day ?? 0]}</span> — {a.recurring_time}
                    </p>
                    <div className="mt-3 sm:mt-4 rounded-xl bg-primary/10 border border-primary/25 p-3 sm:p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bir Sonraki Görüşme</p>
                      <p className="font-display font-black text-xl sm:text-2xl text-primary">{format(nextOcc, 'dd MMMM yyyy', { locale: tr })}</p>
                      <p className="font-display font-black text-2xl sm:text-3xl text-foreground">{format(nextOcc, 'HH:mm')}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">{statusBadge(a.status)}</div>
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
              className="glass-card rounded-2xl p-4 sm:p-5 border border-amber-500/20">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
                  {a.type === 'video' ? <Video className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> : <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm sm:text-base">
                    {a.type === 'video' ? 'Görüntülü' : 'Sesli'} Görüşme
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Her <span className="font-medium text-foreground">{DAY_NAMES[a.recurring_day ?? new Date(a.scheduled_at).getDay()]}</span> — {a.recurring_time || format(new Date(a.scheduled_at), 'HH:mm')}
                  </p>
                  <p className="text-amber-400 font-bold text-sm sm:text-lg mt-1">{format(new Date(a.scheduled_at), 'dd MMMM yyyy — HH:mm', { locale: tr })}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                {statusBadge(a.status)}
                <Button variant="ghost" size="sm" onClick={() => handleCancel(a.id)} className="text-destructive hover:text-destructive h-9 px-3 gap-1">
                  <X className="h-4 w-4" /> İptal
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ended */}
      {ended.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Sona Eren / Geçmiş</h3>
          {ended.slice(0, 5).map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4 flex items-center gap-3 opacity-60">
              {a.type === 'video' ? <Video className="h-5 w-5 text-muted-foreground" /> : <Phone className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm flex-1">{DAY_NAMES[a.recurring_day ?? 0]} — {a.recurring_time || format(new Date(a.scheduled_at), 'HH:mm')}</span>
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

      {/* ====== BOOKING DIALOG ====== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-3 text-xl">
              {selectedType === 'video' ? <Video className="h-6 w-6 text-primary" /> : <Phone className="h-6 w-6 text-emerald-400" />}
              {selectedType === 'video' ? 'Görüntülü Görüşme Planla' : 'Sesli Görüşme Planla'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-3">
            {/* Recurring info */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center gap-2.5">
              <Repeat className="h-4.5 w-4.5 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300 font-medium">Bu randevu her hafta otomatik tekrar eder</p>
            </div>

            {availability.length === 0 ? (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-6 text-center">
                <p className="text-base text-destructive font-medium">Koçunuz henüz müsaitlik aralığı belirlememiş.</p>
                <p className="text-sm text-muted-foreground mt-2">Randevu almak için koçunuzun müsaitlik saatlerini ayarlaması gerekiyor.</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-base font-semibold mb-3 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" /> Gün Seç
                  </p>

                  {/* Day list rows */}
                  <div className="space-y-2">
                    {DAY_ORDER.map((dow) => {
                      const daySlots = slotsPerDay[dow] || [];
                      const hasSlots = daySlots.length > 0;
                      const isSelectedDay = selectedDay === dow;
                      const isFull = availableDays.has(dow) && !hasSlots;

                      return (
                        <div key={dow}>
                          <button
                            disabled={!hasSlots}
                            onClick={() => {
                              if (isSelectedDay) {
                                setSelectedDay(null);
                                setSelectedTime(null);
                              } else {
                                setSelectedDay(dow);
                                setSelectedTime(null);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all ${
                              isSelectedDay
                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                                : hasSlots
                                  ? 'border-border bg-card hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
                                  : 'border-border/30 bg-secondary/20 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-display font-bold text-sm ${
                                isSelectedDay
                                  ? 'bg-primary text-primary-foreground'
                                  : hasSlots
                                    ? 'bg-primary/15 text-primary'
                                    : 'bg-muted text-muted-foreground'
                              }`}>
                                {DAY_SHORT[DAY_ORDER.indexOf(dow)]}
                              </div>
                              <div className="text-left">
                                <p className={`font-display font-semibold ${!hasSlots ? 'text-muted-foreground' : 'text-foreground'}`}>
                                  {DAY_NAMES[dow]}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {hasSlots
                                    ? `${daySlots.length} saat dilimi müsait`
                                    : isFull
                                      ? 'Tüm saatler dolu'
                                      : 'Müsait değil'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!hasSlots && isFull && (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Dolu</span>
                              )}
                              {hasSlots && (
                                <Clock className={`h-4 w-4 transition-transform ${isSelectedDay ? 'text-primary rotate-90' : 'text-muted-foreground'}`} />
                              )}
                            </div>
                          </button>

                          {/* Expandable time slots panel */}
                          <AnimatePresence>
                            {isSelectedDay && hasSlots && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="pt-3 pb-1 px-2">
                                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" /> Saat seçin — {DAY_NAMES[dow]}
                                  </p>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                    {daySlots.map(t => {
                                      const isSelected = selectedTime === t;
                                      return (
                                        <button
                                          key={t}
                                          onClick={() => setSelectedTime(t)}
                                          className={`rounded-xl py-2.5 px-2 text-center transition-all border-2 ${
                                            isSelected
                                              ? 'border-primary bg-gradient-orange text-primary-foreground font-bold shadow-lg shadow-primary/20'
                                              : 'border-primary/30 bg-card hover:border-primary hover:bg-primary/5 text-foreground'
                                          }`}
                                        >
                                          <span className="text-sm font-bold">{t}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selection summary */}
                <AnimatePresence>
                  {selectedDay !== null && selectedTime && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className="rounded-2xl bg-primary/10 border-2 border-primary/30 p-6 text-center"
                    >
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Haftalık Randevu Özeti</p>
                      <p className="font-display font-bold text-xl text-foreground">
                        Her <span className="text-primary">{DAY_NAMES[selectedDay]}</span>
                      </p>
                      <p className="font-display font-black text-4xl text-primary mt-1">{selectedTime}</p>
                      <p className="text-sm text-muted-foreground mt-2">{selectedType === 'video' ? '📹 Görüntülü Görüşme' : '📞 Sesli Görüşme'}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Confirm button - sticky at bottom */}
            <Button onClick={handleSubmit} disabled={submitting || selectedDay === null || !selectedTime}
              className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-14 text-lg font-bold rounded-2xl gap-2 sticky bottom-0">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              {submitting ? 'Gönderiliyor...' : 'Randevu Onayla'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
