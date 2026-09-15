import { Linking } from 'react-native';

import { formatPhone, storedPhoneDigits } from '@/lib/phone';

/** tel:+919876543210 for a saved number, or null when there's no usable one. */
export function buildTelUrl(phone: string | null | undefined): string | null {
  const digits = storedPhoneDigits(phone);
  return digits === null ? null : `tel:+${digits}`;
}

export type StartCallResult = { status: 'opened' } | { status: 'error'; message: string };

/**
 * Hands the number to the phone app. canOpenURL isn't asked first: on Android
 * 11+ and iOS it answers false for tel: unless the scheme is declared up front,
 * which would hide a call that would have worked. openURL rejecting is the real
 * signal — a tablet with no dialler, say — and gets a message instead of silence.
 */
export async function startCall(phone: string | null | undefined): Promise<StartCallResult> {
  const url = buildTelUrl(phone);
  if (!url) return { status: 'error', message: 'There’s no usable phone number to call.' };
  try {
    await Linking.openURL(url);
    return { status: 'opened' };
  } catch {
    return { status: 'error', message: `Couldn’t start a call on this device. The number is ${formatPhone(phone)}.` };
  }
}
