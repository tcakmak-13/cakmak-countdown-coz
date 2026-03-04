import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, LogOut, BarChart3, LayoutDashboard, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import YKSCountdown from '@/components/YKSCountdown';
import StudyPlanner from '@/components/StudyPlanner';
import StudentProfileForm from '@/components/StudentProfileForm';
import ChatBubble from '@/components/ChatBubble';
import Denemelerim from '@/components/Denemelerim';
import CoachInfo from '@/components/CoachInfo';

type Tab = 'denemelerim' | 'ana-menu' | 'profilim';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { profile, role, loading, signOut, profileId } = useAuth();
  const [tab, setTab] = useState<Tab>('ana-menu');

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  if (!profile || role !== 'student') { navigate('/login'); return null; }
  if (!profile.profile_completed) { navigate('/onboarding'); return null; }

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'denemelerim', label: 'Denemelerim', icon: BarChart3 },
    { key: 'ana-menu', label: 'Ana Menü', icon: LayoutDashboard },
    { key: 'profilim', label: 'Profilim', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold hidden sm:inline">
              Çakmak<span className="text-primary">Koçluk</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">Merhaba, {profile.full_name}</span>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'denemelerim' && profileId && <Denemelerim studentId={profileId} studentArea={profile.area ?? 'SAY'} />}

        {tab === 'ana-menu' && (
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
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold mb-1">Motivasyon</h2>
              <p className="text-muted-foreground text-sm">
                "Başarı, her gün tekrarlanan küçük çabaların toplamıdır." — Robert Collier
              </p>
            </div>
          </div>
        )}

        {tab === 'profilim' && profileId && (
          <div className="space-y-6 pb-24">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold mb-4">Profilim</h2>
              <StudentProfileForm studentId={profileId} />
            </div>
            <CoachInfo />
          </div>
        )}
      </main>

      {/* Bottom Nav */}
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

      {profileId && <ChatBubble currentProfileId={profileId} currentName={profile.full_name} currentRole={role} />}
    </div>
  );
}
