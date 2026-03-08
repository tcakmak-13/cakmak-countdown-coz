import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, LogOut, Users, Calendar, User as UserIcon, Plus, MessageCircle, Camera, BarChart3, Settings, Megaphone, CalendarCheck, Trash2, Shield, UserPlus } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AvatarUpload from '@/components/AvatarUpload';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import YKSCountdown from '@/components/YKSCountdown';
import StudyPlanner from '@/components/StudyPlanner';
import StudentProfileForm from '@/components/StudentProfileForm';
import ChatView from '@/components/ChatView';
import AdminAnalytics from '@/components/AdminAnalytics';
import AdminAppointments from '@/components/AdminAppointments';
import CoachProfileEditor from '@/components/CoachProfileEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface StudentProfile {
  id: string;
  full_name: string;
  area: string | null;
  grade: string | null;
  username: string | null;
  target_university: string | null;
  target_department: string | null;
  coach_id: string | null;
}

interface CoachProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, role, loading, signOut, profileId, session, refreshProfile } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [tab, setTab] = useState<'overview' | 'students' | 'coaches' | 'schedule' | 'profile' | 'messages' | 'analytics' | 'coach-edit' | 'appointments'>('overview');

  const TAB_TITLES: Record<string, string> = {
    overview: 'Genel Bakış',
    analytics: 'Analiz Merkezi',
    students: 'Öğrenciler',
    coaches: 'Koçlar',
    schedule: selectedStudent ? selectedStudent.full_name || 'Program' : 'Program',
    profile: selectedStudent ? selectedStudent.full_name || 'Profil' : 'Profil',
    messages: 'Mesajlar',
    'coach-edit': 'Koç Profilim',
    appointments: 'Randevular',
  };

  // Student creation
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [creatingStudent, setCreatingStudent] = useState(false);

  // Coach creation
  const [showCreateCoach, setShowCreateCoach] = useState(false);
  const [newCoachUsername, setNewCoachUsername] = useState('');
  const [newCoachPassword, setNewCoachPassword] = useState('');
  const [newCoachFullName, setNewCoachFullName] = useState('');
  const [creatingCoach, setCreatingCoach] = useState(false);

  // Announcement
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Deletion
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; type: 'student' | 'coach' } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Coach assignment
  const [assignDialogStudent, setAssignDialogStudent] = useState<StudentProfile | null>(null);
  const [assignCoachId, setAssignCoachId] = useState<string>('');

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) { toast.error('Başlık ve içerik gerekli.'); return; }
    setSendingAnnouncement(true);
    try {
      const { data: studentRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
      if (!studentRoles || studentRoles.length === 0) { toast.error('Bildirim gönderilecek öğrenci bulunamadı.'); setSendingAnnouncement(false); return; }
      const rows = studentRoles.map(r => ({ user_id: r.user_id, title: announcementTitle.trim(), message: announcementBody.trim(), type: 'announcement', icon: 'megaphone', link: null }));
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) { toast.error('Duyuru gönderilemedi: ' + error.message); }
      else { toast.success(`Duyuru ${studentRoles.length} öğrenciye gönderildi!`); setAnnouncementTitle(''); setAnnouncementBody(''); setShowAnnouncement(false); }
    } catch { toast.error('Bağlantı hatası.'); }
    setSendingAnnouncement(false);
  };

  const loadStudents = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, area, grade, username, target_university, target_department, coach_id');
    if (data) {
      // Filter out admin and coach profiles
      const coachIds = new Set(coaches.map(c => c.id));
      setStudents(data.filter((s: any) => s.id !== profileId && !coachIds.has(s.id)) as StudentProfile[]);
    }
  };

  const loadCoaches = async () => {
    const { data: coachRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'koc');
    if (!coachRoles || coachRoles.length === 0) { setCoaches([]); return; }
    const coachUserIds = coachRoles.map(r => r.user_id);
    const { data: coachProfiles } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('user_id', coachUserIds);
    if (coachProfiles) setCoaches(coachProfiles as CoachProfile[]);
  };

  const loadAll = async () => {
    await loadCoaches();
    // loadStudents depends on coaches being loaded
  };

  useEffect(() => {
    if (!loading && (!profile || role !== 'admin')) { navigate('/login'); return; }
    if (role === 'admin') loadAll();
  }, [loading, role, profile, navigate, profileId]);

  // Reload students when coaches change
  useEffect(() => {
    if (role === 'admin') loadStudents();
  }, [coaches, profileId, role]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  if (!profile || role !== 'admin') return null;

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const handleCreateStudent = async () => {
    if (!newStudentUsername.trim() || !newStudentPassword.trim()) { toast.error('Kullanıcı adı ve şifre gerekli.'); return; }
    if (newStudentPassword.length < 8) { toast.error('Şifre en az 8 karakter olmalı.'); return; }
    setCreatingStudent(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'create-student', username: newStudentUsername.trim(), password: newStudentPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Öğrenci oluşturulamadı.'); }
      else { toast.success(`Öğrenci "${newStudentUsername}" oluşturuldu!`); setNewStudentUsername(''); setNewStudentPassword(''); setShowCreateStudent(false); setTimeout(() => loadStudents(), 500); }
    } catch { toast.error('Bağlantı hatası.'); }
    setCreatingStudent(false);
  };

  const handleCreateCoach = async () => {
    if (!newCoachUsername.trim() || !newCoachPassword.trim()) { toast.error('Kullanıcı adı ve şifre gerekli.'); return; }
    if (newCoachPassword.length < 8) { toast.error('Şifre en az 8 karakter olmalı.'); return; }
    setCreatingCoach(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'create-coach', username: newCoachUsername.trim(), password: newCoachPassword, fullName: newCoachFullName.trim() || newCoachUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Koç oluşturulamadı.'); }
      else { toast.success(`Koç "${newCoachFullName || newCoachUsername}" oluşturuldu!`); setNewCoachUsername(''); setNewCoachPassword(''); setNewCoachFullName(''); setShowCreateCoach(false); setTimeout(() => loadAll(), 500); }
    } catch { toast.error('Bağlantı hatası.'); }
    setCreatingCoach(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'delete-user', profileId: userToDelete.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Kullanıcı silinemedi.'); }
      else {
        toast.success(`"${userToDelete.name}" silindi.`);
        if (selectedStudent?.id === userToDelete.id) setSelectedStudent(null);
        loadAll();
      }
    } catch { toast.error('Bağlantı hatası.'); }
    setDeleting(false);
    setUserToDelete(null);
  };

  const handleAssignCoach = async () => {
    if (!assignDialogStudent) return;
    const coachId = assignCoachId === 'none' ? null : assignCoachId;
    const { error } = await supabase.from('profiles').update({ coach_id: coachId, coach_selected: coachId ? true : false }).eq('id', assignDialogStudent.id);
    if (error) { toast.error('Koç ataması başarısız: ' + error.message); return; }
    toast.success('Koç ataması güncellendi!');
    setAssignDialogStudent(null);
    setAssignCoachId('');
    loadStudents();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) { toast.error('Yalnızca JPG, PNG veya WebP yükleyebilirsiniz.'); return; }
    const ext = file.name.split('.').pop();
    const filePath = `${session.user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error('Yükleme hatası: ' + uploadError.message); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profileId);
    toast.success('Profil fotoğrafı güncellendi!');
    await refreshProfile();
  };

  const getCoachName = (coachId: string | null) => {
    if (!coachId) return 'Atanmamış';
    const coach = coaches.find(c => c.id === coachId);
    return coach ? coach.full_name || coach.username || 'Koç' : 'Atanmamış';
  };

  const getCoachStudentCount = (coachId: string) => {
    return students.filter(s => s.coach_id === coachId).length;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold hidden sm:inline">
              Çakmak<span className="text-primary">Koçluk</span>
            </span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium hidden sm:inline">Admin</span>
            {TAB_TITLES[tab] && (
              <span className="text-muted-foreground font-display text-sm hidden sm:inline ml-1">/ {TAB_TITLES[tab]}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <YKSCountdown compact />
            <ThemeToggle />
            <NotificationBell />
            <AvatarUpload size="sm" disableUpload onClick={() => { setSelectedStudent(null); setTab('coach-edit'); }} />
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 flex-col lg:flex-row">
        <aside className="w-full lg:w-72 shrink-0 space-y-3">

          {/* Overview */}
          <button
            onClick={() => { setSelectedStudent(null); setTab('overview'); }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
              tab === 'overview' ? 'bg-primary/10 border border-primary/30' : 'glass-card hover:bg-secondary'
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground shrink-0 shadow-orange">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Genel Bakış</p>
              <p className="text-xs text-muted-foreground">Sistem istatistikleri</p>
            </div>
          </button>

          {/* Students */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Öğrenciler ({students.length})
              </h2>
              <Dialog open={showCreateStudent} onOpenChange={setShowCreateStudent}>
                <DialogTrigger asChild>
                  <button className="h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle className="font-display">Yeni Öğrenci Oluştur</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Kullanıcı Adı</Label>
                      <Input value={newStudentUsername} onChange={e => setNewStudentUsername(e.target.value)} placeholder="ogrenci123" className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Şifre</Label>
                      <Input type="password" value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} placeholder="••••••••" className="bg-secondary border-border" />
                    </div>
                    <Button onClick={handleCreateStudent} disabled={creatingStudent} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
                      {creatingStudent ? 'Oluşturuluyor...' : 'Öğrenci Oluştur'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {students.map(s => (
                <div key={s.id} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group ${selectedStudent?.id === s.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary'}`}>
                  <button onClick={() => { setSelectedStudent(s); setTab('schedule'); }} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {s.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.full_name || s.username || 'İsimsiz'}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.area ?? 'SAY'} — <span className={s.coach_id ? 'text-primary' : 'text-amber-400'}>{getCoachName(s.coach_id)}</span>
                      </p>
                    </div>
                  </button>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setAssignDialogStudent(s); setAssignCoachId(s.coach_id || 'none'); }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10"
                      title="Koç ata"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setUserToDelete({ id: s.id, name: s.full_name || s.username || 'Öğrenci', type: 'student' }); }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Öğrenciyi sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {students.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Henüz öğrenci yok.</p>}
            </div>
          </div>

          {/* Coaches */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" /> Koçlar ({coaches.length})
              </h2>
              <Dialog open={showCreateCoach} onOpenChange={setShowCreateCoach}>
                <DialogTrigger asChild>
                  <button className="h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle className="font-display">Yeni Koç Oluştur</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Ad Soyad</Label>
                      <Input value={newCoachFullName} onChange={e => setNewCoachFullName(e.target.value)} placeholder="Koç ismi" className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Kullanıcı Adı</Label>
                      <Input value={newCoachUsername} onChange={e => setNewCoachUsername(e.target.value)} placeholder="koc123" className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Şifre</Label>
                      <Input type="password" value={newCoachPassword} onChange={e => setNewCoachPassword(e.target.value)} placeholder="••••••••" className="bg-secondary border-border" />
                    </div>
                    <Button onClick={handleCreateCoach} disabled={creatingCoach} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
                      {creatingCoach ? 'Oluşturuluyor...' : 'Koç Oluştur'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {coaches.map(c => (
                <div key={c.id} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors group">
                  <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-orange">
                    {c.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.full_name || c.username}</p>
                    <p className="text-xs text-muted-foreground">{getCoachStudentCount(c.id)} öğrenci</p>
                  </div>
                  <button
                    onClick={() => setUserToDelete({ id: c.id, name: c.full_name || c.username || 'Koç', type: 'coach' })}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Koçu sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {coaches.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Henüz koç yok.</p>}
            </div>
          </div>

          {/* Sidebar buttons */}
          <button onClick={() => { setSelectedStudent(null); setTab('analytics'); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${tab === 'analytics' ? 'bg-primary/10 border border-primary/30' : 'glass-card hover:bg-secondary'}`}>
            <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground shrink-0 shadow-orange"><BarChart3 className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-sm font-medium">Analiz Merkezi</p><p className="text-xs text-muted-foreground">Isı haritası & uyarılar</p></div>
          </button>

          <button onClick={() => { setSelectedStudent(null); setTab('messages'); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${tab === 'messages' ? 'bg-primary/10 border border-primary/30' : 'glass-card hover:bg-secondary'}`}>
            <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground shrink-0 shadow-orange"><MessageCircle className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-sm font-medium">Mesajlar</p><p className="text-xs text-muted-foreground">Tüm sohbetler</p></div>
          </button>

          <button onClick={() => { setSelectedStudent(null); setTab('appointments'); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${tab === 'appointments' ? 'bg-primary/10 border border-primary/30' : 'glass-card hover:bg-secondary'}`}>
            <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground shrink-0 shadow-orange"><CalendarCheck className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-sm font-medium">Randevular</p><p className="text-xs text-muted-foreground">Görüşme talepleri</p></div>
          </button>

          <Dialog open={showAnnouncement} onOpenChange={setShowAnnouncement}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors glass-card hover:bg-secondary">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0"><Megaphone className="h-5 w-5" /></div>
                <div className="min-w-0"><p className="text-sm font-medium">Duyuru Gönder</p><p className="text-xs text-muted-foreground">Tüm öğrencilere bildirim</p></div>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Megaphone className="h-5 w-5 text-amber-400" /> Duyuru Gönder</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Başlık</Label><Input value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} placeholder="Önemli Duyuru" className="bg-secondary border-border" maxLength={100} /></div>
                <div className="space-y-2"><Label>İçerik</Label><Textarea value={announcementBody} onChange={e => setAnnouncementBody(e.target.value)} placeholder="Tüm öğrencilere iletmek istediğiniz mesajı yazın..." className="bg-secondary border-border min-h-[100px] resize-none" maxLength={500} /><p className="text-[11px] text-muted-foreground text-right">{announcementBody.length}/500</p></div>
                <Button onClick={handleSendAnnouncement} disabled={sendingAnnouncement} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-2"><Megaphone className="h-4 w-4" />{sendingAnnouncement ? 'Gönderiliyor...' : `Tüm Öğrencilere Gönder (${students.length})`}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </aside>

        <main className="flex-1 min-w-0">
          {tab === 'overview' ? (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-bold">Sistem Genel Bakış</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold text-primary">{coaches.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Aktif Koç</p>
                </div>
                <div className="glass-card rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold text-primary">{students.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Aktif Öğrenci</p>
                </div>
                <div className="glass-card rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold text-amber-400">{students.filter(s => !s.coach_id).length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Koç Atanmamış</p>
                </div>
              </div>

              {/* Coach breakdown */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-display text-lg font-semibold mb-4">Koç Bazlı Dağılım</h3>
                {coaches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz koç oluşturulmamış.</p>
                ) : (
                  <div className="space-y-3">
                    {coaches.map(c => {
                      const count = getCoachStudentCount(c.id);
                      return (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground text-sm font-bold shadow-orange">
                              {c.full_name?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm font-medium">{c.full_name || c.username}</span>
                          </div>
                          <span className="text-sm text-primary font-semibold">{count} öğrenci</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : tab === 'analytics' ? (
            <AdminAnalytics students={students} adminProfileId={profileId} />
          ) : tab === 'appointments' ? (
            <AdminAppointments />
          ) : tab === 'coach-edit' ? (
            <CoachProfileEditor adminName={profile.full_name} adminAvatarUrl={profile.avatar_url} onAvatarUpload={handleAvatarUpload} />
          ) : tab === 'messages' && profileId ? (
            <ChatView currentProfileId={profileId} currentName={profile.full_name} currentRole={role} currentUserId={session?.user?.id} />
          ) : !selectedStudent ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold mb-2">Hoş geldiniz, {profile.full_name}</h2>
              <p className="text-muted-foreground">Sol taraftan bir öğrenci seçerek programını görüntüleyin.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-1 mb-4">
                <button onClick={() => setTab('schedule')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'schedule' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  <Calendar className="h-4 w-4" /> Program
                </button>
                <button onClick={() => setTab('profile')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'profile' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  <UserIcon className="h-4 w-4" /> Profil
                </button>
              </div>
              <div className="glass-card rounded-2xl p-6">
                <h2 className="font-display text-lg font-semibold mb-4">
                  {selectedStudent.full_name || selectedStudent.username} — {tab === 'schedule' ? 'Haftalık Program' : 'Profil'}
                </h2>
                {tab === 'schedule' ? <StudyPlanner studentId={selectedStudent.id} /> : <StudentProfileForm studentId={selectedStudent.id} readOnly />}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">{userToDelete?.type === 'coach' ? 'Koçu Sil' : 'Öğrenciyi Sil'}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{userToDelete?.name}</strong> adlı {userToDelete?.type === 'coach' ? 'koçu' : 'öğrenciyi'} silmek istediğinize emin misiniz?
              {userToDelete?.type === 'coach' && ' Koça atanmış tüm öğrenciler koçsuz kalacaktır.'}
              {' '}Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Siliniyor...' : 'Evet, Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Coach assignment dialog */}
      <Dialog open={!!assignDialogStudent} onOpenChange={(open) => { if (!open) setAssignDialogStudent(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Koç Ata — {assignDialogStudent?.full_name || assignDialogStudent?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Koç Seçin</Label>
              <Select value={assignCoachId} onValueChange={setAssignCoachId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Koç seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Koç Yok (Atamasız)</SelectItem>
                  {coaches.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name || c.username} ({getCoachStudentCount(c.id)} öğrenci)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssignCoach} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
              Koç Ata
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}