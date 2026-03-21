import { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, Trash2, Loader2, CalendarClock, Check, X, Video, Phone, Repeat, StopCircle, Pencil, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { format, nextDay, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

/* ── Constants ── */
const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
// Maps visual index (0=Mon…6=Sun) → JS day-of-week (0=Sun,1=Mon…6=Sat)
const IDX_TO_DOW = [1, 2, 3, 4, 5, 6, 0];
const DOW_NAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);
const MINUTES = [0, 15, 30, 45];

function timeOptions() {
  const opts: string[] = [];
  for (const h of HOURS) for (const m of MINUTES) opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
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

/* ── Helpers ── */
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

/* ── Component ── */
export default function CoachSchedule({ coachProfileId }: { coachProfileId: string }) {
  /* State – availability */
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [formDay, setFormDay] = useState<number | null>(null);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('12:00');
  const [adding, setAdding] = useState<number | null>(null);

  /* State – appointments */
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* State – edit dialog */
  const [editDialog, setEditDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<AppointmentRow | null>(null);
  const [editDay, setEditDay] = useState(1);
  const [editHour, setEditHour] = useState(10);
  const [editMinute, setEditMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  /* ── Pending section expanded ── */
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);

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
  const activeRecurring = useMemo(() => appointments.filter(a => a.status === 'approved' && a.recurring && !a.series_ended_at), [appointments]);
  const history = useMemo(() => appointments.filter(a => a.status !== 'pending' && !(a.status === 'approved' && a.recurring && !a.series_ended_at)), [appointments]);

  // Group active recurring by day-of-week
  const appointmentsByDow = useMemo(() => {
    const map = new Map<number, AppointmentRow[]>();
    for (const a of activeRecurring) {
      const dow = a.recurring_day ?? 0;
      if (!map.has(dow)) map.set(dow, []);
      map.get(dow)!.push(a);
    }
    return map;
  }, [activeRecurring]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <CalendarClock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Haftalık Program</h2>
          <p className="text-sm text-muted-foreground">Müsaitlik saatlerini ve onaylanan randevuları tek ekranda yönet</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
          <span className="text-muted-foreground">Müsaitlik Aralığı</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Onaylı Görüşme</span>
        </div>
      </div>

      {/* ═══ Pending Requests ═══ */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <button
            onClick={() => setPendingExpanded(!pendingExpanded)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-amber-500/5 transition-colors"
          >
            <span className="font-display font-semibold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Bekleyen Talepler ({pending.length})
            </span>
            <ChevronDown className={`h-4 w-4 text-amber-400 transition-transform ${pendingExpanded ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {pendingExpanded && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-5 pb-4 space-y-3">
                  {pending.map(a => (
                    <div key={a.id} className="glass-card rounded-xl p-4 border border-amber-500/20">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
                          {a.type === 'video' ? <Video className="h-5 w-5 text-primary" /> : <Phone className="h-5 w-5 text-emerald-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{a.profiles?.full_name || 'Öğrenci'}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.type === 'video' ? 'Görüntülü' : 'Sesli'} ({a.duration_minutes} dk) — Her {DOW_NAMES_TR[a.recurring_day ?? 0]} {a.recurring_time}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" onClick={() => updateStatus(a.id, 'approved')} disabled={updatingId === a.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-9">
                            {updatingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Onayla
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(a.id, 'rejected')} disabled={updatingId === a.id} className="gap-1 h-9">
                            <X className="h-3.5 w-3.5" /> Reddet
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

      {/* ═══ Weekly Grid ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {DAY_LABELS.map((label, idx) => {
          const dow = IDX_TO_DOW[idx];
          const daySlots = slots.filter(s => s.day_of_week === dow);
          const dayAppts = appointmentsByDow.get(dow) || [];
          const isFormOpen = formDay === dow;
          const hasContent = daySlots.length > 0 || dayAppts.length > 0;

          return (
            <div
              key={dow}
              className={`rounded-2xl border p-4 flex flex-col min-h-[260px] transition-all duration-200 ${
                hasContent ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              {/* Day header */}
              <div className="text-center mb-3 pb-2.5 border-b border-border">
                <p className="font-display font-bold text-lg text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{DAY_FULL[idx]}</p>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-2">
                {/* Availability slots */}
                {daySlots.map(s => (
                  <div key={s.id} className="group relative bg-gradient-orange rounded-xl px-3 py-2.5 text-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-center gap-1.5">
                      <Clock className="h-3 w-3 text-primary-foreground/80" />
                      <span className="text-sm font-bold text-primary-foreground">{s.start_time.slice(0, 5)}</span>
                    </div>
                    <p className="text-[10px] text-primary-foreground/70 mt-0.5">{s.end_time.slice(0, 5)}'e kadar</p>
                    <button onClick={() => handleDeleteSlot(s.id)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}

                {/* Approved appointments */}
                {dayAppts.map(a => (
                  <div key={a.id} className="group relative rounded-xl px-3 py-2.5 text-center shadow-sm hover:shadow-md transition-shadow bg-emerald-500/20 border border-emerald-500/30">
                    <div className="flex items-center justify-center gap-1.5">
                      {a.type === 'video'
                        ? <Video className="h-3 w-3 text-emerald-400" />
                        : <Phone className="h-3 w-3 text-emerald-400" />
                      }
                      <span className="text-sm font-bold text-emerald-400">{a.recurring_time?.slice(0, 5)}</span>
                    </div>
                    <p className="text-[10px] text-emerald-400/80 mt-0.5 font-medium truncate">
                      {a.profiles?.full_name?.split(' ')[0] || 'Öğrenci'}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{a.duration_minutes} dk</p>
                    {/* Hover actions */}
                    <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center gap-0.5">
                      <button onClick={() => openEditDialog(a)}
                        className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={() => endSeries(a.id)} disabled={updatingId === a.id}
                        className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg">
                        {updatingId === a.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <StopCircle className="h-2.5 w-2.5" />}
                      </button>
                    </div>
                  </div>
                ))}

                {daySlots.length === 0 && dayAppts.length === 0 && !isFormOpen && (
                  <div className="flex flex-col items-center justify-center py-4 text-muted-foreground/30">
                    <Clock className="h-5 w-5 mb-1" />
                    <p className="text-[10px]">Boş</p>
                  </div>
                )}
              </div>

              {/* Add availability form / button */}
              {isFormOpen ? (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Başlangıç</label>
                    <select value={formStart} onChange={e => setFormStart(e.target.value)}
                      className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm font-semibold text-foreground appearance-none cursor-pointer text-center">
                      {TIME_OPTIONS.filter(t => t !== '00:00').map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Bitiş</label>
                    <select value={formEnd} onChange={e => setFormEnd(e.target.value)}
                      className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm font-semibold text-foreground appearance-none cursor-pointer text-center">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleAddSlot(dow)} disabled={adding === dow}
                      className="flex-1 bg-gradient-orange border-0 hover:opacity-90 h-9 rounded-lg font-bold text-xs">
                      {adding === dow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" /> Ekle</>}
                    </Button>
                    <Button variant="ghost" onClick={() => setFormDay(null)} className="h-9 px-2 rounded-lg text-xs text-muted-foreground">
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setFormDay(dow); setFormStart('09:00'); setFormEnd('12:00'); }}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary text-xs font-semibold transition-all duration-200"
                >
                  <Plus className="h-3.5 w-3.5" /> Müsaitlik Ekle
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ History ═══ */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/50 transition-colors"
          >
            <span className="text-sm font-semibold text-muted-foreground">Geçmiş / Sonlanan ({history.length})</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyExpanded ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {historyExpanded && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-5 pb-4 space-y-2">
                  {history.slice(0, 15).map(a => {
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      approved: { label: 'Onaylandı', cls: 'bg-emerald-500/20 text-emerald-400' },
                      rejected: { label: 'Reddedildi', cls: 'bg-destructive/20 text-destructive' },
                      completed: { label: 'Tamamlandı', cls: 'bg-primary/20 text-primary' },
                    };
                    const s = statusMap[a.status] || { label: a.status, cls: 'bg-secondary text-muted-foreground' };
                    return (
                      <div key={a.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 opacity-60">
                        {a.type === 'video' ? <Video className="h-4 w-4 text-muted-foreground shrink-0" /> : <Phone className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="text-sm flex-1 truncate">{a.profiles?.full_name} — {DOW_NAMES_TR[a.recurring_day ?? 0]} {a.recurring_time}</span>
                        {a.series_ended_at && <span className="text-[10px] text-muted-foreground">Sonlandırıldı</span>}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
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
