import { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, Trash2, Loader2, CalendarClock, Check, X, Video, Phone, Repeat, StopCircle, Pencil, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { addDays, nextDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ── Constants ── */
const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const IDX_TO_DOW = [1, 2, 3, 4, 5, 6, 0];
const DOW_NAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const SLOT_DURATION = 20; // minutes

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);
const MINUTES_OPTIONS = [0, 15, 30, 45];

function timeOptions() {
  const opts: string[] = [];
  for (const h of HOURS) for (const m of MINUTES_OPTIONS) opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  opts.push('00:00');
  return opts;
}
const TIME_OPTIONS = timeOptions();

const EDIT_HOURS = Array.from({ length: 13 }, (_, i) => i + 9);

/* ── Interfaces ── */
interface AvailabilitySlot {
  id: string;
  coach_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

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

/* ── Timeline slot type ── */
interface TimelineSlot {
  time: string; // "HH:MM"
  minutes: number;
  type: 'available' | 'appointment';
  span: number; // how many 20-min slots this block spans
  appointment?: AppointmentRow;
  availabilityId?: string;
  isStart: boolean; // only render for first slot of a multi-slot block
}

/* ── Helpers ── */
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

function buildTimeline(
  availSlots: AvailabilitySlot[],
  appointments: AppointmentRow[],
  dow: number
): TimelineSlot[] {
  const dayAvail = availSlots.filter(s => s.day_of_week === dow);
  const dayAppts = appointments.filter(a =>
    a.status === 'approved' && a.recurring && !a.series_ended_at && a.recurring_day === dow
  );

  // Build set of 20-min availability periods
  const availMinutes = new Map<number, string>(); // minute → availability id
  for (const s of dayAvail) {
    const start = timeToMinutes(s.start_time);
    const end = s.end_time === '00:00:00' || s.end_time === '00:00' ? 1440 : timeToMinutes(s.end_time);
    for (let t = start; t < end; t += SLOT_DURATION) {
      availMinutes.set(t, s.id);
    }
  }

  // Build appointment blocks
  const apptBlocks: { start: number; end: number; appt: AppointmentRow }[] = [];
  for (const a of dayAppts) {
    if (!a.recurring_time) continue;
    const start = timeToMinutes(a.recurring_time);
    const end = start + a.duration_minutes;
    apptBlocks.push({ start, end, appt: a });
  }

  // Collect all relevant 20-min periods
  const allMinutes = new Set<number>();
  for (const m of availMinutes.keys()) allMinutes.add(m);
  for (const b of apptBlocks) {
    for (let t = b.start; t < b.end; t += SLOT_DURATION) allMinutes.add(t);
  }

  const sorted = Array.from(allMinutes).sort((a, b) => a - b);
  const result: TimelineSlot[] = [];
  const consumed = new Set<number>();

  for (const m of sorted) {
    if (consumed.has(m)) continue;

    // Check if this slot is part of an appointment
    const apptBlock = apptBlocks.find(b => m >= b.start && m < b.end);
    if (apptBlock && m === apptBlock.start) {
      const span = Math.ceil(apptBlock.appt.duration_minutes / SLOT_DURATION);
      for (let i = 0; i < span; i++) consumed.add(apptBlock.start + i * SLOT_DURATION);
      result.push({
        time: minutesToTime(m),
        minutes: m,
        type: 'appointment',
        span,
        appointment: apptBlock.appt,
        isStart: true,
      });
    } else if (apptBlock) {
      // Inside an appointment but not start - skip
      consumed.add(m);
    } else {
      // Available slot
      consumed.add(m);
      result.push({
        time: minutesToTime(m),
        minutes: m,
        type: 'available',
        span: 1,
        availabilityId: availMinutes.get(m),
        isStart: true,
      });
    }
  }

  return result;
}

/* ── Component ── */
export default function CoachSchedule({ coachProfileId }: { coachProfileId: string }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [formDay, setFormDay] = useState<number | null>(null);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('12:00');
  const [adding, setAdding] = useState<number | null>(null);

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [editDialog, setEditDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<AppointmentRow | null>(null);
  const [editDay, setEditDay] = useState(1);
  const [editHour, setEditHour] = useState(10);
  const [editMinute, setEditMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Selected day for mobile (single-day view)
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // Convert to Mon=0 index
  });

  /* ── Fetch ── */
  const fetchAll = async () => {
    const [slotRes, apptRes] = await Promise.all([
      supabase.from('coach_availability').select('*').eq('coach_id', coachProfileId).order('start_time', { ascending: true }),
      supabase.from('appointments').select('*, profiles!appointments_student_id_fkey(full_name, username)').eq('coach_id', coachProfileId).order('scheduled_at', { ascending: false }),
    ]);
    setSlots((slotRes.data as AvailabilitySlot[]) || []);
    setAppointments((apptRes.data as unknown as AppointmentRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel('coach-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_availability' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coachProfileId]);

  /* ── Availability actions ── */
  const handleAddSlot = async (dayOfWeek: number) => {
    if (formStart >= formEnd && formEnd !== '00:00') { toast.error('Başlangıç bitiş saatinden önce olmalı.'); return; }
    setAdding(dayOfWeek);
    const { error } = await supabase.from('coach_availability').insert({ coach_id: coachProfileId, day_of_week: dayOfWeek, start_time: formStart, end_time: formEnd });
    setAdding(null);
    if (error) { toast.error('Müsaitlik eklenemedi.'); return; }
    toast.success('Müsaitlik eklendi!');
    setFormDay(null);
    fetchAll();
  };

  const handleDeleteSlot = async (id: string) => {
    await supabase.from('coach_availability').delete().eq('id', id);
    toast.success('Silindi');
    fetchAll();
  };

  /* ── Appointment actions ── */
  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    setUpdatingId(null);
    if (error) toast.error('İşlem başarısız.');
    else toast.success(status === 'approved' ? 'Randevu onaylandı!' : 'Randevu reddedildi.');
  };

  const endSeries = async (id: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('appointments').update({ series_ended_at: new Date().toISOString() }).eq('id', id);
    setUpdatingId(null);
    if (error) toast.error('İşlem başarısız.');
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
    const { error } = await supabase.from('appointments').update({ recurring_day: editDay, recurring_time: newTime, scheduled_at: nextOcc.toISOString() }).eq('id', editTarget.id);
    setSaving(false);
    if (error) toast.error('Güncelleme başarısız.');
    else { toast.success('Randevu güncellendi!'); setEditDialog(false); fetchAll(); }
  };

  /* ── Derived data ── */
  const pending = useMemo(() => appointments.filter(a => a.status === 'pending'), [appointments]);
  const history = useMemo(() => appointments.filter(a => a.status !== 'pending' && !(a.status === 'approved' && a.recurring && !a.series_ended_at)), [appointments]);

  // Build timeline for each day
  const timelines = useMemo(() => {
    const map: Record<number, TimelineSlot[]> = {};
    for (let idx = 0; idx < 7; idx++) {
      const dow = IDX_TO_DOW[idx];
      map[idx] = buildTimeline(slots, appointments, dow);
    }
    return map;
  }, [slots, appointments]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const SLOT_HEIGHT = 44; // px per 20-min slot

  const renderTimeline = (dayIdx: number, compact = false) => {
    const timeline = timelines[dayIdx];
    const dow = IDX_TO_DOW[dayIdx];
    const isFormOpen = formDay === dow;

    return (
      <div className="flex flex-col h-full">
        {/* Timeline slots */}
        <div className="flex-1 space-y-0.5">
          {timeline.length === 0 && !isFormOpen && (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/30">
              <Clock className="h-5 w-5 mb-1" />
              <p className="text-[10px]">Boş</p>
            </div>
          )}

          {timeline.map((slot, i) => {
            if (!slot.isStart) return null;

            if (slot.type === 'appointment') {
              const a = slot.appointment!;
              const height = slot.span * SLOT_HEIGHT;
              return (
                <div
                  key={`appt-${a.id}`}
                  className="group relative rounded-lg border border-emerald-500/40 bg-emerald-500/15 overflow-hidden transition-all hover:border-emerald-500/60"
                  style={{ height: compact ? undefined : `${height}px`, minHeight: compact ? undefined : `${height}px` }}
                >
                  <div className={cn(
                    "flex items-center gap-1.5 h-full",
                    compact ? "p-2" : "px-2 py-1"
                  )}>
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      {a.type === 'video'
                        ? <Video className="h-3 w-3 text-emerald-400" />
                        : <Phone className="h-3 w-3 text-emerald-400" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-emerald-400 leading-tight truncate">
                        {slot.time}
                      </p>
                      <p className="text-[9px] text-emerald-400/80 truncate font-medium">
                        {a.profiles?.full_name?.split(' ')[0] || 'Öğrenci'}
                      </p>
                      {!compact && slot.span > 1 && (
                        <p className="text-[8px] text-emerald-400/60">{a.duration_minutes} dk</p>
                      )}
                    </div>
                  </div>
                  {/* Hover actions */}
                  <div className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center gap-0.5">
                    <button onClick={() => openEditDialog(a)}
                      className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Pencil className="h-2 w-2" />
                    </button>
                    <button onClick={() => endSeries(a.id)} disabled={updatingId === a.id}
                      className="h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      {updatingId === a.id ? <Loader2 className="h-2 w-2 animate-spin" /> : <StopCircle className="h-2 w-2" />}
                    </button>
                  </div>
                </div>
              );
            }

            // Available slot
            return (
              <div
                key={`avail-${slot.minutes}`}
                className="group relative rounded-lg border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15 transition-colors"
                style={{ height: compact ? undefined : `${SLOT_HEIGHT}px`, minHeight: compact ? undefined : `${SLOT_HEIGHT}px` }}
              >
                <div className={cn("flex items-center justify-between h-full", compact ? "p-2" : "px-2")}>
                  <span className="text-[10px] font-semibold text-amber-500/80 tabular-nums">{slot.time}</span>
                  {slot.availabilityId && (
                    <button
                      onClick={() => handleDeleteSlot(slot.availabilityId!)}
                      className="h-3.5 w-3.5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-2 w-2" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add availability form / button */}
        {isFormOpen ? (
          <div className="mt-2 pt-2 border-t border-border space-y-1.5">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Başlangıç</label>
              <select value={formStart} onChange={e => setFormStart(e.target.value)}
                className="w-full h-8 rounded-lg bg-secondary border border-border px-2 text-xs font-semibold text-foreground appearance-none cursor-pointer text-center">
                {TIME_OPTIONS.filter(t => t !== '00:00').map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Bitiş</label>
              <select value={formEnd} onChange={e => setFormEnd(e.target.value)}
                className="w-full h-8 rounded-lg bg-secondary border border-border px-2 text-xs font-semibold text-foreground appearance-none cursor-pointer text-center">
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-1">
              <Button onClick={() => handleAddSlot(dow)} disabled={adding === dow}
                className="flex-1 bg-gradient-orange border-0 hover:opacity-90 h-8 rounded-lg font-bold text-[10px]">
                {adding === dow ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3" /> Ekle</>}
              </Button>
              <Button variant="ghost" onClick={() => setFormDay(null)} className="h-8 px-2 rounded-lg text-[10px] text-muted-foreground">
                İptal
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setFormDay(dow); setFormStart('09:00'); setFormEnd('12:00'); }}
            className="mt-2 w-full flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary text-[10px] font-semibold transition-all"
          >
            <Plus className="h-3 w-3" /> Ekle
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <CalendarClock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Haftalık Program</h2>
          <p className="text-xs text-muted-foreground">20 dakikalık dilimlerle zaman çizelgesi</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded border border-amber-500/30 bg-amber-500/15" />
          <span className="text-muted-foreground">Müsait Slot (20dk)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded border border-emerald-500/40 bg-emerald-500/15" />
          <span className="text-muted-foreground">Onaylı Görüşme</span>
        </div>
      </div>

      {/* ═══ Pending Requests ═══ */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <button
            onClick={() => setPendingExpanded(!pendingExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/5 transition-colors"
          >
            <span className="font-display font-semibold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Bekleyen Talepler ({pending.length})
            </span>
            <ChevronDown className={cn("h-4 w-4 text-amber-400 transition-transform", pendingExpanded && "rotate-180")} />
          </button>
          <AnimatePresence>
            {pendingExpanded && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 space-y-2">
                  {pending.map(a => (
                    <div key={a.id} className="glass-card rounded-xl p-3 border border-amber-500/20">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                          a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15')}>
                          {a.type === 'video' ? <Video className="h-4 w-4 text-primary" /> : <Phone className="h-4 w-4 text-emerald-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{a.profiles?.full_name || 'Öğrenci'}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.type === 'video' ? 'Görüntülü' : 'Sesli'} ({a.duration_minutes} dk) — Her {DOW_NAMES_TR[a.recurring_day ?? 0]} {a.recurring_time}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" onClick={() => updateStatus(a.id, 'approved')} disabled={updatingId === a.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8 text-xs">
                            {updatingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Onayla
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(a.id, 'rejected')} disabled={updatingId === a.id} className="gap-1 h-8 text-xs">
                            <X className="h-3 w-3" /> Reddet
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ Mobile Day Selector ═══ */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setSelectedDayIdx(i => (i + 6) % 7)} className="p-2 rounded-xl bg-secondary">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setSelectedDayIdx(i)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  selectedDayIdx === i
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedDayIdx(i => (i + 1) % 7)} className="p-2 rounded-xl bg-secondary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Single day timeline */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-display font-bold text-base mb-3 text-center">{DAY_FULL[selectedDayIdx]}</p>
          {renderTimeline(selectedDayIdx, true)}
        </div>
      </div>

      {/* ═══ Desktop Weekly Grid ═══ */}
      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {DAY_LABELS.map((label, idx) => {
            const timeline = timelines[idx];
            const hasContent = timeline.length > 0;

            return (
              <div
                key={idx}
                className={cn(
                  "rounded-xl border p-3 flex flex-col min-h-[200px] transition-all",
                  hasContent ? "border-primary/20 bg-primary/5" : "border-border bg-card"
                )}
              >
                <div className="text-center mb-2 pb-2 border-b border-border">
                  <p className="font-display font-bold text-sm text-foreground">{label}</p>
                  <p className="text-[9px] text-muted-foreground">{DAY_FULL[idx]}</p>
                </div>
                {renderTimeline(idx)}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ History ═══ */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
          >
            <span className="text-sm font-semibold text-muted-foreground">Geçmiş / Sonlanan ({history.length})</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", historyExpanded && "rotate-180")} />
          </button>
          <AnimatePresence>
            {historyExpanded && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 space-y-2">
                  {history.slice(0, 15).map(a => {
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      approved: { label: 'Onaylandı', cls: 'bg-emerald-500/20 text-emerald-400' },
                      rejected: { label: 'Reddedildi', cls: 'bg-destructive/20 text-destructive' },
                      completed: { label: 'Tamamlandı', cls: 'bg-primary/20 text-primary' },
                    };
                    const s = statusMap[a.status] || { label: a.status, cls: 'bg-secondary text-muted-foreground' };
                    return (
                      <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30 opacity-60">
                        {a.type === 'video' ? <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="text-xs flex-1 truncate">{a.profiles?.full_name} — {DOW_NAMES_TR[a.recurring_day ?? 0]} {a.recurring_time}</span>
                        {a.series_ended_at && <span className="text-[9px] text-muted-foreground">Sonlandırıldı</span>}
                        <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full", s.cls)}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {appointments.length === 0 && slots.length === 0 && (
        <div className="glass-card rounded-2xl p-10 text-center">
          <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Henüz müsaitlik veya randevu bulunmuyor.</p>
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
            <p className="text-sm text-muted-foreground">Değişiklik tüm gelecek haftalara yansır.</p>
            <div>
              <p className="text-sm font-medium mb-2">Gün</p>
              <select value={editDay} onChange={e => setEditDay(Number(e.target.value))}
                className="w-full h-11 rounded-xl bg-secondary border border-border px-3 text-base font-medium appearance-none cursor-pointer">
                {DOW_NAMES_TR.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Saat</p>
              <div className="flex gap-3">
                <select value={editHour} onChange={e => setEditHour(Number(e.target.value))}
                  className="flex-1 h-11 rounded-xl bg-secondary border border-border text-center text-xl font-display font-bold text-primary appearance-none cursor-pointer">
                  {EDIT_HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
                </select>
                <span className="text-2xl font-bold text-muted-foreground self-center">:</span>
                <select value={editMinute} onChange={e => setEditMinute(Number(e.target.value))}
                  className="flex-1 h-11 rounded-xl bg-secondary border border-border text-center text-xl font-display font-bold text-primary appearance-none cursor-pointer">
                  {MINUTES_OPTIONS.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
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
