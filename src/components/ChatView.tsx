import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, ArrowLeft, FileText, Download, Circle, Trophy, Award, GraduationCap, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface Props {
  currentProfileId: string;
  currentName: string;
  currentRole: 'admin' | 'student' | null;
  currentUserId?: string;
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

function isImage(fileName: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
}

function isPdf(fileName: string) {
  return /\.pdf$/i.test(fileName);
}

function CoachDrawer({ open, onOpenChange, name, avatarUrl }: { open: boolean; onOpenChange: (v: boolean) => void; name: string; avatarUrl: string | null }) {
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
            <p className="text-sm text-muted-foreground">YKS Koçu • Mentor</p>
          </SheetHeader>

          <div className="px-6 pb-8 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-xl p-4 text-center border border-primary/20">
                <Trophy className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">YKS Sıralaması</p>
                <p className="font-display text-2xl font-bold text-primary mt-1">Top 1000</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center border border-primary/20">
                <Star className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Deneyim</p>
                <p className="font-display text-2xl font-bold text-primary mt-1">3+ Yıl</p>
              </div>
            </div>

            {/* Net scores */}
            <div className="glass-card rounded-xl p-5 border border-primary/20 space-y-3">
              <h4 className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Sınav Başarısı
              </h4>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm font-medium">TYT Net</span>
                <span className="font-display text-xl font-bold text-primary">112.5</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">AYT Net</span>
                <span className="font-display text-xl font-bold text-primary">75.25</span>
              </div>
            </div>

            {/* Bio */}
            <div className="glass-card rounded-xl p-5 border border-primary/20 space-y-3">
              <h4 className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Hakkında
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                YKS sürecinde yüzlerce öğrenciye rehberlik etmiş, deneyimli bir koç. Motivasyon, planlama ve strateji konularında uzmanlaşmış olup öğrencilerin potansiyellerini en üst düzeye çıkarmayı hedefler.
              </p>
            </div>

            {/* Username */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">@tcakmak1355</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function ChatView({ currentProfileId, currentName, currentRole, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [adminProfileId, setAdminProfileId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('Talha Çakmak');
  const [adminAvatarUrl, setAdminAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [coachDrawerOpen, setCoachDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      supabase.from('profiles').select('id, full_name, area, grade')
        .then(({ data }) => {
          if (data) setStudents(data.filter(s => s.id !== currentProfileId));
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const chatPartnerId = currentRole === 'student' ? adminProfileId : selectedStudent;
    if (!chatPartnerId) return;
    const unread = messages.filter(m => !m.read && m.receiver_id === currentProfileId && m.sender_id === chatPartnerId);
    if (unread.length > 0) {
      supabase.from('chat_messages').update({ read: true }).in('id', unread.map(m => m.id)).then(() => {});
    }
  }, [messages, currentProfileId, adminProfileId, selectedStudent, currentRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedStudent]);

  const chatPartnerId = currentRole === 'student' ? adminProfileId : selectedStudent;

  const filteredMessages = messages.filter(m => {
    if (!chatPartnerId) return false;
    return (m.sender_id === currentProfileId && m.receiver_id === chatPartnerId) ||
           (m.sender_id === chatPartnerId && m.receiver_id === currentProfileId);
  });

  const getLastMessage = (studentId: string) => {
    const studentMsgs = messages.filter(m =>
      (m.sender_id === studentId && m.receiver_id === currentProfileId) ||
      (m.sender_id === currentProfileId && m.receiver_id === studentId)
    );
    return studentMsgs[studentMsgs.length - 1];
  };

  const getUnreadForStudent = (studentId: string) =>
    messages.filter(m => m.sender_id === studentId && m.receiver_id === currentProfileId && !m.read).length;

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
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Mesaj yaz..." className="bg-secondary border-border text-sm h-10" maxLength={2000} />
        <button type="submit" className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity shadow-orange">
          <Send className="h-4 w-4 text-primary-foreground" />
        </button>
      </form>
    </div>
  );

  // Student: direct chat view
  if (currentRole === 'student') {
    return (
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
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
                <div className={`max-w-[75%] px-4 py-2.5 text-sm ${isMine ? 'bg-gradient-orange text-primary-foreground rounded-2xl rounded-br-md shadow-[0_0_12px_-3px_hsl(25_95%_53%/0.5)]' : 'glass-card rounded-2xl rounded-bl-md'}`}>
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

  // Admin: student list
  if (currentRole === 'admin' && !selectedStudent) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
          <p className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Öğrenci Mesajları</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {students.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">Henüz öğrenci yok.</p>
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

  // Admin: chat with selected student
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
              <div className={`max-w-[75%] px-4 py-2.5 text-sm ${isMine ? 'bg-gradient-orange text-primary-foreground rounded-2xl rounded-br-md shadow-[0_0_12px_-3px_hsl(25_95%_53%/0.5)]' : 'glass-card rounded-2xl rounded-bl-md'}`}>
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
