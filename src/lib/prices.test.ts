import { describe, expect, it } from 'vitest';
import { chartRows, groupByCommodity, parseSeriesKey, seriesKey, shortCommodity, skillVsNaive, type PriceRow } from './prices';

const row = (over: Partial<PriceRow>): PriceRow => ({
  market: 'Pune(Manjri)',
  district: 'Pune',
  state: 'Maharashtra',
  commodity: 'Onion',
  variety: 'Local',
  grade: 'FAQ',
  arrival_date: '2026-11-24',
  min_price: 1000,
  max_price: 3000,
  modal_price: 2000,
  source: 'data.gov.in',
  days_old: 1,
  stale: false,
  ...over,
});

describe('price helpers', () => {
  it('shortens Agmarknet commodity names', () => {
    expect(shortCommodity('Arhar (Tur/Red Gram)(Whole)')).toBe('Arhar');
    expect(shortCommodity('Bhindi(Ladies Finger)')).toBe('Bhindi');
    expect(shortCommodity('Onion')).toBe('Onion');
  });

  it('groups rows by commodity, newest first', () => {
    const groups = groupByCommodity([
      row({ commodity: 'Tomato', arrival_date: '2026-11-20' }),
      row({ market: 'Khed(Chakan)', arrival_date: '2026-11-22' }),
      row({ arrival_date: '2026-11-24' }),
    ]);
    expect(groups.map(([c]) => c)).toEqual(['Onion', 'Tomato']);
    expect(groups[0][1].map((r) => r.arrival_date)).toEqual(['2026-11-24', '2026-11-22']);
  });

  it('joins history and forecast in chart rows, skipping range-only points', () => {
    const rows = chartRows(
      [
        { date: '2026-11-23', modal: 1900, min: null, max: null },
        { date: '2026-11-24', modal: 2000, min: null, max: null },
      ],
      [
        { date: '2026-11-25', horizon_days: 1, point: 2010, low: 1800, high: 2200 },
        { date: '2026-12-08', horizon_days: 14, point: null, low: 1500, high: 2600 },
      ]
    );
    expect(rows).toHaveLength(3);
    expect(rows[1]).toMatchObject({ modal: 2000, forecast: 2000, band: [2000, 2000] });
    expect(rows[2]).toEqual({ date: '2026-11-25', forecast: 2010, band: [1800, 2200] });
    expect(chartRows([], undefined)).toEqual([]);
  });

  it('reports skill vs naive from MASE', () => {
    const skill = {
      mase_naive: 1.2,
      mase_seasonal_naive: 1.5,
      mase_ets: 0.9,
      coverage_80: 0.8,
      n_origins: 60,
      first_origin: '2026-09-01',
      last_origin: '2026-11-20',
      evaluated_at: '2026-11-25T00:00:00Z',
    };
    expect(skillVsNaive(skill, 'ets')).toBe(25);
    expect(skillVsNaive(skill, 'naive')).toBe(0);
  });

  it('round-trips series keys', () => {
    expect(parseSeriesKey(seriesKey('Pune(Manjri)', 'Onion'))).toEqual({ market: 'Pune(Manjri)', commodity: 'Onion' });
    expect(parseSeriesKey('')).toBeNull();
  });
});
