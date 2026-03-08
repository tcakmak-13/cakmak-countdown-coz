import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, LogOut, Users, Calendar, User as UserIcon, Plus, X, MessageCircle, Camera, BarChart3, Settings, Megaphone, CalendarCheck, Trash2 } from 'lucide-react';
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
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, role, loading, signOut, profileId, session, refreshProfile } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [tab, setTab] = useState<'list' | 'schedule' | 'profile' | 'messages' | 'analytics' | 'coach-edit' | 'appointments'>('analytics');

  const TAB_TITLES: Record<string, string> = {
    analytics: 'Analiz Merkezi',
    list: 'Öğrenciler',
    schedule: selectedStudent ? selectedStudent.full_name || 'Program' : 'Program',
    profile: selectedStudent ? selectedStudent.full_name || 'Profil' : 'Profil',
    messages: 'Mesajlar',
    'coach-edit': 'Koç Profilim',
    appointments: 'Randevular',
  };

  // Student creation
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Announcement
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Student deletion
  const [studentToDelete, setStudentToDelete] = useState<StudentProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      toast.error('Başlık ve içerik gerekli.');
      return;
    }
    setSendingAnnouncement(true);
    try {
      // Get all student user_ids
      const { data: studentRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
      if (!studentRoles || studentRoles.length === 0) {
        toast.error('Bildirim gönderilecek öğrenci bulunamadı.');
        setSendingAnnouncement(false);
        return;
      }
      const rows = studentRoles.map(r => ({
        user_id: r.user_id,
        title: announcementTitle.trim(),
        message: announcementBody.trim(),
        type: 'announcement',
        icon: 'megaphone',
        link: null,
      }));
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) {
        toast.error('Duyuru gönderilemedi: ' + error.message);
      } else {
        toast.success(`Duyuru ${studentRoles.length} öğrenciye gönderildi!`);
        setAnnouncementTitle('');
        setAnnouncementBody('');
        setShowAnnouncement(false);
      }
    } catch {
      toast.error('Bağlantı hatası.');
    }
    setSendingAnnouncement(false);
  };

  const loadStudents = () => {
    supabase.from('profiles').select('id, full_name, area, grade, username, target_university, target_department').then(({ data }) => {
      if (data) {
        setStudents(data.filter((s: any) => s.id !== profileId) as StudentProfile[]);
      }
    });
  };

  useEffect(() => {
    if (!loading && (!profile || role !== 'admin')) { navigate('/login'); return; }
    if (role === 'admin') loadStudents();
  }, [loading, role, profile, navigate, profileId]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  if (!profile || role !== 'admin') return null;

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const handleCreateStudent = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error('Kullanıcı adı ve şifre gerekli.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'create-student', username: newUsername.trim(), password: newPassword }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Öğrenci oluşturulamadı.');
      } else {
        toast.success(`Öğrenci "${newUsername}" oluşturuldu!`);
        setNewUsername('');
        setNewPassword('');
        setShowCreate(false);
        setTimeout(loadStudents, 500);
      }
    } catch {
      toast.error('Bağlantı hatası.');
    }
    setCreating(false);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'delete-student', profileId: studentToDelete.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Öğrenci silinemedi.');
      } else {
        toast.success(`"${studentToDelete.full_name || studentToDelete.username}" silindi.`);
        if (selectedStudent?.id === studentToDelete.id) setSelectedStudent(null);
        loadStudents();
      }
    } catch {
      toast.error('Bağlantı hatası.');
    }
    setDeleting(false);
    setStudentToDelete(null);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      toast.error('Yalnızca JPG, PNG veya WebP yükleyebilirsiniz.');
      return;
    }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold hidden sm:inline">
              Çakmak<span className="text-primary">Koçluk</span>
            </span>
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

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6 flex-col lg:flex-row">
        <aside className="w-full lg:w-72 shrink-0">
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Öğrenciler ({students.length})
              </h2>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <button className="h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display">Yeni Öğrenci Oluştur</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Kullanıcı Adı</Label>
                      <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="ogrenci123" className="bg-secondary border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label>Şifre</Label>
                      <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-secondary border-border" />
                    </div>
                    <Button onClick={handleCreateStudent} disabled={creating} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
                      {creating ? 'Oluşturuluyor...' : 'Öğrenci Oluştur'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {students.map(s => (
                <div
                  key={s.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group ${
                    selectedStudent?.id === s.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary'
                  }`}
                >
                  <button
                    onClick={() => { setSelectedStudent(s); setTab('schedule'); }}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {s.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.full_name || s.username || 'İsimsiz'}</p>
                      <p className="text-xs text-muted-foreground">{s.username ? `@${s.username}` : ''} — {s.area ?? 'SAY'} — {s.grade ?? '12. Sınıf'}</p>
                      {s.target_university && (
                        <p className="text-[11px] text-primary/80 truncate mt-0.5">🎯 {s.target_university}{s.target_department ? ` / ${s.target_department}` : ''}</p>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setStudentToDelete(s); }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Öğrenciyi sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {students.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz öğrenci yok.</p>
              )}
            </div>
          </div>

          {/* Analytics button */}
          <button
            onClick={() => { setSelectedStudent(null); setTab('analytics'); }}
            className={`w-full mt-3 flex items-center gap-3 p-3 rounded-xl transition-colors ${
              tab === 'analytics' ? 'bg-primary/10 border border-primary/30' : 'glass-card hover:bg-secondary'
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground shrink-0 shadow-orange">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Analiz Merkezi</p>
              <p className="text-xs text-muted-foreground">Isı haritası & uyarılar</p>
            </div>
          </button>

          {/* Coach Edit button */}
          <button
            onClick={() => { setSelectedStudent(null); setTab('coach-edit'); }}
            className={`w-full mt-2 flex items-center gap-3 p-3 rounded-xl transition-colors ${
              tab === 'coach-edit' ? 'bg-primary/10 border border-primary/30' : 'glass-card hover:bg-secondary'
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground shrink-0 shadow-orange">
              <Settings className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Koç Profilim</p>
              <p className="text-xs text-muted-foreground">Önizle & düzenle</p>
            </div>
          </button>

          {/* Messages button */}
          <button
            onClick={() => { setSelectedStudent(null); setTab('messages'); }}
            className={`w-full mt-2 flex items-center gap-3 p-3 rounded-xl transition-colors ${
              tab === 'messages' ? 'bg-primary/10 border border-primary/30' : 'glass-card hover:bg-secondary'
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground shrink-0 shadow-orange">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Mesajlar</p>
              <p className="text-xs text-muted-foreground">Öğrenci sohbetleri</p>
            </div>
          </button>

          {/* Appointments button */}
          <button
            onClick={() => { setSelectedStudent(null); setTab('appointments'); }}
            className={`w-full mt-2 flex items-center gap-3 p-3 rounded-xl transition-colors ${
              tab === 'appointments' ? 'bg-primary/10 border border-primary/30' : 'glass-card hover:bg-secondary'
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground shrink-0 shadow-orange">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Randevular</p>
              <p className="text-xs text-muted-foreground">Görüşme talepleri</p>
            </div>
          </button>


          <Dialog open={showAnnouncement} onOpenChange={setShowAnnouncement}>
            <DialogTrigger asChild>
              <button className="w-full mt-2 flex items-center gap-3 p-3 rounded-xl transition-colors glass-card hover:bg-secondary">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Duyuru Gönder</p>
                  <p className="text-xs text-muted-foreground">Tüm öğrencilere bildirim</p>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-amber-400" /> Duyuru Gönder
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Başlık</Label>
                  <Input
                    value={announcementTitle}
                    onChange={e => setAnnouncementTitle(e.target.value)}
                    placeholder="Önemli Duyuru"
                    className="bg-secondary border-border"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>İçerik</Label>
                  <Textarea
                    value={announcementBody}
                    onChange={e => setAnnouncementBody(e.target.value)}
                    placeholder="Tüm öğrencilere iletmek istediğiniz mesajı yazın..."
                    className="bg-secondary border-border min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">{announcementBody.length}/500</p>
                </div>
                <Button
                  onClick={handleSendAnnouncement}
                  disabled={sendingAnnouncement}
                  className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-2"
                >
                  <Megaphone className="h-4 w-4" />
                  {sendingAnnouncement ? 'Gönderiliyor...' : `Tüm Öğrencilere Gönder (${students.length})`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </aside>

        <main className="flex-1 min-w-0">
          {tab === 'analytics' ? (
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
                <button
                  onClick={() => setTab('schedule')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === 'schedule' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calendar className="h-4 w-4" /> Program
                </button>
                <button
                  onClick={() => setTab('profile')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === 'profile' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UserIcon className="h-4 w-4" /> Profil
                </button>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h2 className="font-display text-lg font-semibold mb-4">
                  {selectedStudent.full_name || selectedStudent.username} — {tab === 'schedule' ? 'Haftalık Program' : 'Profil'}
                </h2>
                {tab === 'schedule' ? (
                  <StudyPlanner studentId={selectedStudent.id} />
                ) : (
                  <StudentProfileForm studentId={selectedStudent.id} readOnly />
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => { if (!open) setStudentToDelete(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Öğrenciyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{studentToDelete?.full_name || studentToDelete?.username}</strong> adlı öğrenciyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve öğrencinin tüm verileri (denemeler, mesajlar, randevular, program) kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Siliniyor...' : 'Evet, Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
