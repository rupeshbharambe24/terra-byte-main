// Pure helpers for equipment rentals. All calendar logic is in Indian Standard Time (UTC+05:30,
// no daylight saving), the time zone the API uses for days.
import type { Booking, BookingStatus, Equipment, RentalUnit } from './types';

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const MAX_HOURS = 72;
export const MAX_DAYS = 60;
/** The API accepts at most 62 days per busy/bookings window. */
export const MAX_WINDOW_DAYS = 62;

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO string of an instant written in IST, e.g. 2026-12-01T08:00:00+05:30. */
export function toIstIso(ms: number): string {
  const d = new Date(ms + IST_OFFSET_MS);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00+05:30`
  );
}

/** Milliseconds of `date` (YYYY-MM-DD) at `time` (HH:MM) in IST. NaN when invalid. */
export function istMs(date: string, time = '00:00'): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return NaN;
  return Date.parse(`${date}T${time}:00+05:30`);
}

/** IST calendar date (YYYY-MM-DD) of an instant. */
export function istDate(value: string | number | Date): string {
  const ms = typeof value === 'number' ? value : new Date(value).getTime();
  return toIstIso(ms).slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return istDate(istMs(date) + days * DAY_MS);
}

export interface PeriodInput {
  unit: RentalUnit;
  /** YYYY-MM-DD (IST). */
  date: string;
  /** HH:MM (IST); ignored for day bookings, which start at 00:00 IST. */
  time?: string;
  /** Number of hours or days. */
  count: number;
}

/** start_at / end_at for the API, or null when the input is incomplete or out of range. */
export function buildPeriod({ unit, date, time, count }: PeriodInput): { start_at: string; end_at: string } | null {
  const max = unit === 'hour' ? MAX_HOURS : MAX_DAYS;
  if (!Number.isInteger(count) || count < 1 || count > max) return null;
  const start = istMs(date, unit === 'hour' ? time ?? '' : '00:00');
  if (Number.isNaN(start)) return null;
  const end = start + count * (unit === 'hour' ? HOUR_MS : DAY_MS);
  return { start_at: toIstIso(start), end_at: toIstIso(end) };
}

export function offeredUnits(eq: Pick<Equipment, 'rate_per_hour_inr' | 'rate_per_day_inr'>): RentalUnit[] {
  const units: RentalUnit[] = [];
  if (eq.rate_per_hour_inr !== null) units.push('hour');
  if (eq.rate_per_day_inr !== null) units.push('day');
  return units;
}

/** Estimate shown before booking; the server computes the binding amount. */
export function estimateAmount(
  eq: Pick<Equipment, 'rate_per_hour_inr' | 'rate_per_day_inr'>,
  unit: RentalUnit,
  count: number
): number | null {
  const rate = unit === 'hour' ? eq.rate_per_hour_inr : eq.rate_per_day_inr;
  if (rate === null || !Number.isFinite(count) || count < 1) return null;
  return Math.round(rate * count * 100) / 100;
}

/** IST dates occupied by [start, end): a day counts if any part of the booking falls on it. */
export function occupiedDays(startIso: string, endIso: string): string[] {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!(end > start)) return [];
  const days: string[] = [];
  let day = istDate(start);
  const last = istDate(end - 1);
  while (day <= last) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

/** Priority when several bookings fall on one day (the most committed status wins). */
const STATUS_RANK: Partial<Record<BookingStatus, number>> = { completed: 3, accepted: 2, requested: 1 };
export const CALENDAR_STATUSES: BookingStatus[] = ['requested', 'accepted', 'completed'];

/** Map of IST date -> strongest status among the given bookings (rejected/cancelled ignored). */
export function dayStatuses(bookings: Pick<Booking, 'start_at' | 'end_at' | 'status'>[]): Record<string, BookingStatus> {
  const out: Record<string, BookingStatus> = {};
  for (const b of bookings) {
    const rank = STATUS_RANK[b.status];
    if (!rank) continue;
    for (const day of occupiedDays(b.start_at, b.end_at)) {
      const current = out[day];
      if (!current || (STATUS_RANK[current] ?? 0) < rank) out[day] = b.status;
    }
  }
  return out;
}

/** Weeks (Monday first) of a month; null cells pad the first and last week. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** API window covering a whole IST month. */
export function monthWindow(year: number, month: number): { from: string; to: string } {
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return {
    from: `${year}-${pad(month)}-01T00:00:00+05:30`,
    to: `${next.y}-${pad(next.m)}-01T00:00:00+05:30`,
  };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function canCancel(b: Pick<Booking, 'status' | 'start_at'>, now: number = Date.now()): boolean {
  return (b.status === 'requested' || b.status === 'accepted') && now < new Date(b.start_at).getTime();
}

export function canComplete(b: Pick<Booking, 'status' | 'start_at'>, now: number = Date.now()): boolean {
  return b.status === 'accepted' && now >= new Date(b.start_at).getTime();
}
