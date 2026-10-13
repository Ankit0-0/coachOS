import { describe, expect, it } from 'vitest';

import { formatInr, isValidUpiId, parseFee, paymentChip, receiptText, upiPayUrl } from '@/lib/payment';

describe('formatInr', () => {
  it('groups digits the Indian way', () => {
    expect(formatInr(500)).toBe('₹500');
    expect(formatInr(4500)).toBe('₹4,500');
    expect(formatInr(125000)).toBe('₹1,25,000');
    expect(formatInr(10000000)).toBe('₹1,00,00,000');
  });
});

describe('parseFee', () => {
  it('reads whole rupees, tolerating the symbol and commas', () => {
    expect(parseFee(' ₹4,500 ')).toBe(4500);
    expect(parseFee('')).toBeNull();
    expect(parseFee('45.50')).toBeUndefined();
    expect(parseFee('0')).toBeUndefined();
    expect(parseFee('abc')).toBeUndefined();
  });
});

describe('isValidUpiId', () => {
  it('accepts name@bank IDs in any case, and nothing else', () => {
    expect(isValidUpiId('Aman.Fit@OKAxis')).toBe(true);
    expect(isValidUpiId('9876543210@ybl')).toBe(true);
    expect(isValidUpiId('aman')).toBe(false);
    expect(isValidUpiId('aman@')).toBe(false);
    expect(isValidUpiId('a man@upi')).toBe(false);
  });
});

describe('paymentChip and receiptText', () => {
  it('labels each status, and nothing without a fee', () => {
    expect(paymentChip('REPORTED')).toEqual({ label: 'Client says paid', tone: 'partial' });
    expect(paymentChip('NONE')).toBeNull();
  });

  it('writes a receipt', () => {
    expect(
      receiptText({
        receiptNumber: 'CF-AB12CD34',
        coachName: 'Aman Kapoor',
        clientName: 'Priya Nair',
        amountInr: 4500,
        periodLabel: '1 Oct – 31 Oct 2026',
        paidOn: '2 Oct 2026',
      }),
    ).toBe(
      'Receipt CF-AB12CD34\nAman Kapoor received ₹4,500 from Priya Nair\nfor coaching, 1 Oct – 31 Oct 2026.\nPaid on 2 Oct 2026.\n\nSent from CoachFolio',
    );
  });
});

describe('upiPayUrl', () => {
  it('fills in the coach, the amount in rupees and paise, and an encoded note', () => {
    expect(upiPayUrl({ upiId: 'aman@okaxis', payeeName: 'Aman Kapoor', amountInr: 4500, note: 'Coaching Oct' })).toBe(
      'upi://pay?pa=aman@okaxis&pn=Aman%20Kapoor&am=4500.00&cu=INR&tn=Coaching%20Oct',
    );
  });
});
