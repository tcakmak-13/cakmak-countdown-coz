import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Paperclip, ArrowLeft, FileText, Download, Circle, Trophy, Award, GraduationCap, Star, Instagram, MessageCircle as WhatsAppIcon, Clock, ImagePlus, Eye, Shield, Building2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ImagePicker from '@/components/ImagePicker';
import { usePresence } from '@/hooks/usePresence';

interface Props {
  currentProfileId: string;
  currentName: string;
  currentRole: 'super_admin' | 'admin' | 'firm_admin' | 'koc' | 'student' | null;
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
  type: 'student' | 'coach' | 'admin' | 'firm_admin';
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
  const { isOnline } = usePresence(currentProfileId);
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

  // Admin/firm_admin direct messaging with coaches
  const [adminCoachContacts, setAdminCoachContacts] = useState<ChatContact[]>([]);
  const [adminChatMode, setAdminChatMode] = useState<'spectator' | 'direct'>('direct');
  const [adminDirectContact, setAdminDirectContact] = useState<ChatContact | null>(null);

  // Coach: admin contact for direct messaging
  const [adminContact, setAdminContact] = useState<ChatContact | null>(null);
  const [coachChatMode, setCoachChatMode] = useState<'students' | 'admin'>('students');

  // Super Admin specific contacts
  const [saFirmAdminContacts, setSaFirmAdminContacts] = useState<ChatContact[]>([]);
  const [saCoachContacts, setSaCoachContacts] = useState<ChatContact[]>([]);
  const [saStudentContacts, setSaStudentContacts] = useState<ChatContact[]>([]);
  const [saChatMode, setSaChatMode] = useState<'firms' | 'team' | 'spectator'>('firms');
  const [saDirectContact, setSaDirectContact] = useState<ChatContact | null>(null);

  const getSignedUrl = async (fileName: string) => {
    if (signedUrls[fileName]) return signedUrls[fileName];
    const { data } = await supabase.storage.from('chat-files').createSignedUrl(fileName, 3600);
    if (data?.signedUrl) {
      setSignedUrls(prev => ({ ...prev, [fileName]: data.signedUrl }));
      return data.signedUrl;
    }
    return '';
  };

  // ─── LOAD CONTACTS ───
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
    if (currentRole === 'super_admin') {
      const loadSuperAdminContacts = async () => {
        // Get own company_id
        const { data: myProfile } = await supabase.from('profiles').select('company_id').eq('id', currentProfileId).single();
        const myCompanyId = myProfile?.company_id;

        // 1) All firm_admins (from all companies)
        const { data: firmAdminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'firm_admin');
        if (firmAdminRoles && firmAdminRoles.length > 0) {
          const { data: firmAdminProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url, company_id').in('user_id', firmAdminRoles.map(r => r.user_id));
          if (firmAdminProfiles) {
            // get company names
            const companyIds = [...new Set(firmAdminProfiles.map(p => p.company_id).filter(Boolean))];
            let companyMap: Record<string, string> = {};
            if (companyIds.length > 0) {
              const { data: companies } = await supabase.from('companies').select('id, name').in('id', companyIds as string[]);
              if (companies) companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]));
            }
            setSaFirmAdminContacts(firmAdminProfiles.map(p => ({
              id: p.id,
              name: p.full_name || 'Firma Yöneticisi',
              type: 'firm_admin' as const,
              avatar_url: p.avatar_url,
              subtitle: p.company_id ? (companyMap[p.company_id] || 'Firma') : 'Firma Yöneticisi',
            })));
          }
        }

