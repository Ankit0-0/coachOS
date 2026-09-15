/**
 * Phone numbers are stored the way wa.me wants them: digits only, country code
 * first, no "+" — e.g. 919876543210.
 *
 * The market is India, so a number typed without a country code is read as
 * Indian, and the profile form says so under the field. A number from anywhere
 * else has to start with "+" (or "00") and its country code.
 */

/** India's calling code, assumed for a number typed without one. */
export const DEFAULT_COUNTRY_CODE = '91';

export type ParsedPhone = { status: 'empty' } | { status: 'valid'; digits: string } | { status: 'invalid' };

/** Digits and the separators people put between groups. Letters, "#" or "*" mean it isn't a phone number. */
const TYPED_PHONE = /^\+?[\d\s\-().]+$/;

/** "+91 098765 43210": India's trunk 0 doesn't belong after the country code. */
function withoutIndianTrunkZero(digits: string): string {
  return digits.length === 13 && digits.startsWith(`${DEFAULT_COUNTRY_CODE}0`)
    ? DEFAULT_COUNTRY_CODE + digits.slice(3)
    : digits;
}

/** Country code first, or null when the country can't be told. */
function toInternational(hasPlus: boolean, digits: string): string | null {
  if (hasPlus) return withoutIndianTrunkZero(digits);
  // "0091 98765 43210": 00 is the international dialling prefix.
  if (digits.startsWith('00')) return withoutIndianTrunkZero(digits.slice(2));

  // Without a "+", only an Indian number can be written, since India is the one
  // country assumed. A leading 0 is India's trunk prefix: "098765 43210".
  const national = digits.startsWith('0') ? digits.slice(1) : digits;
  // "98765 43210"
  if (national.length === 10) return DEFAULT_COUNTRY_CODE + national;
  // "91 98765 43210", "091-98765-43210"
  if (national.length === 12 && national.startsWith(DEFAULT_COUNTRY_CODE)) return national;
  return null;
}

function isPlausible(digits: string): boolean {
  // E.164: at most 15 digits, and no country code starts with 0.
  if (!/^[1-9]\d{7,14}$/.test(digits)) return false;
  // India: ten-digit mobile numbers start with 6–9, and WhatsApp needs a mobile.
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) return /^91[6-9]\d{9}$/.test(digits);
  // North America: ten digits after the 1.
  if (digits.startsWith('1')) return digits.length === 11;
  return true;
}

/**
 * Reads a number as someone typed it into a form: "+91 98765 43210",
 * "9876543210" and "919876543210" all give 919876543210. For a number that has
 * already been saved, use storedPhoneDigits — saved digits are international
 * already, and "6591234567" means Singapore there, not an Indian number.
 */
export function parsePhone(input: string | null | undefined): ParsedPhone {
  const trimmed = (input ?? '').trim();
  if (trimmed === '') return { status: 'empty' };
  if (!TYPED_PHONE.test(trimmed)) return { status: 'invalid' };

  const international = toInternational(trimmed.startsWith('+'), trimmed.replace(/\D/g, ''));
  return international !== null && isPlausible(international)
    ? { status: 'valid', digits: international }
    : { status: 'invalid' };
}

/**
 * The international digits of a saved number, or null when there's no usable one.
 * This app saves digits only, country code first. A coach's number saved as
 * free text before that ("+91 98765 43210") is read the way the form reads it.
 */
export function storedPhoneDigits(stored: string | null | undefined): string | null {
  const trimmed = (stored ?? '').trim();
  if (/^\d+$/.test(trimmed) && isPlausible(trimmed)) return trimmed;
  const parsed = parsePhone(trimmed);
  return parsed.status === 'valid' ? parsed.digits : null;
}

/** Calling codes one or two digits long; every other code has three. No code is a prefix of another. */
const ONE_DIGIT_CODES = new Set(['1', '7']);
const TWO_DIGIT_CODES = new Set([
  '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51',
  '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90',
  '91', '92', '93', '94', '95', '98',
]);

/** Groups of at most four, as even as they'll go, longer ones last: "912 345 6789", "9123 4567". */
function groupDigits(national: string): string {
  const groupCount = Math.ceil(national.length / 4);
  const size = Math.floor(national.length / groupCount);
  const longerGroups = national.length % groupCount;
  const groups: string[] = [];
  let start = 0;
  for (let index = 0; index < groupCount; index += 1) {
    const length = size + (index >= groupCount - longerGroups ? 1 : 0);
    groups.push(national.slice(start, start + length));
    start += length;
  }
  return groups.join(' ');
}

/**
 * "+91 98765 43210", for showing a saved number back. One that can't be read is
 * shown as it was typed rather than hidden. Null when there's no number.
 */
export function formatPhone(stored: string | null | undefined): string | null {
  const trimmed = (stored ?? '').trim();
  if (trimmed === '') return null;
  const digits = storedPhoneDigits(trimmed);
  if (digits === null) return trimmed;

  const codeLength = ONE_DIGIT_CODES.has(digits.slice(0, 1)) ? 1 : TWO_DIGIT_CODES.has(digits.slice(0, 2)) ? 2 : 3;
  const code = digits.slice(0, codeLength);
  const national = digits.slice(codeLength);
  if (code === DEFAULT_COUNTRY_CODE) return `+${code} ${national.slice(0, 5)} ${national.slice(5)}`;
  return `+${code} ${groupDigits(national)}`;
}

export const INVALID_PHONE_MESSAGE =
  'That doesn’t look like a mobile number. Enter 10 digits for an Indian number, or start with + and the country code.';

/** "+91 98765 43210" to prefill a form with, so saving it again reads it back the same. */
export function phoneForEditing(stored: string | null | undefined): string {
  return formatPhone(stored) ?? '';
}

/** The line under a phone field: what will be saved, or how to write a number so it can be. */
export function phoneFieldHint(input: string): string {
  const parsed = parsePhone(input);
  return parsed.status === 'valid'
    ? `Saves as ${formatPhone(parsed.digits)}.`
    : 'A number without a country code is saved as Indian (+91). Outside India? Start with + and your country code.';
}
