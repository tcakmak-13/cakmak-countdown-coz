import { useState, useEffect, useMemo } from 'react';
import { Video, Phone, CalendarIcon, Clock, Check, X, Loader2, Repeat, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, nextDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  type: string;
}

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DURATION = { video: 60, voice: 20 };
const SLOT_DURATION = 20;
const SLOT_HEIGHT = 44;

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

interface TimelineSlot {
  time: string;
  minutes: number;
  type: 'available' | 'booked';
  span: number;
  canSelect: boolean;
  bookedType?: string;
  bookedDuration?: number;
}

function buildStudentTimeline(
  availability: AvailabilitySlot[],
  approved: ApprovedSlot[],
  dow: number,
  selectedDuration: number
): TimelineSlot[] {
  const dayAvail = availability.filter(a => a.day_of_week === dow);
  const dayAppts = approved.filter(a => a.recurring_day === dow);

  const availMinutes = new Set<number>();
  for (const s of dayAvail) {
    const start = timeToMinutes(s.start_time);
    const end = s.end_time === '00:00:00' || s.end_time === '00:00' ? 1440 : timeToMinutes(s.end_time);
    for (let t = start; t < end; t += SLOT_DURATION) availMinutes.add(t);
  }

  const apptBlocks: { start: number; end: number; type: string; duration: number }[] = [];
  for (const a of dayAppts) {
    if (!a.recurring_time) continue;
    const start = timeToMinutes(a.recurring_time);
    apptBlocks.push({ start, end: start + a.duration_minutes, type: a.type, duration: a.duration_minutes });
  }

  const allMinutes = new Set<number>();
  for (const m of availMinutes) allMinutes.add(m);
  for (const b of apptBlocks) {
    for (let t = b.start; t < b.end; t += SLOT_DURATION) allMinutes.add(t);
  }

  const sorted = Array.from(allMinutes).sort((a, b) => a - b);
  const result: TimelineSlot[] = [];
  const consumed = new Set<number>();

  for (const m of sorted) {
    if (consumed.has(m)) continue;

    const apptBlock = apptBlocks.find(b => m >= b.start && m < b.end);
    if (apptBlock && m === apptBlock.start) {
      const span = Math.ceil(apptBlock.duration / SLOT_DURATION);
      for (let i = 0; i < span; i++) consumed.add(apptBlock.start + i * SLOT_DURATION);
      result.push({
        time: minutesToTime(m), minutes: m, type: 'booked', span, canSelect: false,
        bookedType: apptBlock.type, bookedDuration: apptBlock.duration,
      });
    } else if (apptBlock) {
      consumed.add(m);
    } else {
      consumed.add(m);
      // Check if there's enough room for the selected duration
      let canFit = true;
      const slotsNeeded = Math.ceil(selectedDuration / SLOT_DURATION);
      for (let i = 0; i < slotsNeeded; i++) {
        const checkM = m + i * SLOT_DURATION;
        if (!availMinutes.has(checkM) || apptBlocks.some(b => checkM >= b.start && checkM < b.end)) {
          canFit = false;
          break;
        }
      }
      result.push({
        time: minutesToTime(m), minutes: m, type: 'available', span: 1, canSelect: canFit,
      });
    }
  }
  return result;
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

  const [dialogDayIdx, setDialogDayIdx] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });

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
      supabase.from('appointments').select('recurring_day, recurring_time, duration_minutes, type')
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

  const dialogTimelines = useMemo(() => {
    const map: Record<number, TimelineSlot[]> = {};
    for (let idx = 0; idx < 7; idx++) {
      const dow = DAY_ORDER[idx];
      map[idx] = buildStudentTimeline(availability, approvedSlots, dow, DURATION[selectedType]);
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
    if (error) { toast.error('Randevu oluşturulamadı.'); return; }
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

  const handleSlotClick = (dayIdx: number, slot: TimelineSlot) => {
    if (!slot.canSelect) return;
    const dow = DAY_ORDER[dayIdx];
    if (selectedDay === dow && selectedTime === slot.time) {
      setSelectedDay(null);
      setSelectedTime(null);
    } else {
      setSelectedDay(dow);
      setSelectedTime(slot.time);
    }
  };

  const renderTimelineColumn = (dayIdx: number) => {
    const timeline = dialogTimelines[dayIdx];
    const dow = DAY_ORDER[dayIdx];

    return (
      <div className="space-y-0.5">
        {timeline.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/30">
            <Clock className="h-5 w-5 mb-1" />
            <p className="text-[10px]">Boş</p>
          </div>
        )}
        {timeline.map((slot) => {
          if (slot.type === 'booked') {
            const height = slot.span * SLOT_HEIGHT;
            return (
              <div
                key={`booked-${slot.minutes}`}
                className="rounded-lg border border-red-500/30 bg-red-500/10 flex items-center gap-1.5 px-2 overflow-hidden"
                style={{ height: `${height}px`, minHeight: `${height}px` }}
              >
                <div className="shrink-0">
                  {slot.bookedType === 'video'
                    ? <Video className="h-3 w-3 text-red-400" />
                    : <Phone className="h-3 w-3 text-red-400" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-red-400 leading-tight">{slot.time}</p>
                  <p className="text-[9px] text-red-400/70">Dolu</p>
                </div>
              </div>
            );
          }

          const isSelected = selectedDay === dow && selectedTime === slot.time;
          return (
            <button
              key={`avail-${slot.minutes}`}
              disabled={!slot.canSelect}
              onClick={() => handleSlotClick(dayIdx, slot)}
              className={cn(
                "w-full rounded-lg border transition-all flex items-center justify-center",
                isSelected
                  ? "border-primary bg-primary/20 ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                  : slot.canSelect
                    ? "border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/20 hover:border-emerald-500/50 cursor-pointer"
                    : "border-border/30 bg-muted/20 opacity-40 cursor-not-allowed"
              )}
              style={{ height: `${SLOT_HEIGHT}px`, minHeight: `${SLOT_HEIGHT}px` }}
            >
              <span className={cn(
                "text-[11px] font-bold tabular-nums",
                isSelected ? "text-primary" : slot.canSelect ? "text-emerald-500" : "text-muted-foreground"
              )}>
                {slot.time}
              </span>
              {isSelected && <Check className="h-3 w-3 text-primary ml-1" />}
            </button>
          );
        })}
      </div>
    );
  };

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
            <div key={a.id} className="glass-card rounded-xl p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3 opacity-60">
              {a.type === 'video' ? <Video className="h-5 w-5 text-muted-foreground shrink-0" /> : <Phone className="h-5 w-5 text-muted-foreground shrink-0" />}
              <span className="text-sm flex-1 min-w-0 truncate">{DAY_NAMES[a.recurring_day ?? 0]} — {a.recurring_time || format(new Date(a.scheduled_at), 'HH:mm')}</span>
              <div className="flex items-center gap-2 flex-wrap">
                {a.series_ended_at && <span className="text-xs text-muted-foreground">Seri sonlandırıldı</span>}
                {statusBadge(a.status)}
              </div>
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

      {/* ====== BOOKING DIALOG - TIMELINE VIEW ====== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-3 text-xl">
              {selectedType === 'video' ? <Video className="h-6 w-6 text-primary" /> : <Phone className="h-6 w-6 text-emerald-400" />}
              {selectedType === 'video' ? 'Görüntülü Görüşme Planla' : 'Sesli Görüşme Planla'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Info badges */}
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 flex items-center gap-2">
                <Repeat className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300 font-medium">Her hafta tekrar eder</p>
              </div>
              <div className="rounded-xl bg-muted/50 border border-border px-3 py-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground font-medium">{DURATION[selectedType]} dk · 20 dk'lık slotlar</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-6 rounded bg-emerald-500/20 border border-emerald-500/30" />
                <span className="text-muted-foreground">Müsait</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-6 rounded bg-red-500/15 border border-red-500/30" />
                <span className="text-muted-foreground">Dolu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-6 rounded bg-primary/20 border border-primary/40 ring-2 ring-primary/30" />
                <span className="text-muted-foreground">Seçilen</span>
              </div>
            </div>

            {availability.length === 0 ? (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-6 text-center">
                <p className="text-base text-destructive font-medium">Koçunuz henüz müsaitlik aralığı belirlememiş.</p>
                <p className="text-sm text-muted-foreground mt-2">Randevu almak için koçunuzun müsaitlik saatlerini ayarlaması gerekiyor.</p>
              </div>
            ) : (
              <>
                {/* Mobile: single day with nav */}
                <div className="sm:hidden">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setDialogDayIdx(p => (p + 6) % 7)}
                      className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="text-center">
                      <p className="font-display font-bold text-lg">{DAY_SHORT[dialogDayIdx]}</p>
                      <p className="text-[10px] text-muted-foreground">{DAY_NAMES[DAY_ORDER[dialogDayIdx]]}</p>
                    </div>
                    <button onClick={() => setDialogDayIdx(p => (p + 1) % 7)}
                      className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/50 p-3">
                    {renderTimelineColumn(dialogDayIdx)}
                  </div>
                </div>

                {/* Desktop: 7-day grid */}
                <div className="hidden sm:grid grid-cols-7 gap-2">
                  {DAY_SHORT.map((label, idx) => {
                    const dow = DAY_ORDER[idx];
                    const timeline = dialogTimelines[idx];
                    const hasContent = timeline.length > 0;
                    const isDaySelected = selectedDay === dow;

                    return (
                      <div key={idx} className={cn(
                        "rounded-2xl border p-2 flex flex-col min-h-[200px] transition-all",
                        isDaySelected
                          ? "border-primary/40 bg-primary/5"
                          : hasContent
                            ? "border-border bg-card/50"
                            : "border-border/30 bg-muted/10"
                      )}>
                        <div className={cn(
                          "text-center mb-2 pb-2 border-b",
                          isDaySelected ? "border-primary/30" : "border-border"
                        )}>
                          <p className={cn(
                            "font-display font-bold text-sm",
                            isDaySelected ? "text-primary" : "text-foreground"
                          )}>{label}</p>
                        </div>
                        <div className="flex-1">
                          {renderTimelineColumn(idx)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Selection summary */}
            <AnimatePresence>
              {selectedDay !== null && selectedTime && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="rounded-2xl bg-primary/10 border-2 border-primary/30 p-5 text-center"
                >
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Haftalık Randevu Özeti</p>
                  <p className="font-display font-bold text-xl text-foreground">
                    Her <span className="text-primary">{DAY_NAMES[selectedDay]}</span>
                  </p>
                  <p className="font-display font-black text-4xl text-primary mt-1">{selectedTime}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedType === 'video' ? '📹 Görüntülü Görüşme — 60 dk' : '📞 Sesli Görüşme — 20 dk'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirm button */}
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
