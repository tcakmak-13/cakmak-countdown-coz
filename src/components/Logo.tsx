import logoSrc from '@/assets/logo.png';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const textSizeMap = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoSrc}
        alt="ÇakmakKoçluk Logo"
        className={`${sizeMap[size]} object-contain drop-shadow-[0_0_8px_hsl(25,95%,53%,0.6)] mix-blend-lighten`}
      />
      {showText && (
        <span className={`font-display font-bold ${textSizeMap[size]}`}>
          Çakmak<span className="text-primary">Koçluk</span>
        </span>
      )}
    </div>
  );
}
