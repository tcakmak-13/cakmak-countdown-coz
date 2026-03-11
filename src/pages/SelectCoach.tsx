import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, GraduationCap, Award, CheckCircle } from 'lucide-react';
import AppLogo from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CoachProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  title: string;
  bio: string;
  yks_ranking: string;
  experience: string;
  tyt_net: string;
  ayt_net: string;
}

export default function SelectCoach() {
  const navigate = useNavigate();
  const { user, profileId, profile, refreshProfile } = useAuth();
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (profile?.coach_selected) { navigate('/student'); return; }

    const loadCoaches = async () => {
      const { data, error } = await supabase.rpc('get_coach_profiles');
      if (data && data.length > 0) setCoaches(data as CoachProfile[]);
      if (error) console.error('Coach load error:', error.message);
      setLoading(false);
    };
    loadCoaches();
  }, [user, profile, navigate]);

  const handleSelectCoach = async () => {
    if (!selectedCoachId || !profileId) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      coach_id: selectedCoachId,
      coach_selected: true,
    }).eq('id', profileId);
    if (error) {
      toast.error('Koç seçimi kaydedilemedi: ' + error.message);
      setSaving(false);
      return;
    }
    toast.success('Koçun seçildi! Paneline yönlendiriliyorsun...');
    await refreshProfile();
    window.location.href = '/student';
  };

  if (!user) return null;

  const selectedCoach = coaches.find(c => c.id === selectedCoachId);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Flame className="h-8 w-8 text-primary" />
          <span className="font-display text-2xl font-bold">Çakmak<span className="text-primary">Koçluk</span></span>
        </div>
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold">Koçunu Seç</h1>
          <p className="text-sm text-muted-foreground mt-2">Seni sınava hazırlayacak koçunu seç ve yolculuğuna başla!</p>
        </div>

        {loading ? (
          <div className="text-center py-12"><p className="text-muted-foreground">Koçlar yükleniyor...</p></div>
        ) : coaches.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">Henüz aktif koç bulunmuyor</h3>
            <p className="text-sm text-muted-foreground">Yönetici tarafından koç hesapları oluşturulduktan sonra burada görünecektir.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Coach Cards */}
            <div className="grid grid-cols-1 gap-5">
              {coaches.map((coach, i) => {
                const isSelected = selectedCoachId === coach.id;
                return (
                  <motion.button
                    key={coach.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCoachId(coach.id)}
                    className={`w-full text-left rounded-2xl transition-all relative overflow-hidden border ${
                      isSelected
                        ? 'border-primary shadow-[0_0_30px_-5px_hsl(25_95%_53%/0.4)] bg-card'
                        : 'border-border/60 bg-card/60 hover:border-primary/30 hover:bg-card/80'
                    }`}
                  >
                    {/* Selection indicator */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute top-4 right-4 z-10"
                        >
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-orange">
                            <CheckCircle className="h-5 w-5 text-primary-foreground" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="p-6 space-y-5">
                      {/* Avatar + Name + Title */}
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange ring-2 ring-primary/20 overflow-hidden shrink-0">
                          {coach.avatar_url ? (
                            <img src={coach.avatar_url} alt={coach.full_name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-display text-2xl font-bold text-primary-foreground">{coach.full_name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-xl">{coach.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{coach.title || 'YKS Koçu'} • Mentor</p>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-center">
                          <Trophy className="h-5 w-5 text-primary mx-auto mb-1.5" />
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">YKS Sıralaması</p>
                          <p className="font-display text-xl font-bold text-primary mt-0.5">{coach.yks_ranking}</p>
                        </div>
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-center">
                          <Star className="h-5 w-5 text-primary mx-auto mb-1.5" />
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Deneyim</p>
                          <p className="font-display text-xl font-bold text-primary mt-0.5">{coach.experience}</p>
                        </div>
                      </div>

                      {/* Exam Scores */}
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
                        <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-primary" /> Sınav Başarısı
                        </h4>
                        <div className="flex items-center justify-between py-1.5 border-b border-border/30">
                          <span className="text-sm font-medium">TYT Net</span>
                          <span className="font-display text-lg font-bold text-primary">{coach.tyt_net}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-sm font-medium">AYT Net</span>
                          <span className="font-display text-lg font-bold text-primary">{coach.ayt_net}</span>
                        </div>
                      </div>

                      {/* Bio */}
                      {coach.bio && (
                        <div className="rounded-xl border border-border/40 bg-secondary/30 p-4">
                          <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <Award className="h-4 w-4 text-primary" /> Hakkında
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{coach.bio}</p>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={handleSelectCoach}
                disabled={!selectedCoachId || saving}
                className="w-full max-w-md mx-auto block bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-13 text-base font-semibold disabled:opacity-40 shadow-orange"
              >
                {saving ? 'Kaydediliyor...' : selectedCoach ? `${selectedCoach.full_name} ile Devam Et` : 'Koçunu Seç'}
              </Button>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
