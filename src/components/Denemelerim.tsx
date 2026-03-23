import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, AlertTriangle, TrendingUp, Pencil, Trash2, BarChart3, BookOpenCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import ProgressCircle from '@/components/ProgressCircle';
import KonuTakip from '@/components/KonuTakip';

// ─── Subject Configuration ────────────────────────────────────
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

function calcNet(d: number, y: number) {
  return Math.max(0, d - y * 0.25);
}

type ScoreMap = Record<string, number>;

function emptyScores(subjects: SubjectConfig[]): ScoreMap {
  const m: ScoreMap = {};
  subjects.forEach(s => { m[`${s.key}_dogru`] = 0; m[`${s.key}_yanlis`] = 0; });
  return m;
}

function scoresFromResult(result: any, subjects: SubjectConfig[]): ScoreMap {
  const m: ScoreMap = {};
  subjects.forEach(s => {
    m[`${s.key}_dogru`] = Number(result[`${s.key}_dogru`]) || 0;
    m[`${s.key}_yanlis`] = Number(result[`${s.key}_yanlis`]) || 0;
  });
  return m;
}

// ─── Masked Date Input Helper ────────────────────────────────
function formatDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += '.';
    result += digits[i];
  }
  return result;
}

function parseMaskedDate(masked: string): string | null {
  const digits = masked.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const day = parseInt(digits.slice(0, 2));
  const month = parseInt(digits.slice(2, 4));
  const year = parseInt(digits.slice(4, 8));
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2099) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function Denemelerim({ studentId, studentArea }: { studentId: string; studentArea: string }) {
  const [mainTab, setMainTab] = useState<'net' | 'konu'>('net');
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [scores, setScores] = useState<ScoreMap>(() => emptyScores(TYT_SUBJECTS));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [chartTab, setChartTab] = useState<'total' | 'subjects'>('total');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [examName, setExamName] = useState('');
  const [examDateRaw, setExamDateRaw] = useState('');

  const activeSubjects = examType === 'TYT' ? TYT_SUBJECTS : (AYT_BY_AREA[studentArea] || AYT_BY_AREA['SAY']);

  useEffect(() => {
    if (!editingId) {
      setScores(emptyScores(activeSubjects));
      setErrors({});
    }
  }, [examType, studentArea]);

  const fetchResults = useCallback(async () => {
    const { data } = await supabase
      .from('deneme_results')
      .select('*')
      .eq('student_id', studentId)
      .order('exam_date', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true });
    if (data) setResults(data as any[]);
  }, [studentId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    activeSubjects.forEach(s => {
      const d = scores[`${s.key}_dogru`] || 0;
      const y = scores[`${s.key}_yanlis`] || 0;
      if (d + y > s.maxQ) {
        newErrors[s.key] = `Hatalı giriş: ${s.label} soru sayısını aştınız! (Maks: ${s.maxQ})`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [activeSubjects, scores]);

  const totalNet = useMemo(() => {
    return activeSubjects.reduce((sum, s) => {
      return sum + calcNet(scores[`${s.key}_dogru`] || 0, scores[`${s.key}_yanlis`] || 0);
    }, 0);
  }, [scores, activeSubjects]);

  const handleSave = async () => {
    if (!validate()) { toast.error('Lütfen hataları düzeltin.'); return; }
    // Validate exam date if entered
    const parsedDate = examDateRaw ? parseMaskedDate(examDateRaw) : null;
    if (examDateRaw && !parsedDate) {
      toast.error('Geçersiz tarih formatı. GG.AA.YYYY olmalı.');
      return;
    }
    setSaving(true);
    const row: Record<string, any> = {
      student_id: studentId,
      exam_type: examType,
      student_area: examType === 'AYT' ? studentArea : null,
      exam_name: examName.trim() || null,
      exam_date: parsedDate || null,
    };
    activeSubjects.forEach(s => {
      const d = scores[`${s.key}_dogru`] || 0;
      const y = scores[`${s.key}_yanlis`] || 0;
      row[`${s.key}_dogru`] = d;
      row[`${s.key}_yanlis`] = y;
      row[`${s.key}_net`] = calcNet(d, y);
    });
    row.total_net = activeSubjects.reduce((sum, s) => sum + calcNet(scores[`${s.key}_dogru`] || 0, scores[`${s.key}_yanlis`] || 0), 0);

    let error;
    if (editingId) {
      const res = await supabase.from('deneme_results').update(row as any).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('deneme_results').insert(row as any);
      error = res.error;
    }
    setSaving(false);
    if (error) { console.error('Deneme kaydetme hatası:', error); toast.error('Kaydetme başarısız. Lütfen tekrar deneyin.'); return; }
    toast.success(editingId ? 'Deneme güncellendi!' : 'Deneme kaydedildi!');
    setOpen(false);
    setEditingId(null);
    setExamName('');
    setExamDateRaw('');
    setScores(emptyScores(activeSubjects));
    fetchResults();
  };

  const handleEdit = (result: any) => {
    const type = result.exam_type as 'TYT' | 'AYT';
    setExamType(type);
    const subs = type === 'TYT' ? TYT_SUBJECTS : (AYT_BY_AREA[result.student_area || studentArea] || AYT_BY_AREA['SAY']);
    setScores(scoresFromResult(result, subs));
    setEditingId(result.id);
    setExamName(result.exam_name || '');
    // Convert exam_date (YYYY-MM-DD) back to DD.MM.YYYY for the mask
    if (result.exam_date) {
      const [y, m, d] = result.exam_date.split('-');
      setExamDateRaw(`${d}.${m}.${y}`);
    } else {
      setExamDateRaw('');
    }
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('deneme_results').delete().eq('id', deleteId);
    if (error) { console.error('Deneme silme hatası:', error); toast.error('Silme başarısız. Lütfen tekrar deneyin.'); }
    else { toast.success('Deneme silindi.'); fetchResults(); }
    setDeleteId(null);
  };

  const handleModalClose = (val: boolean) => {
    setOpen(val);
    if (!val) { setEditingId(null); setExamName(''); setExamDateRaw(''); setScores(emptyScores(activeSubjects)); setErrors({}); }
  };

  // ─── Progress Circles Data (AVERAGE across ALL exams) ─────────────
  const progressData = useMemo(() => {
    const filtered = results.filter(r => r.exam_type === examType);
    if (filtered.length === 0) return [];
    const subs = examType === 'TYT' ? TYT_SUBJECTS : (AYT_BY_AREA[studentArea] || AYT_BY_AREA['SAY']);
    return subs.map(s => {
      const totalCorrect = filtered.reduce((sum, r) => sum + (Number(r[`${s.key}_dogru`]) || 0), 0);
      const avgCorrect = totalCorrect / filtered.length;
      return {
        label: s.label,
        percentage: s.maxQ > 0 ? (avgCorrect / s.maxQ) * 100 : 0,
      };
    });
  }, [results, examType, studentArea]);

  // ─── Chart Data ──────────────────────────────────────
  const filteredResults = results.filter(r => r.exam_type === examType);
  const chartData = filteredResults.slice(-10).map(r => {
    const displayDate = r.exam_date
      ? new Date(r.exam_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
      : new Date(r.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    const point: Record<string, any> = {
      date: displayDate,
      net: Number(r.total_net),
    };
    const subs = r.exam_type === 'TYT' ? TYT_SUBJECTS : (AYT_BY_AREA[r.student_area] || AYT_BY_AREA[studentArea] || []);
    subs.forEach((s: SubjectConfig) => {
      point[s.label] = Number(r[`${s.key}_net`] || 0);
    });
    return point;
  });

  const CHART_COLORS = ['hsl(25 95% 53%)', 'hsl(200 80% 55%)', 'hsl(150 70% 45%)', 'hsl(280 70% 60%)', 'hsl(45 90% 55%)', 'hsl(340 75% 55%)', 'hsl(170 60% 50%)'];

  const updateScore = (field: string, val: string) => {
    const num = parseInt(val) || 0;
    setScores(prev => ({ ...prev, [field]: Math.max(0, num) }));
    setErrors(prev => { const n = { ...prev }; const key = field.replace(/_dogru|_yanlis/, ''); delete n[key]; return n; });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Main Tabs: Net Analizi / Konu Takibi */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-2xl">
        <button
          onClick={() => setMainTab('net')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
            mainTab === 'net'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Net Analizi
        </button>
        <button
          onClick={() => setMainTab('konu')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
            mainTab === 'konu'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpenCheck className="w-4 h-4" />
          Konu Takibi
        </button>
      </div>

      {mainTab === 'konu' ? (
        <KonuTakip studentId={studentId} studentArea={studentArea} />
      ) : (
      <>
      {/* Exam Type Filter */}
      <button id="deneme-add-btn" onClick={() => { setEditingId(null); setScores(emptyScores(activeSubjects)); setOpen(true); }} className="hidden" />

      {/* Exam Type Filter */}
      <div className="flex gap-2">
        {(['TYT', 'AYT'] as const).map(t => (
          <button
            key={t}
            onClick={() => setExamType(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all ${
              examType === t ? 'bg-gradient-orange text-primary-foreground shadow-orange' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ════════ 1) NET GRAFİĞİ — EN ÜSTTE ════════ */}
      {chartData.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 border border-primary/20 shadow-orange space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Net Grafiği
            </h3>
            <div className="flex bg-secondary rounded-lg p-0.5">
              {[{ key: 'total', label: 'Toplam' }, { key: 'subjects', label: 'Dersler' }].map(ct => (
                <button
                  key={ct.key}
                  onClick={() => setChartTab(ct.key as 'total' | 'subjects')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    chartTab === ct.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
              <XAxis dataKey="date" stroke="hsl(0 0% 55%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 55%)" fontSize={11} />
              <Tooltip
                contentStyle={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(25 95% 53% / 0.4)', borderRadius: '0.75rem', color: 'hsl(0 0% 98%)' }}
                labelStyle={{ color: 'hsl(0 0% 55%)' }}
              />
              {chartTab === 'total' ? (
                <Line type="monotone" dataKey="net" name="Toplam Net" stroke="hsl(25 95% 53%)" strokeWidth={2.5} dot={{ fill: 'hsl(25 95% 53%)', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: 'hsl(35 100% 60%)' }} />
              ) : (
                <>
                  {activeSubjects.map((s, i) => (
                    <Line key={s.key} type="monotone" dataKey={s.label} name={s.label} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
          <p className="text-sm">Henüz {examType} deneme sonucun yok.</p>
          <p className="text-xs mt-1">Yeni deneme eklemek için + butonuna tıkla.</p>
        </div>
      )}

      {/* ════════ 2) GENEL BAŞARI ORANI — GRAFİĞİN ALTINDA ════════ */}
      {progressData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 border border-primary/20">
          <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
            Genel Başarı Oranı — {filteredResults.length} Deneme Ortalaması
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {progressData.map(p => (
              <ProgressCircle key={p.label} label={p.label} percentage={p.percentage} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent results */}
      {filteredResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm text-muted-foreground uppercase tracking-widest">Son Sonuçlar</h3>
          {filteredResults.slice(-5).reverse().map(r => (
            <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-4 flex items-center justify-between border border-border group relative">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.exam_type}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {r.exam_date
                    ? new Date(r.exam_date + 'T00:00:00').toLocaleDateString('tr-TR')
                    : new Date(r.created_at).toLocaleDateString('tr-TR')}
                </span>
                {r.exam_name && <span className="text-xs text-muted-foreground ml-1.5">· {r.exam_name}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-display text-base sm:text-lg font-bold text-primary">{Number(r.total_net).toFixed(2)} Net</span>
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(r)}
                    className="p-2 sm:p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    title="Düzenle"
                  >
                    <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(r.id)}
                    className="p-2 sm:p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Add/Edit Modal ──────────────────────────────── */}
      <Dialog open={open} onOpenChange={handleModalClose}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Deneme Düzenle' : 'Yeni Deneme Ekle'}</DialogTitle>
            <DialogDescription>Doğru ve yanlış sayılarını girin.</DialogDescription>
          </DialogHeader>

          {!editingId && (
            <div className="flex gap-2 mb-2">
              {(['TYT', 'AYT'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setExamType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    examType === t ? 'bg-gradient-orange text-primary-foreground shadow-orange' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {editingId && (
            <p className="text-xs text-muted-foreground text-center mb-2">
              Sınav Türü: <span className="text-primary font-semibold">{examType}</span>
            </p>
          )}

          {examType === 'AYT' && (
            <p className="text-xs text-muted-foreground text-center mb-2">
              Alan: <span className="text-primary font-semibold">{studentArea}</span>
            </p>
          )}
          {/* Deneme Adı & Tarihi */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Deneme Adı / Kurum</Label>
              <Input
                placeholder="Örn: Özdebir, 3D"
                value={examName}
                onChange={e => setExamName(e.target.value)}
                maxLength={60}
                className="bg-secondary border-primary/20 focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Deneme Tarihi</Label>
              <Input
                placeholder="GG.AA.YYYY"
                value={examDateRaw}
                onChange={e => setExamDateRaw(formatDateMask(e.target.value))}
                maxLength={10}
                inputMode="numeric"
                className="bg-secondary border-primary/20 focus:border-primary font-mono tracking-wider"
              />
            </div>
          </div>

          <div className="space-y-4">
            {activeSubjects.map(s => {
              const d = scores[`${s.key}_dogru`] || 0;
              const y = scores[`${s.key}_yanlis`] || 0;
              const net = calcNet(d, y);
              const hasError = !!errors[s.key];
              return (
                <div key={s.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {s.label}
                      <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">({s.maxQ} soru)</span>
                    </Label>
                    <span className={`text-xs font-semibold ${hasError ? 'text-destructive' : 'text-primary'}`}>{net.toFixed(2)} net</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" min={0} max={s.maxQ} placeholder="Doğru" value={d || ''} onChange={e => updateScore(`${s.key}_dogru`, e.target.value)} className={`bg-secondary ${hasError ? 'border-destructive' : 'border-primary/20 focus:border-primary'}`} />
                    <Input type="number" min={0} max={s.maxQ} placeholder="Yanlış" value={y || ''} onChange={e => updateScore(`${s.key}_yanlis`, e.target.value)} className={`bg-secondary ${hasError ? 'border-destructive' : 'border-primary/20 focus:border-primary'}`} />
                  </div>
                  {hasError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-xs text-destructive font-medium drop-shadow-[0_0_6px_hsl(25_95%_53%/0.5)]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {errors[s.key]}
                    </motion.p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 glass-card rounded-xl p-4 text-center border border-primary/30 shadow-orange">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Toplam Net</p>
            <p className="font-display text-3xl font-bold text-primary">{totalNet.toFixed(2)}</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-11 mt-2">
            {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(val) => { if (!val) setDeleteId(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Bu denemeyi silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem geri alınamaz. Deneme sonucu kalıcı olarak silinecektir.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
      )}
    </div>
  );
}
