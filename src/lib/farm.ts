// Helpers for fields, farm accounts and location (pure functions; tested in farm.test.ts).
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type LedgerCategory, type LedgerEntry, type LedgerType } from './types';
import { GUNTHA_PER_ACRE, todayIST } from './format';

export type AreaUnit = 'acres' | 'guntha';

/** Convert an entered area to acres (the stored unit). */
export function toAcres(value: number, unit: AreaUnit): number {
  return unit === 'guntha' ? value / GUNTHA_PER_ACRE : value;
}

/** Show a stored acre value in the chosen unit, rounded for an input box. */
export function fromAcres(acres: number, unit: AreaUnit): number {
  const value = unit === 'guntha' ? acres * GUNTHA_PER_ACRE : acres;
  return Math.round(value * 10000) / 10000;
}

export type Period = 'month' | 'quarter' | 'year' | 'all' | 'custom';
export const PERIODS: Period[] = ['month', 'quarter', 'year', 'all', 'custom'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Inclusive from/to dates (YYYY-MM-DD, India time) for a period; undefined = unbounded. */
export function periodRange(
  period: Period,
  today: string = todayIST(),
  custom: { from?: string; to?: string } = {}
): { from?: string; to?: string } {
  const [y, m] = today.split('-').map(Number);
  switch (period) {
    case 'month':
      return { from: `${y}-${pad(m)}-01`, to: today };
    case 'quarter': {
      // This month and the two before it.
      let month = m - 2;
      let year = y;
      if (month < 1) {
        month += 12;
        year -= 1;
      }
      return { from: `${year}-${pad(month)}-01`, to: today };
    }
    case 'year':
      return { from: `${y}-01-01`, to: today };
    case 'custom':
      return { from: custom.from || undefined, to: custom.to || undefined };
    default:
      return {};
  }
}

export function categoriesFor(type: LedgerType): readonly LedgerCategory[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

/** Entries created from a delivered order or completed booking mirror a real transaction. */
export function isLinked(entry: Pick<LedgerEntry, 'order_id' | 'booking_id'>): boolean {
  return entry.order_id !== null || entry.booking_id !== null;
}

export function linkedHref(entry: Pick<LedgerEntry, 'order_id' | 'booking_id'>): string | null {
  if (entry.order_id !== null) return `/orders/${entry.order_id}`;
  if (entry.booking_id !== null) return '/equipment-rentals?tab=bookings';
  return null;
}

// Rough bounding box of India, the same check the server applies.
export function isInIndia(lat: number, lon: number): boolean {
  return lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;
}

export function roundCoord(value: number): number {
  return Math.round(value * 100000) / 100000;
}

/** Parse an optional numeric text input: '' -> null, invalid -> NaN. */
export function parseOptionalNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export type LocationError = 'unsupported' | 'denied' | 'unavailable' | 'outside';

/** Current device position, rounded to ~1 m. Rejects with a LocationError code. */
export function currentPosition(geo: Geolocation | undefined = globalThis.navigator?.geolocation): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!geo) {
      reject('unsupported' satisfies LocationError);
      return;
    }
    geo.getCurrentPosition(
      (pos) => {
        const lat = roundCoord(pos.coords.latitude);
        const lon = roundCoord(pos.coords.longitude);
        if (!isInIndia(lat, lon)) reject('outside' satisfies LocationError);
        else resolve({ lat, lon });
      },
      (err) => reject((err.code === 1 ? 'denied' : 'unavailable') satisfies LocationError),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

// TanStack Query keys shared by the farm pages.
export const FIELDS_KEY = ['farm', 'fields'] as const;
export const LEDGER_KEY = ['farm', 'ledger'] as const;
