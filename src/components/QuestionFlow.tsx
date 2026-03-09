import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, Filter, Send, Camera, ImagePlus, ChevronLeft, CheckCircle2, Crown, X, ArrowUp, Trash2, XCircle, Pencil, UserCircle, Bot, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import ImagePicker from '@/components/ImagePicker';
import ImageCanvas from '@/components/ImageCanvas';
import ReactMarkdown from 'react-markdown';

const TYT_SUBJECTS = ['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'];
const AYT_SUBJECTS_SAY = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
const AYT_SUBJECTS_EA = ['Matematik', 'Edebiyat', 'Tarih-1', 'Coğrafya-1'];
const AYT_SUBJECTS_SOZ = ['Edebiyat', 'Tarih-1', 'Coğrafya-1', 'Tarih-2', 'Coğrafya-2', 'Felsefe', 'Din Kültürü'];

function getAYTSubjects(area?: string) {
  if (area === 'EA') return AYT_SUBJECTS_EA;
  if (area === 'SÖZ') return AYT_SUBJECTS_SOZ;
  return AYT_SUBJECTS_SAY;
}

interface Question {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  category: string;
  subject: string;
  status: string;
  best_answer_id: string | null;
  student_id: string;
  created_at: string;
  student_name?: string;
  student_avatar?: string;
  answer_count?: number;
}

interface Answer {
  id: string;
  content: string;
  image_url: string | null;
  is_best: boolean;
  author_id: string;
  question_id: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  is_coach?: boolean;
}

interface QuestionFlowProps {
  currentProfileId: string;
  currentName: string;
  currentRole: string;
  username?: string;
  usernameChangedAt?: string | null;
  onUsernameChanged?: (newUsername: string) => void;
}

