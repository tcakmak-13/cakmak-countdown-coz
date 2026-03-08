import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Trophy, TrendingUp, ChevronDown, ChevronUp, Save, Trash2, History, Target, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { osymData2024, formatRanking, formatRankingShort, type ScoreType } from '@/lib/yksRankingEngine';

// ─── ÖSYM Katsayılar ────────────────────────────────────────────────────
const TYT_COEFFICIENTS = { turkce: 3.3, matematik: 3.3, fen: 3.4, sosyal: 3.4 };
const TYT_BASE = 100;
const OBP_COEFFICIENT = 0.6;
const TYT_TO_AYT_RATIO = 0.4;
const AYT_RATIO = 0.6;

const SAY_COEFFICIENTS = { ayt_matematik: 3.0, ayt_fizik: 2.85, ayt_kimya: 3.07, ayt_biyoloji: 3.07 };
const EA_COEFFICIENTS = { ayt_matematik: 3.0, ayt_edebiyat: 3.0, ayt_tarih1: 2.80, ayt_cografya1: 3.0 };
const SOZ_COEFFICIENTS = {
  ayt_edebiyat: 3.0, ayt_tarih1: 2.80, ayt_cografya1: 3.0,
  ayt_tarih2: 2.90, ayt_cografya2: 2.90, ayt_felsefe: 3.0, ayt_din: 3.30,
};

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

const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
  TYT: 'TYT',
  SAYISAL: 'Sayısal (SAY)',
  SOZEL: 'Sözel (SÖZ)',
  ESIT_AGIRLIK: 'Eşit Ağırlık (EA)',
  DIL: 'Dil',
};

interface SavedCalculation {
  id: string;
  date: string;
  tytNets: Record<string, number>;
  aytNets: Record<string, number>;
  obp: number;
  selectedType: ScoreType;
  result: ScoreResult;
}

