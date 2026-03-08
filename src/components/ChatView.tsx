import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Paperclip, ArrowLeft, FileText, Download, Circle, Trophy, Award, GraduationCap, Star, Instagram, MessageCircle as WhatsAppIcon, Clock, ImagePlus, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ImagePicker from '@/components/ImagePicker';

interface Props {
  currentProfileId: string;
  currentName: string;
  currentRole: 'admin' | 'koc' | 'student' | null;
  currentUserId?: string;
  coachId?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: string;
  file_name: string | null;
  created_at: string;
  read: boolean;
}

interface StudentItem {
  id: string;
  full_name: string;
  area: string | null;
  grade: string | null;
}

interface ConversationPair {
  coachId: string;
  coachName: string;
  studentId: string;
  studentName: string;
  key: string;
}

function isImage(fileName: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
}

function isPdf(fileName: string) {
  return /\.pdf$/i.test(fileName);
}

function CoachDrawer({ open, onOpenChange, name, avatarUrl }: { open: boolean; onOpenChange: (v: boolean) => void; name: string; avatarUrl: string | null }) {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    if (open && !info) {
      supabase.from('coach_info').select('*').limit(1).single().then(({ data }) => {
        if (data) setInfo(data);
      });
    }
  }, [open]);

  const title = info?.title || 'YKS Koçu • Mentor';
  const bio = info?.bio || '';
  const yksRanking = info?.yks_ranking || 'Top 1000';
  const experience = info?.experience || '3+ Yıl';
  const tytNet = info?.tyt_net || '112.5';
  const aytNet = info?.ayt_net || '75.25';
  const whatsappLink = info?.whatsapp_link || '';
  const instagram = info?.instagram || '';
  const appointmentHours = info?.appointment_hours || '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-card border-border w-[340px] sm:w-[400px] p-0 overflow-y-auto">
        <div className="relative">
          {/* Hero gradient header */}
          <div className="h-36 bg-gradient-orange relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(35_100%_60%/0.4),transparent_60%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
          </div>

          {/* Avatar */}
          <div className="flex justify-center -mt-14 relative z-10">
            <div className="h-24 w-24 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange ring-4 ring-card overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-3xl font-bold text-primary-foreground">{name.charAt(0)}</span>
              )}
            </div>
          </div>

          <SheetHeader className="pt-4 pb-2 px-6 text-center">
            <SheetTitle className="font-display text-2xl font-bold">{name}</SheetTitle>
            <p className="text-sm text-muted-foreground">{title}</p>
          </SheetHeader>

          <div className="px-6 pb-8 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-xl p-4 text-center border border-primary/20">
                <Trophy className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">YKS Sıralaması</p>
                <p className="font-display text-2xl font-bold text-primary mt-1">{yksRanking}</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center border border-primary/20">
                <Star className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Deneyim</p>
                <p className="font-display text-2xl font-bold text-primary mt-1">{experience}</p>
              </div>
            </div>

            {/* Net scores */}
            <div className="glass-card rounded-xl p-5 border border-primary/20 space-y-3">
              <h4 className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Sınav Başarısı
              </h4>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm font-medium">TYT Net</span>
                <span className="font-display text-xl font-bold text-primary">{tytNet}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">AYT Net</span>
                <span className="font-display text-xl font-bold text-primary">{aytNet}</span>
              </div>
            </div>

            {/* Bio */}
            {bio && (
              <div className="glass-card rounded-xl p-5 border border-primary/20 space-y-3">
                <h4 className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" /> Hakkında
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{bio}</p>
              </div>
            )}

            {/* Contact */}
            {(whatsappLink || instagram || appointmentHours) && (
              <div className="glass-card rounded-xl p-5 border border-primary/20 space-y-3">
                <h4 className="text-xs text-muted-foreground uppercase tracking-widest">İletişim</h4>
                {whatsappLink && (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-emerald-400 transition-colors">
                    <WhatsAppIcon className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-muted-foreground">WhatsApp</span>
                  </a>
                )}
                {instagram && (
                  <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-400 transition-colors">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <span className="text-sm text-muted-foreground">{instagram}</span>
                  </a>
                )}
                {appointmentHours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{appointmentHours}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function ChatView({ currentProfileId, currentName, currentRole, currentUserId, coachId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [coachProfileId, setCoachProfileId] = useState<string | null>(coachId ?? null);
  const [coachName, setCoachName] = useState('Koçum');
  const [coachAvatarUrl, setCoachAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [coachDrawerOpen, setCoachDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [conversationPairs, setConversationPairs] = useState<ConversationPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<ConversationPair | null>(null);

  const getSignedUrl = async (fileName: string) => {
    if (signedUrls[fileName]) return signedUrls[fileName];
    const { data } = await supabase.storage.from('chat-files').createSignedUrl(fileName, 3600);
    if (data?.signedUrl) {
      setSignedUrls(prev => ({ ...prev, [fileName]: data.signedUrl }));
      return data.signedUrl;
    }
    return '';
  };

  useEffect(() => {
    if (currentRole === 'student') {
      supabase.rpc('get_admin_profile_info').then(({ data }) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setAdminProfileId(data[0].id);
          setAdminName(data[0].full_name || 'Talha Çakmak');
          setAdminAvatarUrl(data[0].avatar_url || null);
        }
      });
    }
  }, [currentRole]);

  useEffect(() => {
    if (currentRole === 'admin') {
      // Build coach-student conversation pairs for spectator mode
      const loadPairs = async () => {
        const { data: coachRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'koc');
        if (!coachRoles || coachRoles.length === 0) { setConversationPairs([]); return; }
        const coachUserIds = coachRoles.map(r => r.user_id);
        const { data: coachProfiles } = await supabase.from('profiles').select('id, full_name, user_id').in('user_id', coachUserIds);
        if (!coachProfiles) { setConversationPairs([]); return; }
        const { data: allStudents } = await supabase.from('profiles').select('id, full_name, coach_id').not('coach_id', 'is', null);
        if (!allStudents) { setConversationPairs([]); return; }
        const pairs: ConversationPair[] = [];
        for (const student of allStudents) {
          const coach = coachProfiles.find(c => c.id === student.coach_id);
          if (coach) {
            pairs.push({
              coachId: coach.id,
              coachName: coach.full_name || 'Koç',
              studentId: student.id,
              studentName: student.full_name || 'Öğrenci',
              key: `${coach.id}-${student.id}`,
            });
          }
        }
        setConversationPairs(pairs);
      };
      loadPairs();
    } else if (currentRole === 'koc') {
      supabase.from('profiles').select('id, full_name, area, grade')
        .eq('coach_id', currentProfileId)
        .then(({ data }) => {
          if (data) setStudents(data);
        });
    }
  }, [currentRole, currentProfileId]);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase.from('chat_messages').select('*').order('created_at');
      if (data) {
        setMessages(data as Message[]);
        for (const msg of data) {
          if (msg.file_name && !signedUrls[msg.file_name]) {
            getSignedUrl(msg.file_name);
          }
        }
      }
    };
    fetchMessages();
    const channel = supabase.channel('chat-realtime-view')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.file_name) getSignedUrl(newMsg.file_name);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
        const deleted = payload.old as { id: string };
        setMessages(prev => prev.filter(m => m.id !== deleted.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    // Admin doesn't mark messages as read (spectator)
    if (currentRole === 'admin') return;
    const chatPartnerId = currentRole === 'student' ? adminProfileId : selectedStudent;
    if (!chatPartnerId) return;
    const unread = messages.filter(m => !m.read && m.receiver_id === currentProfileId && m.sender_id === chatPartnerId);
    if (unread.length > 0) {
      supabase.from('chat_messages').update({ read: true }).in('id', unread.map(m => m.id)).then(() => {});
    }
  }, [messages, currentProfileId, adminProfileId, selectedStudent, currentRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedStudent, selectedPair]);

  const chatPartnerId = currentRole === 'student' ? adminProfileId : selectedStudent;

  const filteredMessages = useMemo(() => {
    // Admin spectator: show messages between selected pair
    if (currentRole === 'admin' && selectedPair) {
      return messages.filter(m =>
        (m.sender_id === selectedPair.coachId && m.receiver_id === selectedPair.studentId) ||
        (m.sender_id === selectedPair.studentId && m.receiver_id === selectedPair.coachId)
      );
    }
    if (!chatPartnerId) return [];
    return messages.filter(m =>
      (m.sender_id === currentProfileId && m.receiver_id === chatPartnerId) ||
      (m.sender_id === chatPartnerId && m.receiver_id === currentProfileId)
    );
  }, [messages, currentRole, selectedPair, chatPartnerId, currentProfileId]);

  const getLastMessage = (studentId: string) => {
    const studentMsgs = messages.filter(m =>
      (m.sender_id === studentId && m.receiver_id === currentProfileId) ||
      (m.sender_id === currentProfileId && m.receiver_id === studentId)
    );
    return studentMsgs[studentMsgs.length - 1];
  };

  const getUnreadForStudent = (studentId: string) =>
    messages.filter(m => m.sender_id === studentId && m.receiver_id === currentProfileId && !m.read).length;

  const getLastMessageForPair = (pair: ConversationPair) => {
    const pairMsgs = messages.filter(m =>
      (m.sender_id === pair.coachId && m.receiver_id === pair.studentId) ||
      (m.sender_id === pair.studentId && m.receiver_id === pair.coachId)
    );
    return pairMsgs[pairMsgs.length - 1];
  };

  const getMessageCountForPair = (pair: ConversationPair) =>
    messages.filter(m =>
      (m.sender_id === pair.coachId && m.receiver_id === pair.studentId) ||
      (m.sender_id === pair.studentId && m.receiver_id === pair.coachId)
    ).length;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !chatPartnerId) return;
    if (trimmed.length > 2000) {
      toast.error('Mesaj çok uzun (maks 2000 karakter)');
      return;
    }
    await supabase.from('chat_messages').insert({
      sender_id: currentProfileId,
      receiver_id: chatPartnerId,
      content: trimmed,
      type: 'text',
    });
    setInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatPartnerId || !currentUserId) return;
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf)$/i;
    if (!allowed.test(file.name)) {
      toast.error('Desteklenmeyen dosya türü. Yalnızca resim ve PDF yükleyebilirsiniz.');
      return;
    }
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Dosya boyutu çok büyük (maks 10MB).');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${currentUserId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, file);
    if (uploadError) { setUploading(false); return; }

    const fileType = isImage(file.name) ? 'image' : 'file';
    await supabase.from('chat_messages').insert({
      sender_id: currentProfileId,
      receiver_id: chatPartnerId,
      content: fileType === 'image' ? '📷 Fotoğraf' : `📄 ${file.name}`,
      type: fileType,
      file_name: filePath,
    });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMultiImageUpload = useCallback(async (files: File[]) => {
    if (!chatPartnerId || !currentUserId) return;
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const filePath = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, file);
      if (uploadError) {
        toast.error(`Yükleme hatası: ${file.name}`);
        continue;
      }
      await supabase.from('chat_messages').insert({
        sender_id: currentProfileId,
        receiver_id: chatPartnerId,
        content: '📷 Fotoğraf',
        type: 'image',
        file_name: filePath,
      });
    }
    setUploading(false);
    toast.success(`${files.length} fotoğraf gönderildi!`);
  }, [chatPartnerId, currentUserId, currentProfileId]);

  const renderMessageContent = (msg: Message) => {
    const isMine = msg.sender_id === currentProfileId;
    const timeStr = new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const fileUrl = msg.file_name ? signedUrls[msg.file_name] : '';

    if (msg.type === 'image' && msg.file_name) {
      return (
        <div className="space-y-1">
          {fileUrl ? (
            <img src={fileUrl} alt="Paylaşılan fotoğraf" className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(fileUrl, '_blank')} />
          ) : (
            <div className="w-[200px] h-[150px] rounded-lg bg-secondary animate-pulse" />
          )}
          <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{timeStr}</p>
        </div>
      );
    }

    if (msg.type === 'file' && msg.file_name && isPdf(msg.file_name)) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="text-sm truncate">{msg.content}</span>
          </div>
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isMine ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground' : 'bg-primary/10 hover:bg-primary/20 text-primary'}`}>
              <Download className="h-3.5 w-3.5" /> PDF İndir
            </a>
          )}
          <p className={`text-[10px] ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{timeStr}</p>
        </div>
      );
    }

    return (
      <>
        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
        <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{timeStr}</p>
      </>
    );
  };

  const renderMessageInput = () => (
    <div className="p-3 border-t border-border bg-card/80 backdrop-blur-xl">
      <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" onChange={handleFileUpload} className="hidden" />
        {/* PDF/file attach */}
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0 hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50">
          {uploading ? <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
        {/* Image picker */}
        <button type="button" onClick={() => setImagePickerOpen(true)} disabled={uploading} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0 hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50">
          <ImagePlus className="h-4 w-4" />
        </button>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Mesaj yaz..." className="bg-secondary border-border text-sm h-10" maxLength={2000} />
        <button type="submit" className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity shadow-orange">
          <Send className="h-4 w-4 text-primary-foreground" />
        </button>
      </form>
      <ImagePicker
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        onUpload={handleMultiImageUpload}
        multiple={true}
        maxFiles={10}
        maxSizeMB={10}
        title="Fotoğraf Gönder"
        description="Koçuna göndermek istediğin fotoğrafları seç"
        uploading={uploading}
      />
    </div>
  );

  // Student: direct chat view
  if (currentRole === 'student') {
    return (
      <div className="overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <button
          onClick={() => setCoachDrawerOpen(true)}
          className="p-4 border-b border-border bg-card/80 backdrop-blur-xl hover:bg-card/95 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gradient-orange flex items-center justify-center text-base font-bold text-primary-foreground shadow-orange ring-2 ring-primary/30 overflow-hidden">
              {adminAvatarUrl ? (
                <img src={adminAvatarUrl} alt={adminName} className="h-full w-full object-cover" />
              ) : (
                adminName.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-base">{adminName}</p>
              <div className="flex items-center gap-1.5">
                <Circle className="h-2 w-2 fill-current text-emerald-500" />
                <span className="text-xs text-emerald-400">Çevrimiçi</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Profili Gör</span>
          </div>
        </button>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">Henüz mesaj yok. Koçunuza bir mesaj gönderin!</p>
          )}
          {filteredMessages.map(msg => {
            const isMine = msg.sender_id === currentProfileId;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 text-sm ${isMine ? 'bg-gradient-orange text-primary-foreground rounded-2xl rounded-br-md shadow-[0_0_12px_-3px_hsl(25_95%_53%/0.5)]' : 'bg-secondary rounded-2xl rounded-bl-md'}`}>
                  {renderMessageContent(msg)}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {renderMessageInput()}
        <CoachDrawer open={coachDrawerOpen} onOpenChange={setCoachDrawerOpen} name={adminName} avatarUrl={adminAvatarUrl} />
      </div>
    );
  }

  // Admin spectator: conversation pair list
  if (currentRole === 'admin' && !selectedPair) {
    return (
      <div className="overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Sohbet Geçmişi</p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Eye className="h-3 w-3" /> İzleyici Modu
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversationPairs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">Henüz koç-öğrenci eşleşmesi yok.</p>
          )}
          {conversationPairs.map(pair => {
            const lastMsg = getLastMessageForPair(pair);
            const msgCount = getMessageCountForPair(pair);
            return (
              <button key={pair.key} onClick={() => setSelectedPair(pair)} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors border-b border-border/50">
                <div className="flex -space-x-3 shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-xs ring-2 ring-card z-10">
                    {pair.coachName.charAt(0)}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-card">
                    {pair.studentName.charAt(0)}
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{pair.coachName} ↔ {pair.studentName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {lastMsg ? lastMsg.content : 'Henüz mesaj yok'}
                    {msgCount > 0 && <span className="ml-1 text-primary/60">({msgCount} mesaj)</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {lastMsg && <span className="text-[10px] text-muted-foreground">{new Date(lastMsg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Admin spectator: read-only chat view
  if (currentRole === 'admin' && selectedPair) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedPair(null)} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex -space-x-2">
              <div className="h-9 w-9 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-xs ring-2 ring-card z-10">
                {selectedPair.coachName.charAt(0)}
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-card">
                {selectedPair.studentName.charAt(0)}
              </div>
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-sm">{selectedPair.coachName} ↔ {selectedPair.studentName}</p>
              <p className="text-xs text-muted-foreground">Koç — Öğrenci Sohbeti</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-medium shrink-0">
              <Eye className="h-3 w-3" /> Salt Okunur
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">Bu eşleşmede henüz mesaj yok</p>
          )}
          {filteredMessages.map(msg => {
            const isCoach = msg.sender_id === selectedPair.coachId;
            return (
              <div key={msg.id} className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  <p className={`text-[10px] mb-1 ${isCoach ? 'text-right text-primary/60' : 'text-muted-foreground'}`}>
                    {isCoach ? selectedPair.coachName : selectedPair.studentName}
                  </p>
                  <div className={`px-4 py-2.5 text-sm ${isCoach ? 'bg-gradient-orange text-primary-foreground rounded-2xl rounded-br-md shadow-[0_0_12px_-3px_hsl(25_95%_53%/0.5)]' : 'bg-secondary rounded-2xl rounded-bl-md'}`}>
                    {renderMessageContent(msg)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* No input bar for admin - spectator mode */}
        <div className="p-3 border-t border-border bg-card/50 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Eye className="h-3.5 w-3.5" /> İzleyici modundasınız — mesaj gönderemezsiniz
          </p>
        </div>
      </div>
    );
  }

  // Coach: student list
  if (currentRole === 'koc' && !selectedStudent) {
    return (
      <div className="overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
          <p className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Öğrencilerimle Mesajlar</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {students.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">Henüz atanmış öğrenci yok.</p>
          )}
          {students.map(s => {
            const lastMsg = getLastMessage(s.id);
            const unread = getUnreadForStudent(s.id);
            return (
              <button key={s.id} onClick={() => setSelectedStudent(s.id)} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors border-b border-border/50">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {s.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg ? lastMsg.content : 'Henüz mesaj yok'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {lastMsg && <span className="text-[10px] text-muted-foreground">{new Date(lastMsg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>}
                  {unread > 0 && <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold px-1.5 shadow-orange">{unread}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Coach: chat with selected student
  const selectedStudentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedStudent(null)} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {selectedStudentData?.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-display font-semibold text-sm">{selectedStudentData?.full_name}</p>
            <p className="text-xs text-muted-foreground">{selectedStudentData?.area ?? 'SAY'} — {selectedStudentData?.grade ?? '12. Sınıf'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Henüz mesaj yok</p>
        )}
        {filteredMessages.map(msg => {
          const isMine = msg.sender_id === currentProfileId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 text-sm ${isMine ? 'bg-gradient-orange text-primary-foreground rounded-2xl rounded-br-md shadow-[0_0_12px_-3px_hsl(25_95%_53%/0.5)]' : 'bg-secondary rounded-2xl rounded-bl-md'}`}>
                {renderMessageContent(msg)}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {renderMessageInput()}
    </div>
  );
}