        // 2) Own company coaches
        if (myCompanyId) {
          const { data: coachRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'koc');
          if (coachRoles && coachRoles.length > 0) {
            const { data: coachProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url, company_id, user_id').in('user_id', coachRoles.map(r => r.user_id)).eq('company_id', myCompanyId);
            if (coachProfiles) {
              setSaCoachContacts(coachProfiles.map(c => ({
                id: c.id,
                name: c.full_name || 'Koç',
                type: 'coach' as const,
                avatar_url: c.avatar_url,
                subtitle: 'Koç',
              })));

              // 3) Own company students
              const { data: studentRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
              if (studentRoles && studentRoles.length > 0) {
                const { data: studentProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url, company_id, coach_id').in('user_id', studentRoles.map(r => r.user_id)).eq('company_id', myCompanyId);
                if (studentProfiles) {
                  setSaStudentContacts(studentProfiles.map(s => ({
                    id: s.id,
                    name: s.full_name || 'Öğrenci',
                    type: 'student' as const,
                    avatar_url: s.avatar_url,
                    subtitle: 'Öğrenci',
                  })));

                  // 4) Conversation pairs for spectator (own company only)
                  const pairs: ConversationPair[] = [];
                  for (const student of studentProfiles) {
                    if (student.coach_id) {
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
                  }
                  setConversationPairs(pairs);
                }
              }
            }
          }
        }
      };
      loadSuperAdminContacts();
  } else if (currentRole === 'admin' || currentRole === 'firm_admin') {
    const loadPairs = async () => {
      // Get my company_id
      const { data: myProfile } = await supabase.from('profiles').select('company_id').eq('id', currentProfileId).single();
      const myCompanyId = myProfile?.company_id;
      
      // Load coaches from same company only
      const { data: coachRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'koc');
      if (!coachRoles || coachRoles.length === 0) { setConversationPairs([]); setAdminCoachContacts([]); return; }
      const coachUserIds = coachRoles.map(r => r.user_id);
      
      let coachQuery = supabase.from('profiles').select('id, full_name, user_id, avatar_url, company_id').in('user_id', coachUserIds);
      if (myCompanyId) coachQuery = coachQuery.eq('company_id', myCompanyId);
      const { data: coachProfiles } = await coachQuery;
      if (!coachProfiles) { setConversationPairs([]); setAdminCoachContacts([]); return; }

      const contacts: ChatContact[] = coachProfiles.map(c => ({
        id: c.id,
        name: c.full_name || 'Koç',
        type: 'coach' as const,
        avatar_url: c.avatar_url,
        subtitle: 'Koç',
      }));

      // firm_admin: also add super_admin as a direct contact
      if (currentRole === 'firm_admin') {
        const { data: saRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'super_admin');
        if (saRoles && saRoles.length > 0) {
          const { data: saProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('user_id', saRoles.map(r => r.user_id));
          if (saProfiles) {
            saProfiles.forEach(sa => {
              contacts.unshift({
                id: sa.id,
                name: sa.full_name || 'Süper Yönetici',
                type: 'admin' as const,
                avatar_url: sa.avatar_url,
                subtitle: 'Süper Yönetici',
              });
            });
          }
        }
      }

      setAdminCoachContacts(contacts);

      // Spectator: only show coach-student pairs from same company
      let studentQuery = supabase.from('profiles').select('id, full_name, coach_id').not('coach_id', 'is', null);
      if (myCompanyId) studentQuery = studentQuery.eq('company_id', myCompanyId);
      const { data: allStudents } = await studentQuery;
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

      // Load firm_admin from same company as the coach's contact
      const loadCoachAdminContact = async () => {
        const { data: myProfile } = await supabase.from('profiles').select('company_id').eq('id', currentProfileId).single();
        const myCompanyId = myProfile?.company_id;
        const contacts: ChatContact[] = [];

        // 1) Find firm_admin(s) from same company
        if (myCompanyId) {
          const { data: faRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'firm_admin');
          if (faRoles && faRoles.length > 0) {
            const { data: faProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url, company_id').in('user_id', faRoles.map(r => r.user_id)).eq('company_id', myCompanyId);
            if (faProfiles && faProfiles.length > 0) {
              faProfiles.forEach(fa => {
                contacts.push({
                  id: fa.id,
                  name: fa.full_name || 'Firma Yöneticisi',
                  type: 'firm_admin',
                  avatar_url: fa.avatar_url,
                  subtitle: 'Firma Yöneticisi',
                });
              });
            }
          }
        }

        // Set the first firm_admin as primary admin contact (for backward compat)
        if (contacts.length > 0) {
          setAdminContact(contacts[0]);
        }
      };
      loadCoachAdminContact();
    }
  }, [currentRole, currentProfileId]);

  // ─── FETCH MESSAGES ───
  useEffect(() => {
    const fetchMessages = async () => {
      let query = supabase.from('chat_messages').select('*');
      if (currentRole !== 'admin' && currentRole !== 'super_admin' && currentRole !== 'firm_admin') {
        query = query.or(`sender_id.eq.${currentProfileId},receiver_id.eq.${currentProfileId}`);
      }
      const { data } = await query.order('created_at').limit(1000);
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

  // ─── MARK AS READ ───
  useEffect(() => {
    if (currentRole === 'super_admin') {
    if (saChatMode !== 'spectator' && saDirectContact) {
      const unread = messages.filter(m => !m.read && m.receiver_id === currentProfileId && m.sender_id === saDirectContact.id);
      if (unread.length > 0) {
        supabase.from('chat_messages').update({ read: true }).in('id', unread.map(m => m.id)).then(() => {});
      }
    }
    return;
    }
    if (currentRole === 'admin' || currentRole === 'firm_admin') {
      if (adminChatMode === 'direct' && adminDirectContact) {
        const unread = messages.filter(m => !m.read && m.receiver_id === currentProfileId && m.sender_id === adminDirectContact.id);
        if (unread.length > 0) {
          supabase.from('chat_messages').update({ read: true }).in('id', unread.map(m => m.id)).then(() => {});
        }
      }
      return;
    }
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
  }, [messages, currentProfileId, coachProfileId, selectedStudent, currentRole, adminChatMode, adminDirectContact, coachChatMode, adminContact, saChatMode, saDirectContact]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedStudent, selectedPair, adminDirectContact, coachChatMode, saDirectContact, saChatMode]);

  // ─── CHAT PARTNER ───
  const chatPartnerId = useMemo(() => {
    if (currentRole === 'student') return coachProfileId;
    if (currentRole === 'super_admin' && saChatMode !== 'spectator' && saDirectContact) return saDirectContact.id;
    if ((currentRole === 'admin' || currentRole === 'firm_admin') && adminChatMode === 'direct' && adminDirectContact) return adminDirectContact.id;
    if (currentRole === 'koc' && coachChatMode === 'admin' && adminContact) return adminContact.id;
    if (currentRole === 'koc' && coachChatMode === 'students') return selectedStudent;
    return null;
  }, [currentRole, coachProfileId, adminChatMode, adminDirectContact, coachChatMode, adminContact, selectedStudent, saChatMode, saDirectContact]);

  // ─── FILTERED MESSAGES ───
  const filteredMessages = useMemo(() => {
    // Super Admin spectator
    if (currentRole === 'super_admin' && saChatMode === 'spectator' && selectedPair) {
      return messages.filter(m =>
        (m.sender_id === selectedPair.coachId && m.receiver_id === selectedPair.studentId) ||
        (m.sender_id === selectedPair.studentId && m.receiver_id === selectedPair.coachId)
      );
    }
    // Super Admin direct (firms or team tab)
    if (currentRole === 'super_admin' && saChatMode !== 'spectator' && saDirectContact) {
      return messages.filter(m =>
        (m.sender_id === currentProfileId && m.receiver_id === saDirectContact.id) ||
        (m.sender_id === saDirectContact.id && m.receiver_id === currentProfileId)
      );
    }
    // Admin spectator
    if ((currentRole === 'admin' || currentRole === 'firm_admin') && adminChatMode === 'spectator' && selectedPair) {
      return messages.filter(m =>
        (m.sender_id === selectedPair.coachId && m.receiver_id === selectedPair.studentId) ||
        (m.sender_id === selectedPair.studentId && m.receiver_id === selectedPair.coachId)
      );
    }
    // Admin direct
    if ((currentRole === 'admin' || currentRole === 'firm_admin') && adminChatMode === 'direct' && adminDirectContact) {
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
  }, [messages, currentRole, selectedPair, chatPartnerId, currentProfileId, adminChatMode, adminDirectContact, coachChatMode, adminContact, saChatMode, saDirectContact]);

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

  const [sendingMessage, setSendingMessage] = useState(false);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !chatPartnerId || sendingMessage) return;
    if (trimmed.length > 2000) {
      toast.error('Mesaj çok uzun (maks 2000 karakter)');
      return;
    }
    setSendingMessage(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: currentProfileId,
        receiver_id: chatPartnerId,
        content: trimmed,
        type: 'text',
      });
      if (error) {
        console.error('Mesaj gönderme hatası:', error.code, error.message, error.details);
        toast.error('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
        return;
      }
      setInput('');
    } catch (err: any) {
      console.error('Mesaj gönderme beklenmeyen hata:', err);
      toast.error('Mesaj gönderilemedi.');
    } finally {
      setSendingMessage(false);
    }
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
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${currentUserId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, file);
      if (uploadError) {
        console.error('Dosya yükleme hatası:', uploadError);
        toast.error('Dosya yüklenemedi. Lütfen tekrar deneyin.');
        return;
      }
      const fileType = isImage(file.name) ? 'image' : 'file';
      const { error: msgError } = await supabase.from('chat_messages').insert({
        sender_id: currentProfileId,
        receiver_id: chatPartnerId,
        content: fileType === 'image' ? '📷 Fotoğraf' : `📄 ${file.name}`,
        type: fileType,
        file_name: filePath,
      });
      if (msgError) {
        console.error('Mesaj kaydetme hatası:', msgError);
        toast.error('Dosya gönderildi ama mesaj kaydedilemedi.');
      }
    } catch (err: any) {
      console.error('Dosya gönderme beklenmeyen hata:', err);
      toast.error('Dosya gönderilemedi.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMultiImageUpload = useCallback(async (files: File[]) => {
    if (!chatPartnerId || !currentUserId) return;
    setUploading(true);
    let successCount = 0;
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const filePath = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, file);
        if (uploadError) { console.error('Çoklu yükleme hatası:', uploadError); toast.error(`Yükleme hatası: ${file.name}`); continue; }
        const { error: msgError } = await supabase.from('chat_messages').insert({
          sender_id: currentProfileId,
          receiver_id: chatPartnerId,
          content: '📷 Fotoğraf',
          type: 'image',
          file_name: filePath,
        });
        if (msgError) { console.error('Mesaj kaydetme hatası:', msgError); continue; }
        successCount++;
      }
      if (successCount > 0) toast.success(`${successCount} fotoğraf gönderildi!`);
    } catch (err: any) {
      console.error('Çoklu fotoğraf gönderme hatası:', err);
      toast.error('Fotoğraflar gönderilemedi.');
    } finally {
      setUploading(false);
    }
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

  const renderReadOnlyBar = () => (
    <div className="p-3 border-t border-border bg-card/50 text-center">
      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
        <Eye className="h-3.5 w-3.5" /> İzleyici modundasınız — mesaj gönderemezsiniz
      </p>
    </div>
  );

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    if (isSameDay(date, today)) return 'Bugün';
    if (isSameDay(date, yesterday)) return 'Dün';

    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${date.getDate()} ${months[date.getMonth()]} ${days[date.getDay()]}`;
  };

  const renderChatBubbles = (isSpectator = false, spectatorPair?: ConversationPair) => {
    let lastDateLabel = '';
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Henüz mesaj yok</p>
        )}
        {filteredMessages.map(msg => {
          const isMine = isSpectator
            ? msg.sender_id === spectatorPair?.coachId
            : msg.sender_id === currentProfileId;
          const dateLabel = getDateLabel(msg.created_at);
          const showDateHeader = dateLabel !== lastDateLabel;
          if (showDateHeader) lastDateLabel = dateLabel;

          return (
            <div key={msg.id}>
              {showDateHeader && (
                <div className="flex justify-center my-4 sticky top-0 z-10">
                  <span className="px-4 py-1.5 rounded-full text-[11px] font-medium text-muted-foreground bg-card/70 backdrop-blur-md border border-border/50 shadow-sm">
                    {dateLabel}
                  </span>
                </div>
              )}
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
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
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    );
  };

  // Helper: render a contact row
  const renderContactRow = (contact: ChatContact, onClick: () => void) => {
    const lastMsg = getLastMessage(contact.id);
    const unread = getUnreadCount(contact.id);
    return (
      <button key={contact.id} onClick={onClick} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors border-b border-border/50">
        <div className="h-11 w-11 rounded-full bg-gradient-orange flex items-center justify-center text-base font-bold text-primary-foreground shadow-orange shrink-0 overflow-hidden">
          {contact.avatar_url ? <img src={contact.avatar_url} alt={contact.name} className="h-full w-full object-cover" /> : contact.name.charAt(0)}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium truncate">{contact.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {contact.subtitle && <span className="text-primary/60">{contact.subtitle} · </span>}
            {lastMsg ? lastMsg.content : 'Henüz mesaj yok'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {lastMsg && <span className="text-[10px] text-muted-foreground">{new Date(lastMsg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>}
          {unread > 0 && <span className="h-5 min-w-[20px] rounded-full bg-[#FF5A01] text-white text-[10px] flex items-center justify-center font-bold px-1.5 shadow-lg">{unread}</span>}
        </div>
      </button>
    );
  };

  // Helper: render a conversation pair row
  const renderPairRow = (pair: ConversationPair, onClick: () => void) => {
    const lastMsg = getLastMessageForPair(pair);
    const msgCount = getMessageCountForPair(pair);
    return (
      <button key={pair.key} onClick={onClick} className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors border-b border-border/50">
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
  };

  // Helper: render direct chat view (back button + header + bubbles + input)
  const renderDirectChatView = (contact: ChatContact, onBack: () => void, subtitleText: string) => (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-sm shadow-orange overflow-hidden shrink-0">
            {contact.avatar_url ? <img src={contact.avatar_url} alt={contact.name} className="h-full w-full object-cover" /> : contact.name.charAt(0)}
          </div>
          <div>
            <p className="font-display font-semibold text-sm">{contact.name}</p>
            <p className="text-xs text-muted-foreground">{subtitleText}</p>
          </div>
        </div>
      </div>
      {renderChatBubbles()}
      {renderMessageInput()}
    </div>
  );

  // Helper: render spectator chat view
  const renderSpectatorChatView = (pair: ConversationPair, onBack: () => void) => (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex -space-x-2">
            <div className="h-9 w-9 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-xs ring-2 ring-card z-10">
              {pair.coachName.charAt(0)}
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-card">
              {pair.studentName.charAt(0)}
            </div>
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm">{pair.coachName} ↔ {pair.studentName}</p>
            <p className="text-xs text-muted-foreground">Koç — Öğrenci Sohbeti</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-medium shrink-0">
            <Eye className="h-3 w-3" /> Salt Okunur
          </span>
        </div>
      </div>
      {renderChatBubbles(true, pair)}
      {renderReadOnlyBar()}
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
                <Circle className={`h-2 w-2 fill-current ${coachProfileId && isOnline(coachProfileId) ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                <span className={`text-xs ${coachProfileId && isOnline(coachProfileId) ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {coachProfileId && isOnline(coachProfileId) ? 'Çevrimiçi' : 'Çevrimdışı'}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Profili Gör</span>
          </div>
        </button>
        {renderChatBubbles()}
        {renderMessageInput()}
        <CoachDrawer open={coachDrawerOpen} onOpenChange={setCoachDrawerOpen} name={coachName} avatarUrl={coachAvatarUrl} coachProfileId={coachProfileId} />
      </div>
    );
  }

  // ─── SUPER ADMIN VIEW ───
  if (currentRole === 'super_admin') {
    // Active direct chat (from firms or team tab)
    if (saChatMode !== 'spectator' && saDirectContact) {
      const subtitleMap: Record<string, string> = { firm_admin: 'Firma Yöneticisi — Doğrudan Mesaj', coach: 'Koç — Doğrudan Mesaj', student: 'Öğrenci — Doğrudan Mesaj' };
      return renderDirectChatView(saDirectContact, () => setSaDirectContact(null), subtitleMap[saDirectContact.type] || 'Doğrudan Mesaj');
    }

    // Active spectator pair
    if (saChatMode === 'spectator' && selectedPair) {
      return renderSpectatorChatView(selectedPair, () => setSelectedPair(null));
    }

    // Contact list with 3 tabs
    const firmUnread = saFirmAdminContacts.reduce((sum, c) => sum + getUnreadCount(c.id), 0);
    const teamUnread = saCoachContacts.reduce((sum, c) => sum + getUnreadCount(c.id), 0);

    return (
      <div className="overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="flex gap-1.5">
            <button
              onClick={() => setSaChatMode('firms')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${saChatMode === 'firms' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              <span className="flex items-center justify-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> Firmalar
                {firmUnread > 0 && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">{firmUnread > 9 ? '9+' : firmUnread}</span>
                )}
              </span>
            </button>
            <button
              onClick={() => setSaChatMode('team')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${saChatMode === 'team' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              <span className="flex items-center justify-center gap-1">
                <Shield className="h-3.5 w-3.5" /> Ekibim
                {teamUnread > 0 && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">{teamUnread > 9 ? '9+' : teamUnread}</span>
                )}
              </span>
            </button>
            <button
              onClick={() => setSaChatMode('spectator')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${saChatMode === 'spectator' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              <span className="flex items-center justify-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Gözlem
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {saChatMode === 'firms' && (
            <>
              {saFirmAdminContacts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">Henüz firma yöneticisi yok.</p>
              )}
              {saFirmAdminContacts.map(contact => renderContactRow(contact, () => setSaDirectContact(contact)))}
            </>
          )}

          {saChatMode === 'team' && (
            <div>
              {saCoachContacts.length > 0 && (
                <>
                  <div className="px-4 py-2.5 bg-secondary/30 border-b border-border/50">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Koçlarım
                    </p>
                  </div>
                  {saCoachContacts.map(contact => renderContactRow(contact, () => setSaDirectContact(contact)))}
                </>
              )}
              {saCoachContacts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">Ekibinizde koç yok.</p>
              )}
            </div>
          )}

          {saChatMode === 'spectator' && (
            <>
              {conversationPairs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">Ekibinizde koç-öğrenci eşleşmesi yok.</p>
              )}
              {conversationPairs.map(pair => renderPairRow(pair, () => setSelectedPair(pair)))}
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── ADMIN / FIRM_ADMIN VIEW ───
  if (currentRole === 'admin' || currentRole === 'firm_admin') {
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
                  <Shield className="h-3.5 w-3.5" /> {currentRole === 'firm_admin' ? 'Mesajlaş' : 'Koçlarla Mesajlaş'}
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
                {adminCoachContacts.map(contact => renderContactRow(contact, () => setAdminDirectContact(contact)))}
              </>
            ) : (
              <>
                {conversationPairs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-12">Henüz koç-öğrenci eşleşmesi yok.</p>
                )}
                {conversationPairs.map(pair => renderPairRow(pair, () => setSelectedPair(pair)))}
              </>
            )}
          </div>
        </div>
      );
    }

    // Admin: direct chat with a coach or super_admin
    if (adminDirectContact) {
      const subtitle = adminDirectContact.type === 'admin' ? 'Süper Yönetici — Doğrudan Mesaj' : 'Koç — Doğrudan Mesaj';
      return renderDirectChatView(adminDirectContact, () => setAdminDirectContact(null), subtitle);
    }

    // Admin: spectator pair view
    if (selectedPair) {
      return renderSpectatorChatView(selectedPair, () => setSelectedPair(null));
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{s.full_name}</p>
                      <Circle className={`h-2 w-2 fill-current shrink-0 ${isOnline(s.id) ? 'text-emerald-500' : 'text-muted-foreground/30'}`} />
                    </div>
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
      return renderDirectChatView(adminContact, () => setCoachChatMode('students'), adminContact.subtitle || 'Firma Yöneticisi');
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
              <div className="flex items-center gap-1.5">
                <Circle className={`h-2 w-2 fill-current ${selectedStudent && isOnline(selectedStudent) ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                <span className={`text-xs ${selectedStudent && isOnline(selectedStudent) ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {selectedStudent && isOnline(selectedStudent) ? 'Çevrimiçi' : 'Çevrimdışı'}
                </span>
              </div>
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
