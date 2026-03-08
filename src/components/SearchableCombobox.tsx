import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X, ChevronDown } from 'lucide-react';

interface SearchableComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  allowCustom?: boolean;
}

export default function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = 'Ara veya yaz...',
  readOnly = false,
  className,
  allowCustom = true,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())).slice(0, 50)
    : options.slice(0, 50);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (readOnly) {
    return (
      <Input value={value} readOnly className={cn('bg-secondary border-border', className)} />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 cursor-pointer',
          open && 'ring-2 ring-ring',
          className
        )}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        {open ? (
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <span className={cn('flex-1 text-sm truncate', !value && 'text-muted-foreground')}>
            {value || placeholder}
          </span>
        )}
        {value && !open && (
          <X
            className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            onClick={e => { e.stopPropagation(); onChange(''); }}
          />
        )}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {filtered.length === 0 && !allowCustom && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sonuç bulunamadı.</p>
          )}
          {filtered.length === 0 && allowCustom && search.trim() && (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => { onChange(search.trim()); setSearch(''); setOpen(false); }}
            >
              <span className="text-muted-foreground">Ekle: </span>
              <span className="font-medium">{search.trim()}</span>
            </button>
          )}
          {filtered.map(option => (
            <button
              key={option}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                value === option && 'bg-accent/50 font-medium'
              )}
              onClick={() => { onChange(option); setSearch(''); setOpen(false); }}
            >
              {option}
            </button>
          ))}
          {allowCustom && search.trim() && filtered.length > 0 && !filtered.includes(search.trim()) && (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm border-t border-border hover:bg-accent hover:text-accent-foreground"
              onClick={() => { onChange(search.trim()); setSearch(''); setOpen(false); }}
            >
              <span className="text-muted-foreground">Özel ekle: </span>
              <span className="font-medium">{search.trim()}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
