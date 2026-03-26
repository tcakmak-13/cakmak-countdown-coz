import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2, LogOut, ArrowLeft, Users, GraduationCap, UserCheck, CalendarDays, UserPlus, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import AppLogo from '@/components/AppLogo';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

interface CompanyStats {
  adminCount: number;
  coachCount: number;
  studentCount: number;
}

interface FirmDetail {
  company: Company;
  coachCount: number;
  studentCount: number;
  partners: { id: string; full_name: string; email: string | null }[];
}

interface PendingUser {
  id: string;
  full_name: string;
  username: string | null;
  created_at: string;
  company_id: string | null;
  company_name: string;
  role: string;
}

export default function SuperAdminDashboard() {
  const { signOut } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyStatsMap, setCompanyStatsMap] = useState<Map<string, CompanyStats>>(new Map());
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Firm detail view
  const [selectedFirm, setSelectedFirm] = useState<FirmDetail | null>(null);
  const [firmLoading, setFirmLoading] = useState(false);

  // Partner creation
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerUsername, setPartnerUsername] = useState('');
  const [partnerPassword, setPartnerPassword] = useState('');
  const [partnerSaving, setPartnerSaving] = useState(false);

  // Pending approvals
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('firmalar');

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Firma listesi alınamadı:', err);
      toast.error('Firma listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    setPendingLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, created_at, company_id, user_id')
        .eq('is_approved', false);

      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        setPendingUsers([]);
        setPendingLoading(false);
        return;
      }

      // Get roles
      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      // Get company names
      const companyIds = [...new Set(profiles.map(p => p.company_id).filter(Boolean))] as string[];
      let companyMap = new Map<string, string>();
      if (companyIds.length > 0) {
        const { data: companiesData } = await supabase.from('companies').select('id, name').in('id', companyIds);
        companyMap = new Map(companiesData?.map(c => [c.id, c.name]) || []);
      }

      const pending: PendingUser[] = profiles.map(p => ({
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        created_at: p.created_at,
        company_id: p.company_id,
        company_name: p.company_id ? (companyMap.get(p.company_id) || 'Bilinmiyor') : 'Firma yok',
        role: roleMap.get(p.user_id) || 'student',
      }));

      setPendingUsers(pending);
    } catch (err) {
      console.error('Onay bekleyen kullanıcılar alınamadı:', err);
      toast.error('Onay listesi yüklenemedi.');
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchPendingUsers();
  }, []);

  // Firm admin fields for create flow
  const [firmAdminName, setFirmAdminName] = useState('');
  const [firmAdminUsername, setFirmAdminUsername] = useState('');
  const [firmAdminPassword, setFirmAdminPassword] = useState('');

  const openCreate = () => {
    setEditingCompany(null);
    setName('');
    setLogoUrl('');
    setFirmAdminName('');
    setFirmAdminUsername('');
    setFirmAdminPassword('');
    setDialogOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditingCompany(c);
    setName(c.name);
    setLogoUrl(c.logo_url || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Firma adı zorunludur.'); return; }

    // For new firms, require admin account info
    if (!editingCompany) {
      if (!firmAdminUsername.trim() || !firmAdminPassword.trim()) {
        toast.error('Firma yöneticisi kullanıcı adı ve şifre zorunludur.');
        return;
      }
      if (firmAdminPassword.length < 8) {
        toast.error('Şifre en az 8 karakter olmalıdır.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({ name: name.trim(), logo_url: logoUrl.trim() || null })
          .eq('id', editingCompany.id);
        if (error) throw error;
        toast.success('Firma güncellendi.');
      } else {
        // 1. Create the company
        const { data: newCompany, error: companyErr } = await supabase
          .from('companies')
          .insert({ name: name.trim(), logo_url: logoUrl.trim() || null })
          .select('id')
          .single();
        if (companyErr) {
          console.error('Firma ekleme hatası:', companyErr);
          toast.error(`Firma eklenemedi: ${companyErr.message}`);
          setSaving(false);
          return;
        }

        // 2. Create the firm admin account
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              action: 'create-firm-admin',
              username: firmAdminUsername.trim(),
              password: firmAdminPassword,
              fullName: firmAdminName.trim() || firmAdminUsername.trim(),
              companyId: newCompany.id,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Firma oluşturuldu ancak yönetici hesabı oluşturulamadı.');
        } else {
          toast.success('Firma ve yönetici hesabı başarıyla oluşturuldu.');
        }
      }
      setDialogOpen(false);
      fetchCompanies();
      if (selectedFirm && editingCompany?.id === selectedFirm.company.id) {
        openFirmDetail({ ...selectedFirm.company, name: name.trim(), logo_url: logoUrl.trim() || null });
      }
    } catch (err: any) {
      console.error('Firma kaydedilemedi:', err);
      toast.error(`Bir hata oluştu: ${err?.message || 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu firmayı silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      toast.success('Firma silindi.');
      if (selectedFirm?.company.id === id) setSelectedFirm(null);
      fetchCompanies();
    } catch (err) {
      console.error('Firma silinemedi:', err);
      toast.error('Firma silinemedi.');
    }
  };

  const openFirmDetail = async (company: Company) => {
    setFirmLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_id, company_id, is_approved')
        .eq('company_id', company.id);

      if (!profiles) {
        setSelectedFirm({ company, coachCount: 0, studentCount: 0, partners: [] });
        setFirmLoading(false);
        return;
      }

      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      let coachCount = 0;
      let studentCount = 0;
      const partners: { id: string; full_name: string; email: string | null }[] = [];

      for (const p of profiles) {
        const role = roleMap.get(p.user_id);
        // Only count approved users in stats
        if (role === 'koc' && p.is_approved) coachCount++;
        else if (role === 'student' && p.is_approved) studentCount++;
        else if (role === 'firm_admin') partners.push({ id: p.id, full_name: p.full_name, email: p.email });
      }

      setSelectedFirm({ company, coachCount, studentCount, partners });
    } catch (err) {
      console.error('Firma detayları alınamadı:', err);
      toast.error('Firma detayları yüklenemedi.');
    } finally {
      setFirmLoading(false);
    }
  };

  const handleCreatePartner = async () => {
    if (!partnerName.trim() || !partnerUsername.trim() || !partnerPassword.trim()) {
      toast.error('Tüm alanlar zorunludur.');
      return;
    }
    if (partnerPassword.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (!selectedFirm) return;

    setPartnerSaving(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'create-firm-admin',
            username: partnerUsername.trim(),
            password: partnerPassword,
            fullName: partnerName.trim(),
            companyId: selectedFirm.company.id,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Yönetici oluşturulamadı.');
        return;
      }
      toast.success('Yönetici/Ortak başarıyla oluşturuldu.');
      setPartnerDialogOpen(false);
      setPartnerName('');
      setPartnerUsername('');
      setPartnerPassword('');
      openFirmDetail(selectedFirm.company);
    } catch (err) {
      console.error('Partner oluşturulamadı:', err);
      toast.error('Bağlantı hatası.');
    } finally {
      setPartnerSaving(false);
    }
  };

  const handleApproveUser = async (profileId: string) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ action: 'approve-user', profileId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Onaylama başarısız.');
        return;
      }
      toast.success('Kullanıcı onaylandı ve aktif edildi.');
      fetchPendingUsers();
      if (selectedFirm) openFirmDetail(selectedFirm.company);
    } catch {
      toast.error('Bağlantı hatası.');
    }
  };

  const handleRejectUser = async (profileId: string) => {
    if (!confirm('Bu kullanıcıyı reddetmek ve silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ action: 'reject-user', profileId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Reddetme başarısız.');
        return;
      }
      toast.success('Kullanıcı reddedildi ve silindi.');
      fetchPendingUsers();
    } catch {
      toast.error('Bağlantı hatası.');
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'koc') return 'Koç';
    if (role === 'student') return 'Öğrenci';
    return role;
  };

  // Firm detail view
  if (selectedFirm) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedFirm(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <AppLogo />
              <span className="font-semibold text-lg">Firma Detayı</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Çıkış
            </Button>
          </div>
        </header>

        <main className="container py-8 space-y-6">
          {firmLoading ? (
            <p className="text-muted-foreground text-center py-8">Yükleniyor...</p>
          ) : (
            <>
              <div className="flex items-center gap-4">
                {selectedFirm.company.logo_url ? (
                  <img src={selectedFirm.company.logo_url} alt={selectedFirm.company.name} className="h-14 w-14 rounded-xl object-contain border" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{selectedFirm.company.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    Kayıt: {new Date(selectedFirm.company.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>

              {/* Stats - only approved users */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Koç</CardTitle>
                    <UserCheck className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedFirm.coachCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Öğrenci</CardTitle>
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedFirm.studentCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Yönetici/Ortak</CardTitle>
                    <Users className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedFirm.partners.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Kayıt Tarihi</CardTitle>
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">
                      {new Date(selectedFirm.company.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Partners */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Yöneticiler/Ortaklar ({selectedFirm.partners.length})</CardTitle>
                  <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => { setPartnerName(''); setPartnerUsername(''); setPartnerPassword(''); }}>
                        <UserPlus className="h-4 w-4 mr-2" /> Yönetici/Ortak Ekle
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Yeni Yönetici/Ortak Ekle</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Ad Soyad *</Label>
                          <Input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
                        </div>
                        <div className="space-y-2">
                          <Label>Kullanıcı Adı *</Label>
                          <Input value={partnerUsername} onChange={e => setPartnerUsername(e.target.value)} placeholder="Giriş için kullanılacak" />
                        </div>
                        <div className="space-y-2">
                          <Label>Şifre * (en az 8 karakter)</Label>
                          <Input type="password" value={partnerPassword} onChange={e => setPartnerPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Bu hesap <strong>firm_admin</strong> rolüyle <strong>{selectedFirm.company.name}</strong> firmasına bağlanacak.
                        </p>
                        <Button onClick={handleCreatePartner} disabled={partnerSaving} className="w-full">
                          {partnerSaving ? 'Oluşturuluyor...' : 'Oluştur'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {selectedFirm.partners.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Henüz yönetici eklenmemiş.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedFirm.partners.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {p.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{p.full_name}</p>
                              <p className="text-sm text-muted-foreground">{p.email || '-'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    );
  }

  // Main view with tabs
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo />
            <span className="font-semibold text-lg">Super Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Çıkış
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="firmalar">
              <Building2 className="h-4 w-4 mr-2" /> Firma Yönetimi
            </TabsTrigger>
            <TabsTrigger value="onay" className="relative">
              <Clock className="h-4 w-4 mr-2" /> Onay Bekleyenler
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1 text-xs">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Firma Yönetimi Tab */}
          <TabsContent value="firmalar" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" /> Firma Yönetimi
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Sisteme kayıtlı firmaları yönetin.
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Yeni Firma
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCompany ? 'Firmayı Düzenle' : 'Yeni Firma Ekle'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Firma Adı *</Label>
                      <Input id="company-name" value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Eğitim A.Ş." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-logo">Logo URL</Label>
                      <Input id="company-logo" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    {logoUrl && (
                      <div className="flex justify-center">
                        <img src={logoUrl} alt="Logo önizleme" className="h-16 w-16 rounded-lg object-contain border" onError={e => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                    {/* Firm admin fields - only for new firms */}
                    {!editingCompany && (
                      <>
                        <div className="border-t pt-4">
                          <p className="text-sm font-medium mb-3">Firma Yöneticisi Hesabı</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Ad Soyad</Label>
                          <Input value={firmAdminName} onChange={e => setFirmAdminName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
                        </div>
                        <div className="space-y-2">
                          <Label>Kullanıcı Adı *</Label>
                          <Input value={firmAdminUsername} onChange={e => setFirmAdminUsername(e.target.value)} placeholder="Giriş için kullanılacak" />
                        </div>
                        <div className="space-y-2">
                          <Label>Şifre * (en az 8 karakter)</Label>
                          <Input type="password" value={firmAdminPassword} onChange={e => setFirmAdminPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                      </>
                    )}
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                      {saving ? 'Kaydediliyor...' : editingCompany ? 'Güncelle' : 'Firma ve Yönetici Oluştur'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kayıtlı Firmalar ({companies.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Yükleniyor...</p>
                ) : companies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Henüz firma eklenmemiş.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Logo</TableHead>
                        <TableHead>Firma Adı</TableHead>
                        <TableHead>Kayıt Tarihi</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map(c => (
                        <TableRow key={c.id} className="cursor-pointer" onClick={() => openFirmDetail(c)}>
                          <TableCell>
                            {c.logo_url ? (
                              <img src={c.logo_url} alt={c.name} className="h-8 w-8 rounded object-contain" />
                            ) : (
                              <Building2 className="h-8 w-8 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString('tr-TR')}
                          </TableCell>
                          <TableCell className="text-right space-x-2" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => openFirmDetail(c)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onay Bekleyenler Tab */}
          <TabsContent value="onay" className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" /> Onay Bekleyen İstekler
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Firmalar tarafından eklenen ve onayınızı bekleyen koç/öğrenci hesapları.
              </p>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Bekleyen Kullanıcılar ({pendingUsers.length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchPendingUsers} disabled={pendingLoading}>
                    Yenile
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <p className="text-muted-foreground text-center py-8">Yükleniyor...</p>
                ) : pendingUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-muted-foreground">Onay bekleyen kullanıcı yok.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>İsim</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Firma</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{u.full_name}</p>
                              <p className="text-xs text-muted-foreground">@{u.username}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'koc' ? 'default' : 'secondary'}>
                              {getRoleLabel(u.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.company_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString('tr-TR')}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" onClick={() => handleApproveUser(u.id)} className="bg-green-600 hover:bg-green-700 text-white">
                              <CheckCircle className="h-4 w-4 mr-1" /> Onayla
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectUser(u.id)}>
                              <XCircle className="h-4 w-4 mr-1" /> Reddet
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
