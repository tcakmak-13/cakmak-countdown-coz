import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, TrendingDown, Clock, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface StudentProfile {
  id: string;
  full_name: string;
  area: string | null;
  username: string | null;
}

interface StudyTask {
  id: string;
  student_id: string;
  completed: boolean;
  estimated_minutes: number;
  created_at: string;
}

interface DenemeResult {
  id: string;
  student_id: string;
  total_net: number;
  created_at: string;
  exam_type: string;
}

interface CriticalAlert {
  studentId: string;
  studentName: string;
  type: 'inactive' | 'net_drop' | 'low_progress';
  message: string;
}

const HEATMAP_COLORS = {
  active: 'bg-emerald-500',
  partial: 'bg-emerald-500/40',
  inactive: 'bg-destructive/60',
  noData: 'bg-muted/30',
};

const LINE_COLORS = [
  'hsl(25, 95%, 53%)',
  'hsl(142, 71%, 45%)',
  'hsl(200, 80%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(45, 90%, 55%)',
  'hsl(340, 75%, 55%)',
  'hsl(170, 70%, 45%)',
  'hsl(15, 85%, 50%)',
];

interface Props {
  students: StudentProfile[];
  adminProfileId: string | null;
}

export default function AdminAnalytics({ students, adminProfileId }: Props) {
  const [allTasks, setAllTasks] = useState<StudyTask[]>([]);
  const [allResults, setAllResults] = useState<DenemeResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [tasksRes, resultsRes] = await Promise.all([
        supabase.from('study_tasks').select('id, student_id, completed, estimated_minutes, created_at'),
        supabase.from('deneme_results').select('id, student_id, total_net, created_at, exam_type').order('created_at', { ascending: true }),
      ]);
      if (tasksRes.data) setAllTasks(tasksRes.data);
      if (resultsRes.data) setAllResults(resultsRes.data);
      setLoading(false);
    };
    fetchData();
  }, [students]);

  // --- Heatmap: Last 7 days activity per student ---
  const heatmapData = useMemo(() => {
    const now = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    return students.map(s => {
      const studentTasks = allTasks.filter(t => t.student_id === s.id);
      const dayCells = days.map(day => {
        const dayTasks = studentTasks.filter(t => t.created_at.slice(0, 10) === day);
        if (dayTasks.length === 0) return 'noData';
        const completed = dayTasks.filter(t => t.completed).length;
        if (completed === dayTasks.length) return 'active';
        if (completed > 0) return 'partial';
        return 'inactive';
      });
      return { student: s, days: dayCells, dayLabels: days };
    });
  }, [students, allTasks]);

  // --- Net comparison chart ---
  const netChartData = useMemo(() => {
    const studentResults: Record<string, DenemeResult[]> = {};
    students.forEach(s => {
      studentResults[s.id] = allResults.filter(r => r.student_id === s.id);
    });

    // Find max exam count
    const maxExams = Math.max(...Object.values(studentResults).map(r => r.length), 1);
    const chartData: any[] = [];

    for (let i = 0; i < maxExams; i++) {
      const point: any = { index: `Deneme ${i + 1}` };
      students.forEach(s => {
        const results = studentResults[s.id];
        if (results[i]) {
          point[s.full_name || s.username || s.id] = Number(results[i].total_net);
        }
      });
      chartData.push(point);
    }

    return chartData;
  }, [students, allResults]);

  // --- Critical alerts ---
  const alerts = useMemo<CriticalAlert[]>(() => {
    const result: CriticalAlert[] = [];
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    students.forEach(s => {
      const studentTasks = allTasks.filter(t => t.student_id === s.id);
      const name = s.full_name || s.username || 'İsimsiz';

      // 1. No completed tasks in last 3 days
      const recentCompleted = studentTasks.filter(
        t => t.completed && new Date(t.created_at) >= threeDaysAgo
      );
      if (recentCompleted.length === 0 && studentTasks.length > 0) {
        result.push({
          studentId: s.id,
          studentName: name,
          type: 'inactive',
          message: 'Son 3 gündür hiçbir görevi tamamlamadı',
        });
      }

      // 2. Net drop > 15%
      const studentResults = allResults
        .filter(r => r.student_id === s.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (studentResults.length >= 2) {
        const last = Number(studentResults[studentResults.length - 1].total_net);
        const prev = Number(studentResults[studentResults.length - 2].total_net);
        if (prev > 0 && ((prev - last) / prev) > 0.15) {
          result.push({
            studentId: s.id,
            studentName: name,
            type: 'net_drop',
            message: `Net düşüşü: ${prev.toFixed(1)} → ${last.toFixed(1)} (-%${Math.round(((prev - last) / prev) * 100)})`,
          });
        }
      }

      // 3. Daily target < 50%
      const today = now.toISOString().slice(0, 10);
      const todayTasks = studentTasks.filter(t => t.created_at.slice(0, 10) === today);
      if (todayTasks.length > 0) {
        const totalMin = todayTasks.reduce((s, t) => s + t.estimated_minutes, 0);
        const completedMin = todayTasks.filter(t => t.completed).reduce((s, t) => s + t.estimated_minutes, 0);
        if (totalMin > 0 && (completedMin / totalMin) < 0.5) {
          result.push({
            studentId: s.id,
            studentName: name,
            type: 'low_progress',
            message: `Günlük hedefin %${Math.round((completedMin / totalMin) * 100)}'inde (${completedMin}/${totalMin} dk)`,
          });
        }
      }
    });

    return result;
  }, [students, allTasks, allResults]);

  const dayLabels = useMemo(() => {
    const days: string[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString('tr-TR', { weekday: 'short' }));
    }
    return days;
  }, []);

  const studentsWithNames = students.filter(s => s.full_name || s.username);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <Activity className="h-8 w-8 text-primary mx-auto mb-3 animate-pulse" />
        <p className="text-muted-foreground text-sm">Analiz verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border-destructive/30">
          <h3 className="font-display font-bold text-base flex items-center gap-2 mb-4 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            KRİTİK UYARILAR ({alerts.length})
          </h3>
          <div className="space-y-2.5">
            {alerts.map((alert, i) => (
              <div
                key={`${alert.studentId}-${alert.type}-${i}`}
                className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/15"
              >
                <div className="shrink-0 mt-0.5">
                  {alert.type === 'inactive' && <Clock className="h-4 w-4 text-destructive" />}
                  {alert.type === 'net_drop' && <TrendingDown className="h-4 w-4 text-destructive" />}
                  {alert.type === 'low_progress' && <Activity className="h-4 w-4 text-amber-500" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{alert.studentName}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  alert.type === 'low_progress' 
                    ? 'bg-amber-500/15 text-amber-500' 
                    : 'bg-destructive/15 text-destructive'
                }`}>
                  {alert.type === 'inactive' ? 'PASİF' : alert.type === 'net_drop' ? 'DÜŞÜŞ' : 'DÜŞÜK'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heatmap */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Çalışma Karnesi (Son 7 Gün)
        </h3>

        {/* Day labels */}
        <div className="flex items-center gap-2 mb-3 pl-[140px]">
          {dayLabels.map((d, i) => (
            <span key={i} className="w-7 text-center text-[10px] font-medium text-muted-foreground uppercase">
              {d}
            </span>
          ))}
        </div>

        <div className="space-y-1.5">
          {heatmapData.map(({ student, days }) => (
            <div key={student.id} className="flex items-center gap-2">
              <span className="w-[132px] text-xs font-medium text-foreground truncate text-right">
                {student.full_name || student.username || '?'}
              </span>
              <div className="flex gap-1">
                {days.map((status, i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-md ${HEATMAP_COLORS[status]} transition-colors`}
                    title={`${dayLabels[i]}: ${
                      status === 'active' ? 'Tamamlandı' :
                      status === 'partial' ? 'Kısmen' :
                      status === 'inactive' ? 'Boş' : 'Veri yok'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pl-[140px]">
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

      {/* Net Comparison Chart */}
      {studentsWithNames.length > 0 && netChartData.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-display font-bold text-base mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Net Kıyaslama Grafiği
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netChartData}>
                <XAxis
                  dataKey="index"
                  tick={{ fill: 'hsl(0,0%,55%)', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(0,0%,18%)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(0,0%,55%)', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(0,0%,18%)' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0,0%,7%)',
                    border: '1px solid hsl(0,0%,18%)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(0,0%,55%)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
                {studentsWithNames.map((s, i) => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.full_name || s.username || s.id}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}