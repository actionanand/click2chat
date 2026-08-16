export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizePhone(callingCode: string, nationalNumber: string): string {
  const code = digitsOnly(callingCode);
  const rawNumber = nationalNumber.trim();
  let number = digitsOnly(rawNumber);

  if (rawNumber.startsWith('+')) return number.length >= 7 ? `+${number}` : '';
  if (code === '91' && number.length === 11 && number.startsWith('0')) number = number.slice(1);

  return code && number ? `+${code}${number}` : '';
}

export function buildWhatsAppUrl(
  callingCode: string,
  nationalNumber: string,
  message: string,
): string | null {
  const normalized = normalizePhone(callingCode, nationalNumber);
  if (normalized.length < 8) return null;
  const text = message.trim();
  return `https://wa.me/${normalized.slice(1)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function displayPhone(value: string): string {
  const digits = digitsOnly(value);
  if (!digits) return 'Private number';
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return value.trim() || digits;
}
