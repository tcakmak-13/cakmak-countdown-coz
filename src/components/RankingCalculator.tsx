import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calculator, ChevronDown, ChevronUp, Trophy, Target, TrendingUp, Save, Share2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';

// ─── Subject & Coefficient Config ─────────────────────────
interface SubjectConfig {
  key: string;
  label: string;
  maxQ: number;
}

const TYT_SUBJECTS: SubjectConfig[] = [
  { key: 'turkce', label: 'Türkçe', maxQ: 40 },
  { key: 'sosyal', label: 'Sosyal Bilimler', maxQ: 20 },
  { key: 'matematik', label: 'Temel Matematik', maxQ: 40 },
  { key: 'fen', label: 'Fen Bilimleri', maxQ: 20 },
];

const AYT_BY_AREA: Record<string, SubjectConfig[]> = {
  SAY: [
    { key: 'ayt_matematik', label: 'Matematik', maxQ: 40 },
    { key: 'ayt_fizik', label: 'Fizik', maxQ: 14 },
    { key: 'ayt_kimya', label: 'Kimya', maxQ: 13 },
    { key: 'ayt_biyoloji', label: 'Biyoloji', maxQ: 13 },
  ],
  EA: [
    { key: 'ayt_edebiyat', label: 'Edebiyat', maxQ: 24 },
    { key: 'ayt_cografya1', label: 'Coğrafya-1', maxQ: 6 },
    { key: 'ayt_tarih1', label: 'Tarih-1', maxQ: 10 },
    { key: 'ayt_matematik', label: 'Matematik', maxQ: 40 },
  ],
  SÖZ: [
    { key: 'ayt_edebiyat', label: 'Edebiyat', maxQ: 24 },
    { key: 'ayt_tarih1', label: 'Tarih-1', maxQ: 10 },
    { key: 'ayt_cografya1', label: 'Coğrafya-1', maxQ: 6 },
    { key: 'ayt_tarih2', label: 'Tarih-2', maxQ: 11 },
    { key: 'ayt_cografya2', label: 'Coğrafya-2', maxQ: 11 },
    { key: 'ayt_felsefe', label: 'Felsefe Grubu', maxQ: 12 },
    { key: 'ayt_din', label: 'Din Kültürü', maxQ: 6 },
  ],
  DİL: [
    { key: 'ayt_edebiyat', label: 'Edebiyat', maxQ: 24 },
    { key: 'ayt_tarih1', label: 'Tarih-1', maxQ: 10 },
    { key: 'ayt_cografya1', label: 'Coğrafya-1', maxQ: 6 },
  ],
};

// Approximate YKS coefficients per net for scoring
const TYT_COEFF: Record<string, number> = {
  turkce: 3.3,
  sosyal: 3.4,
  matematik: 3.3,
  fen: 3.4,
};

const AYT_COEFF: Record<string, Record<string, number>> = {
  SAY: { ayt_matematik: 3.0, ayt_fizik: 3.5, ayt_kimya: 3.5, ayt_biyoloji: 3.5 },
  EA: { ayt_edebiyat: 3.0, ayt_cografya1: 3.3, ayt_tarih1: 3.3, ayt_matematik: 3.0 },
  SÖZ: { ayt_edebiyat: 3.0, ayt_tarih1: 3.3, ayt_cografya1: 3.3, ayt_tarih2: 3.3, ayt_cografya2: 3.3, ayt_felsefe: 3.3, ayt_din: 3.3 },
  DİL: { ayt_edebiyat: 3.0, ayt_tarih1: 3.3, ayt_cografya1: 3.3 },
};

// Approximate ranking lookup based on score (simplified mapping)
function estimateRanking(score: number, area: string): [number, number] {
  // Rough estimates based on recent YKS data
  if (score <= 100) return [2000000, 2500000];
  if (score <= 150) return [1500000, 2000000];
  if (score <= 200) return [800000, 1500000];
  if (score <= 250) return [400000, 800000];
  if (score <= 300) return [150000, 400000];
  if (score <= 350) return [50000, 150000];
  if (score <= 400) return [15000, 50000];
  if (score <= 420) return [8000, 15000];
  if (score <= 440) return [3000, 8000];
  if (score <= 460) return [1000, 3000];
  if (score <= 480) return [300, 1000];
  if (score <= 500) return [50, 300];
  return [1, 50];
}

function calcNet(d: number, y: number) {
  return Math.max(0, d - y * 0.25);
}

interface Props {
  studentId: string;
  studentArea: string;
  profileObp?: string;
}

