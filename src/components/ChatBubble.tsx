import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

interface Props {
  currentProfileId: string;
  currentName: string;
  currentRole: 'admin' | 'student' | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: string;
  created_at: string;
  read: boolean;
}

interface StudentItem {
  id: string;
  full_name: string;
  area: string | null;
  grade: string | null;
}

export default function ChatBubble({ currentProfileId, currentName, currentRole }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [adminProfileId, setAdminProfileId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Find admin profile for student chat
  useEffect(() => {
    if (currentRole === 'student') {
      supabase.from('user_roles').select('user_id').eq('role', 'admin').limit(1)
        .then(({ data }) => {
          if (data?.[0]) {
            supabase.from('profiles').select('id').eq('user_id', data[0].user_id).single()
              .then(({ data: p }) => { if (p) setAdminProfileId(p.id); });
          }
        });
    }
  }, [currentRole]);

  // Load students for admin
  useEffect(() => {
    if (currentRole === 'admin') {
      supabase.from('profiles').select('id, full_name, area, grade')
        .then(({ data }) => {
          if (data) setStudents(data.filter(s => s.id !== currentProfileId));
        });
    }
  }, [currentRole, currentProfileId]);

  // Load messages
  useEffect(() => {
    if (!open) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at');
      if (data) setMessages(data);
    };
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedStudent]);

  const chatPartnerId = currentRole === 'student' ? adminProfileId : selectedStudent;

  const filteredMessages = messages.filter(m => {
    if (!chatPartnerId) return false;
    return (m.sender_id === currentProfileId && m.receiver_id === chatPartnerId) ||
           (m.sender_id === chatPartnerId && m.receiver_id === currentProfileId);
  });

  const unreadCount = messages.filter(m => !m.read && m.receiver_id === currentProfileId).length;

  const getUnreadForStudent = (studentId: string) =>
    messages.filter(m => m.sender_id === studentId && m.receiver_id === currentProfileId && !m.read).length;

  const handleSend = async () => {
    if (!input.trim() || !chatPartnerId) return;
    await supabase.from('chat_messages').insert({
      sender_id: currentProfileId,
      receiver_id: chatPartnerId,
      content: input.trim(),
      type: 'text',
    });
    setInput('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange hover:scale-105 transition-transform"
      >
        {open ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh] glass-card rounded-2xl flex flex-col overflow-hidden shadow-orange"
          >
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-orange flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {currentName.charAt(0)}
                </div>
                <div>
                  <p className="font-display font-semibold text-sm">{currentName}</p>
                  <p className="text-xs text-muted-foreground">{currentRole === 'admin' ? 'Koç' : 'Öğrenci'}</p>
                </div>
              </div>
            </div>

            {currentRole === 'admin' && !selectedStudent ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider px-1 mb-2">Öğrenciler</p>
                {students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {s.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.area ?? 'SAY'} — {s.grade ?? '12. Sınıf'}</p>
                    </div>
                    {getUnreadForStudent(s.id) > 0 && (
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                        {getUnreadForStudent(s.id)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <>
                {currentRole === 'admin' && (
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border-b border-border"
                  >
                    ← Öğrenci Listesi
                  </button>
                )}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {filteredMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Henüz mesaj yok</p>
                  )}
                  {filteredMessages.map(msg => {
                    const isMine = msg.sender_id === currentProfileId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                            isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-secondary text-foreground rounded-bl-md'
                          }`}
                        >
                          {msg.content}
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <div className="p-3 border-t border-border bg-card">
                  <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                    <Input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Mesaj yaz..."
                      className="bg-secondary border-border text-sm"
                    />
                    <button type="submit" className="h-9 w-9 rounded-full bg-gradient-orange flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity">
                      <Send className="h-4 w-4 text-primary-foreground" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
