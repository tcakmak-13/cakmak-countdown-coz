import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, LogOut, User as UserIcon, Calendar, BookOpen } from 'lucide-react';
import { getStoredUser, setStoredUser } from '@/lib/mockData';
import { User } from '@/lib/types';
import YKSCountdown from '@/components/YKSCountdown';
import StudyPlanner from '@/components/StudyPlanner';
import StudentProfileForm from '@/components/StudentProfileForm';
import ChatBubble from '@/components/ChatBubble';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<'countdown' | 'schedule' | 'profile'>('countdown');

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== 'student') { navigate('/login'); return; }
    setUser(u);
  }, [navigate]);

  if (!user) return null;

  const handleLogout = () => { setStoredUser(null); navigate('/'); };

  const tabs = [
    { key: 'countdown' as const, label: 'Geri Sayım', icon: BookOpen },
    { key: 'schedule' as const, label: 'Program', icon: Calendar },
    { key: 'profile' as const, label: 'Profil', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
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
            <span className="text-sm text-muted-foreground hidden sm:inline">Merhaba, {user.name}</span>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <div className="border-b border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'countdown' && (
          <div className="space-y-8">
            <div className="glass-card rounded-2xl p-6 sm:p-10 shadow-orange text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">YKS'ye Kalan Süre</p>
              <YKSCountdown />
              <p className="text-xs text-muted-foreground mt-4">20 Haziran 2026 — 10:15</p>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold mb-1">Motivasyon</h2>
              <p className="text-muted-foreground text-sm">
                "Başarı, her gün tekrarlanan küçük çabaların toplamıdır." — Robert Collier
              </p>
            </div>
          </div>
        )}
        {tab === 'schedule' && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Haftalık Programım</h2>
            <StudyPlanner studentId={user.id} />
          </div>
        )}
        {tab === 'profile' && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Profilim</h2>
            <StudentProfileForm studentId={user.id} />
          </div>
        )}
      </main>

      <ChatBubble currentUser={user} />
    </div>
  );
}
