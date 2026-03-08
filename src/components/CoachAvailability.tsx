import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Loader2, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
// Map display index to JS day_of_week (0=Sun): Mon=1, Tue=2, ..., Sun=0
const DAY_MAP = [1, 2, 3, 4, 5, 6, 0];

interface AvailabilitySlot {
  id: string;
  coach_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8);
const MINUTES = [0, 15, 30, 45];

function timeOptions() {
  const opts: string[] = [];
  for (const h of HOURS) {
    for (const m of MINUTES) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  opts.push('00:00');
  return opts;
}

const TIME_OPTIONS = timeOptions();

export default function CoachAvailability({ coachProfileId }: { coachProfileId: string }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null); // day index currently adding

  // Per-day form state
  const [formDay, setFormDay] = useState<number | null>(null);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('12:00');

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

  const handleAdd = async (dayOfWeek: number) => {
    if (formStart >= formEnd && formEnd !== '00:00') {
      toast.error('Başlangıç saati bitiş saatinden önce olmalı.');
      return;
    }
    setAdding(dayOfWeek);
    const { error } = await supabase.from('coach_availability').insert({
      coach_id: coachProfileId,
      day_of_week: dayOfWeek,
      start_time: formStart,
      end_time: formEnd,
    });
    setAdding(null);
    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        toast.error('Bu saat aralığı zaten ekli.');
      } else {
        toast.error('Eklenemedi: ' + error.message);
      }
      return;
    }
    toast.success('Müsaitlik eklendi!');
    setFormDay(null);
    fetchSlots();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('coach_availability').delete().eq('id', id);
    if (error) toast.error('Silinemedi.');
    else { toast.success('Aralık silindi.'); fetchSlots(); }
  };

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary" />
        <h3 className="font-display font-bold text-lg">Müsaitlik Aralıklarım</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Öğrenciler sadece belirlediğiniz aralıklarda randevu talep edebilir.
      </p>

      <div className="space-y-2">
        {DAY_NAMES.map((name, idx) => {
          const dow = DAY_MAP[idx];
          const daySlots = slots.filter(s => s.day_of_week === dow);
          const isFormOpen = formDay === dow;

          return (
            <div key={dow} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-foreground">{name}</p>
                {!isFormOpen && (
                  <button
                    onClick={() => { setFormDay(dow); setFormStart('09:00'); setFormEnd('12:00'); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Ekle
                  </button>
                )}
              </div>

              {/* Existing slots */}
              {daySlots.length > 0 ? (
                <div className="space-y-1.5 mb-2">
                  {daySlots.map(s => (
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
              ) : !isFormOpen ? (
                <p className="text-xs text-muted-foreground/60 mb-1">Müsaitlik yok</p>
              ) : null}

              {/* Inline add form */}
              {isFormOpen && (
                <div className="flex items-end gap-2 mt-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1">Başlangıç</p>
                    <select value={formStart} onChange={e => setFormStart(e.target.value)}
                      className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm font-medium appearance-none cursor-pointer">
                      {TIME_OPTIONS.filter(t => t !== '00:00').map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground mb-1">Bitiş</p>
                    <select value={formEnd} onChange={e => setFormEnd(e.target.value)}
                      className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm font-medium appearance-none cursor-pointer">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <Button size="sm" onClick={() => handleAdd(dow)} disabled={adding === dow}
                    className="bg-gradient-orange border-0 hover:opacity-90 h-9 px-3 shrink-0">
                    {adding === dow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Ekle'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setFormDay(null)} className="h-9 px-2 shrink-0 text-muted-foreground">
                    ✕
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
