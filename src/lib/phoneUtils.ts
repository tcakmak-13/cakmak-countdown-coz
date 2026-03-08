/**
 * Formats a raw phone string into 05XX XXX XX XX format.
 * Only keeps digits, enforces 05 prefix and max 11 digits.
 */
export function formatPhoneNumber(value: string): string {
  // Strip non-digits
  let digits = value.replace(/\D/g, '');

  // Enforce max 11 digits
  if (digits.length > 11) digits = digits.slice(0, 11);

  // Build formatted string with spaces
  let formatted = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 4 || i === 7 || i === 9) formatted += ' ';
    formatted += digits[i];
  }
  return formatted;
}

/**
 * Validates a phone number: must be 11 digits starting with 05.
 */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('05');
}

/**
 * Returns raw digits from formatted phone.
 */
export function getPhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}