export default function QuestionFlow({ currentProfileId, currentName, currentRole, username, usernameChangedAt, onUsernameChanged }: QuestionFlowProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFilter, setShowFilter] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);

  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerImage, setAnswerImage] = useState<File | null>(null);
  const [answerImagePreview, setAnswerImagePreview] = useState<string | null>(null);
  const [sendingAnswer, setSendingAnswer] = useState(false);
  const [showAnswerImagePicker, setShowAnswerImagePicker] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'question' | 'answer'; id: string } | null>(null);

  // Nickname change state
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  const canChangeNickname = (() => {
    if (!usernameChangedAt) return true;
    const changed = new Date(usernameChangedAt);
    const now = new Date();
    const diffDays = (now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  })();

  const daysUntilChange = (() => {
    if (!usernameChangedAt) return 0;
    const changed = new Date(usernameChangedAt);
    const now = new Date();
    const diffDays = (now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(7 - diffDays));
  })();

  const handleNicknameSave = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed.length < 3) { setNicknameError('Takma ad en az 3 karakter olmalıdır.'); return; }
    if (trimmed.length > 20) { setNicknameError('Takma ad en fazla 20 karakter olabilir.'); return; }
    setNicknameSaving(true);
    setNicknameError('');

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmed)
      .neq('id', currentProfileId)
      .limit(1);

    if (existing && existing.length > 0) {
      setNicknameError('Bu takma ad zaten alınmış.');
      setNicknameSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed, username_changed_at: new Date().toISOString() })
      .eq('id', currentProfileId);

    if (error) {
      setNicknameError('Bir hata oluştu, tekrar deneyin.');
      setNicknameSaving(false);
      return;
    }

    setNicknameDialogOpen(false);
    setNicknameSaving(false);
    onUsernameChanged?.(trimmed);
    toast.success('Takma adın güncellendi!');
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const flowScrollRef = useRef<HTMLDivElement>(null);

  const canModerate = currentRole === 'koc' || currentRole === 'admin';
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxQuestionId, setLightboxQuestionId] = useState<string | null>(null);

  const openCanvas = useCallback((src: string, questionId?: string) => {
    setLightboxSrc(src);
    setLightboxQuestionId(questionId || null);
  }, []);

  const loadQuestionsRef = useRef<(() => void) | null>(null);
  const loadAnswersRef = useRef<((id: string) => void) | null>(null);

  const handleCanvasShareAsAnswer = useCallback(async (blob: Blob) => {
    const targetQuestionId = lightboxQuestionId || selectedQuestion?.id;
    if (!targetQuestionId) { toast.error('Soru bulunamadı'); return; }

    try {
      const filePath = `answers/${currentProfileId}/${Date.now()}_canvas.png`;
      const file = new File([blob], 'canvas_solution.png', { type: 'image/png' });
      const { error: upErr } = await supabase.storage.from('question-images').upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(filePath);

      const { error } = await supabase.from('question_answers').insert({
        question_id: targetQuestionId,
        author_id: currentProfileId,
        content: '🎨 Çizimli çözüm',
        image_url: urlData.publicUrl,
      });
      if (error) throw error;

      toast.success('Çizimli çözümün gönderildi! ✅');
      setLightboxSrc(null);
      setLightboxQuestionId(null);
      if (selectedQuestion) loadAnswersRef.current?.(selectedQuestion.id);
      loadQuestionsRef.current?.();
    } catch (err: any) {
      toast.error('Gönderim hatası: ' + (err.message || ''));
    }
  }, [lightboxQuestionId, selectedQuestion, currentProfileId]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  // Load questions (ascending = oldest first, newest at bottom)
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: true });

    if (filterCategory) query = query.eq('category', filterCategory);
    if (filterSubject) query = query.eq('subject', filterSubject);

    const { data, error } = await query;
    if (error) { toast.error('Sorular yüklenemedi'); setLoading(false); return; }

    const studentIds = [...new Set((data || []).map(q => q.student_id))];
    let profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', studentIds);
      if (profiles) {
        profiles.forEach(p => { profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
      }
    }

    const questionIds = (data || []).map(q => q.id);
    let answerCountMap: Record<string, number> = {};
    if (questionIds.length > 0) {
      const { data: answerData } = await supabase
        .from('question_answers')
        .select('question_id');
      if (answerData) {
        answerData.forEach(a => {
          answerCountMap[a.question_id] = (answerCountMap[a.question_id] || 0) + 1;
        });
      }
    }

    setQuestions((data || []).map(q => ({
      ...q,
      student_name: profileMap[q.student_id]?.full_name || 'Anonim',
      student_avatar: profileMap[q.student_id]?.avatar_url || null,
      answer_count: answerCountMap[q.id] || 0,
    })));
    setLoading(false);
  }, [filterCategory, filterSubject]);

  // Keep refs in sync for canvas share callback
  loadQuestionsRef.current = loadQuestions;

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  // Scroll flow to bottom after questions load
  useEffect(() => {
    if (!loading && questions.length > 0) {
      scrollToBottom(flowScrollRef);
    }
  }, [loading, questions.length, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('questions-flow')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        loadQuestions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_answers' }, () => {
        loadQuestions();
        if (selectedQuestion) loadAnswers(selectedQuestion.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadQuestions, selectedQuestion]);

  // Load answers for thread (ascending order)
  const loadAnswers = async (questionId: string) => {
    setLoadingAnswers(true);
    const { data, error } = await supabase
      .from('question_answers')
      .select('*')
      .eq('question_id', questionId)
      .order('created_at', { ascending: true });

    if (error) { setLoadingAnswers(false); return; }

    const authorIds = [...new Set((data || []).map(a => a.author_id))];
    let profileMap: Record<string, { full_name: string; avatar_url: string | null; user_id: string }> = {};
    let coachSet = new Set<string>();

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, user_id')
        .in('id', authorIds);
      if (profiles) {
        const userIds = profiles.map(p => p.user_id);
        profiles.forEach(p => { profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url, user_id: p.user_id }; });

        // Check which authors are coaches
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds)
          .eq('role', 'koc');
        if (roles) {
          const coachUserIds = new Set(roles.map(r => r.user_id));
          profiles.forEach(p => {
            if (coachUserIds.has(p.user_id)) coachSet.add(p.id);
          });
        }
      }
    }

    setAnswers((data || []).map(a => {
      const isCoach = coachSet.has(a.author_id);
      const profile = profileMap[a.author_id];
      return {
        ...a,
        author_name: isCoach ? `Koç ${profile?.full_name || ''}` : (profile?.full_name || 'Anonim'),
        author_avatar: profile?.avatar_url || null,
        is_coach: isCoach,
      };
    }));
    setLoadingAnswers(false);
  };
  loadAnswersRef.current = loadAnswers;

  useEffect(() => {
    if (!loadingAnswers && answers.length > 0 && selectedQuestion) {
      scrollToBottom(scrollRef);
    }
  }, [loadingAnswers, answers.length, selectedQuestion, scrollToBottom]);

  const openThread = (q: Question) => {
    setSelectedQuestion(q);
    loadAnswers(q.id);
  };

  // Submit new question
  const handleSubmitQuestion = async () => {
    if (!newImage) { toast.error('Lütfen bir fotoğraf ekleyin'); return; }
    if (!newCategory) { toast.error('Lütfen TYT/AYT seçin'); return; }
    if (!newSubject) { toast.error('Lütfen branş seçin'); return; }

    setSubmitting(true);
    try {
      const ext = newImage.name.split('.').pop() || 'jpg';
      const filePath = `${currentProfileId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('question-images').upload(filePath, newImage, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(filePath);

      const { error: insertErr } = await supabase.from('questions').insert({
        student_id: currentProfileId,
        title: newDescription.trim().slice(0, 80) || `${newCategory} - ${newSubject} Sorusu`,
        description: newDescription.trim(),
        image_url: urlData.publicUrl,
        category: newCategory,
        subject: newSubject,
        status: 'open',
      });
      if (insertErr) throw insertErr;

      toast.success('Soru akışa eklendi!');
      resetWizard();
      loadQuestions();
    } catch (err: any) {
      toast.error('Soru gönderilemedi: ' + (err.message || ''));
    }
    setSubmitting(false);
  };

  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewImage(null);
    setNewImagePreview(null);
    setNewDescription('');
    setNewCategory('');
    setNewSubject('');
  };

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!selectedQuestion) return;
    if (!answerText.trim() && !answerImage) { toast.error('Bir yanıt yazın veya fotoğraf ekleyin'); return; }

    setSendingAnswer(true);
    try {
      let imageUrl: string | null = null;
      if (answerImage) {
        const ext = answerImage.name.split('.').pop() || 'jpg';
        const filePath = `answers/${currentProfileId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('question-images').upload(filePath, answerImage, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('question_answers').insert({
        question_id: selectedQuestion.id,
        author_id: currentProfileId,
        content: answerText.trim(),
        image_url: imageUrl,
      });
      if (error) throw error;

      setAnswerText('');
      if (answerImagePreview) URL.revokeObjectURL(answerImagePreview);
      setAnswerImage(null);
      setAnswerImagePreview(null);
      loadAnswers(selectedQuestion.id);
    } catch (err: any) {
      toast.error('Yanıt gönderilemedi: ' + (err.message || ''));
    }
    setSendingAnswer(false);
  };

  // Mark best answer
  const markBestAnswer = async (answerId: string) => {
    if (!selectedQuestion || selectedQuestion.student_id !== currentProfileId) return;
    try {
      if (selectedQuestion.best_answer_id) {
        await supabase.from('question_answers').update({ is_best: false }).eq('id', selectedQuestion.best_answer_id);
      }
      await supabase.from('question_answers').update({ is_best: true }).eq('id', answerId);
      await supabase.from('questions').update({ best_answer_id: answerId, status: 'solved' }).eq('id', selectedQuestion.id);

      setSelectedQuestion({ ...selectedQuestion, best_answer_id: answerId, status: 'solved' });
      toast.success('En iyi çözüm işaretlendi! ✅');
      loadAnswers(selectedQuestion.id);
      loadQuestions();
    } catch {
      toast.error('İşaretlenemedi');
    }
  };

  // Unmark best answer
  const unmarkBestAnswer = async () => {
    if (!selectedQuestion || selectedQuestion.student_id !== currentProfileId || !selectedQuestion.best_answer_id) return;
    try {
      await supabase.from('question_answers').update({ is_best: false }).eq('id', selectedQuestion.best_answer_id);
      await supabase.from('questions').update({ best_answer_id: null, status: 'open' }).eq('id', selectedQuestion.id);

      setSelectedQuestion({ ...selectedQuestion, best_answer_id: null, status: 'open' });
      toast.success('En iyi çözüm işareti kaldırıldı');
      loadAnswers(selectedQuestion.id);
      loadQuestions();
    } catch {
      toast.error('İşaret kaldırılamadı');
    }
  };

  // Delete question
  const handleDeleteQuestion = async (questionId: string) => {
    try {
      // Delete answers first
      await supabase.from('question_answers').delete().eq('question_id', questionId);
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) throw error;
      toast.success('Soru silindi');
      if (selectedQuestion?.id === questionId) {
        setSelectedQuestion(null);
        setAnswers([]);
      }
      loadQuestions();
    } catch (err: any) {
      toast.error('Soru silinemedi: ' + (err.message || ''));
    }
    setDeleteTarget(null);
  };

  // Delete answer
  const handleDeleteAnswer = async (answerId: string) => {
    try {
      // If this was best answer, clear it from question
      if (selectedQuestion?.best_answer_id === answerId) {
        await supabase.from('questions').update({ best_answer_id: null, status: 'open' }).eq('id', selectedQuestion.id);
        setSelectedQuestion({ ...selectedQuestion, best_answer_id: null, status: 'open' });
      }
      const { error } = await supabase.from('question_answers').delete().eq('id', answerId);
      if (error) throw error;
      toast.success('Yanıt silindi');
      if (selectedQuestion) loadAnswers(selectedQuestion.id);
      loadQuestions();
    } catch (err: any) {
      toast.error('Yanıt silinemedi: ' + (err.message || ''));
    }
    setDeleteTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'question') handleDeleteQuestion(deleteTarget.id);
    else handleDeleteAnswer(deleteTarget.id);
  };

  const canDeleteQuestion = (q: Question) => q.student_id === currentProfileId || canModerate;
  const canDeleteAnswer = (a: Answer) => a.author_id === currentProfileId || canModerate;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Az önce';
    if (diffMin < 60) return `${diffMin}dk`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}sa`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}g`;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getSubjectsForFilter = () => {
    if (filterCategory === 'TYT') return TYT_SUBJECTS;
    if (filterCategory === 'AYT') return getAYTSubjects();
    return [...TYT_SUBJECTS, ...AYT_SUBJECTS_SAY];
  };

  // ====== DELETE CONFIRMATION DIALOG ======
  const deleteDialog = (
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deleteTarget?.type === 'question' ? 'Bu soruyu silmek istediğinize emin misiniz?' : 'Bu yanıtı silmek istediğinize emin misiniz?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. {deleteTarget?.type === 'question' ? 'Soruya ait tüm yanıtlar da silinecektir.' : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sil</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ====== THREAD VIEW ======
  if (selectedQuestion) {
    const bestAnswer = answers.find(a => a.is_best);
    const otherAnswers = answers.filter(a => !a.is_best);
    // Best answer pinned at top, rest in chronological order (ascending)
    const sortedAnswers = bestAnswer ? [bestAnswer, ...otherAnswers] : otherAnswers;

    return (
      <div className="flex flex-col h-[calc(100vh-11rem)]">
        {deleteDialog}
        <ImageCanvas src={lightboxSrc} onClose={() => { setLightboxSrc(null); setLightboxQuestionId(null); }} onShareAsAnswer={handleCanvasShareAsAnswer} showShareButton={!!lightboxQuestionId || !!selectedQuestion} />
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <button onClick={() => { setSelectedQuestion(null); setAnswers([]); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">{selectedQuestion.category}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">{selectedQuestion.subject}</span>
              {selectedQuestion.best_answer_id && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
            </div>
            <p className="text-sm font-medium truncate mt-1">{selectedQuestion.student_name}</p>
          </div>
          {/* Delete question from thread header */}
          {canDeleteQuestion(selectedQuestion) && (
            <button
              onClick={() => setDeleteTarget({ type: 'question', id: selectedQuestion.id })}
              className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Question card at top */}
        <div className="py-4 border-b border-border">
          {selectedQuestion.image_url && (
            <img src={selectedQuestion.image_url} alt="Soru" className="rounded-xl max-h-64 w-full object-contain bg-secondary mb-3 cursor-zoom-in hover:opacity-90 transition-opacity" onClick={() => openCanvas(selectedQuestion.image_url!, selectedQuestion.id)} />
          )}
          {selectedQuestion.description && (
            <p className="text-sm text-muted-foreground">{selectedQuestion.description}</p>
          )}
        </div>

        {/* Answers scroll area - scrolls to bottom */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3 scrollbar-hide">
          {loadingAnswers ? (
            <div className="text-center py-8">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : sortedAnswers.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircleQuestion className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Henüz yanıt yok. İlk çözümü sen gönder!</p>
            </div>
          ) : (
            sortedAnswers.map(a => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl p-3 ${a.is_best ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20' : 'bg-secondary/50 border border-border'}`}
              >
                {a.is_best && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Crown className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-bold text-primary">En İyi Çözüm</span>
                    {selectedQuestion.student_id === currentProfileId && (
                      <button
                        onClick={unmarkBestAnswer}
                        className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        Geri Al
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden bg-primary/20 text-primary`}>
                    {a.author_avatar ? <img src={a.author_avatar} className="h-full w-full object-cover" /> : a.author_name?.charAt(0)}
                  </div>
                  <span className={`text-xs font-medium ${a.is_coach ? 'text-primary font-bold' : ''}`}>
                    {a.author_name}
                  </span>
                  {a.is_coach && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      KOÇ
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(a.created_at)}</span>
                  {/* Delete answer */}
                  {canDeleteAnswer(a) && (
                    <button
                      onClick={() => setDeleteTarget({ type: 'answer', id: a.id })}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {a.image_url && (
                  <img src={a.image_url} alt="Çözüm" className="rounded-lg max-h-48 w-full object-contain bg-background mb-2 cursor-zoom-in hover:opacity-90 transition-opacity" onClick={() => openCanvas(a.image_url!)} />
                )}
                {a.content && <p className="text-sm leading-relaxed">{a.content}</p>}

                {/* Mark best button */}
                {selectedQuestion.student_id === currentProfileId && !a.is_best && (
                  <button
                    onClick={() => markBestAnswer(a.id)}
                    className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    En İyi Çözüm Olarak İşaretle
                  </button>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Answer input */}
        <div className="border-t border-border pt-3 space-y-2">
          {answerImagePreview && (
            <div className="relative inline-block">
              <img src={answerImagePreview} className="h-16 w-16 rounded-lg object-cover border border-border" />
              <button onClick={() => { if (answerImagePreview) URL.revokeObjectURL(answerImagePreview); setAnswerImage(null); setAnswerImagePreview(null); }} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
                <X className="h-3 w-3 text-destructive-foreground" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => setShowAnswerImagePicker(true)} className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors shrink-0">
              <Camera className="h-5 w-5 text-muted-foreground" />
            </button>
            <Textarea
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
              placeholder="Çözümünü yaz..."
              className="min-h-[44px] max-h-24 resize-none bg-secondary border-border text-sm"
              rows={1}
            />
            <Button
              onClick={handleSubmitAnswer}
              disabled={sendingAnswer || (!answerText.trim() && !answerImage)}
              size="icon"
              className="rounded-xl bg-gradient-orange border-0 hover:opacity-90 h-11 w-11 shrink-0"
            >
              {sendingAnswer ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <ImagePicker
          open={showAnswerImagePicker}
          onOpenChange={setShowAnswerImagePicker}
          multiple={false}
          maxFiles={1}
          title="Çözüm Fotoğrafı"
          description="Çözüm fotoğrafını ekle"
          onUpload={async (files) => {
            if (files[0]) {
              setAnswerImage(files[0]);
              setAnswerImagePreview(URL.createObjectURL(files[0]));
            }
          }}
        />
      </div>
    );
  }

  // ====== MAIN FLOW VIEW ======
  return (
    <div className="space-y-4">
      {deleteDialog}
      <ImageCanvas src={lightboxSrc} onClose={() => { setLightboxSrc(null); setLightboxQuestionId(null); }} onShareAsAnswer={handleCanvasShareAsAnswer} showShareButton={!!lightboxQuestionId} />

      {/* Nickname bar */}
      {username && (
        <div className="glass-card rounded-2xl p-3 flex items-center gap-3">
          <UserCircle className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">@{username}</p>
            <p className="text-[10px] text-muted-foreground">Soru Meclisi takma adın</p>
          </div>
          {canChangeNickname ? (
            <button
              onClick={() => { setNicknameInput(username); setNicknameError(''); setNicknameDialogOpen(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <Pencil className="h-3 w-3" /> Değiştir
            </button>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 shrink-0">{daysUntilChange} gün sonra değiştirebilirsin</span>
          )}
        </div>
      )}

      {/* Nickname change dialog */}
      <Dialog open={nicknameDialogOpen} onOpenChange={setNicknameDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Takma Adını Değiştir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Takma adını haftada 1 kez değiştirebilirsin.</p>
            <div className="space-y-2">
              <Label className="font-semibold">Yeni Takma Ad</Label>
              <Input
                value={nicknameInput}
                onChange={e => { setNicknameInput(e.target.value); setNicknameError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleNicknameSave(); }}
                placeholder="Yeni takma ad..."
                className="bg-secondary border-border h-11"
                maxLength={20}
              />
              {nicknameError && <p className="text-xs text-destructive font-medium">{nicknameError}</p>}
            </div>
            <Button
              onClick={handleNicknameSave}
              disabled={nicknameSaving || !nicknameInput.trim()}
              className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base font-bold rounded-2xl"
            >
              {nicknameSaving ? 'Kontrol ediliyor...' : 'Güncelle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Header with filter + ask */}
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-semibold flex-1 flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
          Soru Akışı
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilter(!showFilter)}
          className={`gap-1.5 text-xs ${filterCategory || filterSubject ? 'border-primary text-primary' : ''}`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtrele
        </Button>
        {currentRole === 'student' && (
          <Button
            size="sm"
            onClick={() => setShowWizard(true)}
            className="bg-gradient-orange border-0 hover:opacity-90 gap-1.5 text-xs"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Soru Sor
          </Button>
        )}
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Kategori</p>
                <div className="flex gap-2">
                  {['TYT', 'AYT'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setFilterCategory(filterCategory === cat ? null : cat); setFilterSubject(null); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                      {cat}
                    </button>
                  ))}
                  {(filterCategory || filterSubject) && (
                    <button onClick={() => { setFilterCategory(null); setFilterSubject(null); }} className="px-3 py-2 text-xs text-destructive hover:underline">
                      Temizle
                    </button>
                  )}
                </div>
              </div>
              {filterCategory && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Branş</p>
                  <div className="flex flex-wrap gap-1.5">
                    {getSubjectsForFilter().map(sub => (
                      <button
                        key={sub}
                        onClick={() => setFilterSubject(filterSubject === sub ? null : sub)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSubject === sub ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions chat flow - bottom-to-top style */}
      <div ref={flowScrollRef} className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="text-center py-16">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Sorular yükleniyor...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircleQuestion className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {filterCategory || filterSubject ? 'Bu filtreye uygun soru bulunamadı.' : 'Henüz soru sorulmamış. İlk soruyu sen sor!'}
            </p>
          </div>
        ) : (
          questions.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="w-full text-left glass-card rounded-2xl p-4 hover:bg-primary/5 transition-all group relative"
            >
              <button onClick={() => openThread(q)} className="w-full text-left">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0 overflow-hidden mt-0.5">
                    {q.student_avatar ? <img src={q.student_avatar} className="h-full w-full object-cover" /> : q.student_name?.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">{q.student_name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(q.created_at)}</span>
                      {q.best_answer_id && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 ml-auto" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">{q.category}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">{q.subject}</span>
                    </div>

                    {q.image_url && (
                      <div className="rounded-xl overflow-hidden mb-2 max-h-44" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCanvas(q.image_url!, q.id); }}>
                        <img src={q.image_url} alt="Soru" className="w-full object-contain max-h-44 bg-secondary cursor-zoom-in hover:opacity-90 transition-opacity" />
                      </div>
                    )}

                    {q.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{q.description}</p>
                    )}

                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                      <MessageCircleQuestion className="h-3.5 w-3.5" />
                      {q.answer_count || 0} yanıt
                    </div>
                  </div>
                </div>
              </button>

              {/* Delete button on question card */}
              {canDeleteQuestion(q) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'question', id: q.id }); }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* ====== NEW QUESTION WIZARD ====== */}
      <Dialog open={showWizard} onOpenChange={(open) => { if (!open) resetWizard(); }}>
        <DialogContent className="bg-card border-border max-w-md p-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="font-display flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5 text-primary" />
              Soru Sor
              <span className="ml-auto text-xs text-muted-foreground font-normal">{wizardStep}/3</span>
            </DialogTitle>
          </DialogHeader>

          <div className="px-5">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-orange rounded-full"
                animate={{ width: `${(wizardStep / 3) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <div className="p-5 pt-4">
            <AnimatePresence mode="wait">
              {wizardStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm font-medium">📷 Soru fotoğrafını ekle ve açıklama yaz</p>

                  {newImagePreview ? (
                    <div className="relative">
                      <img src={newImagePreview} className="w-full max-h-48 object-contain rounded-xl bg-secondary" />
                      <button onClick={() => { if (newImagePreview) URL.revokeObjectURL(newImagePreview); setNewImage(null); setNewImagePreview(null); }} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive/90 flex items-center justify-center">
                        <X className="h-4 w-4 text-destructive-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowImagePicker(true)}
                      className="w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Fotoğraf Ekle</span>
                    </button>
                  )}

                  <Textarea
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Sorun hakkında kısa bir açıklama (opsiyonel)"
                    className="min-h-[80px] resize-none bg-secondary border-border"
                    maxLength={300}
                  />

                  <Button
                    onClick={() => { if (!newImage) { toast.error('Lütfen bir fotoğraf ekleyin'); return; } setWizardStep(2); }}
                    className="w-full bg-gradient-orange border-0 hover:opacity-90"
                  >
                    Devam →
                  </Button>
                </motion.div>
              )}

              {wizardStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm font-medium">📚 Sınav türünü seç</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['TYT', 'AYT'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setNewCategory(cat); setNewSubject(''); setWizardStep(3); }}
                        className={`rounded-xl p-6 text-center border-2 transition-all ${newCategory === cat ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-primary/5'}`}
                      >
                        <span className="text-2xl font-display font-bold">{cat}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setWizardStep(1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Geri</button>
                </motion.div>
              )}

              {wizardStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm font-medium">🎯 Branşı seç</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(newCategory === 'TYT' ? TYT_SUBJECTS : getAYTSubjects()).map(sub => (
                      <button
                        key={sub}
                        onClick={() => setNewSubject(sub)}
                        className={`rounded-xl p-3 text-sm font-medium border transition-all ${newSubject === sub ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground'}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleSubmitQuestion}
                    disabled={!newSubject || submitting}
                    className="w-full bg-gradient-orange border-0 hover:opacity-90 gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Soruyu Gönder
                      </>
                    )}
                  </Button>
                  <button onClick={() => setWizardStep(2)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Geri</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      <ImagePicker
        open={showImagePicker}
        onOpenChange={setShowImagePicker}
        multiple={false}
        maxFiles={1}
        title="Soru Fotoğrafı"
        description="Soru fotoğrafını çek veya galerinden seç"
        onUpload={async (files) => {
          if (files[0]) {
            setNewImage(files[0]);
            setNewImagePreview(URL.createObjectURL(files[0]));
          }
        }}
      />
    </div>
  );
}
