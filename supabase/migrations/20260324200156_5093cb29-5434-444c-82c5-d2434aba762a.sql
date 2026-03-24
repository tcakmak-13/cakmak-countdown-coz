-- Add company_id to profiles first
ALTER TABLE public.profiles
ADD COLUMN company_id uuid;

-- Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK constraint
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage companies"
ON public.companies FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view own company"
ON public.companies FOR SELECT TO authenticated
USING (id IN (
  SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid()
));