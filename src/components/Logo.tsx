import logoIcon from '@/assets/logo-icon.png';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  hideTextOnMobile?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-16',
};

export default function Logo({ size = 'sm', showText = true, hideTextOnMobile = false, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={logoIcon}
        alt="ÇakmakKoçluk"
        className={cn(
          'w-auto object-contain',
          'mix-blend-lighten dark:mix-blend-lighten',
          'drop-shadow-[0_0_6px_hsl(25,95%,53%,0.5)]',
          sizeMap[size]
        )}
        style={{ padding: 0, margin: 0, border: 'none', background: 'none' }}
      />
      {showText && (
        <span className={cn('font-display text-lg font-bold', hideTextOnMobile && 'hidden sm:inline')}>
          Çakmak<span className="text-primary">Koçluk</span>
        </span>
      )}
    </div>
  );
}
