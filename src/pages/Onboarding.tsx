import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SearchableCombobox from '@/components/SearchableCombobox';
import { UNIVERSITIES } from '@/lib/universities';
import { DEPARTMENTS } from '@/lib/departments';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profileId } = useAuth();
  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [highSchool, setHighSchool] = useState('');
  const [obp, setObp] = useState('');
  const [area, setArea] = useState('');
  const [grade, setGrade] = useState('');
  const [targetUniversity, setTargetUniversity] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('');
  const [saving, setSaving] = useState(false);

  const isFormValid =
    fullName.trim() !== '' &&
    birthday.trim() !== '' &&
    phone.trim() !== '' &&
    parentPhone.trim() !== '' &&
    highSchool.trim() !== '' &&
    obp.trim() !== '' &&
    area !== '' &&
    grade !== '' &&
    targetUniversity.trim() !== '' &&
    targetDepartment.trim() !== '';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) { toast.error('Tüm alanları doldurun.'); return; }
    if (!profileId) { toast.error('Profil bulunamadı.'); return; }

    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      birthday: birthday.trim(),
      phone: phone.trim(),
      parent_phone: parentPhone.trim(),
      high_school: highSchool.trim(),
      obp: obp.trim(),
      area,
      grade,
      target_university: targetUniversity.trim(),
      target_department: targetDepartment.trim(),
      profile_completed: true,
    }).eq('id', profileId);

    setSaving(false);
    if (error) { toast.error('Kaydetme hatası: ' + error.message); return; }

    toast.success('Profil tamamlandı!');
    window.location.href = '/student';
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
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
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ad Soyad" className="bg-secondary border-border" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthday">Doğum Tarihi *</Label>
              <Input id="birthday" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="bg-secondary border-border" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon *</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XX XXX XX XX" className="bg-secondary border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentPhone">Veli Telefonu *</Label>
              <Input id="parentPhone" value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="05XX XXX XX XX" className="bg-secondary border-border" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highSchool">Lise *</Label>
              <Input id="highSchool" value={highSchool} onChange={e => setHighSchool(e.target.value)} placeholder="Lisenizin adı" className="bg-secondary border-border" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="obp">OBP *</Label>
              <Input id="obp" value={obp} onChange={e => setObp(e.target.value)} placeholder="85.50" className="bg-secondary border-border" required />
            </div>
            <div className="space-y-2">
              <Label>Alan *</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAY">SAY</SelectItem>
                  <SelectItem value="EA">EA</SelectItem>
                  <SelectItem value="SÖZ">SÖZ</SelectItem>
                  <SelectItem value="DİL">DİL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sınıf *</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="11. Sınıf">11. Sınıf</SelectItem>
                  <SelectItem value="12. Sınıf">12. Sınıf</SelectItem>
                  <SelectItem value="Mezun">Mezun</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hedef Üniversite *</Label>
            <SearchableCombobox
              options={UNIVERSITIES}
              value={targetUniversity}
              onChange={setTargetUniversity}
              placeholder="Üniversite ara..."
            />
          </div>

          <div className="space-y-2">
            <Label>Hedef Bölüm *</Label>
            <SearchableCombobox
              options={DEPARTMENTS}
              value={targetDepartment}
              onChange={setTargetDepartment}
              placeholder="Bölüm ara veya yaz..."
              allowCustom={true}
            />
          </div>

          <Button
            type="submit"
            disabled={!isFormValid || saving}
            className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-11 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
}
