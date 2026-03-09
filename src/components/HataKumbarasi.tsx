import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Check, X, Trash2, ZoomIn,
  BookOpen, Calculator, Atom, FlaskConical, Dna, Globe2,
  Landmark, ScrollText, Brain, BookMarked, Languages, PenTool,
  Triangle, Clock, StickyNote, Save, Users, ChevronRight, Sparkles, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ImagePicker from '@/components/ImagePicker';
import ReactMarkdown from 'react-markdown';

interface AISolution {
  solution_text: string;
  topic_analysis?: string;
  reasoning_steps?: string[];
  study_recommendation?: string;
  tags?: string[];
  cached?: boolean;
}

interface ErrorQuestion {
  id: string;
  student_id: string;
  exam_type: string;
  subject: string;
  image_url: string;
  status: string;
  note: string;
  created_at: string;
  ai_solution?: string | null;
}

interface SubjectDef {
  name: string;
  icon: typeof Calculator;
  color: string;
}

const TYT_SUBJECTS: SubjectDef[] = [
  { name: 'Matematik', icon: Calculator, color: 'from-blue-500 to-blue-600' },
  { name: 'Geometri', icon: Triangle, color: 'from-indigo-500 to-indigo-600' },
  { name: 'Türkçe', icon: BookOpen, color: 'from-red-500 to-red-600' },
  { name: 'Fizik', icon: Atom, color: 'from-cyan-500 to-cyan-600' },
  { name: 'Kimya', icon: FlaskConical, color: 'from-emerald-500 to-emerald-600' },
  { name: 'Biyoloji', icon: Dna, color: 'from-green-500 to-green-600' },
  { name: 'Tarih', icon: Landmark, color: 'from-amber-500 to-amber-600' },
  { name: 'Coğrafya', icon: Globe2, color: 'from-teal-500 to-teal-600' },
  { name: 'Felsefe', icon: Brain, color: 'from-purple-500 to-purple-600' },
  { name: 'Din Kültürü', icon: BookMarked, color: 'from-orange-500 to-orange-600' },
];

const AYT_SUBJECTS: SubjectDef[] = [
  { name: 'Matematik', icon: Calculator, color: 'from-blue-500 to-blue-600' },
  { name: 'Fizik', icon: Atom, color: 'from-cyan-500 to-cyan-600' },
  { name: 'Kimya', icon: FlaskConical, color: 'from-emerald-500 to-emerald-600' },
  { name: 'Biyoloji', icon: Dna, color: 'from-green-500 to-green-600' },
  { name: 'Edebiyat', icon: PenTool, color: 'from-rose-500 to-rose-600' },
  { name: 'Tarih', icon: Landmark, color: 'from-amber-500 to-amber-600' },
  { name: 'Coğrafya', icon: Globe2, color: 'from-teal-500 to-teal-600' },
  { name: 'Felsefe', icon: Brain, color: 'from-purple-500 to-purple-600' },
  { name: 'Din Kültürü', icon: BookMarked, color: 'from-orange-500 to-orange-600' },
  { name: 'Dil', icon: Languages, color: 'from-pink-500 to-pink-600' },
];

type View = 'home' | 'subjects' | 'gallery';

interface Props {
  studentId: string;
  currentProfileId?: string;
  currentName?: string;
  currentRole?: string;
  onOpenSoruMeclisi?: () => void;
}

