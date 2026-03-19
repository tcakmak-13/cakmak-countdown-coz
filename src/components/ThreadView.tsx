import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, Crown, XCircle, Trash2, Camera, Send, MessageCircleQuestion, Bot, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ImageCanvas from '@/components/ImageCanvas';
import ImagePicker from '@/components/ImagePicker';
import ReactMarkdown from 'react-markdown';

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
  is_ai?: boolean;
}

interface AISolution {
  id?: string;
  solution_text: string;
  topic_analysis?: string;
  reasoning_steps?: string[];
  study_recommendation?: string;
  tags?: string[];
  cached?: boolean;
}

interface ThreadViewProps {
  question: Question;
  answers: Answer[];
  loadingAnswers: boolean;
  aiSolution: AISolution | null;
  loadingAI: boolean;
  currentProfileId: string;
  canModerate: boolean;
  answerText: string;
  setAnswerText: (v: string) => void;
  answerImage: File | null;
  setAnswerImage: (f: File | null) => void;
  answerImagePreview: string | null;
  setAnswerImagePreview: (s: string | null) => void;
  sendingAnswer: boolean;
  showAnswerImagePicker: boolean;
  setShowAnswerImagePicker: (v: boolean) => void;
  onBack: () => void;
  onSubmitAnswer: () => void;
  onMarkBest: (answerId: string) => void;
  onUnmarkBest: () => void;
  onDeleteTarget: (target: { type: 'question' | 'answer'; id: string } | null) => void;
  onAskAI: () => void;
  openCanvas: (src: string, questionId?: string) => void;
  lightboxSrc: string | null;
  lightboxQuestionId: string | null;
  onCloseLightbox: () => void;
  onCanvasShare: (blob: Blob) => void;
  deleteDialog: React.ReactNode;
  formatTime: (dateStr: string) => string;
  canDeleteQuestion: (q: Question) => boolean;
  canDeleteAnswer: (a: Answer) => boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: (ref: React.RefObject<HTMLDivElement | null>) => void;
}