export default function RankingCalculator({ studentId, studentArea, profileObp }: Props) {
  const [inputMode, setInputMode] = useState<'deneme' | 'manual'>('deneme');
  const [denemeResults, setDenemeResults] = useState<any[]>([]);
  const [selectedDenemeIds, setSelectedDenemeIds] = useState<string[]>([]);
  const [showDenemeList, setShowDenemeList] = useState(false);

  // Manual input nets
  const [tytNets, setTytNets] = useState<Record<string, number>>({
    turkce: 0, sosyal: 0, matematik: 0, fen: 0,
  });
  const [aytNets, setAytNets] = useState<Record<string, number>>({});
  const [obp, setObp] = useState<number>(parseFloat(profileObp || '0') || 0);

  // Result state
  const [result, setResult] = useState<{ score: number; rankLow: number; rankHigh: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCalculations, setSavedCalculations] = useState<any[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const aytSubjects = AYT_BY_AREA[studentArea] || AYT_BY_AREA['SAY'];

  // Initialize AYT nets
  useEffect(() => {
    const initial: Record<string, number> = {};
    aytSubjects.forEach(s => { initial[s.key] = 0; });
    setAytNets(initial);
  }, [studentArea]);

  // Fetch deneme results
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('deneme_results')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (data) {
        setDenemeResults(data);
        // Default: select the latest deneme
        if (data.length > 0) {
          setSelectedDenemeIds([data[0].id]);
          populateFromDenemes([data[0]]);
        }
      }
    })();
  }, [studentId]);

  // Fetch saved calculations
  const fetchSaved = useCallback(async () => {
    const { data } = await supabase
      .from('ranking_calculations')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setSavedCalculations(data as any[]);
  }, [studentId]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const populateFromDenemes = useCallback((selected: any[]) => {
    if (selected.length === 0) return;

    // Average all selected denemes
    const avgTyt: Record<string, number> = { turkce: 0, sosyal: 0, matematik: 0, fen: 0 };
    const avgAyt: Record<string, number> = {};
    aytSubjects.forEach(s => { avgAyt[s.key] = 0; });

    let tytCount = 0;
    let aytCount = 0;

    selected.forEach(r => {
      if (r.exam_type === 'TYT') {
        tytCount++;
        TYT_SUBJECTS.forEach(s => {
          avgTyt[s.key] += Number(r[`${s.key}_net`] || 0);
        });
      } else {
        aytCount++;
        aytSubjects.forEach(s => {
          avgAyt[s.key] += Number(r[`${s.key}_net`] || 0);
        });
      }
    });

    if (tytCount > 0) {
      Object.keys(avgTyt).forEach(k => { avgTyt[k] = avgTyt[k] / tytCount; });
    }
    if (aytCount > 0) {
      Object.keys(avgAyt).forEach(k => { avgAyt[k] = avgAyt[k] / aytCount; });
    }

    setTytNets(avgTyt);
    setAytNets(avgAyt);
  }, [aytSubjects]);

  // When deneme selection changes, populate
  useEffect(() => {
    if (inputMode === 'deneme' && selectedDenemeIds.length > 0) {
      const selected = denemeResults.filter(r => selectedDenemeIds.includes(r.id));
      populateFromDenemes(selected);
    }
  }, [selectedDenemeIds, inputMode, denemeResults, populateFromDenemes]);

  const toggleDeneme = (id: string) => {
    setSelectedDenemeIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ─── Calculate Score ─────────────────────────────────
  const handleCalculate = () => {
    // TYT raw score
    let tytScore = 100; // base
    TYT_SUBJECTS.forEach(s => {
      tytScore += tytNets[s.key] * (TYT_COEFF[s.key] || 3.3);
    });

    // AYT raw score
    let aytScore = 100; // base
    const coeffs = AYT_COEFF[studentArea] || AYT_COEFF['SAY'];
    aytSubjects.forEach(s => {
      aytScore += (aytNets[s.key] || 0) * (coeffs[s.key] || 3.0);
    });

    // Weighted: TYT %40, AYT %60
    const weightedScore = tytScore * 0.4 + aytScore * 0.6;

    // OBP contribution (0.6 * OBP)
    const obpContribution = obp * 0.6;

    const finalScore = weightedScore + obpContribution;
    const [rankLow, rankHigh] = estimateRanking(finalScore, studentArea);

    setResult({ score: Math.round(finalScore * 100) / 100, rankLow, rankHigh });
  };

  // ─── Save Calculation ────────────────────────────────
  const handleSave = async () => {
    if (!result) return;
    setSaving(true);

    const tytTotalNet = Object.values(tytNets).reduce((a, b) => a + b, 0);
    const aytTotalNet = Object.values(aytNets).reduce((a, b) => a + b, 0);

    const { error } = await supabase.from('ranking_calculations').insert({
      student_id: studentId,
      exam_area: studentArea,
      tyt_turkce_net: tytNets.turkce,
      tyt_sosyal_net: tytNets.sosyal,
      tyt_matematik_net: tytNets.matematik,
      tyt_fen_net: tytNets.fen,
      tyt_total_net: tytTotalNet,
      ayt_total_net: aytTotalNet,
      obp: obp,
      calculated_score: result.score,
      estimated_ranking_low: result.rankLow,
      estimated_ranking_high: result.rankHigh,
      source_type: inputMode === 'deneme' ? 'deneme' : 'manual',
      source_deneme_ids: inputMode === 'deneme' ? selectedDenemeIds : [],
    } as any);

    setSaving(false);
    if (error) { toast.error('Kaydetme hatası: ' + error.message); return; }
    toast.success('Hesaplama kaydedildi!');
    fetchSaved();
  };

  // ─── Share as Image ──────────────────────────────────
  const handleShare = async () => {
    if (!resultRef.current) return;
    try {
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `yks-siralama-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success('Görüntü kaydedildi!');
    } catch {
      toast.error('Görüntü oluşturulamadı.');
    }
  };

  const tytTotalNet = useMemo(() => Object.values(tytNets).reduce((a, b) => a + b, 0), [tytNets]);
  const aytTotalNet = useMemo(() => Object.values(aytNets).reduce((a, b) => a + b, 0), [aytNets]);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-primary" />
        <h2 className="font-display text-xl font-bold">Sıralama Hesapla</h2>
      </div>

      {/* ─── Input Mode Toggle ─────────────────────────── */}
      <div className="flex gap-2">
        {([
          { key: 'deneme' as const, label: 'Denemelerimden Seç' },
          { key: 'manual' as const, label: 'Kendim Yazacağım' },
        ]).map(m => (
          <button
            key={m.key}
            onClick={() => setInputMode(m.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all ${
              inputMode === m.key ? 'bg-gradient-orange text-primary-foreground shadow-orange' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ─── Deneme Selection ──────────────────────────── */}
      <AnimatePresence mode="wait">
        {inputMode === 'deneme' && (
          <motion.div key="deneme-select" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
            {denemeResults.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
                <p className="text-sm">Henüz deneme sonucun bulunmuyor.</p>
                <p className="text-xs mt-1">"Kendim Yazacağım" modunu kullanabilirsin.</p>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowDenemeList(!showDenemeList)}
                  className="w-full glass-card rounded-xl p-4 flex items-center justify-between border border-primary/20 hover:border-primary/40 transition-colors"
                >
                  <span className="text-sm font-medium">
                    {selectedDenemeIds.length === 0
                      ? 'Deneme seçin...'
                      : `${selectedDenemeIds.length} deneme seçildi`}
                  </span>
                  {showDenemeList ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {showDenemeList && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {denemeResults.map(r => (
                          <label
                            key={r.id}
                            className={`glass-card rounded-lg p-3 flex items-center gap-3 cursor-pointer border transition-all ${
                              selectedDenemeIds.includes(r.id)
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-border hover:border-primary/20'
                            }`}
                          >
                            <Checkbox
                              checked={selectedDenemeIds.includes(r.id)}
                              onCheckedChange={() => toggleDeneme(r.id)}
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.exam_type}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {new Date(r.created_at).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                              <span className="font-display text-sm font-bold text-primary">
                                {Number(r.total_net).toFixed(1)} Net
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                      {selectedDenemeIds.length > 1 && (
                        <p className="text-xs text-primary mt-2 text-center font-medium">
                          ✨ {selectedDenemeIds.length} denemenin ortalaması kullanılacak
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Net Inputs ────────────────────────────────── */}
      <div className="space-y-4">
        {/* TYT Nets */}
        <div className="glass-card rounded-2xl p-5 border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">TYT Netleri</h3>
            <span className="text-xs font-bold text-primary">{tytTotalNet.toFixed(1)} Net</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TYT_SUBJECTS.map(s => (
              <div key={s.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{s.label}</Label>
                <Input
                  type="number"
                  min={0}
                  max={s.maxQ}
                  step="0.01"
                  value={tytNets[s.key] || ''}
                  onChange={e => setTytNets(prev => ({ ...prev, [s.key]: parseFloat(e.target.value) || 0 }))}
                  disabled={inputMode === 'deneme'}
                  className="bg-secondary border-primary/20 focus:border-primary h-9 text-sm"
                  placeholder={`Maks: ${s.maxQ}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* AYT Nets */}
        <div className="glass-card rounded-2xl p-5 border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">
              AYT Netleri <span className="text-primary">({studentArea})</span>
            </h3>
            <span className="text-xs font-bold text-primary">{aytTotalNet.toFixed(1)} Net</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {aytSubjects.map(s => (
              <div key={s.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{s.label}</Label>
                <Input
                  type="number"
                  min={0}
                  max={s.maxQ}
                  step="0.01"
                  value={aytNets[s.key] || ''}
                  onChange={e => setAytNets(prev => ({ ...prev, [s.key]: parseFloat(e.target.value) || 0 }))}
                  disabled={inputMode === 'deneme'}
                  className="bg-secondary border-primary/20 focus:border-primary h-9 text-sm"
                  placeholder={`Maks: ${s.maxQ}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* OBP */}
        <div className="glass-card rounded-2xl p-5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">OBP (Orta Öğretim Başarı Puanı)</Label>
          </div>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={obp || ''}
            onChange={e => setObp(parseFloat(e.target.value) || 0)}
            className="bg-secondary border-primary/20 focus:border-primary h-10"
            placeholder="0 - 100 arası"
          />
          <p className="text-[10px] text-muted-foreground mt-1">OBP katkısı: {(obp * 0.6).toFixed(2)} puan</p>
        </div>
      </div>

      {/* ─── Calculate Button ──────────────────────────── */}
      <Button
        onClick={handleCalculate}
        className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base font-bold shadow-orange"
      >
        <Sparkles className="h-5 w-5 mr-2" />
        Sıralamamı Hesapla
      </Button>

      {/* ─── Result Card ───────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultRef}
            key="result"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="glass-card rounded-2xl p-6 border border-primary/30 shadow-orange space-y-5"
          >
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Hesaplama Sonucu</p>
              <h3 className="font-display text-2xl font-bold text-gradient-orange">YKS Tahmini Sıralaman</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Score */}
              <div className="glass-card rounded-xl p-4 text-center border border-primary/20 space-y-1">
                <Trophy className="h-6 w-6 text-primary mx-auto drop-shadow-[0_0_12px_hsl(25_95%_53%)]" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Puanın</p>
                <p className="font-display text-3xl font-black text-primary drop-shadow-[0_0_20px_hsl(25_95%_53%/0.6)]">
                  {result.score.toFixed(1)}
                </p>
              </div>

              {/* Ranking */}
              <div className="glass-card rounded-xl p-4 text-center border border-primary/20 space-y-1">
                <Target className="h-6 w-6 text-primary mx-auto drop-shadow-[0_0_12px_hsl(25_95%_53%)]" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Tahmini Sıralaman</p>
                <p className="font-display text-lg font-bold text-foreground">
                  {result.rankLow.toLocaleString('tr-TR')} — {result.rankHigh.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>

            {/* Progress bar - closeness to a goal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Hedefe Yakınlık
                </span>
                <span className="text-xs font-bold text-primary">{Math.min(100, Math.round(result.score / 5)).toFixed(0)}%</span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, result.score / 5)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  className="h-full bg-gradient-orange rounded-full shadow-[0_0_12px_hsl(25_95%_53%/0.6)]"
                />
              </div>
            </div>

            {/* Net summary */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">TYT Toplam</p>
                <p className="font-display text-sm font-bold text-foreground">{tytTotalNet.toFixed(1)} Net</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">AYT Toplam</p>
                <p className="font-display text-sm font-bold text-foreground">{aytTotalNet.toFixed(1)} Net</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? 'Kaydediliyor...' : 'Hesaplamayı Kaydet'}
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="border-primary/30 hover:bg-primary/10"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Saved Calculations ────────────────────────── */}
      {savedCalculations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm text-muted-foreground uppercase tracking-widest">Önceki Hesaplamalar</h3>
          {savedCalculations.map(calc => (
            <motion.div key={calc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-4 flex items-center justify-between border border-border">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{calc.exam_area}</span>
                <span className="text-xs text-muted-foreground ml-2">{new Date(calc.created_at).toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="text-right">
                <p className="font-display text-sm font-bold text-primary">{Number(calc.calculated_score).toFixed(1)} Puan</p>
                <p className="text-[10px] text-muted-foreground">
                  {Number(calc.estimated_ranking_low).toLocaleString('tr-TR')} — {Number(calc.estimated_ranking_high).toLocaleString('tr-TR')}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
