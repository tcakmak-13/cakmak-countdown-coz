import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Paperclip, ArrowLeft, FileText, Download, Circle, Trophy, Award, GraduationCap, Star, Instagram, MessageCircle as WhatsAppIcon, Clock, ImagePlus, Eye, Shield } from 'lucide-react';
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

interface ChatContact {
  id: string;
  name: string;
  type: 'student' | 'coach' | 'admin';
  avatar_url?: string | null;
  subtitle?: string;
}

function isImage(fileName: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
}

function isPdf(fileName: string) {
  return /\.pdf$/i.test(fileName);
}

function CoachDrawer({ open, onOpenChange, name, avatarUrl, coachProfileId }: { open: boolean; onOpenChange: (v: boolean) => void; name: string; avatarUrl: string | null; coachProfileId?: string | null }) {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    if (open && !info && coachProfileId) {
      supabase.from('coach_info').select('*').eq('id', coachProfileId).maybeSingle().then(({ data }) => {
        if (data) setInfo(data);
      });
    }
  }, [open, coachProfileId]);

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
          <div className="h-36 bg-gradient-orange relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(35_100%_60%/0.4),transparent_60%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
          </div>
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
            {bio && (
              <div className="glass-card rounded-xl p-5 border border-primary/20 space-y-3">
                <h4 className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" /> Hakkında
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{bio}</p>
              </div>
            )}
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

  // Admin direct messaging with coaches
  const [adminCoachContacts, setAdminCoachContacts] = useState<ChatContact[]>([]);
  const [adminChatMode, setAdminChatMode] = useState<'spectator' | 'direct'>('spectator');
  const [adminDirectContact, setAdminDirectContact] = useState<ChatContact | null>(null);

  // Coach: admin contact for direct messaging
  const [adminContact, setAdminContact] = useState<ChatContact | null>(null);
  const [coachChatMode, setCoachChatMode] = useState<'students' | 'admin'>('students');

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
    if (currentRole === 'student' && coachId) {
      setCoachProfileId(coachId);
      supabase.from('profiles').select('id, full_name, avatar_url').eq('id', coachId).single().then(({ data }) => {
        if (data) {
          setCoachName(data.full_name || 'Koçum');
          setCoachAvatarUrl(data.avatar_url || null);
        }
      });
    }
  }, [currentRole, coachId]);

  useEffect(() => {
    if (currentRole === 'admin') {
      const loadPairs = async () => {
        const { data: coachRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'koc');
        if (!coachRoles || coachRoles.length === 0) { setConversationPairs([]); setAdminCoachContacts([]); return; }
        const coachUserIds = coachRoles.map(r => r.user_id);
        const { data: coachProfiles } = await supabase.from('profiles').select('id, full_name, user_id, avatar_url').in('user_id', coachUserIds);
        if (!coachProfiles) { setConversationPairs([]); setAdminCoachContacts([]); return; }

        // Coach contacts for direct messaging
        setAdminCoachContacts(coachProfiles.map(c => ({
          id: c.id,
          name: c.full_name || 'Koç',
          type: 'coach' as const,
          avatar_url: c.avatar_url,
          subtitle: 'Koç',
        })));

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
      // Load students
      supabase.from('profiles').select('id, full_name, area, grade')
        .eq('coach_id', currentProfileId)
        .then(({ data }) => {
          if (data) setStudents(data);
        });
      // Load admin contact
      supabase.rpc('get_admin_profile_info').then(({ data }) => {
        if (data && data.length > 0) {
          const admin = data[0];
          setAdminContact({
            id: admin.id,
            name: admin.full_name || 'Yönetici',
            type: 'admin',
            avatar_url: admin.avatar_url,
            subtitle: 'Süper Yönetici',
          });
        }
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
    if (currentRole === 'admin') {
      // Admin marks direct messages as read
      if (adminChatMode === 'direct' && adminDirectContact) {
        const unread = messages.filter(m => !m.read && m.receiver_id === currentProfileId && m.sender_id === adminDirectContact.id);
        if (unread.length > 0) {
          supabase.from('chat_messages').update({ read: true }).in('id', unread.map(m => m.id)).then(() => {});
        }
      }
      return;
    }
    // Coach: mark messages from admin or selected student as read
    if (currentRole === 'koc') {
      const partnerId = coachChatMode === 'admin' && adminContact ? adminContact.id : selectedStudent;
      if (!partnerId) return;
      const unread = messages.filter(m => !m.read && m.receiver_id === currentProfileId && m.sender_id === partnerId);
      if (unread.length > 0) {
        supabase.from('chat_messages').update({ read: true }).in('id', unread.map(m => m.id)).then(() => {});
      }
      return;
    }
    // Student
    const partner = coachProfileId;
    if (!partner) return;
    const unread = messages.filter(m => !m.read && m.receiver_id === currentProfileId && m.sender_id === partner);
    if (unread.length > 0) {
      supabase.from('chat_messages').update({ read: true }).in('id', unread.map(m => m.id)).then(() => {});
    }
  }, [messages, currentProfileId, coachProfileId, selectedStudent, currentRole, adminChatMode, adminDirectContact, coachChatMode, adminContact]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedStudent, selectedPair, adminDirectContact, coachChatMode]);

  // Determine chat partner for sending
  const chatPartnerId = useMemo(() => {
    if (currentRole === 'student') return coachProfileId;
    if (currentRole === 'admin' && adminChatMode === 'direct' && adminDirectContact) return adminDirectContact.id;
    if (currentRole === 'koc' && coachChatMode === 'admin' && adminContact) return adminContact.id;
    if (currentRole === 'koc' && coachChatMode === 'students') return selectedStudent;
    return null;
  }, [currentRole, coachProfileId, adminChatMode, adminDirectContact, coachChatMode, adminContact, selectedStudent]);

  const filteredMessages = useMemo(() => {
    // Admin spectator
    if (currentRole === 'admin' && adminChatMode === 'spectator' && selectedPair) {
      return messages.filter(m =>
        (m.sender_id === selectedPair.coachId && m.receiver_id === selectedPair.studentId) ||
        (m.sender_id === selectedPair.studentId && m.receiver_id === selectedPair.coachId)
      );
    }
    // Admin direct
    if (currentRole === 'admin' && adminChatMode === 'direct' && adminDirectContact) {
      return messages.filter(m =>
        (m.sender_id === currentProfileId && m.receiver_id === adminDirectContact.id) ||
        (m.sender_id === adminDirectContact.id && m.receiver_id === currentProfileId)
      );
    }
    // Coach: admin chat
    if (currentRole === 'koc' && coachChatMode === 'admin' && adminContact) {
      return messages.filter(m =>
        (m.sender_id === currentProfileId && m.receiver_id === adminContact.id) ||
        (m.sender_id === adminContact.id && m.receiver_id === currentProfileId)
      );
    }
    if (!chatPartnerId) return [];
    return messages.filter(m =>
      (m.sender_id === currentProfileId && m.receiver_id === chatPartnerId) ||
      (m.sender_id === chatPartnerId && m.receiver_id === currentProfileId)
    );
  }, [messages, currentRole, selectedPair, chatPartnerId, currentProfileId, adminChatMode, adminDirectContact, coachChatMode, adminContact]);

  const getLastMessage = (partnerId: string) => {
    const msgs = messages.filter(m =>
      (m.sender_id === partnerId && m.receiver_id === currentProfileId) ||
      (m.sender_id === currentProfileId && m.receiver_id === partnerId)
    );
    return msgs[msgs.length - 1];
  };

  const getUnreadCount = (partnerId: string) =>
    messages.filter(m => m.sender_id === partnerId && m.receiver_id === currentProfileId && !m.read).length;

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
      toast.error('Desteklenmeyen dosya türü.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
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
      if (uploadError) { toast.error(`Yükleme hatası: ${file.name}`); continue; }
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
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0 hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50">
          {uploading ? <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>
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
        description="Göndermek istediğiniz fotoğrafları seçin"
        uploading={uploading}
      />
    </div>
  );

  const renderChatBubbles = (isSpectator = false, spectatorPair?: ConversationPair) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {filteredMessages.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">Henüz mesaj yok</p>
      )}
      {filteredMessages.map(msg => {
        const isMine = isSpectator
          ? msg.sender_id === spectatorPair?.coachId
          : msg.sender_id === currentProfileId;
        return (
          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              {isSpectator && spectatorPair && (
                <p className={`text-[10px] mb-1 ${isMine ? 'text-right text-primary/60' : 'text-muted-foreground'}`}>
                  {isMine ? spectatorPair.coachName : spectatorPair.studentName}
                </p>
              )}
              <div className={`px-4 py-2.5 text-sm ${isMine ? 'bg-gradient-orange text-primary-foreground rounded-2xl rounded-br-md shadow-[0_0_12px_-3px_hsl(25_95%_53%/0.5)]' : 'bg-secondary rounded-2xl rounded-bl-md'}`}>
                {renderMessageContent(msg)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );

  // ─── STUDENT VIEW ───
  if (currentRole === 'student') {
    return (
      <div className="overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <button onClick={() => setCoachDrawerOpen(true)} className="p-4 border-b border-border bg-card/80 backdrop-blur-xl hover:bg-card/95 transition-colors cursor-pointer text-left">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gradient-orange flex items-center justify-center text-base font-bold text-primary-foreground shadow-orange ring-2 ring-primary/30 overflow-hidden">
              {coachAvatarUrl ? <img src={coachAvatarUrl} alt={coachName} className="h-full w-full object-cover" /> : coachName.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-base">{coachName}</p>
              <div className="flex items-center gap-1.5">
                <Circle className="h-2 w-2 fill-current text-emerald-500" />
                <span className="text-xs text-emerald-400">Çevrimiçi</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Profili Gör</span>
          </div>
        </button>
        {renderChatBubbles()}
        {renderMessageInput()}
        <CoachDrawer open={coachDrawerOpen} onOpenChange={setCoachDrawerOpen} name={coachName} avatarUrl={coachAvatarUrl} />
      </div>
    );
  }

  // ─── ADMIN VIEW ───
  if (currentRole === 'admin') {
    // Admin: contact list (tabs: spectator + direct)
    if (!selectedPair && !adminDirectContact) {
      const adminUnreadFromCoaches = adminCoachContacts.reduce((sum, c) => sum + getUnreadCount(c.id), 0);
      return (
        <div className="overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
            <div className="flex gap-2">
              <button
                onClick={() => setAdminChatMode('direct')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${adminChatMode === 'direct' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Koçlarla Mesajlaş
                  {adminUnreadFromCoaches > 0 && (
                    <span className="h-4 min-w-[16px] px-1 rounded-full bg-[#FF5A01] text-white text-[9px] font-bold flex items-center justify-center">{adminUnreadFromCoaches > 9 ? '9+' : adminUnreadFromCoaches}</span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setAdminChatMode('spectator')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${adminChatMode === 'spectator' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Sohbet İzle
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {adminChatMode === 'direct' ? (
              <>
                {adminCoachContacts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-12">Henüz koç yok.</p>
                )}
                {adminCoachContacts.map(contact => {
                  const lastMsg = getLastMessage(contact.id);
                  const unread = getUnreadCount(contact.id);
                  return (
                    <button key={contact.id} onClick={() => setAdminDirectContact(contact)} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors border-b border-border/50">
                      <div className="h-11 w-11 rounded-full bg-gradient-orange flex items-center justify-center text-base font-bold text-primary-foreground shadow-orange shrink-0 overflow-hidden">
                        {contact.avatar_url ? <img src={contact.avatar_url} alt={contact.name} className="h-full w-full object-cover" /> : contact.name.charAt(0)}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg ? lastMsg.content : 'Henüz mesaj yok'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {lastMsg && <span className="text-[10px] text-muted-foreground">{new Date(lastMsg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>}
                        {unread > 0 && <span className="h-5 min-w-[20px] rounded-full bg-[#FF5A01] text-white text-[10px] flex items-center justify-center font-bold px-1.5 shadow-lg">{unread}</span>}
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      );
    }

    // Admin: direct chat with a coach
    if (adminDirectContact) {
      return (
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button onClick={() => setAdminDirectContact(null)} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-sm shadow-orange overflow-hidden shrink-0">
                {adminDirectContact.avatar_url ? <img src={adminDirectContact.avatar_url} alt={adminDirectContact.name} className="h-full w-full object-cover" /> : adminDirectContact.name.charAt(0)}
              </div>
              <div>
                <p className="font-display font-semibold text-sm">{adminDirectContact.name}</p>
                <p className="text-xs text-muted-foreground">Koç — Doğrudan Mesaj</p>
              </div>
            </div>
          </div>
          {renderChatBubbles()}
          {renderMessageInput()}
        </div>
      );
    }

    // Admin: spectator pair view
    if (selectedPair) {
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
          {renderChatBubbles(true, selectedPair)}
          <div className="p-3 border-t border-border bg-card/50 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> İzleyici modundasınız — mesaj gönderemezsiniz
            </p>
          </div>
        </div>
      );
    }
  }

  // ─── COACH VIEW ───
  if (currentRole === 'koc') {
    // Coach: contact list with tabs
    if (!selectedStudent && coachChatMode === 'students') {
      const adminUnread = adminContact ? getUnreadCount(adminContact.id) : 0;
      return (
        <div className="overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl space-y-3">
            <p className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Mesajlar</p>
            {/* Admin contact - special card */}
            {adminContact && (
              <button
                onClick={() => setCoachChatMode('admin')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-sm shadow-orange shrink-0 overflow-hidden">
                  {adminContact.avatar_url ? <img src={adminContact.avatar_url} alt={adminContact.name} className="h-full w-full object-cover" /> : <Shield className="h-5 w-5" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    {adminContact.name}
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Yönetici</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {(() => { const lm = getLastMessage(adminContact.id); return lm ? lm.content : 'Yönetici ile mesajlaşın'; })()}
                  </p>
                </div>
                {adminUnread > 0 && (
                  <span className="h-5 min-w-[20px] rounded-full bg-[#FF5A01] text-white text-[10px] flex items-center justify-center font-bold px-1.5 shadow-lg">{adminUnread}</span>
                )}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {students.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">Henüz atanmış öğrenci yok.</p>
            )}
            {students.map(s => {
              const lastMsg = getLastMessage(s.id);
              const unread = getUnreadCount(s.id);
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

    // Coach: chat with admin
    if (coachChatMode === 'admin' && adminContact) {
      return (
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button onClick={() => { setCoachChatMode('students'); }} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground shadow-orange shrink-0 overflow-hidden">
                {adminContact.avatar_url ? <img src={adminContact.avatar_url} alt={adminContact.name} className="h-full w-full object-cover" /> : <Shield className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-display font-semibold text-sm">{adminContact.name}</p>
                <p className="text-xs text-muted-foreground">Süper Yönetici</p>
              </div>
            </div>
          </div>
          {renderChatBubbles()}
          {renderMessageInput()}
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
        {renderChatBubbles()}
        {renderMessageInput()}
      </div>
    );
  }

  return null;
}
