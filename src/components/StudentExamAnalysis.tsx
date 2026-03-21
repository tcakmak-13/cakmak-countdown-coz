import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Flame, Target, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

/* ── Mock Data ────────────────────────────────────────────── */
const mockExamData = {
  summary: {
    totalNet: 87.5,
    correct: 102,
    wrong: 18,
    blank: 30,
    streak: 7,
  },
  distribution: [
    { name: 'Doğru', value: 102, color: 'hsl(var(--chart-2))' },
    { name: 'Yanlış', value: 18, color: 'hsl(var(--destructive))' },
    { name: 'Boş', value: 30, color: 'hsl(var(--muted-foreground))' },
  ],
  subjectNets: [
    { subject: 'Matematik', net: 28.5 },
    { subject: 'Türkçe', net: 32 },
    { subject: 'Fen', net: 14.25 },
    { subject: 'Sosyal', net: 12.75 },
    { subject: 'Fizik', net: 10 },
    { subject: 'Kimya', net: 8.5 },
    { subject: 'Biyoloji', net: 7 },
  ],
  topicProgress: [
    { subject: 'Matematik', progress: 72 },
    { subject: 'Türkçe', progress: 85 },
    { subject: 'Fizik', progress: 58 },
    { subject: 'Kimya', progress: 45 },
    { subject: 'Biyoloji', progress: 63 },
    { subject: 'Tarih', progress: 90 },
    { subject: 'Coğrafya', progress: 77 },
    { subject: 'Felsefe', progress: 52 },
  ],
};

const donutConfig = {
  correct: { label: 'Doğru', color: 'hsl(var(--chart-2))' },
  wrong: { label: 'Yanlış', color: 'hsl(var(--destructive))' },
  blank: { label: 'Boş', color: 'hsl(var(--muted-foreground))' },
};

const barConfig = {
  net: { label: 'Net', color: 'hsl(var(--primary))' },
};

/* ── Props ────────────────────────────────────────────────── */
interface StudentExamAnalysisProps {
  student: {
    full_name: string;
    area: string | null;
    grade: string | null;
    target_university: string | null;
    target_department: string | null;
    avatar_url: string | null;
  };
}

export default function StudentExamAnalysis({ student }: StudentExamAnalysisProps) {
  const { summary, distribution, subjectNets, topicProgress } = mockExamData;

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
          <span className="font-display text-xl font-bold text-primary">{summary.streak}</span>
          <span className="text-xs text-muted-foreground">Seri</span>
        </div>
      </div>

      {/* ── Summary Score Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-primary/20 bg-card">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Target className="h-5 w-5 text-primary mb-1" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Toplam Net</p>
            <p className="font-display text-2xl font-bold text-primary">{summary.totalNet}</p>
          </CardContent>
        </Card>
        <Card className="border-chart-2/30 bg-card">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <CheckCircle2 className="h-5 w-5 text-chart-2 mb-1" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Doğru</p>
            <p className="font-display text-2xl font-bold text-chart-2">{summary.correct}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-card">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <XCircle className="h-5 w-5 text-destructive mb-1" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Yanlış</p>
            <p className="font-display text-2xl font-bold text-destructive">{summary.wrong}</p>
          </CardContent>
        </Card>
        <Card className="border-muted-foreground/20 bg-card">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <MinusCircle className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Boş</p>
            <p className="font-display text-2xl font-bold text-muted-foreground">{summary.blank}</p>
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
            <CardTitle className="text-sm font-medium">Ders Bazlı Net</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="aspect-[4/3] max-h-[280px]">
              <BarChart data={subjectNets} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="net" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Topic Progress ── */}
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
    </div>
  );
}
