import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Loader2, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_MAP = [1, 2, 3, 4, 5, 6, 0]; // display idx -> JS day_of_week

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
  const [adding, setAdding] = useState<number | null>(null);
  const [formDay, setFormDay] = useState<number | null>(null);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('12:00');

  const fetchSlots = async () => {
    const { data } = await supabase
      .from('coach_availability')
      .select('*')
      .eq('coach_id', coachProfileId)
      .order('start_time', { ascending: true });
    setSlots((data as AvailabilitySlot[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSlots(); }, [coachProfileId]);

  const handleAdd = async (dayOfWeek: number) => {
    if (formStart >= formEnd && formEnd !== '00:00') {
      toast.error('Başlangıç bitiş saatinden önce olmalı.');
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
      toast.error(error.message.includes('unique') || error.message.includes('duplicate')
        ? 'Bu aralık zaten ekli.' : 'Eklenemedi.');
      return;
    }
    toast.success('Eklendi!');
    setFormDay(null);
    fetchSlots();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('coach_availability').delete().eq('id', id);
    fetchSlots();
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

      {/* Column layout - 7 day columns */}
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_NAMES.map((name, idx) => {
          const dow = DAY_MAP[idx];
          const daySlots = slots.filter(s => s.day_of_week === dow);
          const isFormOpen = formDay === dow;

          return (
            <div key={dow} className="glass-card rounded-xl p-2 flex flex-col min-h-[160px]">
              {/* Day header */}
              <div className="text-center mb-2">
                <p className="text-xs font-bold text-foreground">{name}</p>
                <p className="text-[9px] text-muted-foreground hidden sm:block">{DAY_FULL[idx]}</p>
              </div>

              {/* Slots */}
              <div className="flex-1 space-y-1">
                {daySlots.map(s => (
                  <div key={s.id} className="group relative bg-primary/10 border border-primary/20 rounded-lg px-1.5 py-1.5 text-center">
                    <p className="text-[10px] font-semibold text-primary leading-tight">{s.start_time.slice(0, 5)}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">{s.end_time.slice(0, 5)}</p>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive/80 text-destructive-foreground items-center justify-center text-[8px] hidden group-hover:flex"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {daySlots.length === 0 && !isFormOpen && (
                  <p className="text-[9px] text-muted-foreground/40 text-center">—</p>
                )}
              </div>

              {/* Add button / form */}
              {isFormOpen ? (
                <div className="mt-1.5 space-y-1">
                  <select value={formStart} onChange={e => setFormStart(e.target.value)}
                    className="w-full h-7 rounded-md bg-secondary border border-border px-1 text-[10px] font-medium appearance-none cursor-pointer text-center">
                    {TIME_OPTIONS.filter(t => t !== '00:00').map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={formEnd} onChange={e => setFormEnd(e.target.value)}
                    className="w-full h-7 rounded-md bg-secondary border border-border px-1 text-[10px] font-medium appearance-none cursor-pointer text-center">
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex gap-0.5">
                    <Button size="sm" onClick={() => handleAdd(dow)} disabled={adding === dow}
                      className="flex-1 bg-gradient-orange border-0 hover:opacity-90 h-6 text-[10px] px-1 rounded-md">
                      {adding === dow ? <Loader2 className="h-3 w-3 animate-spin" /> : '✓'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setFormDay(null)}
                      className="h-6 px-1 text-[10px] text-muted-foreground rounded-md">
                      ✕
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setFormDay(dow); setFormStart('09:00'); setFormEnd('12:00'); }}
                  className="mt-1.5 w-full flex items-center justify-center gap-0.5 py-1.5 rounded-lg bg-secondary/50 hover:bg-primary/10 text-muted-foreground hover:text-primary text-[10px] font-medium transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
