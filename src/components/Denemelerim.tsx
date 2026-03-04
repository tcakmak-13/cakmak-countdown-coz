import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface DenemeResult {
  id: string;
  exam_type: string;
  turkce_dogru: number;
  turkce_yanlis: number;
  sosyal_dogru: number;
  sosyal_yanlis: number;
  matematik_dogru: number;
  matematik_yanlis: number;
  fen_dogru: number;
  fen_yanlis: number;
  total_net: number;
  created_at: string;
}

const SUBJECTS_TYT = [
  { key: 'turkce', label: 'Türkçe' },
  { key: 'sosyal', label: 'Sosyal' },
  { key: 'matematik', label: 'Matematik' },
  { key: 'fen', label: 'Fen' },
];

function calcNet(d: number, y: number) {
  return Math.max(0, d - y * 0.25);
}

export default function Denemelerim({ studentId }: { studentId: string }) {
  const [results, setResults] = useState<DenemeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [scores, setScores] = useState({
    turkce_dogru: 0, turkce_yanlis: 0,
    sosyal_dogru: 0, sosyal_yanlis: 0,
    matematik_dogru: 0, matematik_yanlis: 0,
    fen_dogru: 0, fen_yanlis: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchResults = async () => {
    const { data } = await supabase
      .from('deneme_results')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });
    if (data) setResults(data as unknown as DenemeResult[]);
  };

  useEffect(() => { fetchResults(); }, [studentId]);

  const totalNet = useMemo(() => {
    return SUBJECTS_TYT.reduce((sum, s) => {
      const d = scores[`${s.key}_dogru` as keyof typeof scores];
      const y = scores[`${s.key}_yanlis` as keyof typeof scores];
      return sum + calcNet(d, y);
    }, 0);
  }, [scores]);

  const subjectNets = useMemo(() => {
    return SUBJECTS_TYT.map(s => ({
      label: s.label,
      net: calcNet(
        scores[`${s.key}_dogru` as keyof typeof scores],
        scores[`${s.key}_yanlis` as keyof typeof scores]
      ),
    }));
  }, [scores]);

  const handleSave = async () => {
    setSaving(true);
    const nets = {
      turkce_net: calcNet(scores.turkce_dogru, scores.turkce_yanlis),
      sosyal_net: calcNet(scores.sosyal_dogru, scores.sosyal_yanlis),
      matematik_net: calcNet(scores.matematik_dogru, scores.matematik_yanlis),
      fen_net: calcNet(scores.fen_dogru, scores.fen_yanlis),
    };
    const { error } = await supabase.from('deneme_results').insert({
      student_id: studentId,
      exam_type: examType,
      ...scores,
      ...nets,
      total_net: nets.turkce_net + nets.sosyal_net + nets.matematik_net + nets.fen_net,
    });
    setSaving(false);
    if (error) { toast.error('Kaydetme hatası.'); return; }
    toast.success('Deneme kaydedildi!');
    setOpen(false);
    setScores({ turkce_dogru: 0, turkce_yanlis: 0, sosyal_dogru: 0, sosyal_yanlis: 0, matematik_dogru: 0, matematik_yanlis: 0, fen_dogru: 0, fen_yanlis: 0 });
    fetchResults();
  };

  const chartData = results.slice(-10).map(r => ({
    date: new Date(r.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
    net: Number(r.total_net),
  }));

  const updateScore = (field: keyof typeof scores, val: string) => {
    const num = parseInt(val) || 0;
    setScores(prev => ({ ...prev, [field]: Math.max(0, num) }));
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Denemelerim</h2>
        <Button onClick={() => setOpen(true)} size="icon" className="rounded-full bg-gradient-orange border-0 hover:opacity-90 shadow-orange h-10 w-10">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 border border-primary/20 shadow-orange"
        >
          <h3 className="text-sm text-muted-foreground mb-4 uppercase tracking-widest">Net Grafiği</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
              <XAxis dataKey="date" stroke="hsl(0 0% 55%)" fontSize={12} />
              <YAxis stroke="hsl(0 0% 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{ background: 'hsl(0 0% 7%)', border: '1px solid hsl(25 95% 53% / 0.3)', borderRadius: '0.75rem', color: 'hsl(0 0% 98%)' }}
                labelStyle={{ color: 'hsl(0 0% 55%)' }}
              />
              <Line type="monotone" dataKey="net" stroke="hsl(25 95% 53%)" strokeWidth={2.5} dot={{ fill: 'hsl(25 95% 53%)', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: 'hsl(35 100% 60%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
          <p className="text-sm">Henüz deneme sonucun yok.</p>
          <p className="text-xs mt-1">Yeni deneme eklemek için + butonuna tıkla.</p>
        </div>
      )}

      {/* Recent results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm text-muted-foreground uppercase tracking-widest">Son Sonuçlar</h3>
          {results.slice(-5).reverse().map(r => (
            <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-4 flex items-center justify-between border border-border">
              <div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.exam_type}</span>
                <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
              </div>
              <span className="font-display text-lg font-bold text-primary">{Number(r.total_net).toFixed(2)} Net</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Yeni Deneme Ekle</DialogTitle>
            <DialogDescription>Doğru ve yanlış sayılarını girin.</DialogDescription>
          </DialogHeader>

          {/* TYT/AYT Toggle */}
          <div className="flex gap-2 mb-4">
            {(['TYT', 'AYT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setExamType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  examType === t ? 'bg-gradient-orange text-primary-foreground shadow-orange' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Subject rows */}
          <div className="space-y-4">
            {SUBJECTS_TYT.map(s => {
              const d = scores[`${s.key}_dogru` as keyof typeof scores];
              const y = scores[`${s.key}_yanlis` as keyof typeof scores];
              const net = calcNet(d, y);
              return (
                <div key={s.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{s.label}</Label>
                    <span className="text-xs text-primary font-semibold">{net.toFixed(2)} net</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Doğru"
                      value={d || ''}
                      onChange={e => updateScore(`${s.key}_dogru` as keyof typeof scores, e.target.value)}
                      className="bg-secondary border-primary/20 focus:border-primary"
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Yanlış"
                      value={y || ''}
                      onChange={e => updateScore(`${s.key}_yanlis` as keyof typeof scores, e.target.value)}
                      className="bg-secondary border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-4 glass-card rounded-xl p-4 text-center border border-primary/30 shadow-orange">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Toplam Net</p>
            <p className="font-display text-3xl font-bold text-primary">{totalNet.toFixed(2)}</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-11 mt-2">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
