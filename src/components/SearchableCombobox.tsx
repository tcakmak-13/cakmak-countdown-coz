import { useState, useRef, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
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
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())).slice(0, 50)
    : options.slice(0, 50);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCustomMode(false);
        setCustomText('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (customMode) {
      setTimeout(() => customInputRef.current?.focus(), 0);
    }
  }, [customMode]);

  const handleCustomSubmit = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      onChange(trimmed);
      setCustomText('');
      setCustomMode(false);
      setSearch('');
      setOpen(false);
    }
  };

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
          {/* Fixed "+ Özel Ekle" button at top */}
          {allowCustom && !customMode && (
            <button
              type="button"
              className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 text-primary font-bold border-b border-border/50 hover:bg-primary/10 transition-colors sticky top-0 bg-card z-10"
              onClick={(e) => { e.stopPropagation(); setCustomMode(true); }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Özel Ekle</span>
            </button>
          )}

          {/* Custom input mode */}
          {allowCustom && customMode && (
            <div className="px-3 py-2.5 border-b border-border/50 sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                <input
                  ref={customInputRef}
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(); if (e.key === 'Escape') { setCustomMode(false); setCustomText(''); } }}
                  placeholder="Özel ders/konu adı yaz..."
                  className="flex-1 bg-secondary rounded-lg px-3 py-1.5 text-sm text-foreground outline-none border border-border focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={!customText.trim()}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors shrink-0',
                    customText.trim()
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setCustomMode(false); setCustomText(''); }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sonuç bulunamadı.</p>
          )}
          {filtered.map(option => (
            <button
              key={option}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                value === option && 'bg-accent/50 font-medium'
              )}
              onClick={() => { onChange(option); setSearch(''); setOpen(false); setCustomMode(false); setCustomText(''); }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
