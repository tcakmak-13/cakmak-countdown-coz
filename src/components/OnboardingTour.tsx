import { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import type { Step } from 'react-joyride';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const FIRM_ADMIN_STEPS: Step[] = [
  {
    target: '[data-tour="management-tab"]',
    content: 'Buradan koçlarınızı ve öğrencilerinizi yönetebilirsiniz. İlk adım olarak bir koç ekleyin!',
    title: '👥 Kullanıcı Yönetimi',
    placement: 'bottom',
  },
  {
    target: '[data-tour="add-coach-btn"]',
    content: 'Bu butona tıklayarak sisteme yeni bir koç hesabı oluşturabilirsiniz.',
    title: '🎓 Koç Ekle',
    placement: 'bottom',
  },
  {
    target: '[data-tour="add-student-btn"]',
    content: 'Öğrenci hesaplarını bu butona tıklayarak oluşturabilirsiniz.',
    title: '📚 Öğrenci Ekle',
    placement: 'bottom',
  },
  {
    target: '[data-tour="analytics-tab"]',
    content: 'Tüm öğrencilerinizin çalışma performanslarını ve gelişim grafiklerini buradan takip edebilirsiniz.',
    title: '📊 Analiz Paneli',
    placement: 'bottom',
  },
  {
    target: '[data-tour="messages-tab"]',
    content: 'Koçlarınız ve öğrencilerinizle doğrudan mesajlaşabilirsiniz.',
    title: '💬 Mesajlaşma',
    placement: 'bottom',
  },
];

const COACH_STEPS: Step[] = [
  {
    target: '[data-tour="analytics-tab"]',
    content: 'Öğrencilerinizin haftalık çalışma performanslarını ve deneme sonuçlarını buradan takip edebilirsiniz.',
    title: '📊 Analiz Paneli',
    placement: 'bottom',
  },
  {
    target: '[data-tour="student-list-tab"]',
    content: 'Atanan öğrencilerinizin listesine buradan ulaşabilirsiniz. Profil detaylarını ve programlarını görüntüleyebilirsiniz.',
    title: '👥 Öğrenci Listem',
    placement: 'bottom',
  },
  {
    target: '[data-tour="schedule-tab"]',
    content: 'Randevu takvimini ve müsaitlik saatlerinizi buradan yönetebilirsiniz.',
    title: '📅 Randevular',
    placement: 'bottom',
  },
  {
    target: '[data-tour="messages-tab"]',
    content: 'Öğrencilerinizle ve yöneticilerinizle doğrudan mesajlaşabilirsiniz.',
    title: '💬 Mesajlaşma',
    placement: 'bottom',
  },
];

interface OnboardingTourProps {
  role: 'firm_admin' | 'koc';
}

export default function OnboardingTour({ role }: OnboardingTourProps) {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkOnboarding = async () => {
      const { data } = await supabase
        .from('user_onboarding')
        .select('tour_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data) {
        // First time - insert record and start tour
        await supabase.from('user_onboarding').insert({ user_id: user.id, tour_completed: false });
        setRun(true);
      } else if (!data.tour_completed) {
        setRun(true);
      }
      setChecked(true);
    };
    checkOnboarding();
  }, [user]);

  const handleCallback = async (data: any) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      if (user) {
        await supabase
          .from('user_onboarding')
          .update({ tour_completed: true, completed_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    }
  };

  if (!checked || !run) return null;

  const steps = role === 'firm_admin' ? FIRM_ADMIN_STEPS : COACH_STEPS;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      locale={{
        back: 'Geri',
        close: 'Kapat',
        last: 'Bitir',
        next: 'İleri',
        skip: 'Turu Atla',
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: 'hsl(25, 95%, 53%)',
          backgroundColor: 'hsl(var(--card))',
          textColor: 'hsl(var(--foreground))',
          arrowColor: 'hsl(var(--card))',
        },
        tooltip: {
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        },
        tooltipTitle: {
          fontSize: '16px',
          fontWeight: 700,
        },
        tooltipContent: {
          fontSize: '14px',
          lineHeight: '1.6',
        },
        buttonNext: {
          borderRadius: '10px',
          padding: '8px 18px',
          fontSize: '14px',
          fontWeight: 600,
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: '14px',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
          fontSize: '13px',
        },
        spotlight: {
          borderRadius: '12px',
        },
      }}
    />
  );
}
