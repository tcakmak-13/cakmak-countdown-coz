import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, profileId } = useAuth();
  const [fullName, setFullName] = useState('');
  const [highSchool, setHighSchool] = useState('');
  const [obp, setObp] = useState('');
  const [goals, setGoals] = useState('');
  const [area, setArea] = useState('SAY');
  const [grade, setGrade] = useState('12. Sınıf');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !highSchool.trim() || !obp.trim() || !goals.trim()) {
      toast.error('Tüm alanları doldurun.');
      return;
    }
    if (!profileId) { toast.error('Profil bulunamadı.'); return; }

    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      high_school: highSchool.trim(),
      obp: obp.trim(),
      goals: goals.trim(),
      area,
      grade,
      profile_completed: true,
    }).eq('id', profileId);

    setSaving(false);
    if (error) { toast.error('Kaydetme hatası: ' + error.message); return; }

    toast.success('Profil tamamlandı!');
    // Force profile refresh
    window.location.href = '/student';
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <Flame className="h-8 w-8 text-primary" />
          <span className="font-display text-2xl font-bold">
            Çakmak<span className="text-primary">Koçluk</span>
          </span>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSave}
          className="glass-card rounded-2xl p-8 space-y-5"
        >
          <div className="text-center mb-2">
            <h2 className="font-display text-xl font-bold">Profilini Tamamla</h2>
            <p className="text-sm text-muted-foreground mt-1">Devam etmek için tüm alanları doldurun</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Ad Soyad *</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ad Soyad" className="bg-secondary border-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="highSchool">Okul Adı *</Label>
            <Input id="highSchool" value={highSchool} onChange={e => setHighSchool(e.target.value)} placeholder="Lisenizin adı" className="bg-secondary border-border" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="obp">OBP Puanı *</Label>
              <Input id="obp" value={obp} onChange={e => setObp(e.target.value)} placeholder="85.50" className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Alan</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAY">SAY</SelectItem>
                  <SelectItem value="EA">EA</SelectItem>
                  <SelectItem value="SÖZ">SÖZ</SelectItem>
                  <SelectItem value="DİL">DİL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sınıf</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="11. Sınıf">11. Sınıf</SelectItem>
                <SelectItem value="12. Sınıf">12. Sınıf</SelectItem>
                <SelectItem value="Mezun">Mezun</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Hedef Üniversite/Bölüm & Koçluktan Beklentiler *</Label>
            <Textarea id="goals" value={goals} onChange={e => setGoals(e.target.value)} placeholder="Hedef üniversiteniz, bölümünüz ve koçluktan beklentileriniz..." className="bg-secondary border-border min-h-[100px]" />
          </div>

          <Button type="submit" disabled={saving} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-11">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
}
