import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Award, GraduationCap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CoachProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  username: string | null;
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

    // Fetch all coaches
    const loadCoaches = async () => {
      const { data: coachRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'koc');
      if (!coachRoles || coachRoles.length === 0) {
        setLoading(false);
        return;
      }
      const coachUserIds = coachRoles.map(r => r.user_id);
      const { data: coachProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('user_id', coachUserIds);
      if (coachProfiles) setCoaches(coachProfiles);
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <Flame className="h-8 w-8 text-primary" />
          <span className="font-display text-2xl font-bold">
            Çakmak<span className="text-primary">Koçluk</span>
          </span>
        </div>

        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold">Koçunu Seç</h2>
          <p className="text-sm text-muted-foreground mt-2">Seni sınava hazırlayacak koçunu seç ve yolculuğuna başla!</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Koçlar yükleniyor...</p>
          </div>
        ) : coaches.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">Henüz aktif koç bulunmuyor</h3>
            <p className="text-sm text-muted-foreground">Yönetici tarafından koç hesapları oluşturulduktan sonra burada görünecektir.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {coaches.map(coach => (
                <motion.button
                  key={coach.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedCoachId(coach.id)}
                  className={`glass-card rounded-2xl p-6 text-left transition-all relative overflow-hidden ${
                    selectedCoachId === coach.id
                      ? 'border-2 border-primary shadow-orange'
                      : 'border border-border hover:border-primary/40'
                  }`}
                >
                  {selectedCoachId === coach.id && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-4">
                    {coach.avatar_url ? (
                      <img src={coach.avatar_url} alt={coach.full_name} className="h-14 w-14 rounded-full object-cover border-2 border-primary/30" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange">
                        <Award className="h-7 w-7 text-primary-foreground" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-display font-bold text-lg">{coach.full_name || coach.username}</h3>
                      {coach.username && (
                        <p className="text-xs text-muted-foreground">@{coach.username}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">YKS Koçu</p>
                </motion.button>
              ))}
            </div>

            <Button
              onClick={handleSelectCoach}
              disabled={!selectedCoachId || saving}
              className="w-full max-w-md mx-auto block bg-gradient-orange text-primary-foreground border-0 hover:opacity-90 h-12 text-base disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Koçumu Seç ve Devam Et'}
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}