import { useState, useEffect, useMemo } from 'react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Building2, LogOut, ArrowLeft, Users, GraduationCap,
  UserCheck, CalendarDays, UserPlus, Eye, Clock, CheckCircle, XCircle,
  Shield, Ban, MessageCircle, BarChart3
} from 'lucide-react';
import AppLogo from '@/components/AppLogo';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import YKSCountdown from '@/components/YKSCountdown';
import AvatarUpload from '@/components/AvatarUpload';
import ImageLightbox from '@/components/ImageLightbox';

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

interface MasterUser {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_approved: boolean;
  area: string | null;
  grade: string | null;
  coach_id: string | null;
  role: string;
}

export default function SuperAdminDashboard() {
  const { signOut, session, profile, profileId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyStatsMap, setCompanyStatsMap] = useState<Map<string, CompanyStats>>(new Map());
  const [dialogOpen, setDialogOpen] = useState(false);
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

  // Master SaaS - own coaches & students
  const [masterUsers, setMasterUsers] = useState<MasterUser[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);

  // Create student/coach dialogs
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [creatingStudent, setCreatingStudent] = useState(false);

  const [showCreateCoach, setShowCreateCoach] = useState(false);
  const [newCoachUsername, setNewCoachUsername] = useState('');
  const [newCoachPassword, setNewCoachPassword] = useState('');
  const [newCoachFullName, setNewCoachFullName] = useState('');
  const [creatingCoach, setCreatingCoach] = useState(false);

  // Firm admin fields
  const [firmAdminName, setFirmAdminName] = useState('');
  const [firmAdminUsername, setFirmAdminUsername] = useState('');
  const [firmAdminPassword, setFirmAdminPassword] = useState('');

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const callAuth = async (body: any) => {
    const token = await getToken();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  };

  // ─── FETCH COMPANIES ───
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCompanies(data || []);

      if (data && data.length > 0) {
        const companyIds = data.map(c => c.id);
        const { data: profiles } = await supabase.from('profiles').select('company_id, user_id, is_approved').in('company_id', companyIds);
        if (profiles && profiles.length > 0) {
          const userIds = profiles.map(p => p.user_id);
          const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
          const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
          const statsMap = new Map<string, CompanyStats>();
          for (const cId of companyIds) statsMap.set(cId, { adminCount: 0, coachCount: 0, studentCount: 0 });
          for (const p of profiles) {
            if (!p.company_id) continue;
            const stats = statsMap.get(p.company_id);
            if (!stats) continue;
            const role = roleMap.get(p.user_id);
            if (role === 'firm_admin') stats.adminCount++;
            else if (role === 'koc' && p.is_approved) stats.coachCount++;
            else if (role === 'student' && p.is_approved) stats.studentCount++;
          }
          setCompanyStatsMap(statsMap);
        }
      }
    } catch (err) {
      console.error('Firma listesi alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── FETCH PENDING USERS ───
  const fetchPendingUsers = async () => {
    setPendingLoading(true);
    try {
      const { data: profiles, error } = await supabase.from('profiles').select('id, full_name, username, created_at, company_id, user_id').eq('is_approved', false);
      if (error) throw error;
      if (!profiles || profiles.length === 0) { setPendingUsers([]); setPendingLoading(false); return; }

      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const companyIds = [...new Set(profiles.map(p => p.company_id).filter(Boolean))] as string[];
      let companyMap = new Map<string, string>();
      if (companyIds.length > 0) {
        const { data: companiesData } = await supabase.from('companies').select('id, name').in('id', companyIds);
        companyMap = new Map(companiesData?.map(c => [c.id, c.name]) || []);
      }

      setPendingUsers(profiles.map(p => ({
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        created_at: p.created_at,
        company_id: p.company_id,
        company_name: p.company_id ? (companyMap.get(p.company_id) || 'Bilinmiyor') : 'Firma yok',
        role: roleMap.get(p.user_id) || 'student',
      })));
    } catch (err) {
      console.error('Onay bekleyen kullanıcılar alınamadı:', err);
    } finally {
      setPendingLoading(false);
    }
  };

  // ─── FETCH MASTER USERS (ÇakmakKoçluk's own users) ───
  const fetchMasterUsers = async () => {
    setMasterLoading(true);
    try {
      const myCompanyId = profile?.company_id;
      // Get users that belong to super admin's company OR have no company
      const query = supabase.from('profiles').select('id, full_name, username, avatar_url, is_active, is_approved, area, grade, coach_id, user_id');
      
      let profiles: any[] = [];
      if (myCompanyId) {
        const { data } = await query.eq('company_id', myCompanyId);
        profiles = data || [];
      } else {
        // Super admin has no company_id → get users with null company_id (excluding self)
        const { data } = await query.is('company_id', null);
        profiles = (data || []).filter((p: any) => p.id !== profileId);
      }

      if (profiles.length === 0) { setMasterUsers([]); setMasterLoading(false); return; }

      const userIds = profiles.map((p: any) => p.user_id);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      setMasterUsers(profiles
        .filter((p: any) => {
          const role = roleMap.get(p.user_id);
          return role === 'koc' || role === 'student';
        })
        .map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          username: p.username,
          avatar_url: p.avatar_url,
          is_active: p.is_active,
          is_approved: p.is_approved,
          area: p.area,
          grade: p.grade,
          coach_id: p.coach_id,
          role: roleMap.get(p.user_id) || 'student',
        }))
      );
    } catch (err) {
      console.error('Master kullanıcılar alınamadı:', err);
    } finally {
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchPendingUsers();
    fetchMasterUsers();
  }, []);

  // ─── COMPANY CRUD ───
  const openCreate = () => {
    setEditingCompany(null); setName(''); setLogoUrl('');
    setFirmAdminName(''); setFirmAdminUsername(''); setFirmAdminPassword('');
    setDialogOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditingCompany(c); setName(c.name); setLogoUrl(c.logo_url || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Firma adı zorunludur.'); return; }
    if (!editingCompany && (!firmAdminUsername.trim() || !firmAdminPassword.trim())) {
      toast.error('Firma yöneticisi kullanıcı adı ve şifre zorunludur.'); return;
    }
    if (!editingCompany && firmAdminPassword.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır.'); return;
    }
    setSaving(true);
    try {
      if (editingCompany) {
        await supabase.from('companies').update({ name: name.trim(), logo_url: logoUrl.trim() || null }).eq('id', editingCompany.id);
        toast.success('Firma güncellendi.');
      } else {
        const { data: newCompany, error: companyErr } = await supabase.from('companies').insert({ name: name.trim(), logo_url: logoUrl.trim() || null }).select('id').single();
        if (companyErr) throw companyErr;
        const { ok, data } = await callAuth({ action: 'create-firm-admin', username: firmAdminUsername.trim(), password: firmAdminPassword, fullName: firmAdminName.trim() || firmAdminUsername.trim(), companyId: newCompany.id });
        if (!ok) toast.error(data.error || 'Firma oluşturuldu ancak yönetici hesabı oluşturulamadı.');
        else toast.success('Firma ve yönetici hesabı başarıyla oluşturuldu.');
      }
      setDialogOpen(false);
      fetchCompanies();
    } catch (err: any) {
      toast.error(`Hata: ${err?.message || 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu firmayı silmek istediğinize emin misiniz?')) return;
    try {
      await supabase.from('companies').delete().eq('id', id);
      toast.success('Firma silindi.');
      if (selectedFirm?.company.id === id) setSelectedFirm(null);
      fetchCompanies();
    } catch { toast.error('Firma silinemedi.'); }
  };

  // ─── FIRM DETAIL ───
  const openFirmDetail = async (company: Company) => {
    setFirmLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, user_id, company_id, is_approved').eq('company_id', company.id);
      if (!profiles) { setSelectedFirm({ company, coachCount: 0, studentCount: 0, partners: [] }); setFirmLoading(false); return; }

      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      let coachCount = 0, studentCount = 0;
      const partners: { id: string; full_name: string; email: string | null }[] = [];
      for (const p of profiles) {
        const role = roleMap.get(p.user_id);
        if (role === 'koc' && p.is_approved) coachCount++;
        else if (role === 'student' && p.is_approved) studentCount++;
        else if (role === 'firm_admin') partners.push({ id: p.id, full_name: p.full_name, email: p.email });
      }
      setSelectedFirm({ company, coachCount, studentCount, partners });
    } catch { toast.error('Firma detayları yüklenemedi.'); }
    finally { setFirmLoading(false); }
  };

  const handleCreatePartner = async () => {
    if (!partnerUsername.trim() || !partnerPassword.trim()) { toast.error('Kullanıcı adı ve şifre zorunludur.'); return; }
    if (partnerPassword.length < 8) { toast.error('Şifre en az 8 karakter olmalıdır.'); return; }
    if (!selectedFirm) return;
    setPartnerSaving(true);
    const { ok, data } = await callAuth({ action: 'create-firm-admin', username: partnerUsername.trim(), password: partnerPassword, fullName: partnerName.trim() || partnerUsername.trim(), companyId: selectedFirm.company.id });
    if (!ok) toast.error(data.error || 'Yönetici oluşturulamadı.');
    else { toast.success('Yönetici/Ortak başarıyla oluşturuldu.'); setPartnerDialogOpen(false); openFirmDetail(selectedFirm.company); }
    setPartnerSaving(false);
  };

  // ─── APPROVAL ACTIONS ───
  const handleApproveUser = async (id: string) => {
    const { ok, data } = await callAuth({ action: 'approve-user', profileId: id });
    if (!ok) toast.error(data.error || 'Onaylama başarısız.');
    else { toast.success('Kullanıcı onaylandı!'); fetchPendingUsers(); fetchCompanies(); }
  };

  const handleRejectUser = async (id: string) => {
    if (!confirm('Bu kullanıcıyı reddetmek ve silmek istediğinize emin misiniz?')) return;
    const { ok, data } = await callAuth({ action: 'reject-user', profileId: id });
    if (!ok) toast.error(data.error || 'Reddetme başarısız.');
    else { toast.success('Kullanıcı reddedildi ve silindi.'); fetchPendingUsers(); }
  };

  // ─── MASTER SAAS: CREATE STUDENT/COACH ───
  const handleCreateStudent = async () => {
    if (!newStudentUsername.trim() || !newStudentPassword.trim()) { toast.error('Kullanıcı adı ve şifre gerekli.'); return; }
    if (newStudentPassword.length < 8) { toast.error('Şifre en az 8 karakter olmalı.'); return; }
    setCreatingStudent(true);
    const { ok, data } = await callAuth({ action: 'create-student', username: newStudentUsername.trim(), password: newStudentPassword });
    if (!ok) toast.error(data.error || 'Öğrenci oluşturulamadı.');
    else { toast.success(`Öğrenci "${newStudentUsername}" oluşturuldu!`); setNewStudentUsername(''); setNewStudentPassword(''); setShowCreateStudent(false); fetchMasterUsers(); }
    setCreatingStudent(false);
  };

  const handleCreateCoach = async () => {
    if (!newCoachUsername.trim() || !newCoachPassword.trim()) { toast.error('Kullanıcı adı ve şifre gerekli.'); return; }
    if (newCoachPassword.length < 8) { toast.error('Şifre en az 8 karakter olmalı.'); return; }
    setCreatingCoach(true);
    const { ok, data } = await callAuth({ action: 'create-coach', username: newCoachUsername.trim(), password: newCoachPassword, fullName: newCoachFullName.trim() || newCoachUsername.trim() });
    if (!ok) toast.error(data.error || 'Koç oluşturulamadı.');
    else { toast.success(`Koç "${newCoachFullName || newCoachUsername}" oluşturuldu!`); setNewCoachUsername(''); setNewCoachPassword(''); setNewCoachFullName(''); setShowCreateCoach(false); fetchMasterUsers(); }
    setCreatingCoach(false);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    const { ok, data } = await callAuth({ action: 'delete-user', profileId: id });
    if (!ok) toast.error(data.error || 'Kullanıcı silinemedi.');
    else { toast.success(`"${name}" silindi.`); fetchMasterUsers(); }
  };

  const handleToggleActive = async (id: string, name: string) => {
    const { ok, data } = await callAuth({ action: 'toggle-active', profileId: id });
    if (!ok) toast.error(data.error || 'İşlem başarısız.');
    else { toast.success(data.is_active ? `"${name}" aktif edildi.` : `"${name}" donduruldu.`); fetchMasterUsers(); }
  };

  const getRoleLabel = (role: string) => role === 'koc' ? 'Koç' : role === 'student' ? 'Öğrenci' : role;

  // ─── GROUPED PENDING USERS BY COMPANY ───
  const pendingByCompany = useMemo(() => {
    const map = new Map<string, { companyName: string; users: PendingUser[] }>();
    for (const u of pendingUsers) {
      const key = u.company_id || 'no-company';
      if (!map.has(key)) map.set(key, { companyName: u.company_name, users: [] });
      map.get(key)!.users.push(u);
    }
    return Array.from(map.entries());
  }, [pendingUsers]);

  const masterCoaches = masterUsers.filter(u => u.role === 'koc');
  const masterStudents = masterUsers.filter(u => u.role === 'student');

  const getCoachName = (coachId: string | null) => {
    if (!coachId) return 'Atanmamış';
    const coach = masterCoaches.find(c => c.id === coachId);
    return coach ? (coach.full_name || coach.username || 'Koç') : 'Atanmamış';
  };

  // ─── FIRM DETAIL VIEW ───
  if (selectedFirm) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedFirm(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <AppLogo size="sm" />
              <span className="font-semibold text-lg">Firma Detayı</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => setShowLogoutDialog(true)}>
                <LogOut className="h-4 w-4 mr-2" /> Çıkış
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
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
                  <p className="text-sm text-muted-foreground">Kayıt: {new Date(selectedFirm.company.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Aktif Koç</CardTitle><UserCheck className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{selectedFirm.coachCount}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Aktif Öğrenci</CardTitle><GraduationCap className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{selectedFirm.studentCount}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Yönetici</CardTitle><Users className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{selectedFirm.partners.length}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Kayıt Tarihi</CardTitle><CalendarDays className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-lg font-semibold">{new Date(selectedFirm.company.created_at).toLocaleDateString('tr-TR')}</div></CardContent></Card>
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
                      <DialogHeader><DialogTitle>Yeni Yönetici/Ortak Ekle</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2"><Label>Ad Soyad</Label><Input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" /></div>
                        <div className="space-y-2"><Label>Kullanıcı Adı *</Label><Input value={partnerUsername} onChange={e => setPartnerUsername(e.target.value)} placeholder="Giriş için kullanılacak" /></div>
                        <div className="space-y-2"><Label>Şifre * (en az 8 karakter)</Label><Input type="password" value={partnerPassword} onChange={e => setPartnerPassword(e.target.value)} placeholder="••••••••" /></div>
                        <p className="text-xs text-muted-foreground">Bu hesap <strong>firm_admin</strong> rolüyle <strong>{selectedFirm.company.name}</strong> firmasına bağlanacak.</p>
                        <Button onClick={handleCreatePartner} disabled={partnerSaving} className="w-full">{partnerSaving ? 'Oluşturuluyor...' : 'Oluştur'}</Button>
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
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{p.full_name.charAt(0).toUpperCase()}</div>
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

  // ─── MAIN DASHBOARD ───
  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="border-b border-border bg-card/50 fixed top-0 inset-x-0 z-40 backdrop-blur-md pt-safe">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <button onClick={() => setActiveTab('firmalar')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <AppLogo size="sm" />
              <span className="font-display text-lg font-bold hidden sm:inline">
                Çakmak<span className="text-primary">Koçluk</span>
              </span>
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-medium hidden sm:inline">Super Admin</span>
            </button>
            <div className="flex items-center gap-2">
              <YKSCountdown compact />
              <ThemeToggle />
              <NotificationBell />
              <AvatarUpload size="sm" disableUpload />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6 mt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full sm:w-auto">
              <TabsTrigger value="firmalar" className="gap-1.5">
                <Building2 className="h-4 w-4" /> Firmalar
              </TabsTrigger>
              <TabsTrigger value="cakmak" className="gap-1.5">
                <Shield className="h-4 w-4" /> ÇakmakKoçluk
              </TabsTrigger>
              <TabsTrigger value="onay" className="gap-1.5 relative">
                <Clock className="h-4 w-4" /> Onay
                {pendingUsers.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-xs">{pendingUsers.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ─── FIRMA YÖNETİMİ ─── */}
            <TabsContent value="firmalar" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /> Firma Yönetimi</h1>
                  <p className="text-muted-foreground text-sm mt-1">Sisteme kayıtlı firmaları yönetin.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openCreate} className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90"><Plus className="h-4 w-4 mr-2" /> Yeni Firma Ekle</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingCompany ? 'Firmayı Düzenle' : 'Yeni Firma ve Yönetici Ekle'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2"><Label>Firma Adı *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Eğitim A.Ş." /></div>
                      <div className="space-y-2"><Label>Logo URL</Label><Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." /></div>
                      {logoUrl && <div className="flex justify-center"><img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-contain border" onError={e => (e.currentTarget.style.display = 'none')} /></div>}
                      {!editingCompany && (
                        <>
                          <div className="border-t pt-4"><p className="text-sm font-medium mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Firma Yöneticisi Hesabı</p></div>
                          <div className="space-y-2"><Label>Ad Soyad</Label><Input value={firmAdminName} onChange={e => setFirmAdminName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" /></div>
                          <div className="space-y-2"><Label>Kullanıcı Adı *</Label><Input value={firmAdminUsername} onChange={e => setFirmAdminUsername(e.target.value)} placeholder="Giriş için kullanılacak" /></div>
                          <div className="space-y-2"><Label>Şifre * (en az 8 karakter)</Label><Input type="password" value={firmAdminPassword} onChange={e => setFirmAdminPassword(e.target.value)} placeholder="••••••••" /></div>
                        </>
                      )}
                      <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? 'Kaydediliyor...' : editingCompany ? 'Güncelle' : 'Firma ve Yönetici Oluştur'}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  {loading ? <p className="text-muted-foreground text-center py-8">Yükleniyor...</p> : companies.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Henüz firma eklenmemiş.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Logo</TableHead>
                          <TableHead>Firma Adı</TableHead>
                          <TableHead className="text-center"><span className="flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" /> Admin</span></TableHead>
                          <TableHead className="text-center"><span className="flex items-center justify-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Koç</span></TableHead>
                          <TableHead className="text-center"><span className="flex items-center justify-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Öğrenci</span></TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companies.map(c => {
                          const stats = companyStatsMap.get(c.id) || { adminCount: 0, coachCount: 0, studentCount: 0 };
                          return (
                            <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openFirmDetail(c)}>
                              <TableCell>
                                {c.logo_url ? <img src={c.logo_url} alt={c.name} className="h-9 w-9 rounded-lg object-contain border" /> : (
                                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
                                )}
                              </TableCell>
                              <TableCell><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('tr-TR')}</p></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="font-semibold">{stats.adminCount}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="font-semibold">{stats.coachCount}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="font-semibold">{stats.studentCount}</Badge></TableCell>
                              <TableCell className="text-right space-x-1" onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" onClick={() => openFirmDetail(c)} title="Detay"><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Düzenle"><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)} title="Sil"><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── ÇAKMAKKOÇLUK (MASTER SaaS) ─── */}
            <TabsContent value="cakmak" className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> ÇakmakKoçluk Paneli</h1>
                <p className="text-muted-foreground text-sm mt-1">Kendi koçlarınızı ve öğrencilerinizi yönetin. (Onaya düşmez)</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="glass-card rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{masterCoaches.filter(c => c.is_approved).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Aktif Koç</p>
                </div>
                <div className="glass-card rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{masterStudents.filter(s => s.is_approved).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Aktif Öğrenci</p>
                </div>
                <div className="glass-card rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
                  <p className="text-2xl font-bold text-amber-400">{masterStudents.filter(s => !s.coach_id).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Koç Atanmamış</p>
                </div>
              </div>

              {/* Coaches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /> Koçlar ({masterCoaches.length})</h2>
                  <Dialog open={showCreateCoach} onOpenChange={setShowCreateCoach}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-1"><Plus className="h-4 w-4" /> Koç Ekle</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Yeni Koç Oluştur</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2"><Label>Ad Soyad</Label><Input value={newCoachFullName} onChange={e => setNewCoachFullName(e.target.value)} placeholder="Koç ismi" /></div>
                        <div className="space-y-2"><Label>Kullanıcı Adı</Label><Input value={newCoachUsername} onChange={e => setNewCoachUsername(e.target.value)} placeholder="koc123" /></div>
                        <div className="space-y-2"><Label>Şifre</Label><Input type="password" value={newCoachPassword} onChange={e => setNewCoachPassword(e.target.value)} placeholder="••••••••" /></div>
                        <Button onClick={handleCreateCoach} disabled={creatingCoach} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">{creatingCoach ? 'Oluşturuluyor...' : 'Koç Oluştur'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {masterCoaches.map(c => (
                    <div key={c.id} className={`glass-card rounded-2xl p-4 flex items-center gap-3 group ${!c.is_active ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt={c.full_name} className="h-10 w-10 rounded-full object-cover shrink-0 ring-2 ring-primary/20" onClick={() => setLightboxSrc(c.avatar_url)} />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">{c.full_name?.charAt(0) || '?'}</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.full_name || c.username}</p>
                          <p className="text-xs text-muted-foreground">{masterStudents.filter(s => s.coach_id === c.id).length} öğrenci</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button onClick={() => handleToggleActive(c.id, c.full_name || 'Koç')} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"><Ban className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteUser(c.id, c.full_name || 'Koç')} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                  {masterCoaches.length === 0 && <p className="text-sm text-muted-foreground py-4">Henüz koç yok.</p>}
                </div>
              </div>

              {/* Students */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Öğrenciler ({masterStudents.length})</h2>
                  <Dialog open={showCreateStudent} onOpenChange={setShowCreateStudent}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-1"><Plus className="h-4 w-4" /> Öğrenci Ekle</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Yeni Öğrenci Oluştur</DialogTitle></DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2"><Label>Kullanıcı Adı</Label><Input value={newStudentUsername} onChange={e => setNewStudentUsername(e.target.value)} placeholder="ogrenci123" /></div>
                        <div className="space-y-2"><Label>Şifre</Label><Input type="password" value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} placeholder="••••••••" /></div>
                        <Button onClick={handleCreateStudent} disabled={creatingStudent} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">{creatingStudent ? 'Oluşturuluyor...' : 'Öğrenci Oluştur'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {masterStudents.map(s => (
                    <div key={s.id} className={`glass-card rounded-2xl p-4 flex items-center gap-3 group ${!s.is_active ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.full_name} className="h-10 w-10 rounded-full object-cover shrink-0 ring-2 ring-primary/20" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{s.full_name?.charAt(0) || '?'}</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.full_name || s.username || 'İsimsiz'}</p>
                          <p className="text-xs text-muted-foreground">{s.area ?? 'SAY'} — <span className={s.coach_id ? 'text-primary' : 'text-amber-400'}>{getCoachName(s.coach_id)}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button onClick={() => handleToggleActive(s.id, s.full_name || 'Öğrenci')} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"><Ban className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteUser(s.id, s.full_name || 'Öğrenci')} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                  {masterStudents.length === 0 && <p className="text-sm text-muted-foreground py-4">Henüz öğrenci yok.</p>}
                </div>
              </div>
            </TabsContent>

            {/* ─── ONAY BEKLEYENLERİ (Kategorik Akordeon) ─── */}
            <TabsContent value="onay" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6 text-primary" /> Onay Bekleyen Hesaplar</h1>
                  <p className="text-muted-foreground text-sm mt-1">Firmalar tarafından eklenen koç/öğrenci hesaplarını onaylayın veya reddedin.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchPendingUsers} disabled={pendingLoading}>Yenile</Button>
              </div>

              {pendingLoading ? (
                <p className="text-muted-foreground text-center py-8">Yükleniyor...</p>
              ) : pendingUsers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-medium">Tebrikler!</p>
                    <p className="text-muted-foreground mt-1">Onay bekleyen hesap bulunmuyor.</p>
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="multiple" defaultValue={pendingByCompany.map(([key]) => key)} className="space-y-3">
                  {pendingByCompany.map(([key, { companyName, users }]) => (
                    <AccordionItem key={key} value={key} className="border rounded-xl overflow-hidden bg-card">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-semibold">{companyName}</span>
                          <Badge variant="destructive" className="text-xs">{users.length} bekleyen</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {/* Coaches */}
                        {users.filter(u => u.role === 'koc').length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Koçlar</p>
                            <div className="space-y-2">
                              {users.filter(u => u.role === 'koc').map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-sm">{u.full_name?.charAt(0) || '?'}</div>
                                    <div>
                                      <p className="font-medium text-sm">{u.full_name}</p>
                                      <p className="text-xs text-muted-foreground">@{u.username} · {new Date(u.created_at).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleApproveUser(u.id)} className="bg-green-600 hover:bg-green-700 text-white gap-1"><CheckCircle className="h-3.5 w-3.5" /> Onayla</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRejectUser(u.id)} className="gap-1"><XCircle className="h-3.5 w-3.5" /> Reddet</Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Students */}
                        {users.filter(u => u.role === 'student').length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Öğrenciler</p>
                            <div className="space-y-2">
                              {users.filter(u => u.role === 'student').map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{u.full_name?.charAt(0) || '?'}</div>
                                    <div>
                                      <p className="font-medium text-sm">{u.full_name}</p>
                                      <p className="text-xs text-muted-foreground">@{u.username} · {new Date(u.created_at).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleApproveUser(u.id)} className="bg-green-600 hover:bg-green-700 text-white gap-1"><CheckCircle className="h-3.5 w-3.5" /> Onayla</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRejectUser(u.id)} className="gap-1"><XCircle className="h-3.5 w-3.5" /> Reddet</Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>
          </Tabs>
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border pb-safe">
          <div className="max-w-7xl mx-auto flex items-center h-14 sm:h-16">
            {[
              { key: 'firmalar', icon: Building2, label: 'Firmalar' },
              { key: 'cakmak', icon: Shield, label: 'ÇakmakKoçluk' },
              { key: 'onay', icon: Clock, label: 'Onay', badge: pendingUsers.length },
            ].map(item => {
              const isActive = activeTab === item.key;
              return (
                <button key={item.key} onClick={() => setActiveTab(item.key)} className="flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] transition-colors relative">
                  <div className="relative">
                    <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    {item.badge ? <span className="absolute -top-1 -right-2 bg-destructive text-destructive-foreground text-[9px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-0.5">{item.badge}</span> : null}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{item.label}</span>
                  {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                </button>
              );
            })}
            <button onClick={() => setShowLogoutDialog(true)} className="flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px]">
              <LogOut className="h-5 w-5 text-destructive" />
              <span className="text-[10px] font-medium text-destructive">Çıkış</span>
            </button>
          </div>
        </nav>

        {/* Logout Dialog */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Çıkış yapmak istediğinize emin misiniz?</AlertDialogTitle>
              <AlertDialogDescription>Oturumunuz sonlandırılacak.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={async () => { await signOut(); }}>Evet, Çıkış Yap</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <ImageLightbox src={lightboxSrc} alt="Profil Fotoğrafı" onClose={() => setLightboxSrc(null)} />
    </>
  );
}
