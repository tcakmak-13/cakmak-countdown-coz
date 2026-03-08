import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Timer, TrendingUp, Trophy, Flame } from 'lucide-react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  studentId: string;
}

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function formatHM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

export default function WeeklyStudyStats({ studentId }: Props) {
  const [weekData, setWeekData] = useState<{ day: string; seconds: number; date: string; isToday: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDates = useMemo(() => {
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    const fetchWeekStats = async () => {
      setLoading(true);
      const startDate = format(weekDates[0], 'yyyy-MM-dd');
      const endDate = format(weekDates[6], 'yyyy-MM-dd');

      const { data } = await supabase
        .from('study_timer_logs')
        .select('log_date, elapsed_seconds')
        .eq('student_id', studentId)
        .gte('log_date', startDate)
        .lte('log_date', endDate);

      const dateMap: Record<string, number> = {};
      data?.forEach((row: any) => {
        dateMap[row.log_date] = (dateMap[row.log_date] || 0) + row.elapsed_seconds;
      });

      const result = weekDates.map((date, i) => ({
        day: DAY_LABELS[i],
        seconds: dateMap[format(date, 'yyyy-MM-dd')] || 0,
        date: format(date, 'yyyy-MM-dd'),
        isToday: isToday(date),
      }));

      setWeekData(result);
      setLoading(false);
    };

    fetchWeekStats();
  }, [studentId, weekDates]);

  const totalSeconds = weekData.reduce((s, d) => s + d.seconds, 0);
  const activeDays = weekData.filter(d => d.seconds > 0).length;
  const bestDay = weekData.reduce((best, d) => (d.seconds > best.seconds ? d : best), weekData[0]);
  const avgSeconds = activeDays > 0 ? Math.round(totalSeconds / activeDays) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { day, seconds } = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-xs font-bold text-foreground">{day}</p>
        <p className="text-sm font-mono text-primary">{formatHM(seconds)}</p>
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
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
            <Timer className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Toplam</p>
          <p className="text-lg font-bold text-foreground font-display">{formatHM(totalSeconds)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ortalama</p>
          <p className="text-lg font-bold text-foreground font-display">{formatHM(avgSeconds)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-2">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">En İyi Gün</p>
          <p className="text-lg font-bold text-foreground font-display">
            {bestDay?.seconds > 0 ? `${bestDay.day} — ${formatHM(bestDay.seconds)}` : '—'}
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
        {totalSeconds === 0 ? (
          <div className="text-center py-12">
            <Timer className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Bu hafta henüz kronometre verisi yok.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Programındaki görevlerde kronometreyi başlatarak veri oluştur.</p>
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
              <YAxis
                hide
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="seconds" radius={[8, 8, 0, 0]} maxBarSize={40}>
                {weekData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isToday ? 'hsl(25, 95%, 53%)' : entry.seconds > 0 ? 'hsl(25, 95%, 53%, 0.4)' : 'hsl(0, 0%, 15%)'}
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
