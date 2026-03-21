import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Users, Calendar, MessageCircle, UserCircle, CalendarCheck,
  FolderOpen, MessageCircleQuestion, Activity, AlertTriangle, TrendingDown,
  Clock, CheckCircle2, Plus, Sparkles, Bot, Crown, Send, Camera, BookOpen,
  Target, Award, Flame, Star, ChevronRight, ChevronLeft, ArrowUpRight
} from 'lucide-react';
import AppLogo from '@/components/AppLogo';
import YKSCountdown from '@/components/YKSCountdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

// ─── Mock Data ───────────────────────────────────────────────────────

const MOCK_STUDENTS = [
  { id: '1', full_name: 'Zeynep Aydın', area: 'SAY', grade: '12. Sınıf', username: 'zeynep', avatar_url: null, target_university: 'İTÜ', target_department: 'Bilgisayar Mühendisliği' },
  { id: '2', full_name: 'Burak Demir', area: 'EA', grade: '12. Sınıf', username: 'burak', avatar_url: null, target_university: 'Boğaziçi', target_department: 'İşletme' },
  { id: '3', full_name: 'Elif Yılmaz', area: 'SAY', grade: 'Mezun', username: 'elif', avatar_url: null, target_university: 'Hacettepe', target_department: 'Tıp' },
  { id: '4', full_name: 'Mert Kaya', area: 'SÖZ', grade: '11. Sınıf', username: 'mert', avatar_url: null, target_university: 'Ankara Üniversitesi', target_department: 'Hukuk' },
  { id: '5', full_name: 'Selin Çelik', area: 'SAY', grade: '12. Sınıf', username: 'selin', avatar_url: null, target_university: 'ODTÜ', target_department: 'Elektrik-Elektronik Müh.' },
];

const HEATMAP_MOCK: ('active' | 'partial' | 'inactive' | 'noData')[][] = [
  ['active', 'active', 'partial', 'active', 'active', 'active', 'partial'],
  ['active', 'partial', 'active', 'inactive', 'active', 'partial', 'noData'],
  ['active', 'active', 'active', 'active', 'partial', 'active', 'active'],
  ['inactive', 'partial', 'active', 'partial', 'inactive', 'active', 'partial'],
  ['active', 'active', 'active', 'active', 'active', 'active', 'active'],
];

const HEATMAP_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  partial: 'bg-yellow-400',
  inactive: 'bg-red-600',
  noData: 'bg-muted/30',
};

const LINE_COLORS = [
  'hsl(25, 95%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(200, 80%, 55%)',
  'hsl(280, 65%, 60%)', 'hsl(45, 90%, 55%)',
];

const TYT_CHART = [
  { index: 'Deneme 1', 'Zeynep Aydın': 78, 'Burak Demir': 65, 'Elif Yılmaz': 88, 'Mert Kaya': 52, 'Selin Çelik': 71 },
  { index: 'Deneme 2', 'Zeynep Aydın': 82, 'Burak Demir': 70, 'Elif Yılmaz': 91, 'Mert Kaya': 55, 'Selin Çelik': 76 },
  { index: 'Deneme 3', 'Zeynep Aydın': 85, 'Burak Demir': 68, 'Elif Yılmaz': 95, 'Mert Kaya': 60, 'Selin Çelik': 80 },
  { index: 'Deneme 4', 'Zeynep Aydın': 90, 'Burak Demir': 74, 'Elif Yılmaz': 98, 'Mert Kaya': 58, 'Selin Çelik': 83 },
  { index: 'Deneme 5', 'Zeynep Aydın': 88, 'Burak Demir': 79, 'Elif Yılmaz': 101, 'Mert Kaya': 63, 'Selin Çelik': 87 },
];

