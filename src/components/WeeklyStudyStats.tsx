import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, TrendingUp, Trophy, Flame, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  studentId: string;
}

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

export default function WeeklyStudyStats({ studentId }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekData, setWeekData] = useState<{ day: string; minutes: number; date: string; isToday: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDates = useMemo(() => {
    const base = addWeeks(new Date(), weekOffset);
    const monday = startOfWeek(base, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [weekOffset]);

  const isCurrentWeek = weekOffset === 0;

  useEffect(() => {
    const fetchWeekStats = async () => {
      setLoading(true);

      const { data } = await supabase
        .from('study_tasks')
        .select('day_of_week, estimated_minutes, completed')
        .eq('student_id', studentId)
        .eq('completed', true);

      // day_of_week: 0=Mon … 6=Sun
      const dayMap: Record<number, number> = {};
      data?.forEach((row: any) => {
        dayMap[row.day_of_week] = (dayMap[row.day_of_week] || 0) + (row.estimated_minutes || 0);
      });

      const result = weekDates.map((date, i) => ({
        day: DAY_LABELS[i],
        minutes: dayMap[i] || 0,
        date: format(date, 'yyyy-MM-dd'),
        isToday: isToday(date),
      }));

      setWeekData(result);
      setLoading(false);
    };

    fetchWeekStats();
  }, [studentId, weekDates]);

  const totalMinutes = weekData.reduce((s, d) => s + d.minutes, 0);
  const activeDays = weekData.filter(d => d.minutes > 0).length;
  const bestDay = weekData.reduce((best, d) => (d.minutes > best.minutes ? d : best), weekData[0]);
  const avgMinutes = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { day, minutes } = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-xs font-bold text-foreground">{day}</p>
        <p className="text-sm font-mono text-primary">{formatHM(minutes)}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-secondary rounded w-48 mb-4" />
        <div className="h-48 bg-secondary rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold font-display text-foreground min-w-[140px] text-center">
            {format(weekDates[0], 'd MMM', { locale: tr })} – {format(weekDates[6], 'd MMM', { locale: tr })}
          </span>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {!isCurrentWeek && (
          <button onClick={() => setWeekOffset(0)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> Bu Hafta
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Toplam</p>
          <p className="text-lg font-bold text-foreground font-display">{formatHM(totalMinutes)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ortalama</p>
          <p className="text-lg font-bold text-foreground font-display">{formatHM(avgMinutes)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-2">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">En İyi Gün</p>
          <p className="text-lg font-bold text-foreground font-display">
            {bestDay?.minutes > 0 ? `${bestDay.day} — ${formatHM(bestDay.minutes)}` : '—'}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Aktif Gün</p>
          <p className="text-lg font-bold text-foreground font-display">{activeDays} / 7</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
          {format(weekDates[0], 'd MMM', { locale: tr })} – {format(weekDates[6], 'd MMM', { locale: tr })} Haftalık Çalışma
        </h3>
        {totalMinutes === 0 ? (
          <div className="text-center py-12">
            <Target className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Bu hafta için henüz veri yok.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Programına hedef süre belirleyerek görev eklediğinde istatistiklerin burada görünecektir.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData} barCategoryGap="20%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(0,0%,55%)', fontSize: 12, fontWeight: 600 }}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="minutes" radius={[8, 8, 0, 0]} maxBarSize={40}>
                {weekData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isToday ? 'hsl(25, 95%, 53%)' : entry.minutes > 0 ? 'hsl(25, 95%, 53%, 0.4)' : 'hsl(0, 0%, 15%)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
