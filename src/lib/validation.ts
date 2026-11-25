// Client-side checks that mirror the API's rules (the server re-validates everything).

/** Strip spaces, dashes, +91 / 91 / 0 prefixes. */
export function normalizePhone(value: string): string {
  let digits = value.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isValidIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(value));
}

export const MIN_PASSWORD_LENGTH = 8;
