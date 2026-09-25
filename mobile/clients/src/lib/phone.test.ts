import { describe, expect, it } from 'vitest';

import { formatPhone, parsePhone, storedPhoneDigits } from '@/lib/phone';

describe('parsePhone', () => {
  it.each(['+91 98765 43210', '9876543210', '919876543210', '098765 43210', '0091 98765 43210'])(
    '%s normalises to 919876543210',
    (input) => {
      expect(parsePhone(input)).toEqual({ status: 'valid', digits: '919876543210' });
    },
  );

  it('keeps a non-Indian number with its own country code', () => {
    expect(parsePhone('+44 7911 123456')).toEqual({ status: 'valid', digits: '447911123456' });
    expect(parsePhone('+1 (415) 555-0132')).toEqual({ status: 'valid', digits: '14155550132' });
  });

  it.each(['abc', '98765', '12345 67890', '+91 12345 67890', '98765-43210 ext 4', '#9876543210'])(
    'rejects %s',
    (input) => {
      expect(parsePhone(input)).toEqual({ status: 'invalid' });
    },
  );

  it('treats blank input as empty, not invalid', () => {
    expect(parsePhone('   ')).toEqual({ status: 'empty' });
    expect(parsePhone(null)).toEqual({ status: 'empty' });
  });
});

describe('storedPhoneDigits', () => {
  it('reads saved digits as already international', () => {
    // Singapore, not an Indian number missing its code.
    expect(storedPhoneDigits('6591234567')).toBe('6591234567');
  });

  it('reads a legacy free-text number the way the form does', () => {
    expect(storedPhoneDigits('+91 98765 43210')).toBe('919876543210');
  });

  it('is null for nothing usable', () => {
    expect(storedPhoneDigits(undefined)).toBeNull();
    expect(storedPhoneDigits('call me')).toBeNull();
  });
});

describe('formatPhone', () => {
  it('shows an Indian number in 5 + 5 groups', () => {
    expect(formatPhone('919876543210')).toBe('+91 98765 43210');
  });

  it('shows an unreadable number as typed rather than hiding it', () => {
    expect(formatPhone('call me')).toBe('call me');
  });
});
