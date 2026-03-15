import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Loader2, CalendarClock, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
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
      console.error('Müsaitlik ekleme hatası:', error);
      toast.error('Müsaitlik eklenemedi. Lütfen tekrar deneyin.');
      return;
    }
    toast.success('Müsaitlik eklendi!');
    setFormDay(null);
    fetchSlots();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('coach_availability').delete().eq('id', id);
    toast.success('Silindi');
    fetchSlots();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <CalendarClock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-bold text-xl text-foreground">Müsaitlik Aralıklarım</h3>
          <p className="text-sm text-muted-foreground">
            Öğrenciler sadece belirlediğiniz aralıklarda randevu talep edebilir.
          </p>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {DAY_NAMES.map((name, idx) => {
          const dow = DAY_MAP[idx];
          const daySlots = slots.filter(s => s.day_of_week === dow);
          const isFormOpen = formDay === dow;
          const hasSlots = daySlots.length > 0;

          return (
            <div
              key={dow}
              className={`rounded-2xl border p-4 flex flex-col min-h-[220px] transition-all duration-200 ${
                hasSlots
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              {/* Day header */}
              <div className="text-center mb-4 pb-3 border-b border-border">
                <p className="font-display font-bold text-lg text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{DAY_FULL[idx]}</p>
              </div>

              {/* Slots */}
              <div className="flex-1 space-y-2">
                {daySlots.map(s => (
                  <div
                    key={s.id}
                    className="group relative bg-gradient-orange rounded-xl px-3 py-3 text-center shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary-foreground/80" />
                      <span className="text-sm font-bold text-primary-foreground">
                        {s.start_time.slice(0, 5)}
                      </span>
                    </div>
                    <p className="text-xs text-primary-foreground/70 mt-0.5">
                      {s.end_time.slice(0, 5)}'e kadar
                    </p>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {daySlots.length === 0 && !isFormOpen && (
                  <div className="flex flex-col items-center justify-center py-4 text-muted-foreground/40">
                    <Clock className="h-5 w-5 mb-1" />
                    <p className="text-xs">Boş</p>
                  </div>
                )}
              </div>

              {/* Add button / form */}
              {isFormOpen ? (
                <div className="mt-3 pt-3 border-t border-border space-y-2.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Başlangıç</label>
                    <select
                      value={formStart}
                      onChange={e => setFormStart(e.target.value)}
                      className="w-full h-10 rounded-xl bg-secondary border border-border px-3 text-sm font-semibold text-foreground appearance-none cursor-pointer text-center focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    >
                      {TIME_OPTIONS.filter(t => t !== '00:00').map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bitiş</label>
                    <select
                      value={formEnd}
                      onChange={e => setFormEnd(e.target.value)}
                      className="w-full h-10 rounded-xl bg-secondary border border-border px-3 text-sm font-semibold text-foreground appearance-none cursor-pointer text-center focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    >
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAdd(dow)}
                      disabled={adding === dow}
                      className="flex-1 bg-gradient-orange border-0 hover:opacity-90 h-10 rounded-xl font-bold text-sm"
                    >
                      {adding === dow ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <><Check className="h-4 w-4" /> Ekle</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setFormDay(null)}
                      className="h-10 px-3 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setFormDay(dow); setFormStart('09:00'); setFormEnd('12:00'); }}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary text-sm font-semibold transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                  Ekle
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
