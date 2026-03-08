import { Input } from '@/components/ui/input';
import { formatPhoneNumber, isValidPhone, getPhoneDigits } from '@/lib/phoneUtils';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  id?: string;
}

export default function PhoneInput({ value, onChange, readOnly = false, className, id }: PhoneInputProps) {
  const formatted = formatPhoneNumber(value);
  const digits = getPhoneDigits(value);
  const valid = digits.length === 0 || isValidPhone(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 11) {
      onChange(formatPhoneNumber(digits));
    }
  };

  return (
    <div className="space-y-1">
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        value={formatted}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder="05XX XXX XX XX"
        maxLength={14}
        className={cn(
          'bg-secondary border-border',
          !valid && digits.length > 0 && 'border-destructive focus-visible:ring-destructive',
          className
        )}
      />
      {!valid && digits.length > 0 && (
        <p className="text-xs text-destructive">Lütfen geçerli bir telefon numarası giriniz (05XX...)</p>
      )}
    </div>
  );
}
