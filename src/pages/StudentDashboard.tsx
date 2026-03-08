import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, LogOut, BarChart3, LayoutDashboard, User as UserIcon, MessageCircle, CalendarIcon, ScrollText, Plus, ArrowLeft } from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';
import NotificationBell from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import YKSCountdown from '@/components/YKSCountdown';
import StudyPlanner from '@/components/StudyPlanner';
import StudentProfileForm from '@/components/StudentProfileForm';
import ChatView from '@/components/ChatView';
import Denemelerim from '@/components/Denemelerim';
import MotivationQuote from '@/components/MotivationQuote';
import AppointmentBooking from '@/components/AppointmentBooking';
import HataKumbarasi from '@/components/HataKumbarasi';
import WeeklyStudyStats from '@/components/WeeklyStudyStats';
import ThemeToggle from '@/components/ThemeToggle';
import QuestionFlow from '@/components/QuestionFlow';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

type Tab = 'denemelerim' | 'hata-kumbarasi' | 'ana-menu' | 'randevular' | 'mesajlar' | 'profilim' | 'soru-meclisi';

const TAB_TITLES: Record<Tab, string> = {
  'denemelerim': 'Denemelerim',
  'hata-kumbarasi': 'Hatalarım',
  'ana-menu': '',
  'randevular': 'Randevular',
  'mesajlar': 'Mesajlar',
  'profilim': 'Profilim',
  'soru-meclisi': 'Soru Meclisi',
};

const tabVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { profile, role, loading, signOut, profileId, user } = useAuth();
  const [tab, setTab] = useState<Tab>('ana-menu');
  const [studentArea, setStudentArea] = useState<string>('SAY');
  const unreadCount = useUnreadMessages(profileId);
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [hasUsername, setHasUsername] = useState<boolean>(!!profile?.username);

  useEffect(() => {
    setHasUsername(!!profile?.username);
  }, [profile?.username]);

  const handleTabChange = (newTab: Tab) => {
    if (newTab === 'soru-meclisi' && !hasUsername) {
      setUsernameInput('');
      setUsernameError('');
      setUsernameModalOpen(true);
      return;
    }
    setTab(newTab);
  };

  const handleUsernameSave = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed || trimmed.length < 3) {
      setUsernameError('Takma ad en az 3 karakter olmalıdır.');
      return;
    }
    if (trimmed.length > 20) {
      setUsernameError('Takma ad en fazla 20 karakter olabilir.');
      return;
    }
    setUsernameSaving(true);
    setUsernameError('');

    // Check uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmed)
      .neq('id', profileId!)
      .limit(1);

    if (existing && existing.length > 0) {
      setUsernameError('Bu takma ad zaten alınmış. Başka bir tane deneyin.');
      setUsernameSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', profileId!);

    if (error) {
      setUsernameError(error.message.includes('unique') ? 'Bu takma ad zaten alınmış.' : 'Bir hata oluştu, tekrar deneyin.');
      setUsernameSaving(false);
      return;
    }

    setHasUsername(true);
    setUsernameModalOpen(false);
    setUsernameSaving(false);
    setTab('soru-meclisi');
  };

  // Sync area from profile and listen for realtime changes
  useEffect(() => {
    if (profile?.area) setStudentArea(profile.area);
  }, [profile?.area]);

  // Subscribe to profile changes for dynamic area sync
  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel('profile-area-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profileId}`,
      }, (payload) => {
        const newArea = (payload.new as any)?.area;
        if (newArea) setStudentArea(newArea);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'denemelerim', label: 'Denemelerim', icon: BarChart3 },
    { key: 'hata-kumbarasi', label: 'Hatalarım', icon: ScrollText },
    { key: 'ana-menu', label: 'Ana Menü', icon: LayoutDashboard },
    { key: 'mesajlar', label: 'Mesajlar', icon: MessageCircle },
    { key: 'profilim', label: 'Profilim', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('ana-menu')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Flame className="h-6 w-6 text-primary" />
              <span className="font-display text-lg font-bold hidden sm:inline">
                Çakmak<span className="text-primary">Koçluk</span>
              </span>
            </button>
            {TAB_TITLES[tab] && (
              <span className="text-muted-foreground font-display text-sm hidden sm:inline ml-1">/ {TAB_TITLES[tab]}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tab === 'denemelerim' && profileId && (
              <Button onClick={() => { /* trigger add from header */ document.getElementById('deneme-add-btn')?.click(); }} size="icon" className="rounded-full bg-gradient-orange border-0 hover:opacity-90 shadow-orange h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <ThemeToggle />
            <NotificationBell />
            <AvatarUpload size="sm" disableUpload onClick={() => setTab('profilim')} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {tab === 'denemelerim' && profileId && (
            <motion.div key="denemelerim" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <Denemelerim studentId={profileId} studentArea={studentArea} />
            </motion.div>
          )}

          {tab === 'ana-menu' && (
            <motion.div key="ana-menu" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="space-y-8">
                <div className="glass-card rounded-2xl p-6 sm:p-10 shadow-orange text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">YKS'ye Kalan Süre</p>
                  <YKSCountdown />
                  <p className="text-xs text-muted-foreground mt-4">20 Haziran 2026 — 10:15</p>
                </div>
                {profileId && (
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="font-display text-lg font-semibold mb-4">Haftalık Programım</h2>
                    <StudyPlanner studentId={profileId} />
                  </div>
                )}
                {profileId && (
                  <div className="glass-card rounded-2xl p-6">
                    <h2 className="font-display text-lg font-semibold mb-4">📊 Haftalık Çalışma İstatistikleri</h2>
                    <WeeklyStudyStats studentId={profileId} />
                  </div>
                )}
                {profileId && (
                  <button
                    onClick={() => setTab('randevular' as Tab)}
                    className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:bg-secondary/50 transition-colors w-full"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-orange flex items-center justify-center shadow-orange shrink-0">
                      <CalendarIcon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="font-display font-semibold text-sm">Randevu Al</p>
                      <p className="text-[11px] text-muted-foreground">Koçunla görüşme planla</p>
                    </div>
                  </button>
                )}
                <MotivationQuote />
              </div>
            </motion.div>
          )}

          {tab === 'randevular' && profileId && (
            <motion.div key="randevular" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <AppointmentBooking studentId={profileId} coachId={profile?.coach_id} />
            </motion.div>
          )}

          {tab === 'hata-kumbarasi' && profileId && (
            <motion.div key="hata-kumbarasi" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <HataKumbarasi studentId={profileId} currentProfileId={profileId} currentName={profile.full_name} currentRole={role} onOpenSoruMeclisi={() => handleTabChange('soru-meclisi')} />
            </motion.div>
          )}

          {tab === 'soru-meclisi' && profileId && (
            <motion.div key="soru-meclisi" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setTab('hata-kumbarasi')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Geri</span>
                </button>
                <h1 className="font-display font-bold text-lg text-foreground">Soru Meclisi</h1>
              </div>
              <QuestionFlow currentProfileId={profileId} currentName={profile.full_name} currentRole={role} />
            </motion.div>
          )}

          {tab === 'mesajlar' && profileId && (
            <motion.div key="mesajlar" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <ChatView currentProfileId={profileId} currentName={profile.full_name} currentRole={role} currentUserId={user?.id} coachId={profile?.coach_id} />
            </motion.div>
          )}

          {tab === 'profilim' && profileId && (
            <motion.div key="profilim" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <div className="space-y-6 pb-24">
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="font-display text-lg font-semibold mb-4">Profilim</h2>
                  <div className="flex items-center gap-4 mb-6">
                    <AvatarUpload size="lg" />
                    <div>
                      <p className="font-display font-bold text-lg">{profile.full_name}</p>
                      <p className="text-xs text-muted-foreground">Fotoğrafı değiştirmek için tıklayın</p>
                    </div>
                  </div>
                  <StudentProfileForm studentId={profileId} onAreaChange={setStudentArea} />
                </div>
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-primary/20 bg-card/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                (tab === t.key || (t.key === 'hata-kumbarasi' && tab === 'soru-meclisi')) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <t.icon className={`h-5 w-5 ${(tab === t.key || (t.key === 'hata-kumbarasi' && tab === 'soru-meclisi')) ? 'drop-shadow-[0_0_8px_hsl(25,95%,53%)]' : ''}`} />
                {t.key === 'mesajlar' && unreadCount > 0 && tab !== 'mesajlar' && (
                  <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center shadow-orange">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
