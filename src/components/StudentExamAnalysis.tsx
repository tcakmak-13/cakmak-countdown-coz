import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Flame, Target, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ── Colors ── */
const COLOR_GREEN = '#22c55e';
const COLOR_RED = '#ef4444';
const COLOR_ORANGE = 'hsl(var(--primary))';

const donutConfig = {
  correct: { label: 'Doğru', color: COLOR_GREEN },
  wrong: { label: 'Yanlış', color: COLOR_RED },
  blank: { label: 'Boş', color: COLOR_ORANGE },
};

const barConfig = {
  net: { label: 'Net', color: COLOR_ORANGE },
};

/* ── TYT question counts per subject ── */
const TYT_QUESTION_COUNTS: Record<string, number> = {
  turkce: 40, sosyal: 20, matematik: 40, fen: 20,
};

/* ── AYT question counts per subject ── */
const AYT_QUESTION_COUNTS: Record<string, number> = {
  ayt_matematik: 40, ayt_fizik: 14, ayt_kimya: 13, ayt_biyoloji: 13,
  ayt_edebiyat: 24, ayt_tarih1: 10, ayt_cografya1: 6,
  ayt_tarih2: 11, ayt_cografya2: 11, ayt_felsefe: 12, ayt_din: 6,
};

const SUBJECT_LABELS: Record<string, string> = {
  turkce: 'Türkçe', sosyal: 'Sosyal', matematik: 'Matematik', fen: 'Fen',
  ayt_matematik: 'AYT Mat', ayt_fizik: 'Fizik', ayt_kimya: 'Kimya', ayt_biyoloji: 'Biyoloji',
  ayt_edebiyat: 'Edebiyat', ayt_tarih1: 'Tarih-1', ayt_cografya1: 'Coğ-1',
  ayt_tarih2: 'Tarih-2', ayt_cografya2: 'Coğ-2', ayt_felsefe: 'Felsefe', ayt_din: 'Din',
};

/* ── Props ── */
interface StudentExamAnalysisProps {
  student: {
    id: string;
    full_name: string;
    area: string | null;
    grade: string | null;
    target_university: string | null;
    target_department: string | null;
    avatar_url: string | null;
  };
}

