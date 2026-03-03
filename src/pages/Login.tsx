import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, GraduationCap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setStoredUser, ADMIN_USER, getStudents } from '@/lib/mockData';
import type { User } from '@/lib/types';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'admin' | 'student' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'admin') {
      // Mock admin login
      if (email === 'admin@cakmak.com' && password === 'admin123') {
        setStoredUser(ADMIN_USER);
        navigate('/admin');
      } else {
        setError('E-posta: admin@cakmak.com / Şifre: admin123');
      }
    } else {
      // Mock student login - match by email
      const students = getStudents();
      const student = students.find(s => s.email === email);
      if (student) {
        const user: User = { id: student.id, role: 'student', name: student.fullName };
        setStoredUser(user);
        navigate('/student');
      } else {
        setError('Öğrenci bulunamadı. Deneyin: elif@example.com');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <Flame className="h-8 w-8 text-primary" />
          <span className="font-display text-2xl font-bold">
            Çakmak<span className="text-primary">Koçluk</span>
          </span>
        </div>

        {!role ? (
          <div className="space-y-4">
            <h2 className="text-center text-2xl font-display font-bold mb-6">Giriş Yap</h2>
            <button
              onClick={() => setRole('student')}
              className="w-full glass-card rounded-xl p-6 flex items-center gap-4 hover:border-primary/40 transition-all group"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-display font-semibold text-foreground">Öğrenci Girişi</h3>
                <p className="text-sm text-muted-foreground">Program ve profil yönetimi</p>
              </div>
            </button>
            <button
              onClick={() => setRole('admin')}
              className="w-full glass-card rounded-xl p-6 flex items-center gap-4 hover:border-primary/40 transition-all group"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-display font-semibold text-foreground">Admin Girişi</h3>
                <p className="text-sm text-muted-foreground">Öğrenci ve program yönetimi</p>
              </div>
            </button>
          </div>
        ) : (
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleLogin}
            className="glass-card rounded-xl p-6 space-y-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => { setRole(null); setError(''); }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ← Geri
              </button>
            </div>
            <h2 className="font-display text-xl font-bold">
              {role === 'admin' ? 'Admin Girişi' : 'Öğrenci Girişi'}
            </h2>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={role === 'admin' ? 'admin@cakmak.com' : 'elif@example.com'}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary border-border"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
            )}
            <Button type="submit" className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
              Giriş Yap
            </Button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
