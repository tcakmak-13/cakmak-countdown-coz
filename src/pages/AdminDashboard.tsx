import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageLightbox from '@/components/ImageLightbox';
import { LogOut, Users, Calendar, User as UserIcon, Plus, MessageCircle, BarChart3, Megaphone, CalendarCheck, Trash2, Shield, UserPlus, Ban, CheckCircle, Building2, Pencil, Eye, GraduationCap, UserCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLogo from '@/components/AppLogo';
import ThemeToggle from '@/components/ThemeToggle';
import AvatarUpload from '@/components/AvatarUpload';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import YKSCountdown from '@/components/YKSCountdown';
import StudyPlanner from '@/components/StudyPlanner';
import StudentProfileForm from '@/components/StudentProfileForm';
import ChatView from '@/components/ChatView';
import AdminAnalytics from '@/components/AdminAnalytics';
import AdminAppointments from '@/components/AdminAppointments';

import CoachDetailView from '@/components/CoachDetailView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface StudentProfile {
  id: string;
  full_name: string;
  area: string | null;
  grade: string | null;
  username: string | null;
  target_university: string | null;
  target_department: string | null;
  coach_id: string | null;
  is_active: boolean;
  is_approved: boolean;
  avatar_url: string | null;
}

interface CoachProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_approved: boolean;
}

interface CompanyScopedUser {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_approved: boolean;
  area: string | null;
  grade: string | null;
  target_university: string | null;
  target_department: string | null;
  coach_id: string | null;
  role: string | null;
}

