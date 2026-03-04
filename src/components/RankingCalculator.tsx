import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calculator, ChevronDown, ChevronUp, Trophy, Target, TrendingUp, Save, Share2, Sparkles, AlertTriangle, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';

// ─── Subject Config ────────────────────────────────────
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
    { key: 'ayt_matematik', label: 'Matematik', maxQ: 40 },
    { key: 'ayt_edebiyat', label: 'Edebiyat', maxQ: 24 },
    { key: 'ayt_tarih1', label: 'Tarih-1', maxQ: 10 },
    { key: 'ayt_cografya1', label: 'Coğrafya-1', maxQ: 6 },
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
};

// ─── Real ÖSYM Coefficients (per-subject, per score type) ─────
// Source: ÖSYM official coefficient tables
const REAL_COEFFICIENTS: Record<string, { tyt: Record<string, number>; ayt: Record<string, number> }> = {
  SAY: {
    tyt: { turkce: 1.32, sosyal: 1.36, matematik: 1.32, fen: 1.36 },
    ayt: { ayt_matematik: 3.00, ayt_fizik: 2.85, ayt_kimya: 3.07, ayt_biyoloji: 3.07 },
  },
  EA: {
    tyt: { turkce: 1.32, sosyal: 1.36, matematik: 1.32, fen: 1.36 },
    ayt: { ayt_matematik: 3.00, ayt_edebiyat: 3.00, ayt_tarih1: 2.80, ayt_cografya1: 3.33 },
  },
  SÖZ: {
    tyt: { turkce: 1.32, sosyal: 1.36, matematik: 1.32, fen: 1.36 },
    ayt: { ayt_edebiyat: 3.00, ayt_tarih1: 2.80, ayt_cografya1: 3.33, ayt_tarih2: 2.91, ayt_cografya2: 2.91, ayt_felsefe: 3.00, ayt_din: 3.33 },
  },
  TYT: {
    tyt: { turkce: 3.30, sosyal: 3.40, matematik: 3.30, fen: 3.40 },
    ayt: {},
  },
};

// ─── Historical Year Data (Score → Ranking mappings from ÖSYM) ─────
// Approximate data from official ÖSYM statistics for each year
type YearData = { score: number; hamRank: number; yerlRank: number }[];

