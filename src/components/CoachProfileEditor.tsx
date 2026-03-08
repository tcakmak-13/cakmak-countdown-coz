import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Trophy, Star, GraduationCap, Award, Save, Instagram, MessageCircle as WhatsAppIcon, Clock, Circle, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CoachData {
  id: string;
  title: string;
  bio: string;
  whatsapp_link: string;
  instagram: string;
  appointment_hours: string;
  yks_ranking: string;
  experience: string;
  tyt_net: string;
  ayt_net: string;
  daily_quote: string;
}

interface Props {
  adminName: string;
  adminAvatarUrl: string | null;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  coachProfileId?: string;
}

export default function CoachProfileEditor({ adminName, adminAvatarUrl, onAvatarUpload }: Props) {
  const [data, setData] = useState<CoachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('coach_info')
      .select('*')
      .limit(1)
      .single()
      .then(({ data: row }) => {
        if (row) setData(row as unknown as CoachData);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase
      .from('coach_info')
      .update({
        title: data.title,
        bio: data.bio,
        whatsapp_link: data.whatsapp_link,
        instagram: data.instagram,
        appointment_hours: data.appointment_hours,
        yks_ranking: data.yks_ranking,
        experience: data.experience,
        tyt_net: data.tyt_net,
        ayt_net: data.ayt_net,
        daily_quote: data.daily_quote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);
    setSaving(false);
    if (error) {
      toast.error('Kaydetme hatası: ' + error.message);
    } else {
      toast.success('Koç bilgileri güncellendi! Tüm öğrencilere yansıyacak.');
    }
  };

  const update = (field: keyof CoachData, value: string) => {
    if (data) setData({ ...data, [field]: value });
  };

  if (loading || !data) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Editor Panel */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Koç Profili Düzenle
        </h3>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group">
            <div className="h-20 w-20 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange overflow-hidden ring-2 ring-primary/30">
              {adminAvatarUrl ? (
                <img src={adminAvatarUrl} alt="Koç" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl font-bold text-primary-foreground">{adminName.charAt(0)}</span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={onAvatarUpload} className="hidden" />
          </label>
          <div>
            <p className="font-display font-bold text-lg">{adminName}</p>
            <p className="text-xs text-muted-foreground">Fotoğrafı değiştirmek için tıklayın</p>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label className="font-semibold text-sm">Unvan</Label>
          <Input
            value={data.title}
            onChange={e => update('title', e.target.value)}
            placeholder="YKS Koçu • Mentor"
            className="bg-secondary border-border h-11 text-base"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label className="font-semibold text-sm">Hakkımda / Biyografi</Label>
          <Textarea
            value={data.bio}
            onChange={e => update('bio', e.target.value)}
            placeholder="Öğrencilerin göreceği tanıtım yazınız..."
            className="bg-secondary border-border min-h-[120px] text-sm leading-relaxed resize-y"
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="font-semibold text-sm">YKS Sıralaması</Label>
            <Input value={data.yks_ranking} onChange={e => update('yks_ranking', e.target.value)} placeholder="Top 1000" className="bg-secondary border-border h-10" />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Deneyim</Label>
            <Input value={data.experience} onChange={e => update('experience', e.target.value)} placeholder="3+ Yıl" className="bg-secondary border-border h-10" />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-sm">TYT Net</Label>
            <Input value={data.tyt_net} onChange={e => update('tyt_net', e.target.value)} placeholder="112.5" className="bg-secondary border-border h-10" />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold text-sm">AYT Net</Label>
            <Input value={data.ayt_net} onChange={e => update('ayt_net', e.target.value)} placeholder="75.25" className="bg-secondary border-border h-10" />
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <Label className="font-semibold text-sm">İletişim Bilgileri</Label>
          <div className="flex items-center gap-2">
            <WhatsAppIcon className="h-4 w-4 text-emerald-500 shrink-0" />
            <Input value={data.whatsapp_link} onChange={e => update('whatsapp_link', e.target.value)} placeholder="https://wa.me/905xxxxxxxxx" className="bg-secondary border-border h-10 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-pink-500 shrink-0" />
            <Input value={data.instagram} onChange={e => update('instagram', e.target.value)} placeholder="@kullaniciadi" className="bg-secondary border-border h-10 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <Input value={data.appointment_hours} onChange={e => update('appointment_hours', e.target.value)} placeholder="Pazartesi-Cuma 10:00-18:00" className="bg-secondary border-border h-10 text-sm" />
          </div>
        </div>

        {/* Daily Quote Override */}
        <div className="space-y-2 border-t border-border pt-4">
          <Label className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Günün Sözünü Ben Belirle
          </Label>
          <Textarea
            value={data.daily_quote}
            onChange={e => update('daily_quote', e.target.value)}
            placeholder="Boş bırakırsan rastgele söz gösterilir. Bir söz yazarsan tüm öğrenciler bunu görür."
            className="bg-secondary border-border min-h-[80px] text-sm leading-relaxed resize-y"
            maxLength={300}
          />
          <p className="text-[11px] text-muted-foreground">
            {data.daily_quote ? '✅ Özel söz aktif — tüm öğrenciler bunu görecek.' : '🎲 Rastgele söz modu aktif.'}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base font-bold">
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Kaydediliyor...' : 'Güncelle'}
        </Button>
      </div>

      {/* Live Preview */}
      <div className="space-y-4">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
          Öğrenci Gözünden — Canlı Önizleme
        </h3>

        <div className="glass-card rounded-2xl overflow-hidden border border-primary/10">
          {/* Hero */}
          <div className="h-28 bg-gradient-orange relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(35_100%_60%/0.4),transparent_60%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
          </div>

          {/* Avatar */}
          <div className="flex justify-center -mt-12 relative z-10">
            <div className="h-20 w-20 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange ring-4 ring-card overflow-hidden">
              {adminAvatarUrl ? (
                <img src={adminAvatarUrl} alt={adminName} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl font-bold text-primary-foreground">{adminName.charAt(0)}</span>
              )}
            </div>
          </div>

          <div className="px-5 pb-6 pt-3 text-center space-y-4">
            <div>
              <p className="font-display text-xl font-bold">{adminName}</p>
              <p className="text-sm text-muted-foreground">{data.title || 'YKS Koçu'}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="glass-card rounded-xl p-3 text-center border border-primary/20">
                <Trophy className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">YKS Sıralaması</p>
                <p className="font-display text-lg font-bold text-primary mt-0.5">{data.yks_ranking || '—'}</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center border border-primary/20">
                <Star className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Deneyim</p>
                <p className="font-display text-lg font-bold text-primary mt-0.5">{data.experience || '—'}</p>
              </div>
            </div>

            {/* Nets */}
            <div className="glass-card rounded-xl p-4 border border-primary/20 space-y-2 text-left">
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-primary" /> Sınav Başarısı
              </h4>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-sm font-medium">TYT Net</span>
                <span className="font-display text-lg font-bold text-primary">{data.tyt_net || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm font-medium">AYT Net</span>
                <span className="font-display text-lg font-bold text-primary">{data.ayt_net || '—'}</span>
              </div>
            </div>

            {/* Bio */}
            {data.bio && (
              <div className="glass-card rounded-xl p-4 border border-primary/20 text-left space-y-2">
                <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" /> Hakkında
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{data.bio}</p>
              </div>
            )}

            {/* Contact preview */}
            {(data.whatsapp_link || data.instagram || data.appointment_hours) && (
              <div className="glass-card rounded-xl p-4 border border-primary/20 text-left space-y-2">
                <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest">İletişim</h4>
                {data.whatsapp_link && (
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-muted-foreground truncate">{data.whatsapp_link}</span>
                  </div>
                )}
                {data.instagram && (
                  <div className="flex items-center gap-2">
                    <Instagram className="h-3.5 w-3.5 text-pink-500" />
                    <span className="text-xs text-muted-foreground">{data.instagram}</span>
                  </div>
                )}
                {data.appointment_hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">{data.appointment_hours}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
