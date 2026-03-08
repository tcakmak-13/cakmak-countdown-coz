import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import SearchableCombobox from '@/components/SearchableCombobox';
import { UNIVERSITIES } from '@/lib/universities';
import { DEPARTMENTS } from '@/lib/departments';
import PhoneInput from '@/components/PhoneInput';
import { isValidPhone } from '@/lib/phoneUtils';

interface ProfileData {
  id: string;
  full_name: string;
  birthday: string | null;
  phone: string | null;
  parent_phone: string | null;
  email: string | null;
  high_school: string | null;
  obp: string | null;
  goals: string | null;
  expectations: string | null;
  area: string | null;
  grade: string | null;
  target_university: string | null;
  target_department: string | null;
}

interface Props {
  studentId: string;
  readOnly?: boolean;
  onAreaChange?: (area: string) => void;
}

export default function StudentProfileForm({ studentId, readOnly = false, onAreaChange }: Props) {
  const [student, setStudent] = useState<ProfileData | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, birthday, phone, parent_phone, email, high_school, obp, goals, expectations, area, grade, target_university, target_department')
      .eq('id', studentId).single()
      .then(({ data }) => { if (data) setStudent(data as ProfileData); });
  }, [studentId]);

  if (!student) return <p className="text-muted-foreground">Öğrenci bulunamadı.</p>;

  const update = (key: keyof ProfileData, value: string) => {
    setStudent(prev => prev ? { ...prev, [key]: value } : null);
    if (key === 'area' && onAreaChange) onAreaChange(value);
  };

  const phonesValid =
    (!student.phone || student.phone.trim() === '' || isValidPhone(student.phone)) &&
    (!student.parent_phone || student.parent_phone.trim() === '' || isValidPhone(student.parent_phone));

  const handleSave = async () => {
    if (!student) return;
    if (!phonesValid) { toast.error('Lütfen geçerli telefon numaraları giriniz (05XX XXX XX XX).'); return; }
    const { error } = await supabase.from('profiles').update({
      full_name: student.full_name,
      birthday: student.birthday,
      phone: student.phone,
      parent_phone: student.parent_phone,
      email: student.email,
      high_school: student.high_school,
      obp: student.obp,
      goals: student.goals,
      expectations: student.expectations,
      area: student.area,
      grade: student.grade,
      target_university: student.target_university,
      target_department: student.target_department,
    }).eq('id', student.id);
    if (error) { toast.error('Güncelleme başarısız.'); return; }
    toast.success('Profil güncellendi!');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ad Soyad</Label>
          <Input value={student.full_name} onChange={e => update('full_name', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Doğum Tarihi</Label>
          <Input type="date" value={student.birthday ?? ''} onChange={e => update('birthday', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Telefon</Label>
          <PhoneInput value={student.phone ?? ''} onChange={v => update('phone', v)} readOnly={readOnly} />
        </div>
        <div className="space-y-2">
          <Label>Veli Telefonu</Label>
          <PhoneInput value={student.parent_phone ?? ''} onChange={v => update('parent_phone', v)} readOnly={readOnly} />
        </div>
        <div className="space-y-2">
          <Label>E-posta</Label>
          <Input value={student.email ?? ''} onChange={e => update('email', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Lise</Label>
          <Input value={student.high_school ?? ''} onChange={e => update('high_school', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>OBP</Label>
          <Input value={student.obp ?? ''} onChange={e => update('obp', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Alan</Label>
          {readOnly ? (
            <Input value={student.area ?? ''} readOnly className="bg-secondary border-border" />
          ) : (
            <Select value={student.area ?? 'SAY'} onValueChange={v => update('area', v)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="SAY">SAY</SelectItem>
                <SelectItem value="EA">EA</SelectItem>
                <SelectItem value="DİL">DİL</SelectItem>
                <SelectItem value="SÖZ">SÖZ</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Sınıf</Label>
          {readOnly ? (
            <Input value={student.grade ?? ''} readOnly className="bg-secondary border-border" />
          ) : (
            <Select value={student.grade ?? '12. Sınıf'} onValueChange={v => update('grade', v)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="11. Sınıf">11. Sınıf</SelectItem>
                <SelectItem value="12. Sınıf">12. Sınıf</SelectItem>
                <SelectItem value="Mezun">Mezun</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Hedef Üniversite</Label>
          <SearchableCombobox
            options={UNIVERSITIES}
            value={student.target_university ?? ''}
            onChange={v => update('target_university', v)}
            placeholder="Üniversite ara..."
            readOnly={readOnly}
            className=""
          />
        </div>
        <div className="space-y-2">
          <Label>Hedef Bölüm</Label>
          <SearchableCombobox
            options={DEPARTMENTS}
            value={student.target_department ?? ''}
            onChange={v => update('target_department', v)}
            placeholder="Bölüm ara veya yaz..."
            readOnly={readOnly}
            allowCustom={true}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Hedefim</Label>
        <Input
          value={student.goals ?? ''}
          onChange={e => update('goals', e.target.value)}
          readOnly={readOnly}
          placeholder="Örn: Tıp Fakültesi, İlk 1000..."
          className="bg-secondary border-border"
        />
      </div>
      <div className="space-y-2">
        <Label>Koçluktan Beklentilerim</Label>
        <textarea
          value={student.expectations ?? ''}
          onChange={e => update('expectations', e.target.value)}
          readOnly={readOnly}
          rows={4}
          className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Koçunuzdan ne bekliyorsunuz?"
        />
      </div>
      {!readOnly && (
        <Button onClick={handleSave} className="bg-gradient-orange text-primary-foreground border-0 hover:opacity-90">
          Kaydet
        </Button>
      )}
    </div>
  );
}
