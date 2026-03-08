import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, ChevronRight, BookOpen, Calculator, Triangle, Atom, FlaskConical, Leaf, Landmark, Globe, Brain, Book, PenTool, AlertTriangle, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface Subject {
  id: string;
  exam_type: string;
  name: string;
  sort_order: number;
  icon: string;
  allowed_areas: string[];
}

interface Topic {
  id: string;
  subject_id: string;
  name: string;
  sort_order: number;
}

interface TopicProgress {
  topic_id: string;
  completed: boolean;
}

const iconMap: Record<string, typeof BookOpen> = {
  'book-open': BookOpen,
  'calculator': Calculator,
  'triangle': Triangle,
  'atom': Atom,
  'flask-conical': FlaskConical,
  'leaf': Leaf,
  'landmark': Landmark,
  'globe': Globe,
  'brain': Brain,
  'book': Book,
  'pen-tool': PenTool,
};

export default function KonuTakip({ studentId }: { studentId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<Map<string, boolean>>(new Map());
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [examFilter, setExamFilter] = useState<'TYT' | 'AYT'>('TYT');
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [subRes, topRes, progRes] = await Promise.all([
        supabase.from('subjects').select('*').order('sort_order'),
        supabase.from('topics').select('*').order('sort_order'),
        supabase.from('user_topic_progress').select('topic_id, completed').eq('student_id', studentId),
      ]);
      if (subRes.data) setSubjects(subRes.data as Subject[]);
      if (topRes.data) setTopics(topRes.data as Topic[]);
      if (progRes.data) {
        const map = new Map<string, boolean>();
        (progRes.data as TopicProgress[]).forEach(p => map.set(p.topic_id, p.completed));
        setProgress(map);
      }
      setLoading(false);
    };
    load();
  }, [studentId]);

  const filteredSubjects = useMemo(() => subjects.filter(s => s.exam_type === examFilter), [subjects, examFilter]);

  const topicsBySubject = useMemo(() => {
    const map = new Map<string, Topic[]>();
    topics.forEach(t => {
      const arr = map.get(t.subject_id) || [];
      arr.push(t);
      map.set(t.subject_id, arr);
    });
    return map;
  }, [topics]);

  const getSubjectProgress = useCallback((subjectId: string) => {
    const subTopics = topicsBySubject.get(subjectId) || [];
    if (subTopics.length === 0) return 0;
    const completed = subTopics.filter(t => progress.get(t.id)).length;
    return Math.round((completed / subTopics.length) * 100);
  }, [topicsBySubject, progress]);

  const overallProgress = useMemo(() => {
    const filtered = filteredSubjects.flatMap(s => topicsBySubject.get(s.id) || []);
    if (filtered.length === 0) return 0;
    const completed = filtered.filter(t => progress.get(t.id)).length;
    return Math.round((completed / filtered.length) * 100);
  }, [filteredSubjects, topicsBySubject, progress]);

  const totalTopics = useMemo(() => {
    return filteredSubjects.reduce((sum, s) => sum + (topicsBySubject.get(s.id)?.length || 0), 0);
  }, [filteredSubjects, topicsBySubject]);

  const completedTopics = useMemo(() => {
    return filteredSubjects.reduce((sum, s) => {
      const subTopics = topicsBySubject.get(s.id) || [];
      return sum + subTopics.filter(t => progress.get(t.id)).length;
    }, 0);
  }, [filteredSubjects, topicsBySubject, progress]);

  const toggleTopic = useCallback(async (topicId: string) => {
    const current = progress.get(topicId) || false;
    const newVal = !current;

    // Optimistic update
    setProgress(prev => {
      const next = new Map(prev);
      next.set(topicId, newVal);
      return next;
    });

    if (newVal) {
      const { error } = await supabase.from('user_topic_progress').upsert({
        student_id: studentId,
        topic_id: topicId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'student_id,topic_id' });
      if (error) {
        setProgress(prev => { const n = new Map(prev); n.set(topicId, false); return n; });
        toast.error('Kaydedilemedi');
      }
    } else {
      const { error } = await supabase.from('user_topic_progress')
        .update({ completed: false, completed_at: null })
        .eq('student_id', studentId)
        .eq('topic_id', topicId);
      if (error) {
        setProgress(prev => { const n = new Map(prev); n.set(topicId, true); return n; });
        toast.error('Kaydedilemedi');
      }
    }
  }, [progress, studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exam Type Filter */}
      <div className="flex gap-2">
        {(['TYT', 'AYT'] as const).map(type => (
          <button
            key={type}
            onClick={() => { setExamFilter(type); setExpandedSubject(null); }}
            className={`px-5 py-2.5 rounded-xl font-bold text-base transition-all duration-200 ${
              examFilter === type
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Overall Progress Circle */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative flex flex-col items-center py-6"
      >
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${overallProgress * 2.64} ${264 - overallProgress * 2.64}`}
              className="transition-all duration-700 ease-out"
              style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-foreground">{overallProgress}%</span>
            <span className="text-xs text-muted-foreground font-medium mt-0.5">tamamlandı</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground font-medium">
          {examFilter} Genel İlerleme • <span className="text-primary font-bold">{completedTopics}</span>/{totalTopics} konu
        </p>
      </motion.div>

      {/* Subject Cards */}
      <div className="space-y-3">
        {filteredSubjects.map((subject, i) => {
          const subjectTopics = topicsBySubject.get(subject.id) || [];
          const pct = getSubjectProgress(subject.id);
          const completedCount = subjectTopics.filter(t => progress.get(t.id)).length;
          const isExpanded = expandedSubject === subject.id;
          const Icon = iconMap[subject.icon] || BookOpen;

          return (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              {/* Subject Card */}
              <button
                onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                className="w-full text-left rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-4 hover:border-primary/40 hover:bg-card transition-all duration-200 group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    pct === 100
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-primary/15 text-primary group-hover:bg-primary/25'
                  }`}>
                    {pct === 100 ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground text-base truncate">{subject.name}</h3>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {completedCount}/{subjectTopics.length}
                        </span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={pct} className="h-2.5 bg-muted/60" />
                  <span className={`absolute right-0 -top-5 text-xs font-bold ${
                    pct === 100 ? 'text-green-400' : 'text-primary'
                  }`}>
                    %{pct}
                  </span>
                </div>
              </button>

              {/* Topics Accordion */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 ml-4 mr-1 space-y-1 py-2">
                      {subjectTopics.map((topic, ti) => {
                        const isCompleted = progress.get(topic.id) || false;
                        return (
                          <motion.button
                            key={topic.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ti * 0.025 }}
                            onClick={() => toggleTopic(topic.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group/topic ${
                              isCompleted
                                ? 'bg-green-500/10 border border-green-500/20'
                                : 'bg-muted/30 border border-transparent hover:border-primary/20 hover:bg-muted/50'
                            }`}
                          >
                            {/* Checkbox */}
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                              isCompleted
                                ? 'bg-green-500 shadow-md shadow-green-500/30'
                                : 'border-2 border-muted-foreground/30 group-hover/topic:border-primary/60'
                            }`}>
                              {isCompleted && (
                                <motion.svg
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-4 h-4 text-white"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </motion.svg>
                              )}
                            </div>
                            <span className={`text-sm font-medium transition-colors flex-1 ${
                              isCompleted ? 'text-green-400 line-through opacity-70' : 'text-foreground'
                            }`}>
                              {topic.name}
                            </span>
                            <span className="text-xs text-muted-foreground/50 font-mono">
                              {ti + 1}/{subjectTopics.length}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
