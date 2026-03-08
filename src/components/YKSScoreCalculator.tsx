import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Trophy, TrendingUp, ChevronDown, ChevronUp, Save, Trash2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── ÖSYM Approximate Coefficients (2025 based) ─────────────────────────
const TYT_COEFFICIENTS = {
  turkce: 3.3,
  matematik: 3.3,
  fen: 3.4,
  sosyal: 3.3,
};

const TYT_BASE = 100;
const OBP_COEFFICIENT = 0.6;

// TYT contribution ratio to AYT scores (~40%)
const TYT_TO_AYT_RATIO = 0.4;
const AYT_RATIO = 0.6;

// SAY coefficients
const SAY_COEFFICIENTS = {
  ayt_matematik: 3.0,
  ayt_fizik: 2.85,
  ayt_kimya: 3.07,
  ayt_biyoloji: 3.07,
};

// EA coefficients
const EA_COEFFICIENTS = {
  ayt_matematik: 3.0,
  ayt_edebiyat: 3.0,
  ayt_tarih1: 2.80,
  ayt_cografya1: 3.0,
};

// SÖZ coefficients
const SOZ_COEFFICIENTS = {
  ayt_edebiyat: 3.0,
  ayt_tarih1: 2.80,
  ayt_cografya1: 3.0,
  ayt_tarih2: 2.90,
  ayt_cografya2: 2.90,
  ayt_felsefe: 3.0,
  ayt_din: 3.30,
};

// ─── Estimated ranking ranges based on cumulative data ───────────────────
function estimateRanking(score: number, type: string): string {
  if (score <= 0) return '-';
  
  const ranges: Record<string, [number, number, string][]> = {
    TYT: [
      [500, 600, '1 - 500'],
      [450, 500, '500 - 5.000'],
      [400, 450, '5.000 - 30.000'],
      [350, 400, '30.000 - 100.000'],
      [300, 350, '100.000 - 300.000'],
      [250, 300, '300.000 - 600.000'],
      [200, 250, '600.000 - 1.200.000'],
      [150, 200, '1.200.000 - 2.000.000'],
      [0, 150, '2.000.000+'],
    ],
    SAY: [
      [500, 600, '1 - 300'],
      [450, 500, '300 - 3.000'],
      [400, 450, '3.000 - 20.000'],
      [350, 400, '20.000 - 70.000'],
      [300, 350, '70.000 - 180.000'],
      [250, 300, '180.000 - 400.000'],
      [200, 250, '400.000 - 800.000'],
      [0, 200, '800.000+'],
    ],
    EA: [
      [500, 600, '1 - 200'],
      [450, 500, '200 - 2.000'],
      [400, 450, '2.000 - 15.000'],
      [350, 400, '15.000 - 50.000'],
      [300, 350, '50.000 - 150.000'],
      [250, 300, '150.000 - 350.000'],
      [200, 250, '350.000 - 700.000'],
      [0, 200, '700.000+'],
    ],
    SOZ: [
      [500, 600, '1 - 200'],
      [450, 500, '200 - 2.000'],
      [400, 450, '2.000 - 12.000'],
      [350, 400, '12.000 - 40.000'],
      [300, 350, '40.000 - 120.000'],
      [250, 300, '120.000 - 300.000'],
      [200, 250, '300.000 - 600.000'],
      [0, 200, '600.000+'],
    ],
  };

  const typeRanges = ranges[type] || ranges.TYT;
  for (const [min, max, label] of typeRanges) {
    if (score >= min && score < max) return label;
  }
  return typeRanges[typeRanges.length - 1][2];
}

// ─── Max question counts ─────────────────────────────────────────────────
const TYT_MAX: Record<string, number> = { turkce: 40, matematik: 40, fen: 20, sosyal: 20 };
const AYT_MAX: Record<string, number> = {
  ayt_matematik: 40, ayt_fizik: 14, ayt_kimya: 13, ayt_biyoloji: 13,
  ayt_edebiyat: 24, ayt_tarih1: 10, ayt_cografya1: 6,
  ayt_tarih2: 11, ayt_cografya2: 11, ayt_felsefe: 12, ayt_din: 6,
};

