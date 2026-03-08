import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Loader2, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

interface AvailabilitySlot {
  id: string;
  coach_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 08-23
const MINUTES = [0, 15, 30, 45];

function timeOptions() {
  const opts: string[] = [];
  for (const h of HOURS) {
    for (const m of MINUTES) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  // Add 00:00 for midnight end
  opts.push('00:00');
  return opts;
}

const TIME_OPTIONS = timeOptions();

export default function CoachAvailability({ coachProfileId }: { coachProfileId: string }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // New slot form
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('12:00');
  const [showForm, setShowForm] = useState(false);

  const fetchSlots = async () => {
    const { data } = await supabase
      .from('coach_availability')
      .select('*')
      .eq('coach_id', coachProfileId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    setSlots((data as AvailabilitySlot[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSlots(); }, [coachProfileId]);

  const handleAdd = async () => {
    if (newStart >= newEnd && newEnd !== '00:00') {
      toast.error('Başlangıç saati bitiş saatinden önce olmalı.');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('coach_availability').insert({
      coach_id: coachProfileId,
      day_of_week: newDay,
      start_time: newStart,
      end_time: newEnd,
    });
    setAdding(false);
    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        toast.error('Bu gün ve saat aralığı zaten ekli.');
      } else {
        toast.error('Eklenemedi: ' + error.message);
      }
      return;
    }
    toast.success('Müsaitlik aralığı eklendi!');
    setShowForm(false);
    fetchSlots();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('coach_availability').delete().eq('id', id);
    if (error) toast.error('Silinemedi.');
    else { toast.success('Aralık silindi.'); fetchSlots(); }
  };

  // Group by day
  const grouped = DAY_NAMES.map((name, i) => ({
    day: i,
    name,
    slots: slots.filter(s => s.day_of_week === i),
  })).filter(g => g.slots.length > 0);

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold text-lg">Müsaitlik Aralıklarım</h3>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5 bg-gradient-orange border-0 hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> Aralık Ekle
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Öğrenciler sadece belirlediğiniz müsait aralıklarda randevu talep edebilir.
      </p>

      {showForm && (
        <div className="glass-card rounded-xl p-4 space-y-3 border border-primary/20">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Gün</p>
              <select value={newDay} onChange={e => setNewDay(Number(e.target.value))}
                className="w-full h-10 rounded-lg bg-secondary border border-border px-2 text-sm font-medium appearance-none cursor-pointer">
                {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Başlangıç</p>
              <select value={newStart} onChange={e => setNewStart(e.target.value)}
                className="w-full h-10 rounded-lg bg-secondary border border-border px-2 text-sm font-medium appearance-none cursor-pointer">
                {TIME_OPTIONS.filter(t => t !== '00:00').map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Bitiş</p>
              <select value={newEnd} onChange={e => setNewEnd(e.target.value)}
                className="w-full h-10 rounded-lg bg-secondary border border-border px-2 text-sm font-medium appearance-none cursor-pointer">
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={adding} size="sm" className="bg-gradient-orange border-0 hover:opacity-90 gap-1">
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {adding ? 'Ekleniyor...' : 'Ekle'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>İptal</Button>
          </div>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Henüz müsaitlik aralığı eklenmemiş.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(g => (
            <div key={g.day} className="glass-card rounded-xl p-4">
              <p className="text-sm font-bold text-foreground mb-2">{g.name}</p>
              <div className="space-y-1.5">
                {g.slots.map(s => (
                  <div key={s.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm font-medium flex-1">
                      {s.start_time.slice(0, 5)} — {s.end_time.slice(0, 5)}
                    </span>
                    <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