const AYT_CHART = [
  { index: 'Deneme 1', 'Zeynep Aydın': 42, 'Burak Demir': 38, 'Elif Yılmaz': 55, 'Mert Kaya': 30, 'Selin Çelik': 40 },
  { index: 'Deneme 2', 'Zeynep Aydın': 48, 'Burak Demir': 42, 'Elif Yılmaz': 60, 'Mert Kaya': 33, 'Selin Çelik': 45 },
  { index: 'Deneme 3', 'Zeynep Aydın': 52, 'Burak Demir': 45, 'Elif Yılmaz': 63, 'Mert Kaya': 36, 'Selin Çelik': 50 },
  { index: 'Deneme 4', 'Zeynep Aydın': 55, 'Burak Demir': 48, 'Elif Yılmaz': 67, 'Mert Kaya': 40, 'Selin Çelik': 54 },
];

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const WEEKLY_TASKS = [
  [
    { subject: 'Matematik', topic: 'Türev - Limit', minutes: 60, completed: true, book: 'Acil Matematik' },
    { subject: 'Fizik', topic: 'Kuvvet ve Hareket', minutes: 45, completed: true, book: '345 Fizik' },
    { subject: 'Türkçe', topic: 'Paragraf Analizi', minutes: 30, completed: false, book: null },
  ],
  [
    { subject: 'Kimya', topic: 'Mol Hesaplamaları', minutes: 50, completed: true, book: '3D Kimya' },
    { subject: 'Biyoloji', topic: 'Hücre Bölünmesi', minutes: 40, completed: false, book: null },
  ],
  [
    { subject: 'Matematik', topic: 'İntegral', minutes: 90, completed: true, book: 'Acil Matematik' },
    { subject: 'Tarih', topic: 'Osmanlı Devleti', minutes: 45, completed: true, book: null },
    { subject: 'Coğrafya', topic: 'İklim ve Bitki Örtüsü', minutes: 30, completed: true, book: null },
    { subject: 'Fizik', topic: 'Elektrik Devreleri', minutes: 60, completed: false, book: '345 Fizik' },
  ],
  [
    { subject: 'Matematik', topic: 'Olasılık', minutes: 60, completed: false, book: 'Acil Matematik' },
    { subject: 'Kimya', topic: 'Asit-Baz Dengesi', minutes: 45, completed: false, book: '3D Kimya' },
  ],
  [
    { subject: 'Türkçe', topic: 'Dil Bilgisi', minutes: 40, completed: true, book: null },
    { subject: 'Matematik', topic: 'Geometri - Üçgenler', minutes: 75, completed: true, book: null },
    { subject: 'Fizik', topic: 'Dalga Mekaniği', minutes: 50, completed: false, book: '345 Fizik' },
  ],
  [
    { subject: 'Biyoloji', topic: 'Genetik', minutes: 60, completed: true, book: null },
    { subject: 'Kimya', topic: 'Organik Kimya', minutes: 45, completed: false, book: '3D Kimya' },
  ],
  [
    { subject: 'Genel Tekrar', topic: 'TYT Deneme Çözümü', minutes: 180, completed: false, book: null },
  ],
];

const MOCK_QUESTIONS = [
  {
    id: 'q1', title: 'Türev sorusunda limit nasıl hesaplanır?', subject: 'Matematik', category: 'TYT',
    status: 'answered', answers: 3, hasBest: true, hasAI: true,
    description: 'Fonksiyonun türevini limit tanımıyla hesaplarken hangi adımları izlemeliyim?',
  },
  {
    id: 'q2', title: 'Kuvvet-ivme ilişkisini anlayamıyorum', subject: 'Fizik', category: 'AYT',
    status: 'open', answers: 1, hasBest: false, hasAI: true,
    description: 'Newton\'un ikinci yasasında F=ma formülünü farklı durumlar için nasıl uygularım?',
  },
  {
    id: 'q3', title: 'Organik bileşik isimlendirmesi', subject: 'Kimya', category: 'AYT',
    status: 'open', answers: 0, hasBest: false, hasAI: false,
    description: 'IUPAC isimlendirme kurallarını karıştırıyorum, özellikle dallanmış yapılarda.',
  },
  {
    id: 'q4', title: 'Paragraf sorularında ana fikir bulma', subject: 'Türkçe', category: 'TYT',
    status: 'answered', answers: 5, hasBest: true, hasAI: false,
    description: 'Uzun paragraf sorularında ana fikri hızlıca nasıl tespit edebilirim?',
  },
];