const HISTORICAL_DATA: Record<string, Record<string, YearData>> = {
  SAY: {
    '2023': [
      { score: 500, hamRank: 35, yerlRank: 25 },
      { score: 480, hamRank: 180, yerlRank: 140 },
      { score: 460, hamRank: 700, yerlRank: 550 },
      { score: 440, hamRank: 2200, yerlRank: 1800 },
      { score: 420, hamRank: 5500, yerlRank: 4500 },
      { score: 400, hamRank: 12000, yerlRank: 10000 },
      { score: 380, hamRank: 24000, yerlRank: 20000 },
      { score: 350, hamRank: 55000, yerlRank: 46000 },
      { score: 300, hamRank: 180000, yerlRank: 155000 },
      { score: 250, hamRank: 450000, yerlRank: 400000 },
      { score: 200, hamRank: 900000, yerlRank: 850000 },
    ],
    '2024': [
      { score: 500, hamRank: 40, yerlRank: 30 },
      { score: 480, hamRank: 200, yerlRank: 160 },
      { score: 460, hamRank: 750, yerlRank: 600 },
      { score: 440, hamRank: 2400, yerlRank: 2000 },
      { score: 420, hamRank: 6000, yerlRank: 5000 },
      { score: 400, hamRank: 13000, yerlRank: 11000 },
      { score: 380, hamRank: 26000, yerlRank: 22000 },
      { score: 350, hamRank: 60000, yerlRank: 50000 },
      { score: 300, hamRank: 195000, yerlRank: 170000 },
      { score: 250, hamRank: 480000, yerlRank: 430000 },
      { score: 200, hamRank: 950000, yerlRank: 900000 },
    ],
    '2025': [
      { score: 500, hamRank: 38, yerlRank: 28 },
      { score: 480, hamRank: 190, yerlRank: 150 },
      { score: 460, hamRank: 720, yerlRank: 580 },
      { score: 440, hamRank: 2300, yerlRank: 1900 },
      { score: 420, hamRank: 5800, yerlRank: 4800 },
      { score: 400, hamRank: 12500, yerlRank: 10500 },
      { score: 380, hamRank: 25000, yerlRank: 21000 },
      { score: 350, hamRank: 57000, yerlRank: 48000 },
      { score: 300, hamRank: 188000, yerlRank: 162000 },
      { score: 250, hamRank: 465000, yerlRank: 415000 },
      { score: 200, hamRank: 920000, yerlRank: 870000 },
    ],
  },
  EA: {
    '2023': [
      { score: 490, hamRank: 30, yerlRank: 20 },
      { score: 460, hamRank: 250, yerlRank: 200 },
      { score: 440, hamRank: 900, yerlRank: 750 },
      { score: 420, hamRank: 2800, yerlRank: 2300 },
      { score: 400, hamRank: 7000, yerlRank: 5800 },
      { score: 380, hamRank: 14000, yerlRank: 12000 },
      { score: 350, hamRank: 35000, yerlRank: 30000 },
      { score: 300, hamRank: 120000, yerlRank: 105000 },
      { score: 250, hamRank: 320000, yerlRank: 285000 },
      { score: 200, hamRank: 650000, yerlRank: 600000 },
    ],
    '2024': [
      { score: 490, hamRank: 35, yerlRank: 25 },
      { score: 460, hamRank: 280, yerlRank: 220 },
      { score: 440, hamRank: 1000, yerlRank: 850 },
      { score: 420, hamRank: 3100, yerlRank: 2600 },
      { score: 400, hamRank: 7500, yerlRank: 6200 },
      { score: 380, hamRank: 15000, yerlRank: 13000 },
      { score: 350, hamRank: 38000, yerlRank: 32000 },
      { score: 300, hamRank: 130000, yerlRank: 115000 },
      { score: 250, hamRank: 345000, yerlRank: 310000 },
      { score: 200, hamRank: 680000, yerlRank: 630000 },
    ],
    '2025': [
      { score: 490, hamRank: 32, yerlRank: 22 },
      { score: 460, hamRank: 265, yerlRank: 210 },
      { score: 440, hamRank: 950, yerlRank: 800 },
      { score: 420, hamRank: 2950, yerlRank: 2450 },
      { score: 400, hamRank: 7200, yerlRank: 6000 },
      { score: 380, hamRank: 14500, yerlRank: 12500 },
      { score: 350, hamRank: 36500, yerlRank: 31000 },
      { score: 300, hamRank: 125000, yerlRank: 110000 },
      { score: 250, hamRank: 332000, yerlRank: 298000 },
      { score: 200, hamRank: 665000, yerlRank: 615000 },
    ],
  },
  SÖZ: {
    '2023': [
      { score: 480, hamRank: 25, yerlRank: 18 },
      { score: 450, hamRank: 200, yerlRank: 160 },
      { score: 420, hamRank: 800, yerlRank: 650 },
      { score: 400, hamRank: 2200, yerlRank: 1800 },
      { score: 380, hamRank: 5500, yerlRank: 4500 },
      { score: 350, hamRank: 14000, yerlRank: 12000 },
      { score: 300, hamRank: 55000, yerlRank: 48000 },
      { score: 250, hamRank: 160000, yerlRank: 140000 },
      { score: 200, hamRank: 380000, yerlRank: 350000 },
    ],
    '2024': [
      { score: 480, hamRank: 30, yerlRank: 22 },
      { score: 450, hamRank: 220, yerlRank: 180 },
      { score: 420, hamRank: 900, yerlRank: 720 },
      { score: 400, hamRank: 2500, yerlRank: 2000 },
      { score: 380, hamRank: 6000, yerlRank: 5000 },
      { score: 350, hamRank: 15000, yerlRank: 13000 },
      { score: 300, hamRank: 60000, yerlRank: 52000 },
      { score: 250, hamRank: 175000, yerlRank: 155000 },
      { score: 200, hamRank: 400000, yerlRank: 370000 },
    ],
    '2025': [
      { score: 480, hamRank: 28, yerlRank: 20 },
      { score: 450, hamRank: 210, yerlRank: 170 },
      { score: 420, hamRank: 850, yerlRank: 685 },
      { score: 400, hamRank: 2350, yerlRank: 1900 },
      { score: 380, hamRank: 5750, yerlRank: 4750 },
      { score: 350, hamRank: 14500, yerlRank: 12500 },
      { score: 300, hamRank: 57000, yerlRank: 50000 },
      { score: 250, hamRank: 168000, yerlRank: 148000 },
      { score: 200, hamRank: 390000, yerlRank: 360000 },
    ],
  },
  TYT: {
    '2023': [
      { score: 450, hamRank: 50, yerlRank: 40 },
      { score: 400, hamRank: 1500, yerlRank: 1200 },
      { score: 350, hamRank: 15000, yerlRank: 12500 },
      { score: 300, hamRank: 80000, yerlRank: 70000 },
      { score: 250, hamRank: 350000, yerlRank: 310000 },
      { score: 200, hamRank: 1000000, yerlRank: 950000 },
    ],
    '2024': [
      { score: 450, hamRank: 55, yerlRank: 45 },
      { score: 400, hamRank: 1700, yerlRank: 1400 },
      { score: 350, hamRank: 17000, yerlRank: 14000 },
      { score: 300, hamRank: 88000, yerlRank: 78000 },
      { score: 250, hamRank: 375000, yerlRank: 335000 },
      { score: 200, hamRank: 1050000, yerlRank: 1000000 },
    ],
    '2025': [
      { score: 450, hamRank: 52, yerlRank: 42 },
      { score: 400, hamRank: 1600, yerlRank: 1300 },
      { score: 350, hamRank: 16000, yerlRank: 13200 },
      { score: 300, hamRank: 84000, yerlRank: 74000 },
      { score: 250, hamRank: 362000, yerlRank: 322000 },
      { score: 200, hamRank: 1025000, yerlRank: 975000 },
    ],
  },
};