interface ScoreResult {
  type: ScoreType;
  typeLabel: string;
  score: number;
  ranking: number | null;
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
  const [selectedType, setSelectedType] = useState<ScoreType>('TYT');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showAytDetails, setShowAytDetails] = useState(false);
  const [savedCalcs, setSavedCalcs] = useState<SavedCalculation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeAytTab, setActiveAytTab] = useState('say');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('yks-score-calculations');
      if (saved) setSavedCalcs(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Auto-open AYT section when a non-TYT type is selected
  useEffect(() => {
    if (selectedType !== 'TYT' && !showAytDetails) {
      setShowAytDetails(true);
    }
    // Switch AYT tab to match selected type
    if (selectedType === 'SAYISAL') setActiveAytTab('say');
    else if (selectedType === 'ESIT_AGIRLIK') setActiveAytTab('ea');
    else if (selectedType === 'SOZEL' || selectedType === 'DIL') setActiveAytTab('soz');
  }, [selectedType]);

  const updateTyt = (key: string, val: number) => setTytNets(prev => ({ ...prev, [key]: val }));
  const updateAyt = (key: string, val: number) => setAytNets(prev => ({ ...prev, [key]: val }));

  const calculate = () => {
    // 1. Puan Türünü JSON anahtarına uydur
    const secilenTur = selectedType as ScoreType;

    // 2. Netleri güvenli bir şekilde sayıya çevirip çarp
    const tytPuan = (Number(tytNets.turkce || 0) * 3.3) + (Number(tytNets.sosyal || 0) * 3.4) + (Number(tytNets.matematik || 0) * 3.3) + (Number(tytNets.fen || 0) * 3.4);
    const aytPuan = (Number(aytNets.ayt_matematik || 0) * 3.0) + (Number(aytNets.ayt_fizik || 0) * 2.85) + (Number(aytNets.ayt_kimya || 0) * 3.07) + (Number(aytNets.ayt_biyoloji || 0) * 3.07);

    // 3. Toplam Yerleştirme Puanı
    const toplamPuan = 100 + tytPuan + aytPuan + (Number(obp || 0) * 0.6);
    const score = Math.round(toplamPuan * 100) / 100;

    // 4. Doğrusal Enterpolasyon ile Sıralama Bulma
    let bulunanSiralama: number | null = null;
    if (toplamPuan >= osymData2024[0].puan) {
      bulunanSiralama = osymData2024[0][secilenTur];
    } else if (toplamPuan <= osymData2024[osymData2024.length - 1].puan) {
      bulunanSiralama = osymData2024[osymData2024.length - 1][secilenTur];
    } else {
      for (let i = 0; i < osymData2024.length - 1; i++) {
        const upper = osymData2024[i];
        const lower = osymData2024[i + 1];
        if (toplamPuan <= upper.puan && toplamPuan >= lower.puan) {
          const pointDiff = upper.puan - lower.puan;
          const rankDiff = lower[secilenTur] - upper[secilenTur];
          const scoreOffset = toplamPuan - lower.puan;
          bulunanSiralama = lower[secilenTur] - (rankDiff * (scoreOffset / pointDiff));
          break;
        }
      }
    }

    const ranking = bulunanSiralama !== null ? Math.round(bulunanSiralama) : null;

    const newResult: ScoreResult = {
      type: selectedType,
      typeLabel: SCORE_TYPE_LABELS[selectedType],
      score,
      ranking,
    };

    setResult(newResult);
    setShowResults(true);
  };

  const saveCalculation = () => {
    if (!result) return;
    const calc: SavedCalculation = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleString('tr-TR'),
      tytNets: { ...tytNets },
      aytNets: { ...aytNets },
      obp,
      selectedType,
      result: { ...result },
    };
    const updated = [calc, ...savedCalcs].slice(0, 10);
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
    setSelectedType(calc.selectedType);
    setResult(calc.result);
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
    setResult(null);
    setShowResults(false);
  };

  const scoreColor = (score: number) => {
    if (score >= 400) return 'text-emerald-500 dark:text-emerald-400';
    if (score >= 300) return 'text-primary';
    if (score >= 200) return 'text-amber-500 dark:text-amber-400';
    return 'text-destructive';
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
            <h2 className="font-display text-lg font-bold">Puan & Sıralama Simülatörü</h2>
            <p className="text-xs text-muted-foreground">2024 ÖSYM verisine dayalı doğrusal enterpolasyon</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1.5 text-muted-foreground">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Geçmiş</span>
        </Button>
      </div>

      {/* Privacy notice */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
        <Shield className="h-3.5 w-3.5 shrink-0" />
        <span>Bu veriler yalnızca senin cihazında saklanır. Koçun veya admin bu verileri göremez.</span>
      </div>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && savedCalcs.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Kayıtlı Hesaplamalar</h3>
              {savedCalcs.map(calc => (
                <div key={calc.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                  <button onClick={() => loadCalc(calc)} className="flex-1 text-left">
                    <p className="text-xs text-muted-foreground">{calc.date}</p>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-mono">
                        <span className="text-muted-foreground">{SCORE_TYPE_LABELS[calc.selectedType]}:</span>{' '}
                        <span className={scoreColor(calc.result.score)}>{calc.result.score.toFixed(1)}</span>
                        {calc.result.ranking !== null && (
                          <span className="text-muted-foreground ml-2">→ {formatRankingShort(calc.result.ranking)}</span>
                        )}
                      </span>
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

      {/* Puan Türü Seçimi */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Puan Türü
        </h3>
        <Select value={selectedType} onValueChange={(v) => setSelectedType(v as ScoreType)}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SCORE_TYPE_LABELS) as ScoreType[]).map(key => (
              <SelectItem key={key} value={key}>{SCORE_TYPE_LABELS[key]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TYT Nets */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          TYT Netleri
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(TYT_MAX).map(key => (
            <NetInput key={key} label={FIELD_LABELS[key]} maxNet={TYT_MAX[key]} value={tytNets[key]} onChange={v => updateTyt(key, v)} />
          ))}
        </div>
      </div>

      {/* AYT Nets */}
      {selectedType !== 'TYT' && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <button onClick={() => setShowAytDetails(!showAytDetails)} className="w-full flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary/70" />
              AYT Netleri
            </h3>
            {showAytDetails ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showAytDetails && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <Tabs value={activeAytTab} onValueChange={setActiveAytTab} className="w-full">
                  <TabsList className="w-full bg-secondary/50 mb-4">
                    <TabsTrigger value="say" className="flex-1 text-xs">SAY</TabsTrigger>
                    <TabsTrigger value="ea" className="flex-1 text-xs">EA</TabsTrigger>
                    <TabsTrigger value="soz" className="flex-1 text-xs">SÖZ</TabsTrigger>
                  </TabsList>
                  <TabsContent value={activeAytTab} className="mt-0">
                    <div className="grid grid-cols-2 gap-3">
                      {getActiveAytFields().map(key => (
                        <NetInput key={key} label={FIELD_LABELS[key]} maxNet={AYT_MAX[key]} value={aytNets[key]} onChange={v => updateAyt(key, v)} />
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* OBP */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Diploma Notu (OBP)
        </h3>
        <div className="flex items-center gap-3">
          <Input
            type="number" inputMode="decimal" step="0.1" min={50} max={100}
            value={obp || ''}
            onChange={e => { const v = parseFloat(e.target.value) || 0; setObp(Math.min(Math.max(v, 0), 100)); }}
            className="bg-secondary border-border h-10 text-center font-mono max-w-[120px]"
            placeholder="80"
          />
          <span className="text-xs text-muted-foreground">50 - 100 arası</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={calculate} className="flex-1 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base font-semibold shadow-orange">
          <Calculator className="h-5 w-5 mr-2" />
          Hesapla
        </Button>
        <Button variant="outline" onClick={resetAll} className="h-12 px-4">Sıfırla</Button>
      </div>

      {/* Result */}
      <AnimatePresence>
        {showResults && result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Sonuç
              </h3>
              <Button variant="ghost" size="sm" onClick={saveCalculation} className="gap-1.5 text-primary">
                <Save className="h-4 w-4" />
                Kaydet
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl p-6 relative overflow-hidden"
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

              <div className="space-y-5">
                {/* Score Type Badge */}
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
                    {result.typeLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">2024 ÖSYM Verisi</span>
                </div>

                {/* Main Score */}
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Yerleştirme Puanı</p>
                  <p className={`text-5xl font-bold font-mono tracking-tight ${scoreColor(result.score)}`}>
                    {result.score.toFixed(2)}
                  </p>
                </div>

                {/* Ranking */}
                {result.ranking !== null && result.ranking > 0 && (
                  <div className="bg-secondary/60 rounded-xl p-4 text-center space-y-2">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Target className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-muted-foreground">2024 ÖSYM Sıralaması</p>
                    </div>
                    <p className="text-3xl font-bold font-mono text-foreground">
                      {formatRanking(result.ranking)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Doğrusal enterpolasyon ile hesaplanmıştır
                    </p>
                  </div>
                )}

                {result.ranking === null && (
                  <div className="bg-secondary/60 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Bu puan aralığı için sıralama verisi bulunamadı.</p>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="glass-card rounded-lg p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-semibold">📊 Metodoloji:</span> Puan = Taban(100) + Σ(Net × Katsayı) + (OBP × 0.6) formülüyle hesaplanmıştır. Sıralama, 2024 ÖSYM yığılma tablosuna doğrusal enterpolasyon uygulanarak bulunmuştur.
              </p>
              <p className="text-[10px] text-muted-foreground italic">
                * Katsayılar yaklaşık ÖSYM değerleridir. Gerçek sonuçlar farklılık gösterebilir.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
