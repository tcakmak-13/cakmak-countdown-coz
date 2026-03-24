import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2, LogOut } from 'lucide-react';
import AppLogo from '@/components/AppLogo';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const { signOut } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);

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

  useEffect(() => { fetchCompanies(); }, []);

  const openCreate = () => {
    setEditingCompany(null);
    setName('');
    setLogoUrl('');
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
        const { error } = await supabase
          .from('companies')
          .insert({ name: name.trim(), logo_url: logoUrl.trim() || null });
        if (error) throw error;
        toast.success('Firma oluşturuldu.');
      }
      setDialogOpen(false);
      fetchCompanies();
    } catch (err) {
      console.error('Firma kaydedilemedi:', err);
      toast.error('Bir hata oluştu.');
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
      fetchCompanies();
    } catch (err) {
      console.error('Firma silinemedi:', err);
      toast.error('Firma silinemedi.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? 'Kaydediliyor...' : editingCompany ? 'Güncelle' : 'Ekle'}
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
                    <TableRow key={c.id}>
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
                      <TableCell className="text-right space-x-2">
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
      </main>
    </div>
  );
}
