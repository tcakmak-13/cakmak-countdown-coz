import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Star, GraduationCap, Award, Instagram, MessageCircle as WhatsAppIcon, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CoachDetailViewProps {
  coachId: string;
  coachName: string;
  coachAvatar: string | null;
  onBack: () => void;
}

interface CoachInfo {
  title: string;
  bio: string;
  yks_ranking: string;
  experience: string;
  tyt_net: string;
  ayt_net: string;
  instagram: string;
  whatsapp_link: string;
  appointment_hours: string;
}

interface AssignedStudent {
  id: string;
  full_name: string;
  username: string | null;
  area: string | null;
  grade: string | null;
  target_university: string | null;
  target_department: string | null;
  created_at: string;
}

export default function CoachDetailView({ coachId, coachName, coachAvatar, onBack }: CoachDetailViewProps) {
  const [info, setInfo] = useState<CoachInfo | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<AssignedStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [infoRes, studentsRes] = await Promise.all([
        supabase.from('coach_info').select('*').eq('id', coachId).maybeSingle(),
        supabase.from('profiles').select('id, full_name, username, area, grade, target_university, target_department, created_at').eq('coach_id', coachId),
      ]);
      if (infoRes.data) setInfo(infoRes.data as CoachInfo);
      if (studentsRes.data) setAssignedStudents(studentsRes.data as AssignedStudent[]);
      setLoading(false);
    };
    load();
  }, [coachId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="font-display text-xl font-bold">Koç Detayı</h2>
      </div>

      {/* Coach profile card */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="h-24 bg-gradient-orange relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(35_100%_60%/0.4),transparent_60%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
        </div>
        <div className="px-6 pb-6 -mt-10 relative z-10">
          <div className="flex items-end gap-4">
            <div className="h-20 w-20 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange ring-4 ring-card overflow-hidden shrink-0">
              {coachAvatar ? (
                <img src={coachAvatar} alt={coachName} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl font-bold text-primary-foreground">{coachName.charAt(0)}</span>
              )}
            </div>
            <div className="pb-1">
              <h3 className="font-display text-xl font-bold">{coachName}</h3>
              <p className="text-sm text-muted-foreground">{info?.title || 'YKS Koçu'}</p>
            </div>
          </div>

          {info && (
            <div className="mt-6 space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card rounded-xl p-3 text-center border border-primary/20">
                  <Trophy className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">YKS Sıralaması</p>
                  <p className="font-display text-lg font-bold text-primary mt-0.5">{info.yks_ranking || '-'}</p>
                </div>
                <div className="glass-card rounded-xl p-3 text-center border border-primary/20">
                  <Star className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Deneyim</p>
                  <p className="font-display text-lg font-bold text-primary mt-0.5">{info.experience || '-'}</p>
                </div>
                <div className="glass-card rounded-xl p-3 text-center border border-primary/20">
                  <GraduationCap className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">TYT Net</p>
                  <p className="font-display text-lg font-bold text-primary mt-0.5">{info.tyt_net || '-'}</p>
                </div>
                <div className="glass-card rounded-xl p-3 text-center border border-primary/20">
                  <GraduationCap className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AYT Net</p>
                  <p className="font-display text-lg font-bold text-primary mt-0.5">{info.ayt_net || '-'}</p>
                </div>
              </div>

              {/* Bio */}
              {info.bio && (
                <div className="glass-card rounded-xl p-4 border border-primary/20">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-primary" /> Hakkında
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{info.bio}</p>
                </div>
              )}

              {/* Contact */}
              {(info.instagram || info.whatsapp_link || info.appointment_hours) && (
                <div className="glass-card rounded-xl p-4 border border-primary/20 space-y-2">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">İletişim</h4>
                  {info.whatsapp_link && (
                    <a href={info.whatsapp_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-emerald-400 transition-colors">
                      <WhatsAppIcon className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-muted-foreground">WhatsApp</span>
                    </a>
                  )}
                  {info.instagram && (
                    <a href={`https://instagram.com/${info.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-400 transition-colors">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      <span className="text-sm text-muted-foreground">{info.instagram}</span>
                    </a>
                  )}
                  {info.appointment_hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{info.appointment_hours}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!info && (
            <p className="text-sm text-muted-foreground mt-4">Bu koç henüz profil bilgilerini doldurmamış.</p>
          )}
        </div>
      </div>

      {/* Assigned students */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" /> Bağlı Öğrenciler ({assignedStudents.length})
        </h3>
        {assignedStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Bu koça henüz öğrenci atanmamış.</p>
        ) : (
          <div className="space-y-2">
            {assignedStudents.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {s.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.full_name || s.username || 'İsimsiz'}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.area ?? 'SAY'} — {s.grade ?? '12. Sınıf'}
                    {s.target_university && <span className="ml-1 text-primary/70">• 🎯 {s.target_university}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">
                    Kayıt: {new Date(s.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
