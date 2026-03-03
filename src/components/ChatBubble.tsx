import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Paperclip, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, User } from '@/lib/types';
import { getMessages, saveMessages, getStudents, getStoredUser } from '@/lib/mockData';
import { Input } from '@/components/ui/input';

interface Props {
  currentUser: User;
}

export default function ChatBubble({ currentUser }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(
    currentUser.role === 'student' ? 'admin-1' : null
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  const students = getStudents();

  useEffect(() => {
    setMessages(getMessages());
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedStudent]);

  const filteredMessages = messages.filter(m => {
    if (currentUser.role === 'student') {
      return (m.senderId === currentUser.id && m.receiverId === 'admin-1') ||
             (m.senderId === 'admin-1' && m.receiverId === currentUser.id);
    }
    if (selectedStudent) {
      return (m.senderId === selectedStudent && m.receiverId === 'admin-1') ||
             (m.senderId === 'admin-1' && m.receiverId === selectedStudent);
    }
    return false;
  });

  const unreadCount = messages.filter(m => !m.read && m.receiverId === currentUser.id).length;

  const getUnreadForStudent = (studentId: string) =>
    messages.filter(m => m.senderId === studentId && m.receiverId === 'admin-1' && !m.read).length;

  const handleSend = () => {
    if (!input.trim()) return;
    const receiverId = currentUser.role === 'student' ? 'admin-1' : selectedStudent;
    if (!receiverId) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      receiverId,
      content: input.trim(),
      type: 'text',
      timestamp: new Date().toISOString(),
      read: false,
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    saveMessages(updated);
    setInput('');
  };

  return (
    <>
      {/* Floating button */}
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

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh] glass-card rounded-2xl flex flex-col overflow-hidden shadow-orange"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-orange flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {currentUser.role === 'admin' ? 'KÇ' : currentUser.name.charAt(0)}
                </div>
                <div>
                  <p className="font-display font-semibold text-sm">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.role === 'admin' ? 'Koç' : 'Öğrenci'}</p>
                </div>
              </div>
            </div>

            {/* Admin: student list OR chat */}
            {currentUser.role === 'admin' && !selectedStudent ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider px-1 mb-2">Öğrenciler</p>
                {students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {s.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{s.fullName}</p>
                      <p className="text-xs text-muted-foreground">{s.area} — {s.grade}</p>
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
                {/* Back button for admin */}
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border-b border-border"
                  >
                    ← Öğrenci Listesi
                  </button>
                )}
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {filteredMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Henüz mesaj yok</p>
                  )}
                  {filteredMessages.map(msg => {
                    const isMine = msg.senderId === currentUser.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                            isMine
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-secondary text-foreground rounded-bl-md'
                          }`}
                        >
                          {msg.content}
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                {/* Input */}
                <div className="p-3 border-t border-border bg-card">
                  <form
                    onSubmit={e => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-2"
                  >
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
