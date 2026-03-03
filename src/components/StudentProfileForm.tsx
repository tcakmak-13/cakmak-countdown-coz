import { useState, useEffect } from 'react';
import { Student } from '@/lib/types';
import { getStudents, saveStudents } from '@/lib/mockData';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  studentId: string;
  readOnly?: boolean;
}

export default function StudentProfileForm({ studentId, readOnly = false }: Props) {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const s = getStudents().find(s => s.id === studentId);
    if (s) setStudent({ ...s });
  }, [studentId]);

  if (!student) return <p className="text-muted-foreground">Öğrenci bulunamadı.</p>;

  const update = (key: keyof Student, value: string) => {
    setStudent(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSave = () => {
    if (!student) return;
    const all = getStudents().map(s => s.id === student.id ? student : s);
    saveStudents(all);
    toast.success('Profil güncellendi!');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ad Soyad</Label>
          <Input value={student.fullName} onChange={e => update('fullName', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Doğum Tarihi</Label>
          <Input type="date" value={student.birthday} onChange={e => update('birthday', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Telefon</Label>
          <Input value={student.phone} onChange={e => update('phone', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Veli Telefonu</Label>
          <Input value={student.parentPhone} onChange={e => update('parentPhone', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>E-posta</Label>
          <Input value={student.email} onChange={e => update('email', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Lise</Label>
          <Input value={student.highSchool} onChange={e => update('highSchool', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>OBP</Label>
          <Input value={student.obp} onChange={e => update('obp', e.target.value)} readOnly={readOnly} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Alan</Label>
          {readOnly ? (
            <Input value={student.area} readOnly className="bg-secondary border-border" />
          ) : (
            <Select value={student.area} onValueChange={v => update('area', v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
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
            <Input value={student.grade} readOnly className="bg-secondary border-border" />
          ) : (
            <Select value={student.grade} onValueChange={v => update('grade', v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="11. Sınıf">11. Sınıf</SelectItem>
                <SelectItem value="12. Sınıf">12. Sınıf</SelectItem>
                <SelectItem value="Mezun">Mezun</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Hedefler ve Beklentiler</Label>
        <textarea
          value={student.goals}
          onChange={e => update('goals', e.target.value)}
          readOnly={readOnly}
          rows={4}
          className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Hedeflerinizi yazın..."
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
