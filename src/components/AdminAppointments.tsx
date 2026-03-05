import { useState, useEffect } from 'react';
import { Video, Phone, Check, X, Clock, CalendarIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface AppointmentRow {
  id: string;
  student_id: string;
  type: 'video' | 'voice';
  scheduled_at: string;
  status: string;
  created_at: string;
  profiles: { full_name: string; username: string | null } | null;
}

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetch_ = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles!appointments_student_id_fkey(full_name, username)')
      .order('scheduled_at', { ascending: false });
    setAppointments((data as unknown as AppointmentRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch_();
    const channel = supabase
      .channel('admin-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetch_())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdatingId(id);
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    setUpdatingId(null);
    if (error) toast.error('Hata: ' + error.message);
    else toast.success(status === 'approved' ? 'Randevu onaylandı!' : 'Randevu reddedildi.');
  };

  const pending = appointments.filter(a => a.status === 'pending');
  const approved = appointments.filter(a => a.status === 'approved' && new Date(a.scheduled_at) > new Date());
  const rest = appointments.filter(a => !pending.includes(a) && !approved.includes(a));

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

  const renderCard = (a: AppointmentRow, showActions: boolean) => (
    <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border ${
        a.status === 'pending' ? 'border-amber-500/30' : a.status === 'approved' ? 'border-emerald-500/20' : 'border-border'
      }`}
    >
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${a.type === 'video' ? 'bg-primary/15' : 'bg-emerald-500/15'}`}>
        {a.type === 'video' ? <Video className="h-6 w-6 text-primary" /> : <Phone className="h-6 w-6 text-emerald-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold">{a.profiles?.full_name || a.profiles?.username || 'Öğrenci'}</p>
        <p className="text-sm text-muted-foreground">{a.type === 'video' ? 'Görüntülü' : 'Sesli'} Görüşme</p>
        <p className="font-display font-bold text-lg text-primary mt-1">
          {format(new Date(a.scheduled_at), 'dd MMMM yyyy — HH:mm', { locale: tr })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {statusBadge(a.status)}
        {showActions && (
          <>
            <Button
              size="sm"
              onClick={() => updateStatus(a.id, 'approved')}
              disabled={updatingId === a.id}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              {updatingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Onayla
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateStatus(a.id, 'rejected')}
              disabled={updatingId === a.id}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" /> Reddet
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <CalendarIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Randevu Yönetimi</h2>
          <p className="text-sm text-muted-foreground">Öğrenci randevu taleplerini onayla veya reddet</p>
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Bekleyen Talepler ({pending.length})
          </h3>
          {pending.map(a => renderCard(a, true))}
        </div>
      )}

      {/* Approved upcoming */}
      {approved.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-emerald-400">Yaklaşan Randevular ({approved.length})</h3>
          {approved.map(a => renderCard(a, false))}
        </div>
      )}

      {/* Past */}
      {rest.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Geçmiş</h3>
          {rest.slice(0, 10).map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4 flex items-center gap-3 opacity-60">
              {a.type === 'video' ? <Video className="h-5 w-5 text-muted-foreground" /> : <Phone className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm flex-1">{a.profiles?.full_name} — {format(new Date(a.scheduled_at), 'dd MMM yyyy HH:mm', { locale: tr })}</span>
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
    </div>
  );
}
