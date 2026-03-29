import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CompanyBrand {
  name: string | null;
  logoUrl: string | null;
  loading: boolean;
}

export function useCompanyBrand(): CompanyBrand {
  const { profile } = useAuth();
  const [brand, setBrand] = useState<CompanyBrand>({ name: null, logoUrl: null, loading: true });

  useEffect(() => {
    if (!profile?.company_id) {
      setBrand({ name: null, logoUrl: null, loading: false });
      return;
    }

    const fetchBrand = async () => {
      const { data } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', profile.company_id!)
        .single();

      setBrand({
        name: data?.name ?? null,
        logoUrl: data?.logo_url ?? null,
        loading: false,
      });
    };

    fetchBrand();
  }, [profile?.company_id]);

  return brand;
}
