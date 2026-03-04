
CREATE TABLE public.coach_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'YKS Koçu',
  bio text NOT NULL DEFAULT '',
  whatsapp_link text DEFAULT '',
  instagram text DEFAULT '',
  appointment_hours text DEFAULT '',
  yks_ranking text DEFAULT 'Top 1000',
  experience text DEFAULT '3+ Yıl',
  tyt_net text DEFAULT '112.5',
  ayt_net text DEFAULT '75.25',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_info ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage coach_info" ON public.coach_info
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Everyone authenticated can read
CREATE POLICY "Anyone can read coach_info" ON public.coach_info
  FOR SELECT TO authenticated
  USING (true);

-- Insert default row
INSERT INTO public.coach_info (title, bio) VALUES (
  'YKS Koçu • Mentor',
  'YKS sürecinde yüzlerce öğrenciye rehberlik etmiş, deneyimli bir koç. Motivasyon, planlama ve strateji konularında uzmanlaşmış olup öğrencilerin potansiyellerini en üst düzeye çıkarmayı hedefler.'
);
