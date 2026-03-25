import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Building2, Users, GraduationCap, LogOut, UserCheck, CalendarDays } from 'lucide-react';
import AppLogo from '@/components/AppLogo';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';

interface CompanyInfo {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

interface CoachProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  username: string | null;
}

interface StudentProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  username: string | null;
  coach_id: string | null;
}

export default function FirmDashboard() {
  const { signOut, profile, user } = useAuth();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [partners, setPartners] = useState<{ id: string; full_name: string; email: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    fetchData();
  }, [profile?.company_id]);

  const fetchData = async () => {
    try {
      const companyId = profile?.company_id;
      if (!companyId) return;

      const [companyRes, profilesRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId).single(),
        supabase.from('profiles').select('id, full_name, avatar_url, username, email, coach_id, user_id, company_id'),
      ]);

      if (companyRes.data) setCompany(companyRes.data);

      if (profilesRes.data) {
        // Get roles for all profiles
        const userIds = profilesRes.data.map(p => p.user_id);
        const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
        const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

        const companyProfiles = profilesRes.data.filter(p => p.company_id === companyId);

        const coachList: CoachProfile[] = [];
        const studentList: StudentProfile[] = [];
        const partnerList: { id: string; full_name: string; email: string | null }[] = [];

        for (const p of companyProfiles) {
          const role = roleMap.get(p.user_id);
          if (role === 'koc') {
            coachList.push({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, username: p.username });
          } else if (role === 'student') {
            studentList.push({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, username: p.username, coach_id: p.coach_id });
          } else if (role === 'firm_admin' || role === 'admin') {
            partnerList.push({ id: p.id, full_name: p.full_name, email: p.email });
          }
        }

        setCoaches(coachList);
        setStudents(studentList);
        setPartners(partnerList);
      }
    } catch (err) {
      console.error('Firma verileri alınamadı:', err);
      toast.error('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-8 w-8 rounded object-contain" />
            ) : (
              <AppLogo />
            )}
            <span className="font-semibold text-lg">{company?.name || 'Firma Paneli'}</span>
          </div>
          <div className="flex items-center gap-2">
            {user && <NotificationBell userId={user.id} />}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Firma Paneli
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hoş geldiniz, {profile?.full_name}. Firmanızın verilerini buradan takip edebilirsiniz.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Koç Sayısı</CardTitle>
              <UserCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coaches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Öğrenci Sayısı</CardTitle>
              <GraduationCap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Yönetici/Ortak</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{partners.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Kayıt Tarihi</CardTitle>
              <CalendarDays className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {company?.created_at ? new Date(company.created_at).toLocaleDateString('tr-TR') : '-'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coaches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Koçlar ({coaches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {coaches.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Henüz koç bulunmuyor.</p>
            ) : (
              <div className="space-y-3">
                {coaches.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {c.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{c.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {students.filter(s => s.coach_id === c.id).length} öğrenci
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Students */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Öğrenciler ({students.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Henüz öğrenci bulunmuyor.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {students.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-sm font-bold">
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {coaches.find(c => c.id === s.coach_id)?.full_name || 'Koç atanmamış'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partners */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yöneticiler/Ortaklar ({partners.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {partners.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Yönetici bulunamadı.</p>
            ) : (
              <div className="space-y-2">
                {partners.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium">{p.full_name}</p>
                      <p className="text-sm text-muted-foreground">{p.email || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
