import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, Star, GraduationCap, Award, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CoachOnboarding() {
  const { profile, profileId, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: 'YKS Koçu',
    bio: '',
    yks_ranking: '',
    experience: '1+ Yıl',
    tyt_net: '',
    ayt_net: '',
    specialty: 'SAY',
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!profileId) return;
    if (!form.yks_ranking || !form.tyt_net || !form.ayt_net || !form.bio.trim()) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    setSaving(true);

    // Insert coach_info with profile id
    const { error: infoError } = await supabase.from('coach_info').upsert({
      id: profileId,
      title: form.title,
      bio: form.bio.trim(),
      yks_ranking: form.yks_ranking,
      experience: form.experience,
      tyt_net: form.tyt_net,
      ayt_net: form.ayt_net,
    }, { onConflict: 'id' });

    if (infoError) {
      toast.error('Profil kaydedilemedi: ' + infoError.message);
      setSaving(false);
      return;
    }

    // Mark profile as completed
    const { error: profileError } = await supabase.from('profiles')
      .update({ profile_completed: true, area: form.specialty })
      .eq('id', profileId);

    if (profileError) {
      toast.error('Profil durumu güncellenemedi: ' + profileError.message);
      setSaving(false);
      return;
    }

    toast.success('Profilin oluşturuldu! Paneline yönlendiriliyorsun...');
    await refreshProfile();
    window.location.href = '/coach';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Flame className="h-8 w-8 text-primary" />
          <span className="font-display text-2xl font-bold">Çakmak<span className="text-primary">Koçluk</span></span>
        </div>
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold">Profilini Tamamla</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Hoş geldin, <span className="text-primary font-semibold">{profile?.full_name}</span>! Öğrencilerin seni tanıyabilmesi için bilgilerini doldur.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Unvan *</Label>
            <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="YKS Koçu • Mentor" className="bg-secondary border-border h-11" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-semibold text-sm flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-primary" /> YKS Sıralaması *
              </Label>
              <Input value={form.yks_ranking} onChange={e => update('yks_ranking', e.target.value)} placeholder="1189" className="bg-secondary border-border h-10" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm flex items-center gap-1.5">
                <Star className="h-4 w-4 text-primary" /> Deneyim *
              </Label>
              <Select value={form.experience} onValueChange={v => update('experience', v)}>
                <SelectTrigger className="bg-secondary border-border h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['1+ Yıl', '2+ Yıl', '3+ Yıl', '4+ Yıl', '5+ Yıl'].map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nets */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-primary" /> Sınav Başarın
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">TYT Net *</Label>
                <Input value={form.tyt_net} onChange={e => update('tyt_net', e.target.value)} placeholder="112.5" className="bg-secondary border-border h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">AYT Net *</Label>
                <Input value={form.ayt_net} onChange={e => update('ayt_net', e.target.value)} placeholder="75.25" className="bg-secondary border-border h-10" />
              </div>
            </div>
          </div>

          {/* Specialty */}
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Uzmanlık Alanı *</Label>
            <Select value={form.specialty} onValueChange={v => update('specialty', v)}>
              <SelectTrigger className="bg-secondary border-border h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAY">Sayısal</SelectItem>
                <SelectItem value="EA">Eşit Ağırlık</SelectItem>
                <SelectItem value="SOZ">Sözel</SelectItem>
                <SelectItem value="DIL">Dil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label className="font-semibold text-sm flex items-center gap-1.5">
              <Award className="h-4 w-4 text-primary" /> Hakkında *
            </Label>
            <Textarea
              value={form.bio}
              onChange={e => update('bio', e.target.value)}
              placeholder="Öğrencilerin seni tanıyabilmesi için kendinden bahset..."
              className="bg-secondary border-border min-h-[120px] text-sm leading-relaxed resize-y"
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground text-right">{form.bio.length}/500</p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base font-bold shadow-orange"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Profilimi Oluştur ve Başla'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