export default function HataKumbarasi({ studentId, currentProfileId, currentName, currentRole, onOpenSoruMeclisi }: Props) {
  const { user } = useAuth();
  const [view, setView] = useState<View>('home');
  const [examType, setExamType] = useState<'TYT' | 'AYT'>('TYT');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [questions, setQuestions] = useState<ErrorQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<ErrorQuestion[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<ErrorQuestion | null>(null);
  const [detailQuestion, setDetailQuestion] = useState<ErrorQuestion | null>(null);
  const [editNote, setEditNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [pendingCount, setPendingCount] = useState(0);
  
  const [currentAISolution, setCurrentAISolution] = useState<AISolution | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Fetch pending (open) questions count for badge
  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      setPendingCount(count || 0);
    };
    fetchPending();
    const ch = supabase.channel('pending-q-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => fetchPending())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Helper: extract storage path from image_url (handles both full URLs and plain paths)
  const getStoragePath = (imageUrl: string): string => {
    if (imageUrl.includes('/error-questions/')) {
      const path = imageUrl.split('/object/public/error-questions/')[1] 
        || imageUrl.split('/object/sign/error-questions/')[1]
        || imageUrl.split('/error-questions/')[1];
      return path ? decodeURIComponent(path.split('?')[0]) : imageUrl;
    }
    return imageUrl;
  };

  // Generate signed URLs for all questions
  const generateSignedUrls = async (questions: ErrorQuestion[]) => {
    const paths = questions.map(q => getStoragePath(q.image_url));
    if (paths.length === 0) return;
    
    const { data } = await supabase.storage
      .from('error-questions')
      .createSignedUrls(paths, 3600); // 1 hour TTL
    
    if (data) {
      const urlMap: Record<string, string> = {};
      data.forEach((item) => {
        if (item.signedUrl && !item.error) {
          // Map the original question image_url to signed URL
          const matchingQ = questions.find(q => getStoragePath(q.image_url) === item.path);
          if (matchingQ) {
            urlMap[matchingQ.id] = item.signedUrl;
          }
        }
      });
      setSignedUrls(prev => ({ ...prev, ...urlMap }));
    }
  };

  const getImageUrl = (q: ErrorQuestion): string => {
    return signedUrls[q.id] || '';
  };

  // Load all questions for counts
  useEffect(() => {
    supabase
      .from('error_questions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const qs = data as ErrorQuestion[];
          setAllQuestions(qs);
          generateSignedUrls(qs);
        }
      });
  }, [studentId]);

  // Load filtered questions when entering gallery
  useEffect(() => {
    if (view === 'gallery' && selectedSubject) {
      const filtered = allQuestions.filter(
        q => q.exam_type === examType && q.subject === selectedSubject
      );
      setQuestions(filtered);
    }
  }, [view, selectedSubject, examType, allQuestions]);

  const getSubjectCount = (exam: string, subject: string) =>
    allQuestions.filter(q => q.exam_type === exam && q.subject === subject).length;

  const getExamCount = (exam: string) =>
    allQuestions.filter(q => q.exam_type === exam).length;

  const handleSelectExam = (type: 'TYT' | 'AYT') => {
    setExamType(type);
    setView('subjects');
  };

  const handleSelectSubject = (subject: string) => {
    setSelectedSubject(subject);
    setView('gallery');
  };

  const handleBack = () => {
    if (view === 'gallery') { setView('subjects'); setSelectedSubject(''); }
    else if (view === 'subjects') setView('home');
  };

  // Compress image if too large
  const compressImage = useCallback(async (file: File, maxSizeMB: number = 2): Promise<File> => {
    if (file.size <= maxSizeMB * 1024 * 1024) return file;

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Scale down if very large
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }, []);

  const handleMultiUpload = useCallback(async (files: File[]) => {
    if (!user?.id) return;
    setUploading(true);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    let successCount = 0;

    for (const file of files) {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        toast.error(`"${file.name}" desteklenmiyor. Sadece JPG ve PNG yükleyebilirsiniz.`);
        console.error(`Geçersiz dosya türü: ${file.type} — ${file.name}`);
        continue;
      }

      // Check size limit (10MB hard limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" 10MB sınırını aşıyor, atlandı.`);
        continue;
      }

      try {
        // Compress if larger than 2MB
        const processedFile = await compressImage(file, 2);

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeExt = ['jpg', 'jpeg', 'png'].includes(ext) ? ext : 'jpg';
        const fileName = `${user.id}/${examType}/${selectedSubject}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from('error-questions')
          .upload(fileName, processedFile, { 
            upsert: false,
            contentType: processedFile.type,
          });

        if (uploadError) {
          console.error('Storage yükleme hatası:', uploadError);
          toast.error(`Fotoğraf yüklenemedi, lütfen tekrar deneyin. (${file.name})`);
          continue;
        }

        const { data: inserted, error: insertError } = await supabase
          .from('error_questions')
          .insert({
            student_id: studentId,
            exam_type: examType,
            subject: selectedSubject,
            image_url: fileName,
            status: 'unsolved',
          })
          .select()
          .single();

        if (insertError) {
          console.error('Veritabanı kayıt hatası:', insertError);
          toast.error('Fotoğraf yüklenemedi, lütfen tekrar deneyin.');
        } else if (inserted) {
          const q = inserted as ErrorQuestion;
          setAllQuestions(prev => [q, ...prev]);
          const { data: signedData } = await supabase.storage
            .from('error-questions')
            .createSignedUrl(fileName, 3600);
          if (signedData?.signedUrl) {
            setSignedUrls(prev => ({ ...prev, [q.id]: signedData.signedUrl }));
          }
          successCount++;
        }
      } catch (err) {
        console.error('Beklenmeyen yükleme hatası:', err);
        toast.error(`Fotoğraf yüklenemedi, lütfen tekrar deneyin.`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} fotoğraf başarıyla eklendi!`);
    }
    setUploading(false);
  }, [user?.id, examType, selectedSubject, studentId, compressImage]);

  const toggleStatus = async (question: ErrorQuestion) => {
    const newStatus = question.status === 'learned' ? 'unsolved' : 'learned';
    const { error } = await supabase
      .from('error_questions')
      .update({ status: newStatus })
      .eq('id', question.id);

    if (!error) {
      setAllQuestions(prev =>
        prev.map(q => q.id === question.id ? { ...q, status: newStatus } : q)
      );
    }
  };


  const saveNote = async () => {
    if (!detailQuestion) return;
    setSavingNote(true);
    const { error } = await supabase
      .from('error_questions')
      .update({ note: editNote })
      .eq('id', detailQuestion.id);
    if (!error) {
      setAllQuestions(prev =>
        prev.map(q => q.id === detailQuestion.id ? { ...q, note: editNote } : q)
      );
      setDetailQuestion(prev => prev ? { ...prev, note: editNote } : null);
      toast.success('Not kaydedildi!');
    }
    setSavingNote(false);
  };

  const handleDelete = async () => {
    if (!questionToDelete) return;
    const storagePath = getStoragePath(questionToDelete.image_url);
    if (storagePath) {
      await supabase.storage.from('error-questions').remove([storagePath]);
    }
    await supabase.from('error_questions').delete().eq('id', questionToDelete.id);
    setAllQuestions(prev => prev.filter(q => q.id !== questionToDelete.id));
    setSignedUrls(prev => {
      const next = { ...prev };
      delete next[questionToDelete.id];
      return next;
    });
    setQuestionToDelete(null);
    toast.success('Soru silindi.');
  };

  // AI Solution Handler - same as Soru Meclisi
  const handleAISolve = async (question: ErrorQuestion) => {
    if (loadingAI) return;
    
    const imageUrl = getImageUrl(question);
    if (!imageUrl) {
      toast.error('Görsel yüklenemedi, lütfen tekrar deneyin.');
      return;
    }

    setLoadingAI(true);
    setCurrentAISolution(null);
    
    try {
      const response = await supabase.functions.invoke('solve-question', {
        body: {
          questionId: question.id,
          imageUrl: imageUrl,
          subject: question.subject,
          category: question.exam_type,
          description: question.note || '',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'AI çözümü alınamadı');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'AI yanıt veremedi');
      }

      const sol = response.data.solution;
      const tagMatch = (sol.solution_text || '').match(/#\w+/g) || [];
      const tags = sol.tags || tagMatch;
      
      const solutionObj: AISolution = {
        solution_text: sol.solution_text,
        topic_analysis: sol.topic_analysis,
        reasoning_steps: Array.isArray(sol.reasoning_steps) ? sol.reasoning_steps : [],
        study_recommendation: sol.study_recommendation,
        tags,
        cached: response.data.cached,
      };
      
      setCurrentAISolution(solutionObj);
      
      // Save to database
      const { error: updateError } = await supabase
        .from('error_questions')
        .update({ ai_solution: sol.solution_text })
        .eq('id', question.id);

      if (updateError) {
        console.error('Save AI solution error:', updateError);
      }

      // Update local state
      setAllQuestions(prev =>
        prev.map(q => q.id === question.id ? { ...q, ai_solution: sol.solution_text } : q)
      );
      
      // Update detail question if open
      setDetailQuestion(prev => 
        prev && prev.id === question.id ? { ...prev, ai_solution: sol.solution_text } : prev
      );
      
      if (response.data.cached) {
        toast.success('Önbellekten çözüm getirildi ⚡');
      } else {
        toast.success('AI çözümü hazır! 🎉');
      }
    } catch (err: any) {
      console.error('AI çözüm hatası:', err);
      toast.error(err.message || 'AI çözümü alınamadı');
    } finally {
      setLoadingAI(false);
    }
  };

  // Load existing AI solution when opening detail
  const loadAISolution = (question: ErrorQuestion) => {
    if (question.ai_solution) {
      const tagMatch = (question.ai_solution || '').match(/#\w+/g) || [];
      setCurrentAISolution({
        solution_text: question.ai_solution,
        tags: tagMatch,
        cached: true,
      });
    } else {
      setCurrentAISolution(null);
    }
  };

  const openDetail = (q: ErrorQuestion) => {
    setDetailQuestion(q);
    setEditNote(q.note || '');
    loadAISolution(q);
  };

  const subjects = examType === 'TYT' ? TYT_SUBJECTS : AYT_SUBJECTS;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        {view !== 'home' && (
          <button onClick={handleBack} className="p-2 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            Hata Kumbarası
          </h2>
          {view === 'subjects' && (
            <p className="text-sm text-muted-foreground mt-0.5">{examType} Dersleri</p>
          )}
          {view === 'gallery' && (
            <p className="text-sm text-muted-foreground mt-0.5">{examType} — {selectedSubject}</p>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* HOME: Exam type selection */}
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground text-center">
              Yapamadığın soruları fotoğraflayarak arşivle, ilerlemeni takip et.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* TYT Card */}
              <button
                onClick={() => handleSelectExam('TYT')}
                className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white mb-1">TYT</h3>
                  <p className="text-sm text-white/70">Temel Yeterlilik Testi</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                    <span className="text-xs font-medium text-white">{getExamCount('TYT')} Soru</span>
                  </div>
                </div>
              </button>

              {/* AYT Card */}
              <button
                onClick={() => handleSelectExam('AYT')}
                className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-orange-700 opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.15),transparent_60%)]" />
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                    <ScrollText className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white mb-1">AYT</h3>
                  <p className="text-sm text-white/70">Alan Yeterlilik Testi</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                    <span className="text-xs font-medium text-white">{getExamCount('AYT')} Soru</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Stats summary */}
            <div className="glass-card rounded-2xl p-5 mt-2">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-display text-2xl font-bold text-primary">{allQuestions.length}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">Toplam</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-red-400">{allQuestions.filter(q => q.status === 'unsolved').length}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">Çözemedim</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-emerald-400">{allQuestions.filter(q => q.status === 'learned').length}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">Öğrendim</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBJECTS: Folder-style subject list */}
        {view === 'subjects' && (
          <motion.div
            key="subjects"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {subjects.map((s) => {
                const count = getSubjectCount(examType, s.name);
                const Icon = s.icon;
                return (
                  <button
                    key={s.name}
                    onClick={() => handleSelectSubject(s.name)}
                    className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                    <div className="relative z-10">
                      <Icon className="h-7 w-7 text-white/90 mb-3" />
                      <p className="font-display text-base font-bold text-white leading-tight">{s.name}</p>
                      <p className="text-xs text-white/60 mt-1.5">{count} Soru</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* GALLERY: Question grid */}
        {view === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-4"
          >
            {/* Stats bar */}
            <div className="flex items-center gap-3 text-sm">
              <span className="px-3 py-1 rounded-full bg-secondary text-muted-foreground font-medium">
                {questions.length} Soru
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                ✓ {questions.filter(q => q.status === 'learned').length} Öğrenildi
              </span>
              <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 font-medium">
                ✗ {questions.filter(q => q.status === 'unsolved').length} Çözemedim
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <ScrollText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Henüz soru eklenmedi</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Aşağıdaki butonla ilk sorunuzu ekleyin</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {questions.map((q) => (
                  <div key={q.id} className="group relative rounded-xl overflow-hidden border border-border bg-card">
                    {/* Image - tap to open detail */}
                    <button
                      onClick={() => openDetail(q)}
                      className="w-full aspect-[3/4] overflow-hidden"
                    >
                      {getImageUrl(q) ? (
                        <img
                          src={getImageUrl(q)}
                          alt="Soru"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                          <div className="h-6 w-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                        </div>
                      )}
                    </button>

                    {/* Learned overlay */}
                    {q.status === 'learned' && (
                      <div className="absolute inset-0 bg-emerald-500/15 pointer-events-none flex items-center justify-center">
                        <div className="h-14 w-14 rounded-full bg-emerald-500/80 flex items-center justify-center">
                          <Check className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Note indicator */}
                    {q.note && !q.ai_solution && (
                      <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-amber-500/90 flex items-center justify-center">
                        <StickyNote className="h-3 w-3 text-white" />
                      </div>
                    )}

                    {/* AI Solution indicator */}
                    {q.ai_solution && (
                      <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-gradient-to-r from-primary to-orange-600 flex items-center justify-center shadow-[0_0_8px_hsl(var(--primary)/0.5)]">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    )}

                    {/* Zoom icon */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setFullscreenImg(getImageUrl(q)); }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>

                    {/* Bottom bar */}
                    <div className="p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(q.created_at)}
                        </span>
                        <button
                          onClick={() => setQuestionToDelete(q)}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {q.note && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{q.note}</p>
                      )}
                      
                      {/* AI Solution indicator - tap card to see full solution */}
                      {q.ai_solution && (
                        <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-orange-600/10 border border-primary/30">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                          <span className="text-[10px] font-semibold text-primary">AI Çözümü Hazır</span>
                          <Sparkles className="h-3 w-3 text-primary/70" />
                        </div>
                      )}

                      <button
                        onClick={() => toggleStatus(q)}
                        className={`w-full text-xs font-medium py-1.5 rounded-lg transition-colors ${
                          q.status === 'learned'
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {q.status === 'learned' ? '✓ Öğrendim' : '✗ Hala Çözemedim'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FAB: Add question */}
            <button
              onClick={() => setPickerOpen(true)}
              disabled={uploading}
              className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform disabled:opacity-50"
            >
              {uploading ? (
                <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="h-7 w-7" />
              )}
            </button>

            {/* Image Picker Modal */}
            <ImagePicker
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              onUpload={handleMultiUpload}
              multiple={true}
              maxFiles={10}
              maxSizeMB={10}
              accept="image/jpeg,image/png"
              title="Hata Sorusu Ekle"
              description="Yapamadığın soruları fotoğrafla ve arşivle (JPG, PNG)"
              uploading={uploading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen image dialog */}
      <Dialog open={!!fullscreenImg} onOpenChange={() => setFullscreenImg(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
          {fullscreenImg && (
            <div className="w-full h-full flex items-center justify-center p-2 overflow-auto">
              <img
                src={fullscreenImg}
                alt="Soru - Tam Ekran"
                className="max-w-full max-h-[90vh] object-contain select-none"
                style={{ touchAction: 'pinch-zoom' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Question detail dialog with notes */}
      <Dialog open={!!detailQuestion} onOpenChange={(open) => { if (!open) setDetailQuestion(null); }}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              Soru Detayı
            </DialogTitle>
          </DialogHeader>
          {detailQuestion && (
            <div className="space-y-4">
              {/* Image preview */}
              <button
                onClick={() => { setFullscreenImg(getImageUrl(detailQuestion)); }}
                className="w-full rounded-xl overflow-hidden border border-border relative group"
              >
                <img
                  src={getImageUrl(detailQuestion)}
                  alt="Soru"
                  className="w-full max-h-[40vh] object-contain bg-secondary"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </button>

              {/* Info */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(detailQuestion.created_at)}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium">
                  {detailQuestion.exam_type} — {detailQuestion.subject}
                </span>
              </div>

              {/* Status toggle */}
              <button
                onClick={() => {
                  toggleStatus(detailQuestion);
                  setDetailQuestion(prev => prev ? { ...prev, status: prev.status === 'learned' ? 'unsolved' : 'learned' } : null);
                }}
                className={`w-full text-sm font-medium py-2.5 rounded-xl transition-colors ${
                  detailQuestion.status === 'learned'
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                }`}
              >
                {detailQuestion.status === 'learned' ? '✓ Öğrendim' : '✗ Hala Çözemedim'}
              </button>

              {/* AI Solution Section - Same as Soru Meclisi */}
              <div className="space-y-3">
                {/* AI Loading Animation */}
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

                {/* AI Solution Card - Scrollable & Expandable */}
                {currentAISolution && !loadingAI && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="relative rounded-2xl p-4 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-orange-600/5 border-2 border-orange-500/30 shadow-[0_0_24px_rgba(249,115,22,0.12)]"
                  >
                    {/* AI Badge */}
                    <div className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
                      <Bot className="h-3 w-3" />
                      Yapay Zeka Yanıtı
                      <Sparkles className="h-3 w-3" />
                    </div>
                    
                    {/* Solution Content - Scrollable with better typography */}
                    <div className="mt-4 max-h-[50vh] overflow-y-auto scrollbar-hide pr-1">
                      <div className="prose prose-sm dark:prose-invert max-w-none
                        [&_strong]:text-orange-500 [&_strong]:font-bold
                        [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-0
                        [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-3
                        [&_p]:text-[13px] [&_p]:text-foreground/80 [&_p]:leading-[1.6] [&_p]:mb-2
                        [&_li]:text-[13px] [&_li]:text-foreground/80 [&_li]:leading-[1.6] [&_li]:mb-1
                        [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:mb-3
                        [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:mb-3
                        [&_code]:text-orange-500 [&_code]:bg-orange-500/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                        [&_hr]:border-orange-500/20 [&_hr]:my-3
                        [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                      ">
                        <ReactMarkdown>
                          {currentAISolution.solution_text}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Tags */}
                    {currentAISolution.tags && currentAISolution.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-orange-500/20">
                        {currentAISolution.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/15 text-orange-600 dark:text-orange-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* AI Meclis Üyesine Sor Button - only show if no AI solution exists */}
                {!currentAISolution && !loadingAI && getImageUrl(detailQuestion) && (
                  <motion.button
                    onClick={() => handleAISolve(detailQuestion)}
                    disabled={loadingAI}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
                  >
                    <Bot className="h-5 w-5" />
                    <span>AI ile Çöz</span>
                    <Sparkles className="h-4 w-4" />
                  </motion.button>
                )}
              </div>

              {/* Note editor */}
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-primary" />
                  Not / Çözüm İpucu
                </label>
                <Textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Bu soru hakkında notlarını yaz... Çözüm ipucu, hatırlatma, formül vb."
                  className="bg-secondary border-border min-h-[100px] text-sm leading-relaxed resize-y"
                  maxLength={1000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{editNote.length}/1000</span>
                  <Button
                    onClick={saveNote}
                    disabled={savingNote}
                    size="sm"
                    className="gap-1.5 bg-gradient-orange text-primary-foreground border-0 hover:opacity-90"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingNote ? 'Kaydediliyor...' : 'Notu Kaydet'}
                  </Button>
                </div>
              </div>

              {/* Delete */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDetailQuestion(null); setQuestionToDelete(detailQuestion); }}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Soruyu Sil
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!questionToDelete} onOpenChange={() => setQuestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Soruyu silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem geri alınamaz. Fotoğraf kalıcı olarak silinecektir.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Soru Meclisi - navigation card */}
      {onOpenSoruMeclisi && (
        <div className="mt-8">
          <button
            onClick={onOpenSoruMeclisi}
            className="relative w-full flex items-center justify-between px-5 py-4 rounded-xl bg-card border border-primary/20 hover:border-primary/50 hover:shadow-[0_0_24px_hsl(var(--primary)/0.12)] transition-all duration-300 group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="font-display font-bold text-base text-foreground block leading-tight">Soru Meclisi</span>
                <span className="text-[11px] text-muted-foreground">Topluluğa soru sor, çözümlere ulaş</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-orange animate-scale-in">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
