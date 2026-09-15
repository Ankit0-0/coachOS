import { Linking, Platform } from 'react-native';

import { formatPhone, storedPhoneDigits } from '@/lib/phone';

/**
 * https://wa.me/<digits>?text=<message> for a saved number, or null for a
 * missing or unusable one — so a caller hides its button rather than offering
 * one that can't work.
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message?: string): string | null {
  const digits = storedPhoneDigits(phone);
  if (digits === null) return null;
  const url = `https://wa.me/${digits}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}

export type OpenWhatsAppResult = { status: 'opened' } | { status: 'error'; message: string };

/**
 * Opens a WhatsApp chat with `phone`. The link is plain https, so canOpenURL
 * resolving true only means something can take it: with WhatsApp installed
 * that's the app, and without it a browser, where wa.me offers WhatsApp Web or
 * the download. When nothing can take it, or opening throws, the caller gets a
 * message to show rather than a button that silently does nothing.
 */
export async function openWhatsApp(phone: string | null | undefined, message?: string): Promise<OpenWhatsAppResult> {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return { status: 'error', message: 'There’s no usable phone number to message.' };

  const failed: OpenWhatsAppResult = {
    status: 'error',
    message: `Couldn’t open WhatsApp on this device. You can still message ${formatPhone(phone)} from WhatsApp.`,
  };
  try {
    // Web always answers true, and awaiting it first can cost the tap its
    // permission to open a new tab in stricter browsers.
    if (Platform.OS !== 'web' && !(await Linking.canOpenURL(url))) return failed;
    await Linking.openURL(url);
    return { status: 'opened' };
  } catch {
    return failed;
  }
}
