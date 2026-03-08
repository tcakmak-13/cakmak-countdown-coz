import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, LogOut, BarChart3, LayoutDashboard, User as UserIcon, MessageCircle, CalendarIcon, ScrollText } from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';
import NotificationBell from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
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

type Tab = 'denemelerim' | 'hata-kumbarasi' | 'ana-menu' | 'randevular' | 'mesajlar' | 'profilim';

const TAB_TITLES: Record<Tab, string> = {
  'denemelerim': 'Denemelerim',
  'hata-kumbarasi': 'Hatalarım',
  'ana-menu': '',
  'randevular': 'Randevular',
  'mesajlar': 'Mesajlar',
  'profilim': 'Profilim',
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
            <Flame className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold hidden sm:inline">
              Çakmak<span className="text-primary">Koçluk</span>
            </span>
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
            <AvatarUpload size="sm" />
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
                    className="w-full glass-card rounded-2xl p-5 flex items-center gap-4 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-orange flex items-center justify-center shadow-orange shrink-0">
                      <CalendarIcon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-display font-semibold">Randevu Al</p>
                      <p className="text-xs text-muted-foreground">Koçunla görüşme planla</p>
                    </div>
                  </button>
                )}
                <MotivationQuote />
              </div>
            </motion.div>
          )}

          {tab === 'randevular' && profileId && (
            <motion.div key="randevular" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <AppointmentBooking studentId={profileId} />
            </motion.div>
          )}

          {tab === 'hata-kumbarasi' && profileId && (
            <motion.div key="hata-kumbarasi" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <HataKumbarasi studentId={profileId} />
            </motion.div>
          )}

          {tab === 'mesajlar' && profileId && (
            <motion.div key="mesajlar" variants={tabVariants} initial="initial" animate="animate" exit="exit">
              <ChatView currentProfileId={profileId} currentName={profile.full_name} currentRole={role} currentUserId={user?.id} />
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
                tab === t.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className={`h-5 w-5 ${tab === t.key ? 'drop-shadow-[0_0_8px_hsl(25,95%,53%)]' : ''}`} />
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
