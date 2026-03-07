import logoIcon from '@/assets/logo-icon.png';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-20 w-20',
};

export default function Logo({ size = 'sm', showText = true, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={logoIcon}
        alt="ÇakmakKoçluk"
        className={cn('rounded-full object-cover', sizeMap[size])}
      />
      {showText && (
        <span className="font-display text-lg font-bold">
          Çakmak<span className="text-primary">Koçluk</span>
        </span>
      )}
    </div>
  );
}