const FIELD_LABELS: Record<string, string> = {
  turkce: 'Türkçe', matematik: 'Matematik', fen: 'Fen Bilimleri', sosyal: 'Sosyal Bilimler',
  ayt_matematik: 'Matematik', ayt_fizik: 'Fizik', ayt_kimya: 'Kimya', ayt_biyoloji: 'Biyoloji',
  ayt_edebiyat: 'Edebiyat', ayt_tarih1: 'Tarih-1', ayt_cografya1: 'Coğrafya-1',
  ayt_tarih2: 'Tarih-2', ayt_cografya2: 'Coğrafya-2', ayt_felsefe: 'Felsefe', ayt_din: 'Din',
};

interface SavedCalculation {
  id: string;
  date: string;
  tytNets: Record<string, number>;
  aytNets: Record<string, number>;
  obp: number;
  results: ScoreResult[];
}

interface ScoreResult {
  type: string;
  score: number;
  ranking: string;
}

function NetInput({ label, maxNet, value, onChange }: {
  label: string; maxNet: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label} <span className="opacity-50">(max {maxNet})</span></Label>
      <Input
        type="number"
        inputMode="decimal"
        step="0.25"
        min={0}
        max={maxNet}
        value={value || ''}
        onChange={e => {
          const v = parseFloat(e.target.value) || 0;
          onChange(Math.min(Math.max(v, 0), maxNet));
        }}
        className="bg-secondary border-border h-10 text-center font-mono"
        placeholder="0"
      />
    </div>
  );
}

