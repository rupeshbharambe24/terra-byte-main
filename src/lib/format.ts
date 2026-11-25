const LOCALES: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

export function formatDate(iso: string | null | undefined, language: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALES[language ?? 'en'] ?? 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatLocation(parts: Array<string | null | undefined>): string {
  const text = parts.filter(Boolean).join(', ');
  return text || '—';
}

const localeOf = (language: string | undefined) => LOCALES[language ?? 'en'] ?? 'en-IN';

/** Rupees with Indian digit grouping, e.g. ₹1,23,456.50 (paise shown only when present). */
export function formatMoney(value: number | null | undefined, language?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const fraction = Math.round(value * 100) % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(localeOf(language), {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fraction,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, language?: string, maxFraction = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(localeOf(language), { maximumFractionDigits: maxFraction }).format(value);
}

export function formatDateTime(iso: string | null | undefined, language?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(localeOf(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/** "2026-11" -> "Nov 2026" in the UI language. */
export function formatMonth(month: string, language?: string): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Intl.DateTimeFormat(localeOf(language), { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1))
  );
}

// Land area. 1 acre = 40 guntha (the unit used on Maharashtra 7/12 extracts) = 0.4047 hectare.
export const GUNTHA_PER_ACRE = 40;
export const HECTARES_PER_ACRE = 0.40468564224;

export const acresToGuntha = (acres: number) => acres * GUNTHA_PER_ACRE;
export const gunthaToAcres = (guntha: number) => guntha / GUNTHA_PER_ACRE;
export const acresToHectares = (acres: number) => acres * HECTARES_PER_ACRE;

/** Today's date in India as YYYY-MM-DD (for date inputs and ledger entries). */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}