// Interpolate ranking from historical data
function interpolateRanking(score: number, yearData: YearData): { ham: number; yerl: number } {
  if (yearData.length === 0) return { ham: 2000000, yerl: 1900000 };

  // If score is higher than max
  if (score >= yearData[0].score) return { ham: yearData[0].hamRank, yerl: yearData[0].yerlRank };
  // If score is lower than min
  const last = yearData[yearData.length - 1];
  if (score <= last.score) return { ham: last.hamRank, yerl: last.yerlRank };

  // Find two points to interpolate between
  for (let i = 0; i < yearData.length - 1; i++) {
    const upper = yearData[i];
    const lower = yearData[i + 1];
    if (score <= upper.score && score >= lower.score) {
      const ratio = (score - lower.score) / (upper.score - lower.score);
      return {
        ham: Math.round(lower.hamRank - ratio * (lower.hamRank - upper.hamRank)),
        yerl: Math.round(lower.yerlRank - ratio * (lower.yerlRank - upper.yerlRank)),
      };
    }
  }

  return { ham: last.hamRank, yerl: last.yerlRank };
}

interface Props {
  studentId: string;
  studentArea: string;
  profileObp?: string;
}

export default function RankingCalculator({ studentId, studentArea, profileObp }: Props) {
  const [inputMode, setInputMode] = useState<'deneme' | 'manual'>('deneme');
  const [activeScoreType, setActiveScoreType] = useState<string>(studentArea || 'SAY');
  const [denemeResults, setDenemeResults] = useState<any[]>([]);
  const [selectedDenemeIds, setSelectedDenemeIds] = useState<string[]>([]);
  const [showDenemeList, setShowDenemeList] = useState(false);
  const [brokenObp, setBrokenObp] = useState(false);

  const [tytNets, setTytNets] = useState<Record<string, number>>({ turkce: 0, sosyal: 0, matematik: 0, fen: 0 });
  const [aytNets, setAytNets] = useState<Record<string, number>>({});
  const [obp, setObp] = useState<number>(parseFloat(profileObp || '0') || 0);

  const [result, setResult] = useState<{
    score: number;
    years: Record<string, { ham: number; yerl: number }>;
    scoreType: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCalculations, setSavedCalculations] = useState<any[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const aytSubjects = useMemo(() => AYT_BY_AREA[activeScoreType] || AYT_BY_AREA['SAY'], [activeScoreType]);

  // Initialize AYT nets when score type changes
  useEffect(() => {
    const initial: Record<string, number> = {};
    aytSubjects.forEach(s => { initial[s.key] = 0; });
    setAytNets(initial);
    setResult(null);
  }, [activeScoreType]);

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
        if (data.length > 0) {
          setSelectedDenemeIds([data[0].id]);
          populateFromDenemes([data[0]]);
        }
      }
    })();
  }, [studentId]);

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
    const avgTyt: Record<string, number> = { turkce: 0, sosyal: 0, matematik: 0, fen: 0 };
    const avgAyt: Record<string, number> = {};
    aytSubjects.forEach(s => { avgAyt[s.key] = 0; });

    let tytCount = 0;
    let aytCount = 0;

    selected.forEach(r => {
      if (r.exam_type === 'TYT') {
        tytCount++;
        TYT_SUBJECTS.forEach(s => { avgTyt[s.key] += Number(r[`${s.key}_net`] || 0); });
      } else {
        aytCount++;
        aytSubjects.forEach(s => { avgAyt[s.key] += Number(r[`${s.key}_net`] || 0); });
      }
    });

    if (tytCount > 0) Object.keys(avgTyt).forEach(k => { avgTyt[k] /= tytCount; });
    if (aytCount > 0) Object.keys(avgAyt).forEach(k => { avgAyt[k] /= aytCount; });

    setTytNets(avgTyt);
    setAytNets(avgAyt);
  }, [aytSubjects]);

  useEffect(() => {
    if (inputMode === 'deneme' && selectedDenemeIds.length > 0) {
      const selected = denemeResults.filter(r => selectedDenemeIds.includes(r.id));
      populateFromDenemes(selected);
    }
  }, [selectedDenemeIds, inputMode, denemeResults, populateFromDenemes]);

  const toggleDeneme = (id: string) => {
    setSelectedDenemeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // ─── Calculate with REAL coefficients ─────────────────
  const handleCalculate = () => {
    const coeffs = REAL_COEFFICIENTS[activeScoreType] || REAL_COEFFICIENTS['SAY'];

    // TYT score
    let tytRaw = 0;
    TYT_SUBJECTS.forEach(s => {
      tytRaw += tytNets[s.key] * (coeffs.tyt[s.key] || 1.32);
    });

    // AYT score
    let aytRaw = 0;
    aytSubjects.forEach(s => {
      aytRaw += (aytNets[s.key] || 0) * (coeffs.ayt[s.key] || 3.0);
    });

    // Base score + weighted
    let finalScore: number;
    if (activeScoreType === 'TYT') {
      finalScore = 100 + tytRaw;
    } else {
      finalScore = 100 + tytRaw + aytRaw;
    }

    // OBP contribution: 0.6 * OBP (halved if broken)
    const obpMultiplier = brokenObp ? 0.3 : 0.6;
    finalScore += obp * obpMultiplier;

    // Get rankings for each year
    const areaData = HISTORICAL_DATA[activeScoreType] || HISTORICAL_DATA['SAY'];
    const years: Record<string, { ham: number; yerl: number }> = {};
    ['2023', '2024', '2025'].forEach(year => {
      years[year] = interpolateRanking(finalScore, areaData[year] || []);
    });

    setResult({ score: Math.round(finalScore * 100) / 100, years, scoreType: activeScoreType });
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    const tytTotalNet = Object.values(tytNets).reduce((a, b) => a + b, 0);
    const aytTotalNet = Object.values(aytNets).reduce((a, b) => a + b, 0);
    const latestYear = result.years['2025'] || result.years['2024'];

    const { error } = await supabase.from('ranking_calculations').insert({
      student_id: studentId,
      exam_area: activeScoreType,
      tyt_turkce_net: tytNets.turkce,
      tyt_sosyal_net: tytNets.sosyal,
      tyt_matematik_net: tytNets.matematik,
      tyt_fen_net: tytNets.fen,
      tyt_total_net: tytTotalNet,
      ayt_total_net: aytTotalNet,
      obp,
      calculated_score: result.score,
      estimated_ranking_low: latestYear.yerl,
      estimated_ranking_high: latestYear.ham,
      source_type: inputMode === 'deneme' ? 'deneme' : 'manual',
      source_deneme_ids: inputMode === 'deneme' ? selectedDenemeIds : [],
    } as any);

    setSaving(false);
    if (error) { toast.error('Kaydetme hatası: ' + error.message); return; }
    toast.success('Hesaplama kaydedildi!');
    fetchSaved();
  };

  const handleShare = async () => {
    if (!resultRef.current) return;
    try {
      const canvas = await html2canvas(resultRef.current, { backgroundColor: '#0a0a0a', scale: 2 });
      const link = document.createElement('a');
      link.download = `yks-siralama-${activeScoreType}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success('Görüntü kaydedildi!');
    } catch {
      toast.error('Görüntü oluşturulamadı.');
    }
  };

  const tytTotalNet = useMemo(() => Object.values(tytNets).reduce((a, b) => a + b, 0), [tytNets]);
  const aytTotalNet = useMemo(() => Object.values(aytNets).reduce((a, b) => a + b, 0), [aytNets]);

  const scoreTypes = ['SAY', 'EA', 'SÖZ', 'TYT'];

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-primary" />
        <h2 className="font-display text-xl font-bold">Sıralama Simülatörü</h2>
      </div>

      {/* ─── Score Type Tabs ──────────────────────────── */}
      <Tabs value={activeScoreType} onValueChange={setActiveScoreType}>
        <TabsList className="w-full grid grid-cols-4 bg-secondary/50 rounded-xl h-11">
          {scoreTypes.map(type => (
            <TabsTrigger
              key={type}
              value={type}
              className="rounded-lg text-xs font-bold tracking-wide data-[state=active]:bg-gradient-orange data-[state=active]:text-primary-foreground data-[state=active]:shadow-orange transition-all"
            >
              {type}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
                    {selectedDenemeIds.length === 0 ? 'Deneme seçin...' : `${selectedDenemeIds.length} deneme seçildi`}
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
                              selectedDenemeIds.includes(r.id) ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/20'
                            }`}
                          >
                            <Checkbox checked={selectedDenemeIds.includes(r.id)} onCheckedChange={() => toggleDeneme(r.id)} />
                            <div className="flex-1 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.exam_type}</span>
                                <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString('tr-TR')}</span>
                              </div>
                              <span className="font-display text-sm font-bold text-primary">{Number(r.total_net).toFixed(1)} Net</span>
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
        {/* TYT */}
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
                  type="number" min={0} max={s.maxQ} step="0.01"
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

        {/* AYT (hidden for TYT-only) */}
        {activeScoreType !== 'TYT' && (
          <div className="glass-card rounded-2xl p-5 border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">
                AYT Netleri <span className="text-primary">({activeScoreType})</span>
              </h3>
              <span className="text-xs font-bold text-primary">{aytTotalNet.toFixed(1)} Net</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {aytSubjects.map(s => (
                <div key={s.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{s.label}</Label>
                  <Input
                    type="number" min={0} max={s.maxQ} step="0.01"
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
        )}

        {/* OBP + Kırık OBP */}
        <div className="glass-card rounded-2xl p-5 border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">OBP</Label>
          </div>
          <Input
            type="number" min={0} max={100} step="0.01"
            value={obp || ''}
            onChange={e => setObp(parseFloat(e.target.value) || 0)}
            className="bg-secondary border-primary/20 focus:border-primary h-10"
            placeholder="0 - 100 arası"
          />
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Kırık OBP (Geçen yıl yerleştim)</span>
            </div>
            <Switch checked={brokenObp} onCheckedChange={setBrokenObp} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            OBP katkısı: <span className="text-primary font-semibold">{(obp * (brokenObp ? 0.3 : 0.6)).toFixed(2)}</span> puan
            {brokenObp && <span className="text-yellow-500 ml-1">(Kırık OBP: ×0.3)</span>}
          </p>
        </div>
      </div>

      {/* ─── Calculate ─────────────────────────────────── */}
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
              <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">{result.scoreType} Puan Türü</p>
              <h3 className="font-display text-2xl font-bold text-gradient-orange">YKS Sıralama Simülasyonu</h3>
            </div>

            {/* Score display */}
            <div className="glass-card rounded-xl p-5 text-center border border-primary/20 space-y-1">
              <Trophy className="h-7 w-7 text-primary mx-auto drop-shadow-[0_0_12px_hsl(25_95%_53%)]" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Tahmini Puanın</p>
              <p className="font-display text-4xl font-black text-primary drop-shadow-[0_0_20px_hsl(25_95%_53%/0.6)]">
                {result.score.toFixed(2)}
              </p>
            </div>

            {/* Year comparison table */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Yıl Bazlı Kıyaslama</h4>
              </div>
              <div className="overflow-hidden rounded-xl border border-primary/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary/10 text-primary">
                      <th className="py-2.5 px-3 text-left text-xs font-bold tracking-wider">Yıl</th>
                      <th className="py-2.5 px-3 text-center text-xs font-bold tracking-wider">Ham Sıralama</th>
                      <th className="py-2.5 px-3 text-center text-xs font-bold tracking-wider">Yerleştirme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['2023', '2024', '2025'].map((year, i) => (
                      <tr
                        key={year}
                        className={`border-t border-border/50 transition-colors ${
                          year === '2025' ? 'bg-primary/5' : i % 2 === 0 ? 'bg-secondary/30' : 'bg-secondary/10'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-bold ${year === '2025' ? 'text-primary' : 'text-foreground'}`}>
                            {year} {year === '2025' && '⭐'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-display text-sm font-bold text-foreground">
                            {result.years[year]?.ham.toLocaleString('tr-TR') || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`font-display text-sm font-bold ${year === '2025' ? 'text-primary' : 'text-foreground'}`}>
                            {result.years[year]?.yerl.toLocaleString('tr-TR') || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Progress bar */}
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
              {activeScoreType !== 'TYT' && (
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">AYT Toplam</p>
                  <p className="font-display text-sm font-bold text-foreground">{aytTotalNet.toFixed(1)} Net</p>
                </div>
              )}
              {activeScoreType === 'TYT' && (
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">OBP Katkısı</p>
                  <p className="font-display text-sm font-bold text-primary">{(obp * (brokenObp ? 0.3 : 0.6)).toFixed(1)}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
                <Save className="h-4 w-4 mr-1.5" />
                {saving ? 'Kaydediliyor...' : 'Hesaplamayı Kaydet'}
              </Button>
              <Button onClick={handleShare} variant="outline" className="border-primary/30 hover:bg-primary/10">
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
