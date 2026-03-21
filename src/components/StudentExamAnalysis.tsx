import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Flame, Target, CheckCircle2, XCircle, MinusCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ── Colors ── */
const COLOR_GREEN = '#22c55e';   // Doğru
const COLOR_RED = '#FF0000';     // Yanlış - canlı parlak kırmızı
const COLOR_AMBER = '#f59e0b';   // Boş - amber-500

/* ── Area → AYT subjects mapping ── */
const AREA_AYT_SUBJECTS: Record<string, string[]> = {
  SAY: ['ayt_matematik', 'ayt_fizik', 'ayt_kimya', 'ayt_biyoloji'],
  EA: ['ayt_matematik', 'ayt_edebiyat', 'ayt_tarih1', 'ayt_cografya1'],
  SÖZ: ['ayt_edebiyat', 'ayt_tarih1', 'ayt_cografya1', 'ayt_tarih2', 'ayt_cografya2', 'ayt_felsefe', 'ayt_din'],
  DİL: ['ayt_edebiyat'],
};

const TYT_SUBJECTS = ['turkce', 'sosyal', 'matematik', 'fen'];

const TYT_QUESTION_COUNTS: Record<string, number> = {
  turkce: 40, sosyal: 20, matematik: 40, fen: 20,
};
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

/* ── Chart configs ── */
const donutConfig = {
  correct: { label: 'Doğru', color: COLOR_GREEN },
  wrong: { label: 'Yanlış', color: COLOR_RED },
  blank: { label: 'Boş', color: COLOR_AMBER },
};
const barConfig = { net: { label: 'Net', color: COLOR_AMBER } };

/* ── Types ── */
type ViewMode = 'average' | 'latest';
type ExamFilter = 'TYT' | 'AYT';

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

/* ── Helper: get relevant subjects for a student area + exam filter ── */
function getRelevantSubjects(area: string, examFilter: ExamFilter): string[] {
  const aytSubs = AREA_AYT_SUBJECTS[area] || AREA_AYT_SUBJECTS['SAY'];
  if (examFilter === 'TYT') return TYT_SUBJECTS;
  if (examFilter === 'AYT') return aytSubs;
  return [...TYT_SUBJECTS, ...aytSubs];
}

function getQuestionCount(sub: string): number {
  return TYT_QUESTION_COUNTS[sub] ?? AYT_QUESTION_COUNTS[sub] ?? 0;
}

