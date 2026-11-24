import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildPeriod,
  canCancel,
  canComplete,
  dayStatuses,
  estimateAmount,
  istDate,
  monthGrid,
  monthWindow,
  occupiedDays,
  offeredUnits,
  shiftMonth,
  toIstIso,
} from './rentals';

describe('rental helpers', () => {
  it('builds hourly periods in IST', () => {
    expect(buildPeriod({ unit: 'hour', date: '2026-12-01', time: '08:00', count: 3 })).toEqual({
      start_at: '2026-12-01T08:00:00+05:30',
      end_at: '2026-12-01T11:00:00+05:30',
    });
    // Crossing midnight
    expect(buildPeriod({ unit: 'hour', date: '2026-12-31', time: '22:00', count: 4 })?.end_at).toBe(
      '2027-01-01T02:00:00+05:30'
    );
  });

  it('builds day periods starting at 00:00 IST', () => {
    expect(buildPeriod({ unit: 'day', date: '2026-12-30', time: '15:45', count: 2 })).toEqual({
      start_at: '2026-12-30T00:00:00+05:30',
      end_at: '2027-01-01T00:00:00+05:30',
    });
    // The instant really is 18:30 UTC the day before.
    expect(new Date('2026-12-30T00:00:00+05:30').toISOString()).toBe('2026-12-29T18:30:00.000Z');
  });

  it('rejects incomplete or out-of-range periods', () => {
    expect(buildPeriod({ unit: 'hour', date: '2026-12-01', time: '', count: 2 })).toBeNull();
    expect(buildPeriod({ unit: 'hour', date: '2026-12-01', time: '08:00', count: 0 })).toBeNull();
    expect(buildPeriod({ unit: 'hour', date: '2026-12-01', time: '08:00', count: 73 })).toBeNull();
    expect(buildPeriod({ unit: 'day', date: '2026-12-01', count: 61 })).toBeNull();
    expect(buildPeriod({ unit: 'day', date: 'bad', count: 1 })).toBeNull();
    expect(buildPeriod({ unit: 'day', date: '2026-12-01', count: 1.5 })).toBeNull();
  });

  it('converts instants to IST dates', () => {
    expect(istDate('2026-12-01T19:00:00Z')).toBe('2026-12-02');
    expect(toIstIso(Date.parse('2026-12-01T19:00:00Z'))).toBe('2026-12-02T00:30:00+05:30');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('marks occupied days', () => {
    expect(occupiedDays('2026-12-01T22:00:00+05:30', '2026-12-02T02:00:00+05:30')).toEqual(['2026-12-01', '2026-12-02']);
    // Ending exactly at midnight does not occupy the next day.
    expect(occupiedDays('2026-12-01T00:00:00+05:30', '2026-12-03T00:00:00+05:30')).toEqual(['2026-12-01', '2026-12-02']);
    expect(occupiedDays('2026-12-01T10:00:00+05:30', '2026-12-01T10:00:00+05:30')).toEqual([]);
  });

  it('keeps the strongest status per day and ignores cancelled ones', () => {
    const days = dayStatuses([
      { start_at: '2026-12-01T08:00:00+05:30', end_at: '2026-12-01T10:00:00+05:30', status: 'requested' },
      { start_at: '2026-12-01T12:00:00+05:30', end_at: '2026-12-01T14:00:00+05:30', status: 'accepted' },
      { start_at: '2026-12-02T08:00:00+05:30', end_at: '2026-12-02T10:00:00+05:30', status: 'cancelled' },
    ]);
    expect(days).toEqual({ '2026-12-01': 'accepted' });
  });

  it('lays out a Monday-first month grid', () => {
    const weeks = monthGrid(2026, 12); // 1 Dec 2026 is a Tuesday
    expect(weeks[0]).toEqual([null, '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(monthGrid(2027, 2).flat().filter(Boolean)).toHaveLength(28);
  });

  it('computes month windows and shifts months', () => {
    expect(monthWindow(2026, 12)).toEqual({ from: '2026-12-01T00:00:00+05:30', to: '2027-01-01T00:00:00+05:30' });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2027, 1, -1)).toEqual({ year: 2026, month: 12 });
  });

  it('offers units and estimates from the owner rates', () => {
    const eq = { rate_per_hour_inr: 900, rate_per_day_inr: null };
    expect(offeredUnits(eq)).toEqual(['hour']);
    expect(estimateAmount(eq, 'hour', 3)).toBe(2700);
    expect(estimateAmount(eq, 'day', 2)).toBeNull();
  });

  it('allows cancel before start and complete after start', () => {
    const start = '2026-12-01T08:00:00+05:30';
    const before = Date.parse('2026-12-01T07:00:00+05:30');
    const after = Date.parse('2026-12-01T09:00:00+05:30');
    expect(canCancel({ status: 'accepted', start_at: start }, before)).toBe(true);
    expect(canCancel({ status: 'accepted', start_at: start }, after)).toBe(false);
    expect(canCancel({ status: 'completed', start_at: start }, before)).toBe(false);
    expect(canComplete({ status: 'accepted', start_at: start }, before)).toBe(false);
    expect(canComplete({ status: 'accepted', start_at: start }, after)).toBe(true);
    expect(canComplete({ status: 'requested', start_at: start }, after)).toBe(false);
  });
});