export default function ThreadView({
  question, answers, loadingAnswers, aiSolution, loadingAI,
  currentProfileId, canModerate,
  answerText, setAnswerText, answerImage, setAnswerImage,
  answerImagePreview, setAnswerImagePreview,
  sendingAnswer, showAnswerImagePicker, setShowAnswerImagePicker,
  onBack, onSubmitAnswer, onMarkBest, onUnmarkBest, onDeleteTarget,
  onAskAI, openCanvas,
  lightboxSrc, lightboxQuestionId, onCloseLightbox, onCanvasShare,
  deleteDialog, formatTime, canDeleteQuestion, canDeleteAnswer,
  scrollRef, scrollToBottom,
}: ThreadViewProps) {
  const [isImageCollapsed, setIsImageCollapsed] = useState(false);
  const [miniClickCount, setMiniClickCount] = useState(0);
  const miniClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const imageAreaRef = useRef<HTMLDivElement>(null);

  // Scroll-based image collapse
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      setIsImageCollapsed(container.scrollTop > 60);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll on new answers
  useEffect(() => {
    if (!loadingAnswers && answers.length > 0) {
      scrollToBottom(chatContainerRef);
    }
  }, [loadingAnswers, answers.length, scrollToBottom]);

  const handleMiniStripClick = () => {
    setMiniClickCount(prev => {
      const next = prev + 1;
      if (miniClickTimer.current) clearTimeout(miniClickTimer.current);
      
      if (next === 1) {
        // First click: scroll to top
        chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        miniClickTimer.current = setTimeout(() => setMiniClickCount(0), 500);
      } else if (next >= 2) {
        // Second click: open fullscreen
        if (question.image_url) {
          openCanvas(question.image_url, question.id);
        }
        return 0;
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] pt-safe">
      {deleteDialog}
      <ImageCanvas
        src={lightboxSrc}
        onClose={onCloseLightbox}
        onShareAsAnswer={onCanvasShare}
        showShareButton={!!lightboxQuestionId || !!question}
      />

      {/* Header bar */}
      <div className="flex items-center gap-3 pb-2 shrink-0">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">{question.category}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">{question.subject}</span>
            {question.best_answer_id && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          </div>
          <p className="text-sm font-medium truncate mt-1">{question.student_name}</p>
        </div>
        {canDeleteQuestion(question) && (
          <button
            onClick={() => onDeleteTarget({ type: 'question', id: question.id })}
            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sticky mini preview strip - shown when scrolled down */}
      <AnimatePresence>
        {isImageCollapsed && question.image_url && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 56 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="shrink-0 sticky top-0 z-30 cursor-pointer"
            onClick={handleMiniStripClick}
          >
            <div className="h-14 rounded-xl overflow-hidden bg-secondary border border-border flex items-center gap-3 px-3 hover:bg-secondary/80 transition-colors">
              <img
                src={question.image_url}
                alt="Soru"
                className="h-10 w-16 object-contain rounded-lg bg-background"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{question.category} — {question.subject}</p>
                <p className="text-[10px] text-muted-foreground">Görseli görmek için tıkla</p>
              </div>
              <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] text-primary font-bold">↑</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area - scrollable */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Question image - 40vh when visible */}
        {question.image_url && (
          <motion.div
            ref={imageAreaRef}
            className="rounded-2xl overflow-hidden bg-secondary border border-border cursor-pointer hover:opacity-95 transition-opacity mb-3"
            style={{ height: '40vh', minHeight: 180 }}
            onClick={() => openCanvas(question.image_url!, question.id)}
            animate={{ opacity: isImageCollapsed ? 0.3 : 1 }}
          >
            <img
              src={question.image_url}
              alt="Soru"
              className="w-full h-full object-contain"
            />
          </motion.div>
        )}

        {/* Description + AI button */}
        {(question.description || (question.image_url && !aiSolution && !loadingAI)) && (
          <div className="py-3 border-b border-border">
            {question.description && (
              <p className="text-sm text-muted-foreground">{question.description}</p>
            )}
            {question.image_url && !aiSolution && !loadingAI && (
              <motion.button
                onClick={onAskAI}
                disabled={loadingAI}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
              >
                <Bot className="h-5 w-5" />
                <span>AI Meclis Üyesine Sor</span>
                <Sparkles className="h-4 w-4" />
              </motion.button>
            )}
          </div>
        )}

        {/* Answers area */}
        <div ref={scrollRef} className="py-4 space-y-3">
          {/* AI Loading */}
          {loadingAI && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-5 border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-orange-600/5 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-0.5 shrink-0"
                >
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                    <Bot className="h-5 w-5 text-orange-500" />
                  </div>
                </motion.div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Yapay Zeka Soruyu Çözüyor...</p>
                  <p className="text-[11px] text-muted-foreground">Görsel analiz ve adım adım çözüm hazırlanıyor</p>
                </div>
              </div>
              <div className="flex gap-1 ml-13">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-orange-500"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ delay: i * 0.15, repeat: Infinity, duration: 0.6 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* AI Solution Card */}
          {aiSolution && !loadingAI && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative rounded-2xl p-4 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-orange-600/5 border-2 border-orange-500/30 shadow-[0_0_24px_rgba(249,115,22,0.12)]"
            >
              <div className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
                <Bot className="h-3 w-3" />
                Yapay Zeka Yanıtı
                <Sparkles className="h-3 w-3" />
              </div>
              <div className="mt-3 prose prose-sm dark:prose-invert max-w-none [&_strong]:text-orange-500 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_p]:text-sm [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-2 [&_li]:text-sm [&_li]:text-muted-foreground [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1">
                <ReactMarkdown>{aiSolution.solution_text}</ReactMarkdown>
              </div>
              {aiSolution.tags && aiSolution.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-orange-500/20">
                  {aiSolution.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-600 dark:text-orange-400">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {loadingAnswers ? (
            <div className="text-center py-8">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : answers.length === 0 && !aiSolution && !loadingAI ? (
            <div className="text-center py-12">
              <MessageCircleQuestion className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Henüz yanıt yok. İlk çözümü sen gönder!</p>
            </div>
          ) : (
            answers.map(a => (
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
                    {question.student_id === currentProfileId && (
                      <button
                        onClick={onUnmarkBest}
                        className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        Geri Al
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden bg-primary/20 text-primary">
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
                  {canDeleteAnswer(a) && (
                    <button
                      onClick={() => onDeleteTarget({ type: 'answer', id: a.id })}
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
                {question.student_id === currentProfileId && !a.is_best && (
                  <button
                    onClick={() => onMarkBest(a.id)}
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
      </div>

      {/* Answer input - fixed bottom */}
      <div className="border-t border-border pt-3 space-y-2 shrink-0 pb-safe">
        {answerImagePreview && (
          <div className="relative inline-block">
            <img src={answerImagePreview} className="h-16 w-16 rounded-lg object-cover border border-border" />
            <button onClick={() => { if (answerImagePreview) URL.revokeObjectURL(answerImagePreview); setAnswerImage(null); setAnswerImagePreview(null); }} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
              <X className="h-3 w-3 text-destructive-foreground" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button onClick={() => setShowAnswerImagePicker(true)} className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
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
            onClick={onSubmitAnswer}
            disabled={sendingAnswer || (!answerText.trim() && !answerImage)}
            size="icon"
            className="rounded-xl bg-gradient-orange border-0 hover:opacity-90 h-11 w-11 shrink-0 min-w-[44px]"
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
