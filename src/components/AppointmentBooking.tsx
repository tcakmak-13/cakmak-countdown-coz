import { useState, useEffect } from 'react';
import { Video, Phone, CalendarIcon, Clock, RefreshCw, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  type: 'video' | 'voice';
  scheduled_at: string;
  status: string;
  created_at: string;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 9); // 09:00 - 21:00
const MINUTES = [0, 15, 30, 45];

export default function AppointmentBooking({ studentId }: { studentId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'video' | 'voice'>('video');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState(10);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('student_id', studentId)
      .order('scheduled_at', { ascending: true });
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
    const channel = supabase
      .channel('student-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `student_id=eq.${studentId}` }, () => fetchAppointments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [studentId]);

  const openDialog = (type: 'video' | 'voice') => {
    setSelectedType(type);
    setSelectedDate(undefined);
    setSelectedHour(10);
    setSelectedMinute(0);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedDate) { toast.error('Lütfen bir tarih seçin.'); return; }
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(selectedHour, selectedMinute, 0, 0);
    if (scheduledAt <= new Date()) { toast.error('Geçmiş bir tarih seçemezsiniz.'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('appointments').insert({
      student_id: studentId,
      type: selectedType,
      scheduled_at: scheduledAt.toISOString(),
    });
    setSubmitting(false);
    if (error) { toast.error('Randevu oluşturulamadı: ' + error.message); return; }
    toast.success('Randevu talebin koçuna iletildi!');
    setDialogOpen(false);
    fetchAppointments();
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) toast.error('İptal edilemedi.');
    else { toast.success('Randevu iptal edildi.'); fetchAppointments(); }
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

  const upcomingApproved = appointments.filter(a => a.status === 'approved' && new Date(a.scheduled_at) > new Date());
  const pending = appointments.filter(a => a.status === 'pending');
  const past = appointments.filter(a => a.status !== 'pending' && (a.status !== 'approved' || new Date(a.scheduled_at) <= new Date()));

  return (
    <div className="space-y-6">
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
            <p className="text-sm text-muted-foreground mt-1">Yüz yüze koçluk seansı planla</p>
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
            <p className="text-sm text-muted-foreground mt-1">Telefon ile koçluk seansı planla</p>
          </div>
        </motion.button>
      </div>

      {/* Upcoming approved */}
      {upcomingApproved.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Yaklaşan Randevular</h3>
          {upcomingApproved.map(a => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-5 flex items-center gap-4 border border-emerald-500/20"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
                {a.type === 'video' ? <Video className="h-6 w-6 text-primary" /> : <Phone className="h-6 w-6 text-emerald-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold">{a.type === 'video' ? 'Görüntülü' : 'Sesli'} Görüşme</p>
                <p className="text-primary font-bold text-lg">{format(new Date(a.scheduled_at), 'dd MMMM yyyy — HH:mm', { locale: tr })}</p>
              </div>
              {statusBadge(a.status)}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Bekleyen Talepler</h3>
          {pending.map(a => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-5 flex items-center gap-4 border border-amber-500/20"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
                {a.type === 'video' ? <Video className="h-6 w-6 text-primary" /> : <Phone className="h-6 w-6 text-emerald-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold">{a.type === 'video' ? 'Görüntülü' : 'Sesli'} Görüşme</p>
                <p className="text-amber-400 font-bold text-lg">{format(new Date(a.scheduled_at), 'dd MMMM yyyy — HH:mm', { locale: tr })}</p>
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

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Geçmiş Randevular</h3>
          {past.slice(0, 5).map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4 flex items-center gap-3 opacity-60">
              {a.type === 'video' ? <Video className="h-5 w-5 text-muted-foreground" /> : <Phone className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm flex-1">{format(new Date(a.scheduled_at), 'dd MMM yyyy HH:mm', { locale: tr })}</span>
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
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {selectedType === 'video' ? <Video className="h-5 w-5 text-primary" /> : <Phone className="h-5 w-5 text-emerald-400" />}
              {selectedType === 'video' ? 'Görüntülü Görüşme Planla' : 'Sesli Görüşme Planla'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Date picker */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /> Tarih Seç</p>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  locale={tr}
                  className={cn("p-3 pointer-events-auto rounded-xl border border-border bg-secondary")}
                />
              </div>
            </div>

            {/* Time picker */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Saat Seç</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <select
                    value={selectedHour}
                    onChange={e => setSelectedHour(Number(e.target.value))}
                    className="w-full h-12 rounded-xl bg-secondary border border-border text-center text-2xl font-display font-bold text-primary appearance-none cursor-pointer"
                  >
                    {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
                  </select>
                </div>
                <span className="text-3xl font-bold text-muted-foreground self-center">:</span>
                <div className="flex-1">
                  <select
                    value={selectedMinute}
                    onChange={e => setSelectedMinute(Number(e.target.value))}
                    className="w-full h-12 rounded-xl bg-secondary border border-border text-center text-2xl font-display font-bold text-primary appearance-none cursor-pointer"
                  >
                    {MINUTES.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Selected summary */}
            {selectedDate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-center"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Seçilen Randevu</p>
                <p className="font-display font-bold text-xl text-primary">
                  {format(selectedDate, 'dd MMMM yyyy', { locale: tr })}
                </p>
                <p className="font-display font-bold text-2xl text-foreground">
                  {String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}
                </p>
              </motion.div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedDate}
              className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base gap-2"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              {submitting ? 'Gönderiliyor...' : 'Randevu Al'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