export default function YKSScoreCalculator() {
  const [tytNets, setTytNets] = useState<Record<string, number>>({ turkce: 0, matematik: 0, fen: 0, sosyal: 0 });
  const [aytNets, setAytNets] = useState<Record<string, number>>({
    ayt_matematik: 0, ayt_fizik: 0, ayt_kimya: 0, ayt_biyoloji: 0,
    ayt_edebiyat: 0, ayt_tarih1: 0, ayt_cografya1: 0,
    ayt_tarih2: 0, ayt_cografya2: 0, ayt_felsefe: 0, ayt_din: 0,
  });
  const [obp, setObp] = useState<number>(80);
  const [results, setResults] = useState<ScoreResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showAytDetails, setShowAytDetails] = useState(false);
  const [savedCalcs, setSavedCalcs] = useState<SavedCalculation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeAytTab, setActiveAytTab] = useState('say');

  // Load saved calculations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('yks-score-calculations');
      if (saved) setSavedCalcs(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const updateTyt = (key: string, val: number) => setTytNets(prev => ({ ...prev, [key]: val }));
  const updateAyt = (key: string, val: number) => setAytNets(prev => ({ ...prev, [key]: val }));

  const calculate = () => {
    // TYT raw score
    const tytRaw = TYT_BASE
      + tytNets.turkce * TYT_COEFFICIENTS.turkce
      + tytNets.matematik * TYT_COEFFICIENTS.matematik
      + tytNets.fen * TYT_COEFFICIENTS.fen
      + tytNets.sosyal * TYT_COEFFICIENTS.sosyal
      + obp * OBP_COEFFICIENT;

    // TYT contribution to AYT scores
    const tytContrib = (tytRaw - TYT_BASE) * TYT_TO_AYT_RATIO;

    // SAY
    const sayAyt = aytNets.ayt_matematik * SAY_COEFFICIENTS.ayt_matematik
      + aytNets.ayt_fizik * SAY_COEFFICIENTS.ayt_fizik
      + aytNets.ayt_kimya * SAY_COEFFICIENTS.ayt_kimya
      + aytNets.ayt_biyoloji * SAY_COEFFICIENTS.ayt_biyoloji;
    const sayScore = TYT_BASE + tytContrib + sayAyt * AYT_RATIO + obp * OBP_COEFFICIENT;

    // EA
    const eaAyt = aytNets.ayt_matematik * EA_COEFFICIENTS.ayt_matematik
      + aytNets.ayt_edebiyat * EA_COEFFICIENTS.ayt_edebiyat
      + aytNets.ayt_tarih1 * EA_COEFFICIENTS.ayt_tarih1
      + aytNets.ayt_cografya1 * EA_COEFFICIENTS.ayt_cografya1;
    const eaScore = TYT_BASE + tytContrib + eaAyt * AYT_RATIO + obp * OBP_COEFFICIENT;

    // SÖZ
    const sozAyt = aytNets.ayt_edebiyat * SOZ_COEFFICIENTS.ayt_edebiyat
      + aytNets.ayt_tarih1 * SOZ_COEFFICIENTS.ayt_tarih1
      + aytNets.ayt_cografya1 * SOZ_COEFFICIENTS.ayt_cografya1
      + aytNets.ayt_tarih2 * SOZ_COEFFICIENTS.ayt_tarih2
      + aytNets.ayt_cografya2 * SOZ_COEFFICIENTS.ayt_cografya2
      + aytNets.ayt_felsefe * SOZ_COEFFICIENTS.ayt_felsefe
      + aytNets.ayt_din * SOZ_COEFFICIENTS.ayt_din;
    const sozScore = TYT_BASE + tytContrib + sozAyt * AYT_RATIO + obp * OBP_COEFFICIENT;

    const newResults: ScoreResult[] = [
      { type: 'TYT', score: Math.round(tytRaw * 100) / 100, ranking: estimateRanking(tytRaw, 'TYT') },
      { type: 'SAY', score: Math.round(sayScore * 100) / 100, ranking: estimateRanking(sayScore, 'SAY') },
      { type: 'EA', score: Math.round(eaScore * 100) / 100, ranking: estimateRanking(eaScore, 'EA') },
      { type: 'SÖZ', score: Math.round(sozScore * 100) / 100, ranking: estimateRanking(sozScore, 'SOZ') },
    ];

    setResults(newResults);
    setShowResults(true);
  };

  const saveCalculation = () => {
    if (results.length === 0) return;
    const calc: SavedCalculation = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleString('tr-TR'),
      tytNets: { ...tytNets },
      aytNets: { ...aytNets },
      obp,
      results: [...results],
    };
    const updated = [calc, ...savedCalcs].slice(0, 10); // Keep last 10
    setSavedCalcs(updated);
    localStorage.setItem('yks-score-calculations', JSON.stringify(updated));
  };

  const deleteCalc = (id: string) => {
    const updated = savedCalcs.filter(c => c.id !== id);
    setSavedCalcs(updated);
    localStorage.setItem('yks-score-calculations', JSON.stringify(updated));
  };

  const loadCalc = (calc: SavedCalculation) => {
    setTytNets(calc.tytNets);
    setAytNets(calc.aytNets);
    setObp(calc.obp);
    setResults(calc.results);
    setShowResults(true);
    setShowHistory(false);
  };

  const resetAll = () => {
    setTytNets({ turkce: 0, matematik: 0, fen: 0, sosyal: 0 });
    setAytNets({
      ayt_matematik: 0, ayt_fizik: 0, ayt_kimya: 0, ayt_biyoloji: 0,
      ayt_edebiyat: 0, ayt_tarih1: 0, ayt_cografya1: 0,
      ayt_tarih2: 0, ayt_cografya2: 0, ayt_felsefe: 0, ayt_din: 0,
    });
    setObp(80);
    setResults([]);
    setShowResults(false);
  };

  const scoreColor = (score: number) => {
    if (score >= 400) return 'text-green-400';
    if (score >= 300) return 'text-yellow-400';
    if (score >= 200) return 'text-orange-400';
    return 'text-red-400';
  };

  const sayFields = ['ayt_matematik', 'ayt_fizik', 'ayt_kimya', 'ayt_biyoloji'];
  const eaFields = ['ayt_matematik', 'ayt_edebiyat', 'ayt_tarih1', 'ayt_cografya1'];
  const sozFields = ['ayt_edebiyat', 'ayt_tarih1', 'ayt_cografya1', 'ayt_tarih2', 'ayt_cografya2', 'ayt_felsefe', 'ayt_din'];

  const getActiveAytFields = () => {
    switch (activeAytTab) {
      case 'say': return sayFields;
      case 'ea': return eaFields;
      case 'soz': return sozFields;
      default: return sayFields;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-orange flex items-center justify-center shadow-orange">
            <Calculator className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Puan Hesapla</h2>
            <p className="text-xs text-muted-foreground">Tahmini YKS puanı ve sıralama</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-1.5 text-muted-foreground"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Geçmiş</span>
        </Button>
      </div>

      {/* Privacy notice */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
        <span>🔒</span>
        <span>Bu veriler yalnızca senin cihazında saklanır. Koçun veya admin bu verileri göremez.</span>
      </div>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && savedCalcs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Kayıtlı Hesaplamalar</h3>
              {savedCalcs.map(calc => (
                <div key={calc.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                  <button onClick={() => loadCalc(calc)} className="flex-1 text-left">
                    <p className="text-xs text-muted-foreground">{calc.date}</p>
                    <div className="flex gap-3 mt-1">
                      {calc.results.map(r => (
                        <span key={r.type} className="text-xs font-mono">
                          <span className="text-muted-foreground">{r.type}:</span>{' '}
                          <span className={scoreColor(r.score)}>{r.score.toFixed(1)}</span>
                        </span>
                      ))}
                    </div>
                  </button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteCalc(calc.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TYT Nets */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          TYT Netleri
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(TYT_MAX).map(key => (
            <NetInput
              key={key}
              label={FIELD_LABELS[key]}
              maxNet={TYT_MAX[key]}
              value={tytNets[key]}
              onChange={v => updateTyt(key, v)}
            />
          ))}
        </div>
      </div>

      {/* AYT Nets */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <button
          onClick={() => setShowAytDetails(!showAytDetails)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            AYT Netleri
          </h3>
          {showAytDetails ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {showAytDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Tabs value={activeAytTab} onValueChange={setActiveAytTab} className="w-full">
                <TabsList className="w-full bg-secondary/50 mb-4">
                  <TabsTrigger value="say" className="flex-1 text-xs">SAY</TabsTrigger>
                  <TabsTrigger value="ea" className="flex-1 text-xs">EA</TabsTrigger>
                  <TabsTrigger value="soz" className="flex-1 text-xs">SÖZ</TabsTrigger>
                </TabsList>
                <TabsContent value={activeAytTab} className="mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {getActiveAytFields().map(key => (
                      <NetInput
                        key={key}
                        label={FIELD_LABELS[key]}
                        maxNet={AYT_MAX[key]}
                        value={aytNets[key]}
                        onChange={v => updateAyt(key, v)}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* OBP */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Diploma Notu (OBP)
        </h3>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={50}
            max={100}
            value={obp || ''}
            onChange={e => {
              const v = parseFloat(e.target.value) || 0;
              setObp(Math.min(Math.max(v, 0), 100));
            }}
            className="bg-secondary border-border h-10 text-center font-mono max-w-[120px]"
            placeholder="80"
          />
          <span className="text-xs text-muted-foreground">50 - 100 arası</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={calculate}
          className="flex-1 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base font-semibold shadow-orange"
        >
          <Calculator className="h-5 w-5 mr-2" />
          Hesapla
        </Button>
        <Button variant="outline" onClick={resetAll} className="h-12 px-4">
          Sıfırla
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Sonuçlar
              </h3>
              <Button variant="ghost" size="sm" onClick={saveCalculation} className="gap-1.5 text-primary">
                <Save className="h-4 w-4" />
                Kaydet
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {results.map((r, i) => (
                <motion.div
                  key={r.type}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-xl p-4 text-center relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{r.type}</p>
                  <p className={`text-2xl font-bold font-mono ${scoreColor(r.score)}`}>
                    {r.score.toFixed(1)}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">~{r.ranking}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground text-center italic">
              * Puanlar yaklaşık ÖSYM katsayılarına göre hesaplanmıştır. Tahmini sıralama geçmiş yıl verilerine dayanır.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
