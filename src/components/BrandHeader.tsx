import { Building2 } from 'lucide-react';
import AppLogo from './AppLogo';
import { useCompanyBrand } from '@/hooks/useCompanyBrand';

interface BrandHeaderProps {
  fallbackLabel?: string;
  size?: 'sm' | 'md';
}

export default function BrandHeader({ fallbackLabel = 'ÇakmakKoçluk', size = 'sm' }: BrandHeaderProps) {
  const { name, logoUrl, loading, isMainBrand } = useCompanyBrand();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-20 rounded bg-muted animate-pulse hidden sm:block" />
      </div>
    );
  }

  // White-label: show company brand (but NOT for main brand ÇakmakKoçluk)
  if (name && !isMainBrand) {
    return (
      <div className="flex items-center gap-2">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className={`${size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'} rounded-full object-cover ring-1 ring-border`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {!logoUrl && (
          <div className={`${size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'} rounded-full bg-primary/10 flex items-center justify-center`}>
            <Building2 className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
          </div>
        )}
        {logoUrl && (
          <div className={`${size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'} rounded-full bg-primary/10 items-center justify-center hidden`}>
            <Building2 className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-primary`} />
          </div>
        )}
        <span className="font-display text-lg font-bold hidden sm:inline truncate max-w-[180px]">
          {name}
        </span>
      </div>
    );
  }

  // Default (or main brand ÇakmakKoçluk): show app branding
  return (
    <div className="flex items-center gap-2">
      <AppLogo size={size} />
      <span className="font-display text-lg font-bold hidden sm:inline">
        Çakmak<span className="text-primary">Koçluk</span>
      </span>
    </div>
  );
}
