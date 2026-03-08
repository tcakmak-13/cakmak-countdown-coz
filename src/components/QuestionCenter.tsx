import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, CheckCircle2, Clock, Filter, ArrowLeft, Send, Image as ImageIcon, Trash2, Star, Camera, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppRole } from '@/hooks/useAuth';

const SUBJECTS = [
  'Tümü', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji',
  'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe', 'Edebiyat', 'Din', 'Geometri',
];

const SUBJECT_OPTIONS = SUBJECTS.filter(s => s !== 'Tümü');

interface Question {
  id: string;
  student_id: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  image_url: string | null;
  status: string;
  best_answer_id: string | null;
  created_at: string;
  student_name?: string;
  student_avatar?: string | null;
  answer_count?: number;
}

interface Answer {
  id: string;
  question_id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  is_best: boolean;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
  author_role?: string;
}

interface Props {
  currentProfileId: string;
  currentRole: AppRole;
  currentUserId?: string;
}

const PAGE_SIZE = 20;

export default function QuestionCenter({ currentProfileId, currentRole, currentUserId }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState('Tümü');
  const [activeCategory, setActiveCategory] = useState<'all' | 'TYT' | 'AYT'>('all');
  const [showAskDialog, setShowAskDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ask form
  const [askTitle, setAskTitle] = useState('');
  const [askDesc, setAskDesc] = useState('');
  const [askCategory, setAskCategory] = useState('TYT');
  const [askSubject, setAskSubject] = useState('Matematik');
  const [askImage, setAskImage] = useState<File | null>(null);
  const [askImagePreview, setAskImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail view
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerImage, setAnswerImage] = useState<File | null>(null);
  const [answerImagePreview, setAnswerImagePreview] = useState<string | null>(null);
  const [sendingAnswer, setSendingAnswer] = useState(false);

  const fetchQuestions = useCallback(async (reset = false) => {
    const p = reset ? 0 : page;
    if (reset) { setPage(0); setHasMore(true); }
    if (!reset && !hasMore) return;
    reset ? setLoading(true) : setLoadingMore(true);

    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1);

    if (activeSubject !== 'Tümü') query = query.eq('subject', activeSubject);
    if (activeCategory !== 'all') query = query.eq('category', activeCategory);

    const { data, error } = await query;
    if (error) { console.error(error); setLoading(false); setLoadingMore(false); return; }

    const items = (data || []) as Question[];
    if (items.length < PAGE_SIZE) setHasMore(false);

    // Fetch student names + answer counts
    const studentIds = [...new Set(items.map(q => q.student_id))];
    const questionIds = items.map(q => q.id);

    const [profilesRes, answersCountRes] = await Promise.all([
      studentIds.length > 0
        ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', studentIds)
        : Promise.resolve({ data: [] }),
      questionIds.length > 0
        ? supabase.from('question_answers').select('question_id').in('question_id', questionIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const countMap = new Map<string, number>();
    (answersCountRes.data || []).forEach((a: any) => {
      countMap.set(a.question_id, (countMap.get(a.question_id) || 0) + 1);
    });

    const enriched = items.map(q => ({
      ...q,
      student_name: profileMap.get(q.student_id)?.full_name || 'Anonim',
      student_avatar: profileMap.get(q.student_id)?.avatar_url || null,
      answer_count: countMap.get(q.id) || 0,
    }));

    if (reset) {
      setQuestions(enriched);
    } else {
      setQuestions(prev => [...prev, ...enriched]);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [page, activeSubject, activeCategory, hasMore]);

  useEffect(() => {
    fetchQuestions(true);
  }, [activeSubject, activeCategory]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('questions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        fetchQuestions(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeSubject, activeCategory]);

  // Infinite scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200 && hasMore && !loadingMore) {
        setPage(prev => prev + 1);
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore]);

  useEffect(() => {
    if (page > 0) fetchQuestions(false);
  }, [page]);

  const handleAskImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAskImage(file);
    setAskImagePreview(URL.createObjectURL(file));
  };

  const handleSubmitQuestion = async () => {
    if (!askTitle.trim()) { toast.error('Başlık gerekli.'); return; }
    if (!askImage && !askDesc.trim()) { toast.error('Açıklama veya fotoğraf gerekli.'); return; }
    setSubmitting(true);

    let imageUrl: string | null = null;
    if (askImage && currentUserId) {
      const ext = askImage.name.split('.').pop();
      const path = `${currentUserId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('question-images').upload(path, askImage);
      if (uploadErr) { toast.error('Fotoğraf yüklenemedi.'); setSubmitting(false); return; }
      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('questions').insert({
      student_id: currentProfileId,
      title: askTitle.trim(),
      description: askDesc.trim(),
      category: askCategory,
      subject: askSubject,
      image_url: imageUrl,
    });

    if (error) { toast.error('Soru gönderilemedi: ' + error.message); }
    else {
      toast.success('Sorun başarıyla gönderildi!');
      setAskTitle(''); setAskDesc(''); setAskImage(null); setAskImagePreview(null);
      setShowAskDialog(false);
      fetchQuestions(true);
    }
    setSubmitting(false);
  };

  // ===== Detail View =====
  const loadAnswers = async (questionId: string) => {
    setLoadingAnswers(true);
    const { data } = await supabase
      .from('question_answers')
      .select('*')
      .eq('question_id', questionId)
      .order('is_best', { ascending: false })
      .order('created_at', { ascending: true });

    if (data) {
      const authorIds = [...new Set(data.map((a: any) => a.author_id))];
      const [profilesRes, rolesRes] = await Promise.all([
        authorIds.length > 0 ? supabase.from('profiles').select('id, full_name, avatar_url, user_id').in('id', authorIds) : Promise.resolve({ data: [] }),
        Promise.resolve({ data: [] as any[] }),
      ]);

      // Get roles
      const userIds = (profilesRes.data || []).map((p: any) => p.user_id);
      const rolesData = userIds.length > 0
        ? (await supabase.from('user_roles').select('user_id, role').in('user_id', userIds)).data || []
        : [];

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const roleMap = new Map(rolesData.map((r: any) => [r.user_id, r.role]));

      setAnswers(data.map((a: any) => {
        const prof = profileMap.get(a.author_id);
        return {
          ...a,
          author_name: prof?.full_name || 'Anonim',
          author_avatar: prof?.avatar_url || null,
          author_role: prof ? (roleMap.get(prof.user_id) || 'student') : 'student',
        };
      }));
    }
    setLoadingAnswers(false);
  };

  const openQuestion = (q: Question) => {
    setSelectedQuestion(q);
    loadAnswers(q.id);
  };

  // Realtime answers
  useEffect(() => {
    if (!selectedQuestion) return;
    const channel = supabase
      .channel('answers-realtime-' + selectedQuestion.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_answers', filter: `question_id=eq.${selectedQuestion.id}` }, () => {
        loadAnswers(selectedQuestion.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedQuestion?.id]);

  const handleAnswerImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnswerImage(file);
    setAnswerImagePreview(URL.createObjectURL(file));
  };

  const handleSendAnswer = async () => {
    if (!answerText.trim() && !answerImage) { toast.error('Cevap yazın veya fotoğraf ekleyin.'); return; }
    if (!selectedQuestion) return;
    setSendingAnswer(true);

    let imageUrl: string | null = null;
    if (answerImage && currentUserId) {
      const ext = answerImage.name.split('.').pop();
      const path = `${currentUserId}/answers/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('question-images').upload(path, answerImage);
      if (uploadErr) { toast.error('Fotoğraf yüklenemedi.'); setSendingAnswer(false); return; }
      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('question_answers').insert({
      question_id: selectedQuestion.id,
      author_id: currentProfileId,
      content: answerText.trim(),
      image_url: imageUrl,
    });

    if (error) { toast.error('Cevap gönderilemedi.'); }
    else {
      // Send notification to question owner
      if (selectedQuestion.student_id !== currentProfileId) {
        const { data: ownerProfile } = await supabase.from('profiles').select('user_id').eq('id', selectedQuestion.student_id).single();
        if (ownerProfile) {
          await supabase.from('notifications').insert({
            user_id: ownerProfile.user_id,
            title: 'Soruna Cevap Geldi! 💡',
            message: `"${selectedQuestion.title}" sorunuza yeni bir cevap yazıldı.`,
            type: 'question',
            icon: 'help-circle',
            link: '/soru-merkezi',
          });
        }
      }
      setAnswerText(''); setAnswerImage(null); setAnswerImagePreview(null);
      loadAnswers(selectedQuestion.id);
    }
    setSendingAnswer(false);
  };

  const handleMarkBest = async (answerId: string) => {
    if (!selectedQuestion) return;
    // Unmark all, mark this one
    await supabase.from('question_answers').update({ is_best: false }).eq('question_id', selectedQuestion.id);
    await supabase.from('question_answers').update({ is_best: true }).eq('id', answerId);
    await supabase.from('questions').update({ best_answer_id: answerId, status: 'solved' }).eq('id', selectedQuestion.id);
    setSelectedQuestion(prev => prev ? { ...prev, status: 'solved', best_answer_id: answerId } : null);
    toast.success('En iyi cevap seçildi! Soru çözüldü olarak işaretlendi.');
    loadAnswers(selectedQuestion.id);
    fetchQuestions(true);
  };

  const handleDeleteQuestion = async (qId: string) => {
    const { error } = await supabase.from('questions').delete().eq('id', qId);
    if (error) { toast.error('Silinemedi.'); return; }
    toast.success('Soru silindi.');
    setSelectedQuestion(null);
    fetchQuestions(true);
  };

  const handleDeleteAnswer = async (aId: string) => {
    const { error } = await supabase.from('question_answers').delete().eq('id', aId);
    if (error) { toast.error('Silinemedi.'); return; }
    toast.success('Cevap silindi.');
    loadAnswers(selectedQuestion!.id);
  };

  const canDeleteQuestion = (q: Question) => q.student_id === currentProfileId || currentRole === 'admin';
  const canDeleteAnswer = (a: Answer) => a.author_id === currentProfileId || currentRole === 'admin';
  const canMarkBest = (q: Question) => q.student_id === currentProfileId && q.status !== 'solved';
  const isStudent = currentRole === 'student';

  // ===== Detail Page =====
  if (selectedQuestion) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedQuestion(null)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-lg font-bold truncate flex-1">Soru Detayı</h2>
          {canDeleteQuestion(selectedQuestion) && (
            <button onClick={() => handleDeleteQuestion(selectedQuestion.id)} className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Question card */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
              {selectedQuestion.student_avatar ? <img src={selectedQuestion.student_avatar} className="h-full w-full object-cover" /> : selectedQuestion.student_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedQuestion.student_name}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(selectedQuestion.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{selectedQuestion.category}</Badge>
              <Badge variant="secondary" className="text-[10px]">{selectedQuestion.subject}</Badge>
            </div>
          </div>
          <h3 className="font-display font-bold text-base">{selectedQuestion.title}</h3>
          {selectedQuestion.description && <p className="text-sm text-muted-foreground leading-relaxed">{selectedQuestion.description}</p>}
          {selectedQuestion.image_url && (
            <img src={selectedQuestion.image_url} alt="Soru" className="w-full max-h-[400px] object-contain rounded-xl bg-secondary/50" />
          )}
          {selectedQuestion.status === 'solved' && (
            <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" /> Çözüldü
            </div>
          )}
        </div>

        {/* Answers */}
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Cevaplar ({answers.length})
          </h3>

          {loadingAnswers ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Yükleniyor...</p>
          ) : answers.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Henüz cevap yok. İlk cevabı sen yaz!</p>
            </div>
          ) : (
            answers.map(a => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-xl p-4 space-y-2 ${a.is_best ? 'ring-2 ring-emerald-500/50 bg-emerald-500/5' : ''}`}
              >
                {a.is_best && (
                  <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold mb-1">
                    <Star className="h-3.5 w-3.5 fill-emerald-500" /> En İyi Cevap
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden">
                    {a.author_avatar ? <img src={a.author_avatar} className="h-full w-full object-cover" /> : a.author_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{a.author_name}</span>
                      {a.author_role === 'koc' && <Badge className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-0">Koç</Badge>}
                      {a.author_role === 'admin' && <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-0">Admin</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canMarkBest(selectedQuestion) && !a.is_best && (
                      <button onClick={() => handleMarkBest(a.id)} className="h-7 px-2 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> En İyi
                      </button>
                    )}
                    {canDeleteAnswer(a) && (
                      <button onClick={() => handleDeleteAnswer(a.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {a.content && <p className="text-sm text-foreground/90 leading-relaxed pl-10">{a.content}</p>}
                {a.image_url && <img src={a.image_url} alt="Cevap" className="w-full max-h-[300px] object-contain rounded-lg bg-secondary/50 ml-10 max-w-[calc(100%-2.5rem)]" />}
              </motion.div>
            ))
          )}
        </div>

        {/* Answer input */}
        <div className="glass-card rounded-2xl p-4 space-y-3 sticky bottom-20 z-10">
          {answerImagePreview && (
            <div className="relative inline-block">
              <img src={answerImagePreview} className="h-16 w-16 object-cover rounded-lg" />
              <button onClick={() => { setAnswerImage(null); setAnswerImagePreview(null); }} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <label className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors shrink-0">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAnswerImage} />
            </label>
            <Input
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
              placeholder="Cevabını yaz..."
              className="bg-secondary border-border flex-1"
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendAnswer()}
            />
            <Button onClick={handleSendAnswer} disabled={sendingAnswer} size="icon" className="rounded-xl bg-gradient-orange border-0 hover:opacity-90 shadow-orange h-10 w-10 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Feed View =====
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Soru Çözüm Merkezi</h2>
        {isStudent && (
          <Button onClick={() => setShowAskDialog(true)} size="sm" className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-1.5 shadow-orange">
            <Plus className="h-4 w-4" /> Soru Sor
          </Button>
        )}
      </div>

      {/* Category toggle */}
      <div className="flex gap-2">
        {(['all', 'TYT', 'AYT'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground shadow-orange'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat === 'all' ? 'Tümü' : cat}
          </button>
        ))}
      </div>

      {/* Subject filter chips - scrollable */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {SUBJECTS.map(s => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${
              activeSubject === s
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-secondary text-muted-foreground hover:text-foreground border border-transparent'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Questions feed */}
      <div ref={scrollRef} className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">Sorular yükleniyor...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Henüz soru yok. İlk soruyu sen sor!</p>
          </div>
        ) : (
          <AnimatePresence>
            {questions.map((q, i) => (
              <motion.button
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => openQuestion(q)}
                className="w-full glass-card rounded-2xl p-4 text-left hover:bg-primary/5 transition-all group"
              >
                <div className="flex gap-3">
                  {/* Image thumbnail */}
                  {q.image_url && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary/50 shrink-0">
                      <img src={q.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{q.title}</h3>
                      {q.status === 'solved' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 shrink-0 whitespace-nowrap">
                          <Clock className="h-2.5 w-2.5 mr-1" /> Cevap Bekliyor
                        </Badge>
                      )}
                    </div>
                    {q.description && <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[9px] border-primary/20 text-primary/80">{q.category}</Badge>
                      <Badge variant="secondary" className="text-[9px]">{q.subject}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {q.student_name} • {new Date(q.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                      </span>
                      {(q.answer_count || 0) > 0 && (
                        <span className="text-[10px] text-primary flex items-center gap-0.5">
                          <MessageCircle className="h-3 w-3" /> {q.answer_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
        {loadingMore && <p className="text-center text-muted-foreground text-sm py-4">Daha fazla yükleniyor...</p>}
      </div>

      {/* Ask Question Dialog */}
      <Dialog open={showAskDialog} onOpenChange={setShowAskDialog}>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Soru Sor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Başlık *</Label>
              <Input value={askTitle} onChange={e => setAskTitle(e.target.value)} placeholder="Sorunuzu kısa özetleyin" className="bg-secondary border-border" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea value={askDesc} onChange={e => setAskDesc(e.target.value)} placeholder="Sorunuzu detaylı açıklayın..." className="bg-secondary border-border min-h-[80px] resize-none" maxLength={1000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <div className="flex gap-2">
                  {['TYT', 'AYT'].map(c => (
                    <button key={c} onClick={() => setAskCategory(c)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${askCategory === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Branş</Label>
                <select value={askSubject} onChange={e => setAskSubject(e.target.value)} className="w-full rounded-lg bg-secondary border border-border text-foreground text-sm py-2 px-3">
                  {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label>Fotoğraf (isteğe bağlı)</Label>
              {askImagePreview ? (
                <div className="relative inline-block">
                  <img src={askImagePreview} className="w-full max-h-48 object-contain rounded-xl bg-secondary/50" />
                  <button onClick={() => { setAskImage(null); setAskImagePreview(null); }} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer bg-secondary/30">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Fotoğraf Seç</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAskImage} />
                </label>
              )}
            </div>

            <Button onClick={handleSubmitQuestion} disabled={submitting} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 shadow-orange">
              {submitting ? 'Gönderiliyor...' : 'Soruyu Gönder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
