import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

function getRedirectPath(role: string | null, profile: any) {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'admin') return '/admin';
  if (role === 'koc') return '/coach';
  if (role === 'student') {
    if (!profile?.profile_completed) return '/onboarding';
    if (!profile?.coach_selected) return '/select-coach';
    return '/student';
  }
  return '/login';
}

export default function Login() {
  const navigate = useNavigate();
  const { user, role, profile, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && role) {
      navigate(getRedirectPath(role, profile), { replace: true });
    }
  }, [user, role, profile, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gerekli.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ action: 'login', username: username.trim(), password }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Giriş başarısız.');
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setTimeout(async () => {
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).single();
        const { data: profileData } = await supabase.from('profiles').select('profile_completed, coach_selected').eq('user_id', data.user.id).single();

        const path = getRedirectPath(roleData?.role, profileData);
        navigate(path, { replace: true });
        setLoading(false);
      }, 300);
    } catch {
      setError('Bağlantı hatası.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (user && role) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <AppLogo size="md" />
          <span className="font-display text-2xl font-bold">
            Çakmak<span className="text-primary">Koçluk</span>
          </span>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleLogin}
          className="glass-card rounded-2xl p-8 space-y-6"
        >
          <div className="text-center mb-2">
            <h2 className="font-display text-2xl font-bold">Giriş Yap</h2>
            <p className="text-sm text-muted-foreground mt-1">Hesabınıza giriş yapın</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Kullanıcı Adı</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Kullanıcı adınız"
                className="bg-secondary border-border pl-10"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary border-border pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="border-primary data-[state=checked]:bg-primary"
            />
            <Label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">
              Beni Hatırla
            </Label>
          </div>

          {error && (
            <p className="text-sm rounded-lg p-3 text-destructive bg-destructive/10">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-11">
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
}