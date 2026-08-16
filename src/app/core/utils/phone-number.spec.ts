import { buildWhatsAppUrl, normalizePhone } from './phone-number';

describe('phone number utilities', () => {
  it('normalizes an Indian national number and removes its trunk prefix', () => {
    expect(normalizePhone('+91', '09876543210')).toBe('+919876543210');
  });

  it('keeps an explicitly international number independent of the selected country', () => {
    expect(normalizePhone('+91', '+44 7700 900123')).toBe('+447700900123');
  });

  it('creates a safely encoded WhatsApp URL', () => {
    expect(buildWhatsAppUrl('+91', '98765 43210', 'Hello & welcome')).toBe(
      'https://wa.me/919876543210?text=Hello%20%26%20welcome',
    );
  });

  it('rejects an incomplete phone number', () => {
    expect(buildWhatsAppUrl('+91', '123', '')).toBeNull();
  });
});
