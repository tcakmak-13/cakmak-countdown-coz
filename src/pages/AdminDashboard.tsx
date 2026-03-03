import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, LogOut, Users, Calendar, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import YKSCountdown from '@/components/YKSCountdown';
import StudyPlanner from '@/components/StudyPlanner';
import StudentProfileForm from '@/components/StudentProfileForm';
import ChatBubble from '@/components/ChatBubble';

interface StudentProfile {
  id: string;
  full_name: string;
  area: string | null;
  grade: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, role, loading, signOut, profileId } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [tab, setTab] = useState<'list' | 'schedule' | 'profile'>('list');

  useEffect(() => {
    if (!loading && (!profile || role !== 'admin')) { navigate('/login'); return; }
    if (role === 'admin') {
      supabase.from('profiles').select('id, full_name, area, grade').then(({ data }) => {
        if (data) {
          // Exclude admin's own profile from the student list
          setStudents(data.filter(s => s.id !== profileId));
        }
      });
    }
  }, [loading, role, profile, navigate, profileId]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  if (!profile || role !== 'admin') return null;

  const handleLogout = async () => { await signOut(); navigate('/'); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold hidden sm:inline">
              Çakmak<span className="text-primary">Koçluk</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium ml-2">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <YKSCountdown compact />
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6 flex-col lg:flex-row">
        <aside className="w-full lg:w-72 shrink-0">
          <div className="glass-card rounded-2xl p-4">
            <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" /> Öğrenciler ({students.length})
            </h2>
            <div className="space-y-2">
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedStudent(s); setTab('schedule'); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                    selectedStudent?.id === s.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary'
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {s.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.area ?? 'SAY'} — {s.grade ?? '12. Sınıf'}</p>
                  </div>
                </button>
              ))}
              {students.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Henüz öğrenci yok.</p>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {!selectedStudent ? (
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
                  {selectedStudent.full_name} — {tab === 'schedule' ? 'Haftalık Program' : 'Profil'}
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

      {profileId && <ChatBubble currentProfileId={profileId} currentName={profile.full_name} currentRole={role} />}
    </div>
  );
}
