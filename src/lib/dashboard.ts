// Helpers for dashboard numbers. Every value shown comes from the API; these only format.
import type { DayPoint } from './types';

const LOCALES: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

/** 0.256 -> "25.6%" (null/undefined -> "—"). */
export function formatPercent(share: number | null | undefined, language?: string): string {
  if (share === null || share === undefined || Number.isNaN(share)) return '—';
  return new Intl.NumberFormat(LOCALES[language ?? 'en'] ?? 'en-IN', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(share);
}

/** True when a series has no data at all, so a chart would only draw a flat line. */
export function isAllZero(series: DayPoint[] | undefined, key: 'count' | 'value' = 'count'): boolean {
  return !series || series.every((p) => !p[key]);
}

export function sumCounts(counts: Partial<Record<string, number>> | undefined): number {
  return Object.values(counts ?? {}).reduce<number>((acc, n) => acc + (n ?? 0), 0);
}

/** Counts in a fixed order, with zero for every key the API omitted. */
export function orderedCounts<K extends string>(
  counts: Partial<Record<K, number>> | undefined,
  keys: readonly K[]
): { key: K; count: number }[] {
  return keys.map((key) => ({ key, count: counts?.[key] ?? 0 }));
}

/** "2026-11-24" -> "24 Nov" for chart axes (dates are already IST days). */
export function shortDay(isoDate: string, language?: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat(LOCALES[language ?? 'en'] ?? 'en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Hours as a readable duration: 0.5 -> "30 min", 26.4 -> "26.4 h" (unit labels translatable). */
export function formatHours(
  hours: number | null | undefined,
  language?: string,
  units: { min: string; h: string } = { min: 'min', h: 'h' }
): string | null {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return null;
  const nf = new Intl.NumberFormat(LOCALES[language ?? 'en'] ?? 'en-IN', { maximumFractionDigits: 1 });
  if (hours < 1) return `${nf.format(Math.round(hours * 60))} ${units.min}`;
  return `${nf.format(hours)} ${units.h}`;
}