const AI_SOLUTION_MOCK = {
  question: 'Bir fonksiyonun x = 2 noktasındaki türevi limit tanımıyla nasıl bulunur?',
  image: null,
  solution: `## Çözüm Adımları

**1. Türev Tanımı:**
$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

**2. x = 2 noktası için:**
$$f'(2) = \\lim_{h \\to 0} \\frac{f(2+h) - f(2)}{h}$$

**3. Örnek: f(x) = x² + 3x için:**
- f(2) = 4 + 6 = 10
- f(2+h) = (2+h)² + 3(2+h) = 4 + 4h + h² + 6 + 3h = 10 + 7h + h²

**4. Limite yerleştirme:**
$$f'(2) = \\lim_{h \\to 0} \\frac{10 + 7h + h² - 10}{h} = \\lim_{h \\to 0} (7 + h) = 7$$

### 📌 Sonuç
f'(2) = **7**

### 💡 Önerilen Çalışma Konuları
- Limit kavramı ve süreklilik
- Türev kuralları (toplam, çarpım, bölüm)
- Bileşke fonksiyon türevi`,
  confidence: 0.95,
  model: 'Gemini 2.5 Pro',
};

const SUBJECT_STATS = [
  { name: 'Matematik', correct: 28, wrong: 7, empty: 5 },
  { name: 'Türkçe', correct: 32, wrong: 5, empty: 3 },
  { name: 'Fizik', correct: 10, wrong: 3, empty: 1 },
  { name: 'Kimya', correct: 9, wrong: 4, empty: 0 },
  { name: 'Biyoloji', correct: 11, wrong: 2, empty: 0 },
  { name: 'Tarih', correct: 4, wrong: 1, empty: 0 },
  { name: 'Coğrafya', correct: 4, wrong: 1, empty: 0 },
];

// ─── Components ──────────────────────────────────────────────────────

