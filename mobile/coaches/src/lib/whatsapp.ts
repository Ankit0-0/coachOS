import { Linking } from 'react-native';

import { storedPhoneDigits } from '@/lib/phone';

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
 * Opens a WhatsApp chat with `phone`.
 *
 * No canOpenURL check first. The link is plain https, which something always
 * handles: WhatsApp when it's installed, otherwise a browser, where wa.me offers
 * WhatsApp Web or the download. Asking first is worse than pointless on Android
 * 11+, where package visibility makes canOpenURL answer false for any app not
 * declared in the manifest's <queries> — so it reported failure on phones that
 * would have opened WhatsApp. On web it can also cost the tap its permission to
 * open a tab. openURL throwing is the one real failure.
 */
export async function openWhatsApp(phone: string | null | undefined, message?: string): Promise<OpenWhatsAppResult> {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return { status: 'error', message: 'No phone number to message.' };
  try {
    await Linking.openURL(url);
    return { status: 'opened' };
  } catch {
    return { status: 'error', message: 'Couldn’t open WhatsApp.' };
  }
}
