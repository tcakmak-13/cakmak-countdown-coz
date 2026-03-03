import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, GraduationCap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'select' | 'login' | 'signup'>('select');
  const [role, setRole] = useState<'admin' | 'student' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError('Geçersiz e-posta veya şifre.');
      return;
    }
    // Auth state change in useAuth will update, but we navigate based on role
    // We need to wait briefly for profile/role to load
    setTimeout(() => {
      // Role will be checked on the dashboard pages themselves
      if (role === 'admin') navigate('/admin');
      else navigate('/student');
    }, 500);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Ad Soyad gerekli.'); return; }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setError('');
    setMode('login');
    // Show success
    setError('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
  };

  const goBack = () => {
    setMode('select');
    setRole(null);
    setError('');
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

        {mode === 'select' ? (
          <div className="space-y-4">
            <h2 className="text-center text-2xl font-display font-bold mb-6">Giriş Yap</h2>
            <button
              onClick={() => { setRole('student'); setMode('login'); }}
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
              onClick={() => { setRole('admin'); setMode('login'); }}
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
            onSubmit={mode === 'signup' ? handleSignup : handleLogin}
            className="glass-card rounded-xl p-6 space-y-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={goBack} className="text-muted-foreground hover:text-foreground text-sm">
                ← Geri
              </button>
            </div>
            <h2 className="font-display text-xl font-bold">
              {mode === 'signup' ? 'Kayıt Ol' : (role === 'admin' ? 'Admin Girişi' : 'Öğrenci Girişi')}
            </h2>

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Ad Soyad</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  className="bg-secondary border-border"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ornek@email.com"
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
              <p className={`text-sm rounded-lg p-3 ${error.includes('başarılı') ? 'text-green-400 bg-green-400/10' : 'text-destructive bg-destructive/10'}`}>{error}</p>
            )}
            <Button type="submit" disabled={loading} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
              {loading ? 'Yükleniyor...' : (mode === 'signup' ? 'Kayıt Ol' : 'Giriş Yap')}
            </Button>

            {role === 'student' && (
              <p className="text-sm text-center text-muted-foreground">
                {mode === 'login' ? (
                  <>Hesabınız yok mu?{' '}
                    <button type="button" onClick={() => { setMode('signup'); setError(''); }} className="text-primary hover:underline">Kayıt Ol</button>
                  </>
                ) : (
                  <>Zaten hesabınız var mı?{' '}
                    <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-primary hover:underline">Giriş Yap</button>
                  </>
                )}
              </p>
            )}
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
