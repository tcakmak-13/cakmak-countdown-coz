import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Calendar, User as UserIcon, MessageCircle, BarChart3, CalendarCheck, Megaphone, MessageCircleQuestion, FolderOpen } from 'lucide-react';
import ImageLightbox from '@/components/ImageLightbox';
import AppLogo from '@/components/AppLogo';
import ThemeToggle from '@/components/ThemeToggle';
import AvatarUpload from '@/components/AvatarUpload';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import YKSCountdown from '@/components/YKSCountdown';
import WeeklyBoardPlanner from '@/components/WeeklyBoardPlanner';
import StudentProfileForm from '@/components/StudentProfileForm';
import ChatView from '@/components/ChatView';
import AdminAnalytics from '@/components/AdminAnalytics';
import CoachAppointments from '@/components/CoachAppointments';
import CoachProfileEditor from '@/components/CoachProfileEditor';
import QuestionFlow from '@/components/QuestionFlow';
import ResourceUpload from '@/components/ResourceUpload';
import ResourceList from '@/components/ResourceList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface StudentProfile {
  id: string;
  full_name: string;
  area: string | null;
  grade: string | null;
  username: string | null;
  target_university: string | null;
  target_department: string | null;
  avatar_url: string | null;
}

export default function CoachDashboard() {
  const navigate = useNavigate();
  const { profile, role, loading, signOut, profileId, session, refreshProfile } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [tab, setTab] = useState<'analytics' | 'list' | 'schedule' | 'profile' | 'messages' | 'coach-edit' | 'appointments' | 'soru-akisi' | 'resources'>('analytics');
  const [resourceRefresh, setResourceRefresh] = useState(0);
  const unreadCount = useUnreadMessages(profileId);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Announcement
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      toast.error('Başlık ve içerik gerekli.');
      return;
    }
    setSendingAnnouncement(true);
    try {
      const { data: assignedProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('coach_id', profileId);
      if (!assignedProfiles || assignedProfiles.length === 0) {
        toast.error('Bildirim gönderilecek öğrenci bulunamadı.');
        setSendingAnnouncement(false);
        return;
      }
      const rows = assignedProfiles.map(r => ({
        user_id: r.user_id,
        title: announcementTitle.trim(),
        message: announcementBody.trim(),
        type: 'announcement',
        icon: 'megaphone',
        link: null,
      }));
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) {
        console.error('Duyuru gönderme hatası:', error);
        toast.error('Duyuru gönderilemedi. Lütfen tekrar deneyin.');
      } else {
        toast.success(`Duyuru ${assignedProfiles.length} öğrenciye gönderildi!`);
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
    if (!profileId) return;
    supabase
      .from('profiles')
      .select('id, full_name, area, grade, username, target_university, target_department, avatar_url')
      .eq('coach_id', profileId)
      .then(({ data }) => {
        if (data) setStudents(data as StudentProfile[]);
      });
  };

  const [coachInfoReady, setCoachInfoReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && (!profile || role !== 'koc')) { navigate('/login'); return; }
    if (role === 'koc' && profileId) {
      loadStudents();
      supabase.from('coach_info').select('id').eq('id', profileId).maybeSingle().then(({ data }) => {
        if (!data) {
          navigate('/coach-onboarding');
        } else {
          setCoachInfoReady(true);
        }
      });
    }
  }, [loading, role, profile, navigate, profileId]);

  if (loading || coachInfoReady === null) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  if (!profile || role !== 'koc') return null;

  const handleLogout = async () => { await signOut(); navigate('/'); };

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
    if (uploadError) { console.error('Avatar yükleme hatası:', uploadError); toast.error('Fotoğraf yüklenemedi. Lütfen tekrar deneyin.'); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profileId);
    toast.success('Profil fotoğrafı güncellendi!');
    await refreshProfile();
  };

  // Bottom nav active tab (map sub-tabs to main nav)
  const activeNav = (tab === 'schedule' || tab === 'profile') ? 'list' : tab;

  return (
    <><div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur-md pt-safe">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => { setSelectedStudent(null); setTab('analytics'); }} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <AppLogo size="sm" />
            <span className="font-display text-lg font-bold hidden sm:inline">
              Çakmak<span className="text-primary">Koçluk</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <YKSCountdown compact />
            <ThemeToggle />
            <NotificationBell />
            {/* Announcement trigger */}
            <Dialog open={showAnnouncement} onOpenChange={setShowAnnouncement}>
              <DialogTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-secondary text-amber-400 hover:text-amber-300 transition-colors" title="Duyuru Gönder">
                  <Megaphone className="h-5 w-5" />
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
                    <Input value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} placeholder="Önemli Duyuru" className="bg-secondary border-border" maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label>İçerik</Label>
                    <Textarea value={announcementBody} onChange={e => setAnnouncementBody(e.target.value)} placeholder="Öğrencilerinize iletmek istediğiniz mesajı yazın..." className="bg-secondary border-border min-h-[100px] resize-none" maxLength={500} />
                    <p className="text-[11px] text-muted-foreground text-right">{announcementBody.length}/500</p>
                  </div>
                  <Button onClick={handleSendAnnouncement} disabled={sendingAnnouncement} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-2">
                    <Megaphone className="h-4 w-4" />
                    {sendingAnnouncement ? 'Gönderiliyor...' : `Öğrencilerime Gönder (${students.length})`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main content - full width */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'analytics' ? (
          <AdminAnalytics students={students} adminProfileId={profileId} />
        ) : tab === 'resources' ? (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" /> Kaynak Yönetimi
            </h2>
            <ResourceUpload coachId={profileId!} onUploadSuccess={() => setResourceRefresh(prev => prev + 1)} />
            <div>
              <h3 className="font-display text-lg font-semibold mb-4">Yüklenen Kaynaklar</h3>
              <ResourceList isCoach={true} coachId={profileId!} refreshTrigger={resourceRefresh} />
            </div>
          </div>
        ) : tab === 'appointments' && profileId ? (
          <CoachAppointments coachProfileId={profileId} />
        ) : tab === 'soru-akisi' && profileId ? (
          <QuestionFlow currentProfileId={profileId} currentName={profile.full_name} currentRole={role} />
        ) : tab === 'coach-edit' ? (
          <div className="space-y-6 pb-24">
            <CoachProfileEditor adminName={profile.full_name} adminAvatarUrl={profile.avatar_url} onAvatarUpload={handleAvatarUpload} coachProfileId={profileId} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2">
                  <LogOut className="h-4 w-4" />
                  Çıkış Yap
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Çıkış yapmak istediğinize emin misiniz?</AlertDialogTitle>
                  <AlertDialogDescription>Oturumunuz sonlandırılacak ve giriş sayfasına yönlendirileceksiniz.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>Evet, Çıkış Yap</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : tab === 'messages' && profileId ? (
          <ChatView currentProfileId={profileId} currentName={profile.full_name} currentRole={role} currentUserId={session?.user?.id} />
        ) : tab === 'list' && !selectedStudent ? (
          /* Student list as main content */
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Öğrencilerim ({students.length})
            </h2>
            {students.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Henüz atanmış öğrenci yok.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStudent(s); setTab('schedule'); }}
                    className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:bg-primary/5 transition-colors text-left"
                  >
                    {s.avatar_url ? (
                      <img
                        src={s.avatar_url}
                        alt={s.full_name}
                        className="h-12 w-12 rounded-full object-cover shrink-0 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all"
                        onClick={(e) => { e.stopPropagation(); setLightboxSrc(s.avatar_url); }}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                        {s.full_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.full_name || s.username || 'İsimsiz'}</p>
                      <p className="text-xs text-muted-foreground">{s.username ? `@${s.username}` : ''} — {s.area ?? 'SAY'} — {s.grade ?? '12. Sınıf'}</p>
                      {s.target_university && (
                        <p className="text-[11px] text-primary/80 truncate mt-0.5">🎯 {s.target_university}{s.target_department ? ` / ${s.target_department}` : ''}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : selectedStudent ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => { setSelectedStudent(null); setTab('list'); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Öğrenciler
              </button>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-sm">{selectedStudent.full_name || selectedStudent.username}</span>
            </div>
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
                <WeeklyBoardPlanner studentId={selectedStudent.id} />
              ) : (
                <StudentProfileForm studentId={selectedStudent.id} readOnly />
              )}
            </div>
          </>
        ) : (
          <div className="glass-card rounded-2xl p-10 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">Hoş geldiniz, {profile.full_name}</h2>
            <p className="text-muted-foreground">Alt menüden bir bölüm seçin.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border pb-safe">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto scrollbar-hide h-14 sm:h-16">
          {[
            { key: 'analytics', icon: BarChart3, label: 'Analiz' },
            { key: 'appointments', icon: CalendarCheck, label: 'Randevu' },
            { key: 'resources', icon: FolderOpen, label: 'Kaynak' },
            { key: 'soru-akisi', icon: MessageCircleQuestion, label: 'Sorular' },
            { key: 'list', icon: Users, label: 'Öğrenci' },
            { key: 'messages', icon: MessageCircle, label: 'Mesaj', badge: unreadCount },
            { key: 'coach-edit', icon: UserIcon, label: 'Profilim' },
          ].map(item => {
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setSelectedStudent(null); setTab(item.key as any); }}
                className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-w-[56px] flex-1 min-h-[48px] transition-colors relative px-1"
              >
                <div className="relative">
                  <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {item.badge && item.badge > 0 && activeNav !== 'messages' && (
                    <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-[#FF5A01] text-white text-[9px] font-bold flex items-center justify-center shadow-lg">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] sm:text-[10px] font-medium transition-colors whitespace-nowrap ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
      <ImageLightbox src={lightboxSrc} alt="Profil Fotoğrafı" onClose={() => setLightboxSrc(null)} />
    </>
  );
}
