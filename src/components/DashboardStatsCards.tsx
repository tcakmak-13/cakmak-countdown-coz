import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, GraduationCap, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Props {
  students: { id: string; full_name: string }[];
  coachCount: number;
  companyId?: string | null;
  isSuperAdmin?: boolean;
}

interface WeeklyStudyData {
  thisWeekMinutes: number;
  lastWeekMinutes: number;
  dailyData: { day: string; minutes: number }[];
}

export default function DashboardStatsCards({ students, coachCount, companyId, isSuperAdmin }: Props) {
  const [studyData, setStudyData] = useState<WeeklyStudyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudyHours = async () => {
      if (students.length === 0) {
        setStudyData({ thisWeekMinutes: 0, lastWeekMinutes: 0, dailyData: [] });
        setLoading(false);
        return;
      }

      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() + mondayOffset);
      thisWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setMilliseconds(-1);

      const studentIds = students.map(s => s.id);

      const [thisWeekRes, lastWeekRes] = await Promise.all([
        supabase
          .from('study_timer_logs')
          .select('elapsed_seconds, log_date')
          .in('student_id', studentIds)
          .gte('log_date', thisWeekStart.toISOString().split('T')[0]),
        supabase
          .from('study_timer_logs')
          .select('elapsed_seconds, log_date')
          .in('student_id', studentIds)
          .gte('log_date', lastWeekStart.toISOString().split('T')[0])
          .lt('log_date', thisWeekStart.toISOString().split('T')[0]),
      ]);

      const thisWeekMinutes = Math.round((thisWeekRes.data || []).reduce((sum, r) => sum + r.elapsed_seconds, 0) / 60);
      const lastWeekMinutes = Math.round((lastWeekRes.data || []).reduce((sum, r) => sum + r.elapsed_seconds, 0) / 60);

      // Build daily sparkline data for this week
      const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
      const dailyMap = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(thisWeekStart);
        d.setDate(d.getDate() + i);
        dailyMap.set(d.toISOString().split('T')[0], 0);
      }
      for (const log of thisWeekRes.data || []) {
        const existing = dailyMap.get(log.log_date) || 0;
        dailyMap.set(log.log_date, existing + Math.round(log.elapsed_seconds / 60));
      }
      const dailyData = Array.from(dailyMap.entries()).map(([date, minutes], i) => ({
        day: dayNames[i] || '',
        minutes,
      }));

      setStudyData({ thisWeekMinutes, lastWeekMinutes, dailyData });
      setLoading(false);
    };

    fetchStudyHours();
  }, [students]);

  const trend = useMemo(() => {
    if (!studyData) return { percent: 0, direction: 'neutral' as const };
    if (studyData.lastWeekMinutes === 0) {
      return { percent: studyData.thisWeekMinutes > 0 ? 100 : 0, direction: studyData.thisWeekMinutes > 0 ? 'up' as const : 'neutral' as const };
    }
    const pct = Math.round(((studyData.thisWeekMinutes - studyData.lastWeekMinutes) / studyData.lastWeekMinutes) * 100);
    return { percent: Math.abs(pct), direction: pct > 0 ? 'up' as const : pct < 0 ? 'down' as const : 'neutral' as const };
  }, [studyData]);

  const formatHours = (minutes: number) => {
    if (minutes < 60) return `${minutes}dk`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}sa ${m}dk` : `${h}sa`;
  };

  const trendColor = trend.direction === 'up' ? 'text-emerald-500' : trend.direction === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const sparklineColor = trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : '#f59e0b';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* Aktif Koç */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 text-center">
        <GraduationCap className="h-6 w-6 text-primary mx-auto mb-2" />
        <p className="text-2xl sm:text-3xl font-bold text-primary">{coachCount}</p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Aktif Koç</p>
      </div>

      {/* Aktif Öğrenci */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 text-center">
        <Users className="h-6 w-6 text-primary mx-auto mb-2" />
        <p className="text-2xl sm:text-3xl font-bold text-primary">{students.length}</p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Aktif Öğrenci</p>
      </div>

      {/* Çalışma Saatleri - with sparkline */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
            {loading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Yükleniyor...</p>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold text-primary">{formatHours(studyData?.thisWeekMinutes || 0)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Haftalık Çalışma</p>
                {trend.percent > 0 && (
                  <div className={`flex items-center justify-center gap-1 mt-1 ${trendColor}`}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">%{trend.percent}</span>
                    <span className="text-[10px] text-muted-foreground">geçen haftaya göre</span>
                  </div>
                )}
              </>
            )}
          </div>
          {!loading && studyData && studyData.dailyData.length > 0 && (
            <div className="w-20 h-12 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studyData.dailyData}>
                  <Line type="monotone" dataKey="minutes" stroke={sparklineColor} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