export default function StudentExamAnalysis({ student }: StudentExamAnalysisProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicProgress, setTopicProgress] = useState<{ subject: string; progress: number }[]>([]);

  /* ── Fetch exams ── */
  const fetchExams = async () => {
    const { data } = await supabase
      .from('deneme_results')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    if (data) setExams(data);
    setLoading(false);
  };

  /* ── Fetch topic progress ── */
  const fetchTopicProgress = async () => {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .order('sort_order');
    if (!subjects) return;

    const { data: topics } = await supabase
      .from('topics')
      .select('id, subject_id');
    if (!topics) return;

    const { data: progress } = await supabase
      .from('user_topic_progress')
      .select('topic_id, completed')
      .eq('student_id', student.id);

    const completedSet = new Set(
      (progress || []).filter(p => p.completed).map(p => p.topic_id)
    );

    const result = subjects.map(sub => {
      const subTopics = topics.filter(t => t.subject_id === sub.id);
      const total = subTopics.length;
      const done = subTopics.filter(t => completedSet.has(t.id)).length;
      return { subject: sub.name, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
    }).filter(r => r.progress > 0 || true); // keep all

    setTopicProgress(result);
  };

  useEffect(() => {
    fetchExams();
    fetchTopicProgress();

    const channel = supabase
      .channel(`exam-analysis-${student.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deneme_results',
        filter: `student_id=eq.${student.id}`,
      }, () => fetchExams())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [student.id]);

  /* ── Compute averages from all exams ── */
  const computed = useMemo(() => {
    if (exams.length === 0) {
      return { totalNet: 0, correct: 0, wrong: 0, blank: 0, subjectNets: [], examCount: 0 };
    }

    const n = exams.length;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalNet = 0;

    // Accumulate per-subject nets
    const subjectNetSums: Record<string, number> = {};
    const subjectCounts: Record<string, number> = {};

    for (const exam of exams) {
      const isTYT = exam.exam_type === 'TYT';
      const subjects = isTYT ? Object.keys(TYT_QUESTION_COUNTS) : Object.keys(AYT_QUESTION_COUNTS);
      const questionCounts = isTYT ? TYT_QUESTION_COUNTS : AYT_QUESTION_COUNTS;

      for (const sub of subjects) {
        const d = Number(exam[`${sub}_dogru`] ?? 0);
        const y = Number(exam[`${sub}_yanlis`] ?? 0);
        const net = Number(exam[`${sub}_net`] ?? 0);

        totalCorrect += d;
        totalWrong += y;

        if (!subjectNetSums[sub]) { subjectNetSums[sub] = 0; subjectCounts[sub] = 0; }
        subjectNetSums[sub] += net;
        subjectCounts[sub] += 1;
      }

      totalNet += Number(exam.total_net ?? 0);
    }

    // Calculate total blank across all exams
    let totalQuestions = 0;
    for (const exam of exams) {
      const isTYT = exam.exam_type === 'TYT';
      const qc = isTYT ? TYT_QUESTION_COUNTS : AYT_QUESTION_COUNTS;
      totalQuestions += Object.values(qc).reduce((a, b) => a + b, 0);
    }
    const totalBlank = totalQuestions - totalCorrect - totalWrong;

    // Build subject net averages
    const subjectNets = Object.entries(subjectNetSums)
      .map(([key, sum]) => ({
        subject: SUBJECT_LABELS[key] || key,
        net: Number((sum / subjectCounts[key]).toFixed(2)),
      }))
      .filter(s => s.net > 0)
      .sort((a, b) => b.net - a.net);

    return {
      totalNet: Number((totalNet / n).toFixed(2)),
      correct: Math.round(totalCorrect / n),
      wrong: Math.round(totalWrong / n),
      blank: Math.round(totalBlank / n),
      subjectNets,
      examCount: n,
    };
  }, [exams]);

  /* ── Consecutive exam streak (days with exams) ── */
  const streak = useMemo(() => {
    if (exams.length === 0) return 0;
    const dates = [...new Set(exams.map(e => new Date(e.created_at).toISOString().slice(0, 10)))].sort().reverse();
    let count = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 1) count++;
      else break;
    }
    return count;
  }, [exams]);

  const distribution = [
    { name: 'Doğru', value: computed.correct, color: COLOR_GREEN },
    { name: 'Yanlış', value: computed.wrong, color: COLOR_RED },
    { name: 'Boş', value: computed.blank, color: COLOR_ORANGE },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Student Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-primary/30 shrink-0">
            {student.avatar_url ? (
              <img src={student.avatar_url} alt={student.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-xl font-bold text-primary">{student.full_name?.charAt(0)}</span>
            )}
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">{student.full_name}</h3>
            <p className="text-sm text-muted-foreground">
              {student.area ?? 'SAY'} — {student.grade ?? '12. Sınıf'}
            </p>
            {student.target_university && (
              <p className="text-xs text-primary/80 mt-0.5">
                🎯 {student.target_university}
                {student.target_department ? ` / ${student.target_department}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2">
          <Flame className="h-5 w-5 text-primary" />
          <span className="font-display text-xl font-bold text-primary">{streak}</span>
          <span className="text-xs text-muted-foreground">Seri</span>
        </div>
      </div>

      {exams.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-10 text-center">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Bu öğrenci henüz deneme sınavı girmemiş.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Exam count badge */}
          <p className="text-xs text-muted-foreground">
            Toplam <span className="font-semibold text-foreground">{computed.examCount}</span> deneme sınavının ortalaması gösteriliyor.
          </p>

          {/* ── Summary Score Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-primary/20 bg-card">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Target className="h-5 w-5 text-primary mb-1" />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Toplam Net</p>
                <p className="font-display text-2xl font-bold text-primary">{computed.totalNet}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <CheckCircle2 className="h-5 w-5 mb-1" style={{ color: COLOR_GREEN }} />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Doğru</p>
                <p className="font-display text-2xl font-bold" style={{ color: COLOR_GREEN }}>{computed.correct}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <XCircle className="h-5 w-5 mb-1" style={{ color: COLOR_RED }} />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Yanlış</p>
                <p className="font-display text-2xl font-bold" style={{ color: COLOR_RED }}>{computed.wrong}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <MinusCircle className="h-5 w-5 mb-1" style={{ color: COLOR_ORANGE }} />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Boş</p>
                <p className="font-display text-2xl font-bold text-primary">{computed.blank}</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Donut Chart */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Doğru / Yanlış / Boş Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={donutConfig} className="aspect-square max-h-[240px] mx-auto">
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      strokeWidth={2}
                      stroke="hsl(var(--card))"
                    >
                      {distribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {distribution.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ders Bazlı Net (Ortalama)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barConfig} className="aspect-[4/3] max-h-[280px]">
                  <BarChart data={computed.subjectNets} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="subject" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="net" fill={COLOR_ORANGE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* ── Topic Progress ── */}
          {topicProgress.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Konu Takibi İlerleme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topicProgress.map((t, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t.subject}</span>
                      <span className="text-xs text-muted-foreground">%{t.progress}</span>
                    </div>
                    <Progress value={t.progress} className="h-2.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
