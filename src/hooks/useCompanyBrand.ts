import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const MAIN_BRAND_NAME = 'ÇakmakKoçluk';

interface CompanyBrand {
  name: string | null;
  logoUrl: string | null;
  loading: boolean;
  isMainBrand: boolean;
}

export function useCompanyBrand(): CompanyBrand {
  const { profile, role } = useAuth();
  const [brand, setBrand] = useState<CompanyBrand>({ name: null, logoUrl: null, loading: true, isMainBrand: false });

  useEffect(() => {
    // Super admin always sees original branding
    if (role === 'super_admin') {
      setBrand({ name: null, logoUrl: null, loading: false, isMainBrand: true });
      return;
    }

    if (!profile?.company_id) {
      setBrand({ name: null, logoUrl: null, loading: false, isMainBrand: false });
      return;
    }

    const fetchBrand = async () => {
      const { data } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', profile.company_id!)
        .single();

      const isMain = data?.name === MAIN_BRAND_NAME;

      setBrand({
        name: data?.name ?? null,
        logoUrl: data?.logo_url ?? null,
        loading: false,
        isMainBrand: isMain,
      });
    };

    fetchBrand();
  }, [profile?.company_id, role]);

  return brand;
}
