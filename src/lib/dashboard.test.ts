import { describe, expect, it } from 'vitest';
import { formatHours, formatPercent, isAllZero, orderedCounts, shortDay, sumCounts } from './dashboard';

describe('dashboard helpers', () => {
  it('formats shares as percentages and keeps null as a dash', () => {
    expect(formatPercent(0.256, 'en')).toBe('25.6%');
    expect(formatPercent(0, 'en')).toBe('0%');
    expect(formatPercent(null, 'en')).toBe('—');
  });

  it('detects series without any data', () => {
    const zero = [{ date: '2026-11-01', count: 0, value: 0 }];
    expect(isAllZero(zero)).toBe(true);
    expect(isAllZero(undefined)).toBe(true);
    expect(isAllZero([...zero, { date: '2026-11-02', count: 1, value: 0 }])).toBe(false);
    expect(isAllZero([...zero, { date: '2026-11-02', count: 1, value: 0 }], 'value')).toBe(true);
  });

  it('sums and orders counts with zeros for missing keys', () => {
    expect(sumCounts({ placed: 2, delivered: 3 })).toBe(5);
    expect(sumCounts(undefined)).toBe(0);
    expect(orderedCounts({ delivered: 3 }, ['placed', 'delivered'] as const)).toEqual([
      { key: 'placed', count: 0 },
      { key: 'delivered', count: 3 },
    ]);
  });

  it('formats days and hours', () => {
    expect(shortDay('2026-11-24', 'en')).toBe('24 Nov');
    expect(formatHours(0.5, 'en')).toBe('30 min');
    expect(formatHours(26.43, 'en')).toBe('26.4 h');
    expect(formatHours(null, 'en')).toBeNull();
    expect(formatHours(2, 'en', { min: 'मि', h: 'तास' })).toBe('2 तास');
  });
});
