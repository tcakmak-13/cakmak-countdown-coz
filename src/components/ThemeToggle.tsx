import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300',
        'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
      )}
      title={theme === 'dark' ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
      aria-label="Tema değiştir"
    >
      <Sun className={cn(
        'h-[18px] w-[18px] absolute transition-all duration-300',
        theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
      )} />
      <Moon className={cn(
        'h-[18px] w-[18px] absolute transition-all duration-300',
        theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
      )} />
    </button>
  );
}