export default function AdminDashboard({ panelType = 'admin' }: { panelType?: 'admin' | 'firm' }) {
  const navigate = useNavigate();
  const { profile, role, loading, signOut, profileId, session, refreshProfile } = useAuth();
  const isFirmPanel = panelType === 'firm';
  const hasPanelAccess = isFirmPanel ? role === 'firm_admin' : (role === 'admin' || role === 'super_admin');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [tab, setTab] = useState<'overview' | 'management' | 'schedule' | 'profile' | 'messages' | 'analytics' | 'appointments' | 'coach-detail' | 'company'>('overview');
  const [selectedCoach, setSelectedCoach] = useState<CoachProfile | null>(null);

  // Student creation
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [creatingStudent, setCreatingStudent] = useState(false);

  // Coach creation
  const [showCreateCoach, setShowCreateCoach] = useState(false);
  const [newCoachUsername, setNewCoachUsername] = useState('');
  const [newCoachPassword, setNewCoachPassword] = useState('');
  const [newCoachFullName, setNewCoachFullName] = useState('');
  const [creatingCoach, setCreatingCoach] = useState(false);

  // Announcement
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Deletion & Suspend
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; type: 'student' | 'coach' } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Coach assignment
  const [assignDialogStudent, setAssignDialogStudent] = useState<StudentProfile | null>(null);
  const [assignCoachId, setAssignCoachId] = useState<string>('');

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) { toast.error('Başlık ve içerik gerekli.'); return; }
    setSendingAnnouncement(true);
    try {
      const { data: studentRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
      if (!studentRoles || studentRoles.length === 0) { toast.error('Bildirim gönderilecek öğrenci bulunamadı.'); setSendingAnnouncement(false); return; }
      const rows = studentRoles.map(r => ({ user_id: r.user_id, title: announcementTitle.trim(), message: announcementBody.trim(), type: 'announcement', icon: 'megaphone', link: null }));
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) { console.error('Duyuru hatası:', error); toast.error('Duyuru gönderilemedi. Lütfen tekrar deneyin.'); }
      else { toast.success(`Duyuru ${studentRoles.length} öğrenciye gönderildi!`); setAnnouncementTitle(''); setAnnouncementBody(''); setShowAnnouncement(false); }
    } catch { toast.error('Bağlantı hatası.'); }
    setSendingAnnouncement(false);
  };

  const loadCompanyUsersFromBackend = async () => {
    const token = session?.access_token;
    if (!token) return;

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'get-company-users' }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Firma kullanıcıları yüklenemedi.');
      return;
    }

    const users = (data.users || []) as CompanyScopedUser[];

    const coachList: CoachProfile[] = users
      .filter(u => u.role === 'koc')
      .map(u => ({
        id: u.id,
        full_name: u.full_name,
        username: u.username,
        avatar_url: u.avatar_url,
        is_active: u.is_active,
        is_approved: u.is_approved,
      }));

    const studentList: StudentProfile[] = users
      .filter(u => u.role === 'student')
      .map(u => ({
        id: u.id,
        full_name: u.full_name,
        area: u.area,
        grade: u.grade,
        username: u.username,
        target_university: u.target_university,
        target_department: u.target_department,
        coach_id: u.coach_id,
        is_active: u.is_active,
        is_approved: u.is_approved,
        avatar_url: u.avatar_url,
      }));

    setCoaches(coachList);
    setStudents(studentList);
  };

  const loadStudents = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, area, grade, username, target_university, target_department, coach_id, is_active, is_approved, avatar_url');
    if (data) {
      const coachIds = new Set(coaches.map(c => c.id));
      setStudents(data.filter((s: any) => s.id !== profileId && !coachIds.has(s.id)) as StudentProfile[]);
    }
  };

  const loadCoaches = async () => {
    const { data: coachRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'koc');
    if (!coachRoles || coachRoles.length === 0) { setCoaches([]); return; }
    const coachUserIds = coachRoles.map(r => r.user_id);
    const { data: coachProfiles } = await supabase.from('profiles').select('id, full_name, username, avatar_url, is_active, is_approved').in('user_id', coachUserIds);
    if (coachProfiles) setCoaches(coachProfiles as CoachProfile[]);
  };

  // Company management - table view
  interface CompanyRow { id: string; name: string; logo_url: string | null; created_at: string; }
  interface CompanyStats { adminCount: number; coachCount: number; studentCount: number; }
  const [companiesList, setCompaniesList] = useState<CompanyRow[]>([]);
  const [companyStatsMap, setCompanyStatsMap] = useState<Map<string, CompanyStats>>(new Map());
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [firmAdminName, setFirmAdminName] = useState('');
  const [firmAdminUsername, setFirmAdminUsername] = useState('');
  const [firmAdminPassword, setFirmAdminPassword] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);

  // Add admin to existing company
  const [addAdminDialogOpen, setAddAdminDialogOpen] = useState(false);
  const [addAdminCompany, setAddAdminCompany] = useState<CompanyRow | null>(null);
  const [addAdminName, setAddAdminName] = useState('');
  const [addAdminUsername, setAddAdminUsername] = useState('');
  const [addAdminPassword, setAddAdminPassword] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  const openAddAdmin = (c: CompanyRow) => {
    setAddAdminCompany(c);
    setAddAdminName('');
    setAddAdminUsername('');
    setAddAdminPassword('');
    setAddAdminDialogOpen(true);
  };

  const handleAddAdmin = async () => {
    if (!addAdminCompany) return;
    if (!addAdminUsername.trim() || !addAdminPassword.trim()) { toast.error('Kullanıcı adı ve şifre zorunludur.'); return; }
    if (addAdminPassword.length < 8) { toast.error('Şifre en az 8 karakter olmalıdır.'); return; }
    setAddingAdmin(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ action: 'create-firm-admin', username: addAdminUsername.trim(), password: addAdminPassword, fullName: addAdminName.trim() || addAdminUsername.trim(), companyId: addAdminCompany.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Yönetici hesabı oluşturulamadı.'); }
      else { toast.success(`"${addAdminName.trim() || addAdminUsername.trim()}" yönetici hesabı oluşturuldu!`); setAddAdminDialogOpen(false); loadCompanies(); }
    } catch { toast.error('Bağlantı hatası.'); }
    setAddingAdmin(false);
  };

  const loadCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCompaniesList(data || []);

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
            const r = roleMap.get(p.user_id);
            if (r === 'firm_admin') stats.adminCount++;
            else if (r === 'koc' && p.is_approved) stats.coachCount++;
            else if (r === 'student' && p.is_approved) stats.studentCount++;
          }
          setCompanyStatsMap(statsMap);
        }
      }
    } catch (err) {
      console.error('Firma listesi alınamadı:', err);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const openCreateCompany = () => {
    setEditingCompany(null);
    setCompanyName('');
    setCompanyLogo('');
    setFirmAdminName('');
    setFirmAdminUsername('');
    setFirmAdminPassword('');
    setCompanyDialogOpen(true);
  };

  const openEditCompany = (c: CompanyRow) => {
    setEditingCompany(c);
    setCompanyName(c.name);
    setCompanyLogo(c.logo_url || '');
    setCompanyDialogOpen(true);
  };

  const handleSaveCompany = async () => {
    if (!companyName.trim()) { toast.error('Firma adı zorunludur.'); return; }
    if (!editingCompany && (!firmAdminUsername.trim() || !firmAdminPassword.trim())) {
      toast.error('Firma yöneticisi kullanıcı adı ve şifre zorunludur.'); return;
    }
    if (!editingCompany && firmAdminPassword.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır.'); return;
    }
    setSavingCompany(true);
    try {
      if (editingCompany) {
        const { error } = await supabase.from('companies').update({ name: companyName.trim(), logo_url: companyLogo.trim() || null }).eq('id', editingCompany.id);
        if (error) throw error;
        toast.success('Firma güncellendi.');
      } else {
        const newCompanyId = crypto.randomUUID();
        const { error: insertError } = await supabase.from('companies').insert({ id: newCompanyId, name: companyName.trim(), logo_url: companyLogo.trim() || null });
        if (insertError) throw insertError;

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify({ action: 'create-firm-admin', username: firmAdminUsername.trim(), password: firmAdminPassword, fullName: firmAdminName.trim() || firmAdminUsername.trim(), companyId: newCompanyId }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Firma oluşturuldu ancak yönetici hesabı oluşturulamadı.');
        } else {
          toast.success('Firma ve yönetici hesabı başarıyla oluşturuldu.');
        }
      }
      setCompanyDialogOpen(false);
      loadCompanies();
    } catch (err: any) {
      console.error('Firma kaydedilemedi:', err);
      toast.error(`Bir hata oluştu: ${err?.message || 'Bilinmeyen hata'}`);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Bu firmayı silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      toast.success('Firma silindi.');
      loadCompanies();
    } catch { toast.error('Firma silinemedi.'); }
  };

  const loadAll = async () => {
    if (isFirmPanel) {
      await loadCompanyUsersFromBackend();
      return;
    }
    await loadCoaches();
    await loadCompanies();
  };

  useEffect(() => {
    if (!loading && (!profile || !hasPanelAccess)) { navigate('/login'); return; }
    if (hasPanelAccess) loadAll();
  }, [loading, role, profile, navigate, profileId, session?.access_token, isFirmPanel]);

  useEffect(() => {
    if (!isFirmPanel && (role === 'admin' || role === 'super_admin')) loadStudents();
  }, [coaches, profileId, role, isFirmPanel]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Yükleniyor...</p></div>;
  if (!profile || !hasPanelAccess) return null;

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const handleCreateStudent = async () => {
    if (!newStudentUsername.trim() || !newStudentPassword.trim()) { toast.error('Kullanıcı adı ve şifre gerekli.'); return; }
    if (newStudentPassword.length < 8) { toast.error('Şifre en az 8 karakter olmalı.'); return; }
    setCreatingStudent(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'create-student', username: newStudentUsername.trim(), password: newStudentPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Öğrenci oluşturulamadı.'); }
      else { toast.success(`Öğrenci "${newStudentUsername}" oluşturuldu!`); setNewStudentUsername(''); setNewStudentPassword(''); setShowCreateStudent(false); setTimeout(() => loadStudents(), 500); }
    } catch { toast.error('Bağlantı hatası.'); }
    setCreatingStudent(false);
  };

  const handleCreateCoach = async () => {
    if (!newCoachUsername.trim() || !newCoachPassword.trim()) { toast.error('Kullanıcı adı ve şifre gerekli.'); return; }
    if (newCoachPassword.length < 8) { toast.error('Şifre en az 8 karakter olmalı.'); return; }
    setCreatingCoach(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'create-coach', username: newCoachUsername.trim(), password: newCoachPassword, fullName: newCoachFullName.trim() || newCoachUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Koç oluşturulamadı.'); }
      else { toast.success(`Koç "${newCoachFullName || newCoachUsername}" oluşturuldu!`); setNewCoachUsername(''); setNewCoachPassword(''); setNewCoachFullName(''); setShowCreateCoach(false); setTimeout(() => loadAll(), 500); }
    } catch { toast.error('Bağlantı hatası.'); }
    setCreatingCoach(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'delete-user', profileId: userToDelete.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Kullanıcı silinemedi.'); }
      else {
        toast.success(`"${userToDelete.name}" silindi.`);
        if (selectedStudent?.id === userToDelete.id) setSelectedStudent(null);
        loadAll();
      }
    } catch { toast.error('Bağlantı hatası.'); }
    setDeleting(false);
    setUserToDelete(null);
  };

  const handleToggleActive = async (id: string, name: string, currentlyActive: boolean) => {
    setSuspending(id);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'toggle-active', profileId: id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'İşlem başarısız.'); }
      else {
        toast.success(data.is_active ? `"${name}" hesabı aktif edildi.` : `"${name}" hesabı donduruldu.`);
        loadAll();
      }
    } catch { toast.error('Bağlantı hatası.'); }
    setSuspending(null);
  };

  const handleAssignCoach = async () => {
    if (!assignDialogStudent) return;
    const coachId = assignCoachId === 'none' ? null : assignCoachId;
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'assign-coach', profileId: assignDialogStudent.id, role: coachId ?? 'none' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Koç ataması başarısız.');
        return;
      }
    } catch {
      toast.error('Bağlantı hatası.');
      return;
    }
    toast.success('Koç ataması güncellendi!');
    setAssignDialogStudent(null);
    setAssignCoachId('');
    loadAll();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) { toast.error('Yalnızca JPG, PNG veya WebP yükleyebilirsiniz.'); return; }
    const ext = file.name.split('.').pop();
    const filePath = `${session.user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { console.error('Avatar yükleme hatası:', uploadError); toast.error('Fotoğraf yüklenemedi. Lütfen tekrar deneyin.'); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profileId);
    toast.success('Profil fotoğrafı güncellendi!');
    await refreshProfile();
  };

  const getCoachName = (coachId: string | null) => {
    if (!coachId) return 'Atanmamış';
    const coach = coaches.find(c => c.id === coachId);
    return coach ? coach.full_name || coach.username || 'Koç' : 'Atanmamış';
  };

  const getCoachStudentCount = (coachId: string) => {
    return students.filter(s => s.coach_id === coachId).length;
  };

  const approvedCoachCount = coaches.filter(c => c.is_approved).length;
  const approvedStudentCount = students.filter(s => s.is_approved).length;

  const activeNav = (tab === 'schedule' || tab === 'profile' || tab === 'management' || tab === 'coach-detail') ? 'management' : tab;

  return (
    <><div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 fixed top-0 inset-x-0 z-40 backdrop-blur-md pt-safe">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => { setSelectedStudent(null); setTab('overview'); }} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <AppLogo size="sm" />
            <span className="font-display text-lg font-bold hidden sm:inline">
              Çakmak<span className="text-primary">Koçluk</span>
            </span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium hidden sm:inline">{isFirmPanel ? 'Firma' : 'Admin'}</span>
          </button>
          <div className="flex items-center gap-2">
            <YKSCountdown compact />
            <ThemeToggle />
            <NotificationBell />
            {/* Announcement */}
            {!isFirmPanel && <Dialog open={showAnnouncement} onOpenChange={setShowAnnouncement}>
              <DialogTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-secondary text-amber-400 hover:text-amber-300 transition-colors" title="Duyuru Gönder">
                  <Megaphone className="h-5 w-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border sm:max-w-md">
                <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Megaphone className="h-5 w-5 text-amber-400" /> Duyuru Gönder</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2"><Label>Başlık</Label><Input value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} placeholder="Önemli Duyuru" className="bg-secondary border-border" maxLength={100} /></div>
                  <div className="space-y-2"><Label>İçerik</Label><Textarea value={announcementBody} onChange={e => setAnnouncementBody(e.target.value)} placeholder="Tüm öğrencilere iletmek istediğiniz mesajı yazın..." className="bg-secondary border-border min-h-[100px] resize-none" maxLength={500} /><p className="text-[11px] text-muted-foreground text-right">{announcementBody.length}/500</p></div>
                  <Button onClick={handleSendAnnouncement} disabled={sendingAnnouncement} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-2"><Megaphone className="h-4 w-4" />{sendingAnnouncement ? 'Gönderiliyor...' : `Tüm Öğrencilere Gönder (${students.length})`}</Button>
                </div>
              </DialogContent>
            </Dialog>}
            <AvatarUpload size="sm" disableUpload />
          </div>
        </div>
      </header>

      {/* Main content - full width */}
      <main className="max-w-7xl mx-auto px-4 py-6 mt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        {tab === 'overview' ? (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-bold">Sistem Genel Bakış</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="glass-card rounded-2xl p-4 sm:p-6 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{approvedCoachCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Aktif Koç</p>
              </div>
              <div className="glass-card rounded-2xl p-4 sm:p-6 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{approvedStudentCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Aktif Öğrenci</p>
              </div>
              <div className="glass-card rounded-2xl p-4 sm:p-6 text-center col-span-2 sm:col-span-1">
                <p className="text-2xl sm:text-3xl font-bold text-amber-400">{students.filter(s => !s.coach_id).length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Koç Atanmamış</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Koç Bazlı Dağılım</h3>
              {coaches.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz koç oluşturulmamış.</p>
              ) : (
                <div className="space-y-3">
                  {coaches.map(c => {
                    const count = getCoachStudentCount(c.id);
                    return (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-3">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={c.full_name} className="h-8 w-8 rounded-full object-cover cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all" onClick={() => setLightboxSrc(c.avatar_url)} />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground text-sm font-bold shadow-orange">
                              {c.full_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="text-sm font-medium">{c.full_name || c.username}</span>
                        </div>
                        <span className="text-sm text-primary font-semibold">{count} öğrenci</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : !isFirmPanel && tab === 'company' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" /> Firma Yönetimi
              </h2>
              <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateCompany} className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
                    <Plus className="h-4 w-4 mr-2" /> Yeni Firma Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCompany ? 'Firmayı Düzenle' : 'Yeni Firma ve Yönetici Ekle'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Firma Adı *</Label>
                      <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Örn: Eğitim A.Ş." />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo URL</Label>
                      <Input value={companyLogo} onChange={e => setCompanyLogo(e.target.value)} placeholder="https://..." />
                    </div>
                    {companyLogo && (
                      <div className="flex justify-center">
                        <img src={companyLogo} alt="Logo önizleme" className="h-16 w-16 rounded-lg object-contain border" onError={e => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                    {!editingCompany && (
                      <>
                        <div className="border-t pt-4">
                          <p className="text-sm font-medium mb-3 flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-primary" /> Firma Yöneticisi Hesabı
                          </p>
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
                    <Button onClick={handleSaveCompany} disabled={savingCompany} className="w-full">
                      {savingCompany ? 'Kaydediliyor...' : editingCompany ? 'Güncelle' : 'Firma ve Yönetici Oluştur'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {companiesLoading ? (
                  <p className="text-muted-foreground text-center py-8">Yükleniyor...</p>
                ) : companiesList.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Henüz firma eklenmemiş.</p>
                    <p className="text-sm text-muted-foreground mt-1">Sağ üstteki butona tıklayarak yeni firma ekleyin.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Logo</TableHead>
                        <TableHead>Firma Adı</TableHead>
                        <TableHead className="text-center">
                          <span className="flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" /> Admin</span>
                        </TableHead>
                        <TableHead className="text-center">
                          <span className="flex items-center justify-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Koç</span>
                        </TableHead>
                        <TableHead className="text-center">
                          <span className="flex items-center justify-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Öğrenci</span>
                        </TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companiesList.map(c => {
                        const stats = companyStatsMap.get(c.id) || { adminCount: 0, coachCount: 0, studentCount: 0 };
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              {c.logo_url ? (
                                <img src={c.logo_url} alt={c.name} className="h-9 w-9 rounded-lg object-contain border" />
                              ) : (
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Building2 className="h-5 w-5 text-primary" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{c.name}</p>
                                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('tr-TR')}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-semibold">{stats.adminCount}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-semibold">{stats.coachCount}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-semibold">{stats.studentCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" onClick={() => openAddAdmin(c)} title="Yönetici Ekle">
                                <UserPlus className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditCompany(c)} title="Düzenle">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteCompany(c.id)} title="Sil">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Add Admin to Existing Company Dialog */}
            <Dialog open={addAdminDialogOpen} onOpenChange={setAddAdminDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yönetici Ekle — {addAdminCompany?.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" /> Bu firmaya yeni bir yönetici hesabı oluşturun.
                  </p>
                  <div className="space-y-2">
                    <Label>Ad Soyad</Label>
                    <Input value={addAdminName} onChange={e => setAddAdminName(e.target.value)} placeholder="Örn: Mehmet Kaya" />
                  </div>
                  <div className="space-y-2">
                    <Label>Kullanıcı Adı *</Label>
                    <Input value={addAdminUsername} onChange={e => setAddAdminUsername(e.target.value)} placeholder="Giriş için kullanılacak" />
                  </div>
                  <div className="space-y-2">
                    <Label>Şifre * (en az 8 karakter)</Label>
                    <Input type="password" value={addAdminPassword} onChange={e => setAddAdminPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <Button onClick={handleAddAdmin} disabled={addingAdmin} className="w-full">
                    {addingAdmin ? 'Oluşturuluyor...' : 'Yönetici Hesabı Oluştur'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : tab === 'analytics' ? (
          <AdminAnalytics students={students} adminProfileId={profileId} />
        ) : tab === 'appointments' ? (
          <AdminAppointments />
        ) : tab === 'coach-detail' && selectedCoach ? (
          <CoachDetailView coachId={selectedCoach.id} coachName={selectedCoach.full_name || selectedCoach.username || 'Koç'} coachAvatar={selectedCoach.avatar_url} onBack={() => { setSelectedCoach(null); setTab('management'); }} />
        ) : tab === 'messages' && profileId ? (
          <ChatView currentProfileId={profileId} currentName={profile.full_name} currentRole={isFirmPanel ? 'admin' : role} currentUserId={session?.user?.id} />
        ) : tab === 'management' && !selectedStudent ? (
          /* Management: Students + Coaches as full-width content */
          <div className="space-y-6">
            {/* Students section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Öğrenciler ({students.length})
                </h2>
                <Dialog open={showCreateStudent} onOpenChange={setShowCreateStudent}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-1">
                      <Plus className="h-4 w-4" /> Öğrenci Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle className="font-display">Yeni Öğrenci Oluştur</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2"><Label>Kullanıcı Adı</Label><Input value={newStudentUsername} onChange={e => setNewStudentUsername(e.target.value)} placeholder="ogrenci123" className="bg-secondary border-border" /></div>
                      <div className="space-y-2"><Label>Şifre</Label><Input type="password" value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} placeholder="••••••••" className="bg-secondary border-border" /></div>
                      <Button onClick={handleCreateStudent} disabled={creatingStudent} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
                        {creatingStudent ? 'Oluşturuluyor...' : 'Öğrenci Oluştur'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {students.map(s => (
                  <div key={s.id} className={`glass-card rounded-2xl p-4 flex items-center gap-3 group transition-colors ${selectedStudent?.id === s.id ? 'bg-primary/10 border border-primary/30' : ''} ${!s.is_active ? 'opacity-60' : ''}`}>
                    <button onClick={() => { setSelectedStudent(s); setTab('schedule'); }} className="flex items-center gap-3 flex-1 min-w-0 min-h-[44px]">
                      {s.avatar_url ? (
                        <img
                          src={s.avatar_url}
                          alt={s.full_name}
                          className={`h-10 w-10 rounded-full object-cover shrink-0 cursor-pointer ring-2 transition-all ${s.is_active ? 'ring-primary/20 hover:ring-primary/50' : 'ring-destructive/20'}`}
                          onClick={(e) => { e.stopPropagation(); setLightboxSrc(s.avatar_url); }}
                        />
                      ) : (
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${s.is_active ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                          {s.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1">
                          {s.full_name || s.username || 'İsimsiz'}
                          {!s.is_active && <Ban className="h-3 w-3 text-destructive inline" />}
                        </p>
                        {!s.is_approved && <p className="text-[11px] text-amber-500">Süper Admin Onayı Bekliyor</p>}
                        <p className="text-xs text-muted-foreground">
                          {s.area ?? 'SAY'} — <span className={s.coach_id ? 'text-primary' : 'text-amber-400'}>{getCoachName(s.coach_id)}</span>
                        </p>
                      </div>
                    </button>
                    <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0">
                      <button onClick={() => { setAssignDialogStudent(s); setAssignCoachId(s.coach_id || 'none'); }} className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10" title="Koç ata">
                        <UserPlus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(s.id, s.full_name || s.username || 'Öğrenci', s.is_active)}
                        disabled={suspending === s.id}
                        className={`h-10 w-10 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center transition-colors ${s.is_active ? 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'}`}
                        title={s.is_active ? 'Hesabı Dondur' : 'Hesabı Aktif Et'}
                      >
                        {s.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setUserToDelete({ id: s.id, name: s.full_name || s.username || 'Öğrenci', type: 'student' })} className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Sil">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {students.length === 0 && <p className="text-sm text-muted-foreground py-4">Henüz öğrenci yok.</p>}
              </div>
            </div>

            {/* Coaches section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Koçlar ({coaches.length})
                </h2>
                <Dialog open={showCreateCoach} onOpenChange={setShowCreateCoach}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 gap-1">
                      <Plus className="h-4 w-4" /> Koç Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle className="font-display">Yeni Koç Oluştur</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2"><Label>Ad Soyad</Label><Input value={newCoachFullName} onChange={e => setNewCoachFullName(e.target.value)} placeholder="Koç ismi" className="bg-secondary border-border" /></div>
                      <div className="space-y-2"><Label>Kullanıcı Adı</Label><Input value={newCoachUsername} onChange={e => setNewCoachUsername(e.target.value)} placeholder="koc123" className="bg-secondary border-border" /></div>
                      <div className="space-y-2"><Label>Şifre</Label><Input type="password" value={newCoachPassword} onChange={e => setNewCoachPassword(e.target.value)} placeholder="••••••••" className="bg-secondary border-border" /></div>
                      <Button onClick={handleCreateCoach} disabled={creatingCoach} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
                        {creatingCoach ? 'Oluşturuluyor...' : 'Koç Oluştur'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {coaches.map(c => (
                  <div key={c.id} className={`glass-card rounded-2xl p-4 flex items-center gap-3 group ${!c.is_active ? 'opacity-60' : ''}`}>
                    <button onClick={() => { setSelectedCoach(c); setTab('coach-detail'); }} className="flex items-center gap-3 flex-1 min-w-0">
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt={c.full_name}
                          className="h-10 w-10 rounded-full object-cover shrink-0 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all shadow-orange"
                          onClick={(e) => { e.stopPropagation(); setLightboxSrc(c.avatar_url); }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-orange flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-orange">
                          {c.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-medium truncate flex items-center gap-1">
                          {c.full_name || c.username}
                          {!c.is_active && <Ban className="h-3 w-3 text-destructive inline" />}
                        </p>
                        {!c.is_approved && <p className="text-[11px] text-amber-500">Süper Admin Onayı Bekliyor</p>}
                        <p className="text-xs text-muted-foreground">{getCoachStudentCount(c.id)} öğrenci</p>
                      </div>
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => handleToggleActive(c.id, c.full_name || c.username || 'Koç', c.is_active)}
                        disabled={suspending === c.id}
                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${c.is_active ? 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'}`}
                        title={c.is_active ? 'Hesabı Dondur' : 'Hesabı Aktif Et'}
                      >
                        {c.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setUserToDelete({ id: c.id, name: c.full_name || c.username || 'Koç', type: 'coach' })} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0" title="Koçu sil">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {coaches.length === 0 && <p className="text-sm text-muted-foreground py-4">Henüz koç yok.</p>}
              </div>
            </div>
          </div>
        ) : selectedStudent ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => { setSelectedStudent(null); setTab('management'); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Yönetim
              </button>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-sm">{selectedStudent.full_name || selectedStudent.username}</span>
            </div>
            <div className="flex gap-1 mb-4">
              <button onClick={() => setTab('schedule')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'schedule' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                <Calendar className="h-4 w-4" /> Program
              </button>
              <button onClick={() => setTab('profile')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'profile' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                <UserIcon className="h-4 w-4" /> Profil
              </button>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold mb-4">
                {selectedStudent.full_name || selectedStudent.username} — {tab === 'schedule' ? 'Haftalık Program' : 'Profil'}
              </h2>
              {tab === 'schedule' ? <StudyPlanner studentId={selectedStudent.id} readOnly={isFirmPanel} /> : <StudentProfileForm studentId={selectedStudent.id} readOnly={isFirmPanel} />}
            </div>
          </>
        ) : (
          <div className="glass-card rounded-2xl p-10 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">Hoş geldiniz, {profile.full_name}</h2>
            <p className="text-muted-foreground">Alt menüden bir bölüm seçin.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border pb-safe">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto scrollbar-hide h-14 sm:h-16">
          {(isFirmPanel ? [
            { key: 'analytics', icon: BarChart3, label: 'Analiz' },
            { key: 'overview', icon: Shield, label: 'Bakış' },
            { key: 'management', icon: Users, label: 'Yönetim' },
            { key: 'messages', icon: MessageCircle, label: 'Mesaj' },
            { key: 'appointments', icon: CalendarCheck, label: 'Randevu' },
          ] : [
            { key: 'analytics', icon: BarChart3, label: 'Analiz' },
            { key: 'overview', icon: Shield, label: 'Bakış' },
            { key: 'management', icon: Users, label: 'Yönetim' },
            { key: 'messages', icon: MessageCircle, label: 'Mesaj' },
            { key: 'appointments', icon: CalendarCheck, label: 'Randevu' },
            { key: 'company', icon: Building2, label: 'Firma' },
          ]).map(item => {
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setSelectedStudent(null); setTab(item.key as any); }}
                className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-w-[56px] flex-1 min-h-[48px] transition-colors relative px-1"
              >
                <div className="relative">
                  <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <span className={`text-[9px] sm:text-[10px] font-medium transition-colors whitespace-nowrap ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
          {/* Çıkış Yap button */}
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-w-[56px] flex-1 min-h-[48px] transition-colors relative px-1"
          >
            <LogOut className="h-5 w-5 text-destructive" />
            <span className="text-[9px] sm:text-[10px] font-medium text-destructive whitespace-nowrap">Çıkış</span>
          </button>
        </div>
      </nav>

      {/* Delete confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">{userToDelete?.type === 'coach' ? 'Koçu Sil' : 'Öğrenciyi Sil'}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{userToDelete?.name}</strong> adlı {userToDelete?.type === 'coach' ? 'koçu' : 'öğrenciyi'} silmek istediğinize emin misiniz?
              {userToDelete?.type === 'coach' && ' Koça atanmış tüm öğrenciler koçsuz kalacaktır.'}
              {' '}Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Siliniyor...' : 'Evet, Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Coach assignment dialog */}
      <Dialog open={!!assignDialogStudent} onOpenChange={(open) => { if (!open) setAssignDialogStudent(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Koç Ata — {assignDialogStudent?.full_name || assignDialogStudent?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Koç Seçin</Label>
              <Select value={assignCoachId} onValueChange={setAssignCoachId}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Koç seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Koç Yok (Atamasız)</SelectItem>
                  {coaches.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name || c.username} ({getCoachStudentCount(c.id)} öğrenci)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssignCoach} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
              Koç Ata
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout confirmation */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Çıkış yapmak istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>Oturumunuz sonlandırılacak ve giriş sayfasına yönlendirileceksiniz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Evet, Çıkış Yap</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
      <ImageLightbox src={lightboxSrc} alt="Profil Fotoğrafı" onClose={() => setLightboxSrc(null)} />
    </>
  );
}
