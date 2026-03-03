import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, LogOut, Users, Calendar, User as UserIcon } from 'lucide-react';
import { getStoredUser, setStoredUser, getStudents } from '@/lib/mockData';
import { User, Student } from '@/lib/types';
import YKSCountdown from '@/components/YKSCountdown';
import StudyPlanner from '@/components/StudyPlanner';
import StudentProfileForm from '@/components/StudentProfileForm';
import ChatBubble from '@/components/ChatBubble';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [tab, setTab] = useState<'list' | 'schedule' | 'profile'>('list');

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== 'admin') { navigate('/login'); return; }
    setUser(u);
    setStudents(getStudents());
  }, [navigate]);

  if (!user) return null;

  const handleLogout = () => { setStoredUser(null); navigate('/'); };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Student list sidebar */}
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
                    {s.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground">{s.area} — {s.grade}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {!selectedStudent ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold mb-2">Hoş geldiniz, Koç Çakmak</h2>
              <p className="text-muted-foreground">Sol taraftan bir öğrenci seçerek programını görüntüleyin.</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
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
                  {selectedStudent.fullName} — {tab === 'schedule' ? 'Haftalık Program' : 'Profil'}
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

      <ChatBubble currentUser={user} />
    </div>
  );
}