/* ── Component ── */
export default function StudentExamAnalysis({ student }: StudentExamAnalysisProps) {
  const [allExams, setAllExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('average');
  const [examFilter, setExamFilter] = useState<ExamFilter>('all');

  // Topic progress state
  const [allSubjects, setAllSubjects] = useState<{ id: string; name: string; exam_type: string; allowed_areas: string[] | null }[]>([]);
  const [allTopics, setAllTopics] = useState<{ id: string; subject_id: string }[]>([]);
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(new Set());

  const studentArea = student.area ?? 'SAY';

  /* ── Fetch ── */
  const fetchExams = async () => {
    const { data } = await supabase
      .from('deneme_results')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    if (data) setAllExams(data);
    setLoading(false);
  };

  const fetchTopicData = async () => {
    const [subRes, topRes, progRes] = await Promise.all([
      supabase.from('subjects').select('id, name, exam_type, allowed_areas').order('sort_order'),
      supabase.from('topics').select('id, subject_id'),
      supabase.from('user_topic_progress').select('topic_id, completed').eq('student_id', student.id),
    ]);
    if (subRes.data) setAllSubjects(subRes.data);
    if (topRes.data) setAllTopics(topRes.data);
    setCompletedTopicIds(new Set((progRes.data || []).filter(p => p.completed).map(p => p.topic_id)));
  };

  useEffect(() => {
    fetchExams();
    fetchTopicData();

    const channel = supabase
      .channel(`exam-analysis-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deneme_results', filter: `student_id=eq.${student.id}` }, () => fetchExams())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [student.id]);

  /* ── Filter exams by TYT/AYT ── */
  const filteredExams = useMemo(() => {
    if (examFilter === 'all') return allExams;
    return allExams.filter(e => e.exam_type === examFilter);
  }, [allExams, examFilter]);

  /* ── Relevant subjects for this student ── */
  const relevantSubjects = useMemo(() => getRelevantSubjects(studentArea, examFilter), [studentArea, examFilter]);

  /* ── Compute stats ── */
  const computed = useMemo(() => {
    const exams = filteredExams;
    if (exams.length === 0) return null;

    const source = viewMode === 'latest' ? [exams[0]] : exams;
    const n = source.length;

    let totalCorrect = 0, totalWrong = 0, totalNet = 0, totalQuestions = 0;
    const subjectNetSums: Record<string, number> = {};
    const subjectCounts: Record<string, number> = {};

    for (const exam of source) {
      const isTYT = exam.exam_type === 'TYT';
      const subs = isTYT ? TYT_SUBJECTS : (AREA_AYT_SUBJECTS[studentArea] || AREA_AYT_SUBJECTS['SAY']);

      for (const sub of subs) {
        const d = Number(exam[`${sub}_dogru`] ?? 0);
        const y = Number(exam[`${sub}_yanlis`] ?? 0);
        const net = Number(exam[`${sub}_net`] ?? 0);
        totalCorrect += d;
        totalWrong += y;
        totalQuestions += getQuestionCount(sub);

        if (!subjectNetSums[sub]) { subjectNetSums[sub] = 0; subjectCounts[sub] = 0; }
        subjectNetSums[sub] += net;
        subjectCounts[sub] += 1;
      }

      totalNet += Number(exam.total_net ?? 0);
    }

    const totalBlank = Math.max(0, totalQuestions - totalCorrect - totalWrong);

    const subjectNets = relevantSubjects
      .filter(sub => subjectCounts[sub])
      .map(sub => ({
        subject: SUBJECT_LABELS[sub] || sub,
        net: Number((subjectNetSums[sub] / subjectCounts[sub]).toFixed(2)),
      }));

    return {
      totalNet: Number((totalNet / n).toFixed(2)),
      correct: Math.round(totalCorrect / n),
      wrong: Math.round(totalWrong / n),
      blank: Math.round(totalBlank / n),
      subjectNets,
      examCount: filteredExams.length,
      sourceCount: n,
    };
  }, [filteredExams, viewMode, studentArea, relevantSubjects]);

  /* ── Streak ── */
  const streak = useMemo(() => {
    if (allExams.length === 0) return 0;
    const dates = [...new Set(allExams.map(e => new Date(e.created_at).toISOString().slice(0, 10)))].sort().reverse();
    let count = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
      if (diff <= 1) count++; else break;
    }
    return count;
  }, [allExams]);

  /* ── Topic progress (filtered by area + exam filter) ── */
  const topicProgress = useMemo(() => {
    const filteredSubs = allSubjects.filter(sub => {
      // Filter by exam type
      if (examFilter === 'TYT' && sub.exam_type !== 'TYT') return false;
      if (examFilter === 'AYT' && sub.exam_type !== 'AYT') return false;
      // Filter by area
      if (sub.exam_type === 'AYT' && sub.allowed_areas && sub.allowed_areas.length > 0) {
        if (!sub.allowed_areas.includes(studentArea)) return false;
      }
      return true;
    });

    return filteredSubs.map(sub => {
      const subTopics = allTopics.filter(t => t.subject_id === sub.id);
      const total = subTopics.length;
      const done = subTopics.filter(t => completedTopicIds.has(t.id)).length;
      return { subject: sub.name, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [allSubjects, allTopics, completedTopicIds, studentArea, examFilter]);

  /* ── Distribution data ── */
  const distribution = computed ? [
    { name: 'Doğru', value: computed.correct, color: COLOR_GREEN },
    { name: 'Yanlış', value: computed.wrong, color: COLOR_RED },
    { name: 'Boş', value: computed.blank, color: COLOR_AMBER },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  /* ── Toggle button helper ── */
  const ToggleBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* ── Student Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
              {studentArea} — {student.grade ?? '12. Sınıf'}
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

      {allExams.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-10 text-center">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Bu öğrenci henüz deneme sınavı girmemiş.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Filter Row ── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
              <ToggleBtn active={viewMode === 'latest'} onClick={() => setViewMode('latest')}>
                <TrendingUp className="h-4 w-4" /> Son Deneme
              </ToggleBtn>
              <ToggleBtn active={viewMode === 'average'} onClick={() => setViewMode('average')}>
                <BarChart3 className="h-4 w-4" /> Ortalama
              </ToggleBtn>
            </div>

            {/* Exam type filter */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
              {(['all', 'TYT', 'AYT'] as ExamFilter[]).map(f => (
                <ToggleBtn key={f} active={examFilter === f} onClick={() => setExamFilter(f)}>
                  {f === 'all' ? 'Tümü' : f}
                </ToggleBtn>
              ))}
            </div>
          </div>

          {/* Info badge */}
          <p className="text-xs text-muted-foreground">
            {viewMode === 'latest'
              ? 'En son girilen sınavın verileri gösteriliyor.'
              : <>Toplam <span className="font-semibold text-foreground">{computed?.examCount ?? 0}</span> sınavın ortalaması gösteriliyor.</>
            }
            {examFilter !== 'all' && <span className="ml-1 text-primary font-medium">({examFilter} filtrelenmiş)</span>}
          </p>

          {!computed ? (
            <Card className="border-border bg-card">
              <CardContent className="p-10 text-center">
                <p className="text-muted-foreground">Bu filtreye uygun deneme bulunamadı.</p>
              </CardContent>
            </Card>
          ) : (
            <>
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
                    <MinusCircle className="h-5 w-5 mb-1" style={{ color: COLOR_AMBER }} />
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Boş</p>
                    <p className="font-display text-2xl font-bold" style={{ color: COLOR_AMBER }}>{computed.blank}</p>
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
                          animationBegin={0}
                          animationDuration={800}
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
                    <CardTitle className="text-sm font-medium">
                      Ders Bazlı Net {viewMode === 'average' ? '(Ortalama)' : '(Son Deneme)'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={barConfig} className="aspect-[4/3] max-h-[280px]">
                      <BarChart data={computed.subjectNets} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="subject" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="net" fill={COLOR_AMBER} radius={[4, 4, 0, 0]} animationBegin={0} animationDuration={600} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* ── Topic Progress ── */}
              {topicProgress.length > 0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Konu Takibi İlerleme
                      {examFilter !== 'all' && <span className="text-xs text-muted-foreground ml-2">({examFilter})</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {topicProgress.map((t, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{t.subject}</span>
                          <span className="text-xs font-semibold" style={{
                            color: t.progress >= 75 ? COLOR_GREEN : t.progress >= 40 ? COLOR_AMBER : COLOR_RED
                          }}>
                            %{t.progress}
                          </span>
                        </div>
                        <Progress value={t.progress} className="h-2.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