type ShowcaseTab = 'coach' | 'analysis' | 'ai-solve' | 'planner';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}sa`;
  return `${h}sa ${m}dk`;
}

// ─── Main ────────────────────────────────────────────────────────────

export default function Showcase() {
  const [tab, setTab] = useState<ShowcaseTab>('coach');
  const [chartExamType, setChartExamType] = useState<'TYT' | 'AYT'>('TYT');

  const chartData = chartExamType === 'TYT' ? TYT_CHART : AYT_CHART;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppLogo size="sm" />
            <span className="font-display text-lg font-bold">
              Çakmak<span className="text-primary">Koçluk</span>
            </span>
            <span className="text-[10px] uppercase font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full ml-2">
              SHOWCASE
            </span>
          </div>
          <YKSCountdown compact />
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-14 z-30 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 py-2 overflow-x-auto scrollbar-hide">
          {([
            { key: 'coach', icon: BarChart3, label: 'Koç Paneli' },
            { key: 'analysis', icon: Target, label: 'Öğrenci Analiz' },
            { key: 'ai-solve', icon: Sparkles, label: 'AI Soru Çözüm' },
            { key: 'planner', icon: Calendar, label: 'Haftalık Program' },
          ] as const).map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === item.key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'coach' && (
          <CoachPanelView chartData={chartData} chartExamType={chartExamType} setChartExamType={setChartExamType} />
        )}
        {tab === 'analysis' && <StudentAnalysisView />}
        {tab === 'ai-solve' && <AISolveView />}
        {tab === 'planner' && <WeeklyPlannerView />}
      </main>
    </div>
  );
}

// ─── 1. Coach Panel ──────────────────────────────────────────────────

function CoachPanelView({ chartData, chartExamType, setChartExamType }: {
  chartData: any[];
  chartExamType: 'TYT' | 'AYT';
  setChartExamType: (v: 'TYT' | 'AYT') => void;
}) {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Öğrenci', value: '5', icon: Users, color: 'text-primary' },
          { label: 'Aktif Görev', value: '34', icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Bu Hafta Deneme', value: '12', icon: BookOpen, color: 'text-blue-500' },
          { label: 'Ortalama Net', value: '82.4', icon: TrendingDown, color: 'text-amber-500' },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[11px] text-muted-foreground font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold font-display">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Critical Alerts */}
      <div className="glass-card rounded-2xl p-5 border-destructive/30">
        <h3 className="font-display font-bold text-base flex items-center gap-2 mb-4 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          KRİTİK UYARILAR (3)
        </h3>
        <div className="space-y-2.5">
          {[
            { name: 'Mert Kaya', type: 'inactive', msg: 'Son 3 gündür hiçbir görevi tamamlamadı', badge: 'PASİF', badgeClass: 'bg-destructive/15 text-destructive' },
            { name: 'Burak Demir', type: 'net_drop', msg: 'Net düşüşü: 74.0 → 62.5 (-%16)', badge: 'DÜŞÜŞ', badgeClass: 'bg-destructive/15 text-destructive' },
            { name: 'Elif Yılmaz', type: 'low_progress', msg: 'Günlük hedefin %35\'inde (42/120 dk)', badge: 'DÜŞÜK', badgeClass: 'bg-amber-500/15 text-amber-500' },
          ].map((alert, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/15">
              <div className="shrink-0 mt-0.5">
                {alert.type === 'inactive' && <Clock className="h-4 w-4 text-destructive" />}
                {alert.type === 'net_drop' && <TrendingDown className="h-4 w-4 text-destructive" />}
                {alert.type === 'low_progress' && <Activity className="h-4 w-4 text-amber-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{alert.name}</p>
                <p className="text-xs text-muted-foreground">{alert.msg}</p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${alert.badgeClass}`}>
                {alert.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Çalışma Karnesi (Son 7 Gün)
        </h3>
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="flex items-center gap-2 mb-3 pl-[80px] sm:pl-[140px]">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="w-7 text-center text-[10px] font-medium text-muted-foreground uppercase">{d}</span>
            ))}
          </div>
          <div className="space-y-1.5">
            {MOCK_STUDENTS.map((s, si) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-[72px] sm:w-[132px] text-[11px] sm:text-xs font-medium truncate text-right shrink-0">
                  {s.full_name}
                </span>
                <div className="flex gap-1">
                  {HEATMAP_MOCK[si].map((status, i) => (
                    <div key={i} className={`w-7 h-7 rounded-md ${HEATMAP_COLORS[status]} transition-colors`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 mt-4 flex-wrap">
          {[
            { color: HEATMAP_COLORS.active, label: 'Tamamlandı' },
            { color: HEATMAP_COLORS.partial, label: 'Kısmen' },
            { color: HEATMAP_COLORS.inactive, label: 'Boş' },
            { color: HEATMAP_COLORS.noData, label: 'Veri yok' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${l.color}`} />
              <span className="text-[10px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Net Chart */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Net Kıyaslama Grafiği
          </h3>
          <ToggleGroup type="single" value={chartExamType} onValueChange={(v) => { if (v) setChartExamType(v as any); }} className="bg-muted rounded-lg p-0.5">
            <ToggleGroupItem value="TYT" className="text-xs px-4 py-1.5 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">TYT</ToggleGroupItem>
            <ToggleGroupItem value="AYT" className="text-xs px-4 py-1.5 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">AYT</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="index" tick={{ fill: 'hsl(0,0%,55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(0,0%,18%)' }} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(0,0%,55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(0,0%,18%)' }} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(0,0%,7%)', border: '1px solid hsl(0,0%,18%)', borderRadius: '12px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {MOCK_STUDENTS.map((s, i) => (
                <Line key={s.id} type="monotone" dataKey={s.full_name} stroke={LINE_COLORS[i]} strokeWidth={2.5} dot={{ r: 4, fill: LINE_COLORS[i] }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Student Cards */}
      <div>
        <h3 className="font-display font-bold text-base flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" /> Öğrencilerim ({MOCK_STUDENTS.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MOCK_STUDENTS.map(s => (
            <div key={s.id} className="glass-card rounded-2xl p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 ring-2 ring-primary/20">
                {getInitials(s.full_name)}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{s.full_name}</p>
                <p className="text-xs text-muted-foreground">@{s.username} — {s.area} — {s.grade}</p>
                <p className="text-[11px] text-primary/80 truncate mt-0.5">🎯 {s.target_university} / {s.target_department}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 2. Student Analysis ─────────────────────────────────────────────

function StudentAnalysisView() {
  const student = MOCK_STUDENTS[0]; // Zeynep
  const totalCorrect = SUBJECT_STATS.reduce((a, s) => a + s.correct, 0);
  const totalWrong = SUBJECT_STATS.reduce((a, s) => a + s.wrong, 0);
  const totalEmpty = SUBJECT_STATS.reduce((a, s) => a + s.empty, 0);
  const totalNet = totalCorrect - totalWrong / 4;

  const pieData = [
    { name: 'Doğru', value: totalCorrect, color: 'hsl(142, 71%, 45%)' },
    { name: 'Yanlış', value: totalWrong, color: 'hsl(0, 84%, 55%)' },
    { name: 'Boş', value: totalEmpty, color: 'hsl(0, 0%, 40%)' },
  ];

  const barData = SUBJECT_STATS.map(s => ({
    name: s.name,
    net: +(s.correct - s.wrong / 4).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      {/* Student header */}
      <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-2xl ring-2 ring-primary/30">
          {getInitials(student.full_name)}
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">{student.full_name}</h2>
          <p className="text-sm text-muted-foreground">{student.area} — {student.grade}</p>
          <p className="text-xs text-primary mt-1">🎯 {student.target_university} / {student.target_department}</p>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">12 Gün Seri</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Star className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium">2,450 XP</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Net', value: totalNet.toFixed(1), icon: Target, color: 'text-primary' },
          { label: 'Doğru', value: totalCorrect.toString(), icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Yanlış', value: totalWrong.toString(), icon: AlertTriangle, color: 'text-red-500' },
          { label: 'Boş', value: totalEmpty.toString(), icon: Clock, color: 'text-muted-foreground' },
        ].map(stat => (
          <Card key={stat.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-[11px] text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold font-display">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-display font-bold text-base mb-4">Doğru / Yanlış / Boş Dağılımı</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" strokeWidth={0}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(0,0%,7%)', border: '1px solid hsl(0,0%,18%)', borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-display font-bold text-base mb-4">Ders Bazlı Net</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fill: 'hsl(0,0%,55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(0,0%,55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(0,0%,7%)', border: '1px solid hsl(0,0%,18%)', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="net" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Subject Progress */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Konu Takibi İlerleme
        </h3>
        <div className="space-y-3">
          {[
            { subject: 'Matematik', progress: 72 },
            { subject: 'Fizik', progress: 58 },
            { subject: 'Kimya', progress: 65 },
            { subject: 'Biyoloji', progress: 80 },
            { subject: 'Türkçe', progress: 88 },
            { subject: 'Tarih', progress: 45 },
          ].map(s => (
            <div key={s.subject} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium shrink-0">{s.subject}</span>
              <Progress value={s.progress} className="flex-1 h-2.5" />
              <span className="text-xs font-bold text-primary w-10 text-right">%{s.progress}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 3. AI Solve ─────────────────────────────────────────────────────

function AISolveView() {
  return (
    <div className="space-y-6">
      {/* Question Flow Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
          Soru Akışı
        </h2>
        <Button className="bg-primary text-primary-foreground gap-2 shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4" /> Soru Sor
        </Button>
      </div>

      {/* Question List */}
      <div className="space-y-3">
        {MOCK_QUESTIONS.map(q => (
          <div key={q.id} className="glass-card rounded-2xl p-4 hover:ring-1 hover:ring-primary/20 transition-all">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MessageCircleQuestion className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary">{q.category}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{q.subject}</span>
                  {q.hasBest && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-500 flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Çözüldü
                    </span>
                  )}
                  {q.hasAI && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-500 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-sm">{q.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{q.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> {q.answers} cevap
                  </span>
                  <span>Zeynep Aydın</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* AI Solution Preview */}
      <div className="glass-card rounded-2xl p-5 border-2 border-purple-500/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base">Yapay Zeka Çözümü</h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-purple-400" />
              {AI_SOLUTION_MOCK.model} — Güven: %{Math.round(AI_SOLUTION_MOCK.confidence * 100)}
            </p>
          </div>
        </div>
        <div className="bg-secondary/50 rounded-xl p-4 text-sm leading-relaxed space-y-3">
          <div className="font-bold text-primary">Soru: {AI_SOLUTION_MOCK.question}</div>
          <div className="border-t border-border pt-3 space-y-2">
            <p className="font-bold">Çözüm Adımları:</p>
            <p className="text-muted-foreground">1. <strong>Türev Tanımı:</strong> f'(x) = lim(h→0) [f(x+h) - f(x)] / h</p>
            <p className="text-muted-foreground">2. <strong>x = 2 noktası için:</strong> f'(2) = lim(h→0) [f(2+h) - f(2)] / h</p>
            <p className="text-muted-foreground">3. <strong>f(x) = x² + 3x için:</strong> f(2) = 10, f(2+h) = 10 + 7h + h²</p>
            <p className="text-muted-foreground">4. <strong>Sonuç:</strong> f'(2) = <span className="font-bold text-primary text-lg">7</span></p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-bold text-amber-500 flex items-center gap-1"><Star className="h-3 w-3" /> Önerilen Çalışma Konuları:</p>
            <ul className="text-xs text-muted-foreground ml-4 mt-1 list-disc space-y-0.5">
              <li>Limit kavramı ve süreklilik</li>
              <li>Türev kuralları (toplam, çarpım, bölüm)</li>
              <li>Bileşke fonksiyon türevi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Weekly Planner ───────────────────────────────────────────────

function WeeklyPlannerView() {
  const DAY_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  const totalMinutes = WEEKLY_TASKS.flat().reduce((a, t) => a + t.minutes, 0);
  const completedMinutes = WEEKLY_TASKS.flat().filter(t => t.completed).reduce((a, t) => a + t.minutes, 0);
  const overallProgress = Math.round((completedMinutes / totalMinutes) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Haftalık Program
          </h2>
          <p className="text-sm text-muted-foreground mt-1">17 – 23 Mart 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm">Bu Hafta</Button>
          <Button variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button>
          <Button className="bg-primary text-primary-foreground gap-2 shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4" /> Görev Ekle
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Haftalık İlerleme</span>
          <span className="text-sm font-bold text-primary">{formatDuration(completedMinutes)} / {formatDuration(totalMinutes)}</span>
        </div>
        <Progress value={overallProgress} className="h-3" />
        <p className="text-xs text-muted-foreground mt-1.5 text-right">%{overallProgress} tamamlandı</p>
      </div>

      {/* Board View */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-3" style={{ minWidth: '1820px' }}>
          {DAY_FULL.map((day, dayIdx) => {
            const dayTasks = WEEKLY_TASKS[dayIdx] || [];
            const dayTotal = dayTasks.reduce((a, t) => a + t.minutes, 0);
            const dayCompleted = dayTasks.filter(t => t.completed).reduce((a, t) => a + t.minutes, 0);
            const isCurrentDay = dayIdx === 4; // Friday

            return (
              <div
                key={day}
                className={`flex-1 min-w-[260px] rounded-2xl p-3 ${
                  isCurrentDay ? 'glass-card ring-2 ring-primary/30' : 'bg-secondary/30 border border-border/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isCurrentDay ? 'text-primary' : ''}`}>{day}</span>
                    {isCurrentDay && <span className="text-[9px] font-bold uppercase bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">Bugün</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatDuration(dayCompleted)}/{formatDuration(dayTotal)}</span>
                </div>

                <div className="space-y-2">
                  {dayTasks.map((task, ti) => (
                    <div
                      key={ti}
                      className={`rounded-xl p-3 border transition-all ${
                        task.completed
                          ? 'bg-green-500/5 border-green-500/20'
                          : 'bg-card border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {task.completed && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                            <span className="text-xs font-bold text-primary">{task.subject}</span>
                          </div>
                          <p className="text-[11px] text-foreground break-words">{task.topic}</p>
                          {task.book && (
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <BookOpen className="h-3 w-3" /> {task.book}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDuration(task.minutes)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {dayTasks.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Plus className="h-5 w-5 mx-auto mb-1 opacity-40" />
                      <p className="text-[11px]">Görev yok</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
