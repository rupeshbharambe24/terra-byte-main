import { describe, expect, it, vi } from 'vitest';
import {
  categoriesFor,
  currentPosition,
  fromAcres,
  isInIndia,
  isLinked,
  linkedHref,
  parseOptionalNumber,
  periodRange,
  toAcres,
} from './farm';
import { acresToGuntha, acresToHectares, todayIST } from './format';

describe('farm helpers', () => {
  it('converts between acres and guntha (40 guntha = 1 acre) and hectares', () => {
    expect(toAcres(20, 'guntha')).toBe(0.5);
    expect(toAcres(2.5, 'acres')).toBe(2.5);
    expect(fromAcres(2.5, 'guntha')).toBe(100);
    expect(fromAcres(toAcres(13, 'guntha'), 'guntha')).toBe(13);
    expect(acresToGuntha(1.5)).toBe(60);
    expect(acresToHectares(1)).toBeCloseTo(0.4047, 4);
  });

  it('maps periods to inclusive IST date ranges', () => {
    expect(periodRange('month', '2026-11-24')).toEqual({ from: '2026-11-01', to: '2026-11-24' });
    expect(periodRange('quarter', '2026-11-24')).toEqual({ from: '2026-09-01', to: '2026-11-24' });
    expect(periodRange('quarter', '2026-02-10')).toEqual({ from: '2025-12-01', to: '2026-02-10' });
    expect(periodRange('year', '2026-11-24')).toEqual({ from: '2026-01-01', to: '2026-11-24' });
    expect(periodRange('all', '2026-11-24')).toEqual({});
    expect(periodRange('custom', '2026-11-24', { from: '2026-10-01', to: '' })).toEqual({ from: '2026-10-01', to: undefined });
  });

  it('uses the India date, not UTC, for today', () => {
    // 20:00 UTC on 24 Nov is already 25 Nov in India.
    expect(todayIST(new Date('2026-11-24T20:00:00Z'))).toBe('2026-11-25');
  });

  it('offers only the categories allowed for the entry type', () => {
    expect(categoriesFor('income')).toEqual(['crop_sale', 'subsidy', 'other_income']);
    expect(categoriesFor('expense')).toContain('equipment_rental');
    expect(categoriesFor('expense')).not.toContain('crop_sale');
  });

  it('recognises entries linked to orders and bookings', () => {
    expect(isLinked({ order_id: null, booking_id: null })).toBe(false);
    expect(linkedHref({ order_id: 7, booking_id: null })).toBe('/orders/7');
    expect(linkedHref({ order_id: null, booking_id: 3 })).toBe('/equipment-rentals?tab=bookings');
  });

  it('validates coordinates and numeric inputs like the server', () => {
    expect(isInIndia(19.11, 73.96)).toBe(true);
    expect(isInIndia(73.96, 19.11)).toBe(false); // swapped
    expect(parseOptionalNumber('')).toBeNull();
    expect(parseOptionalNumber('2,5')).toBe(2.5);
    expect(parseOptionalNumber('abc')).toBeNaN();
  });

  it('reads the device position and rejects denied or foreign locations', async () => {
    const geo = (lat: number, lon: number) =>
      ({ getCurrentPosition: vi.fn((ok) => ok({ coords: { latitude: lat, longitude: lon } })) }) as unknown as Geolocation;
    await expect(currentPosition(geo(19.1167123, 73.9667456))).resolves.toEqual({ lat: 19.11671, lon: 73.96675 });
    await expect(currentPosition(geo(51.5, -0.1))).rejects.toBe('outside');
    const denied = { getCurrentPosition: vi.fn((_ok, fail) => fail({ code: 1 })) } as unknown as Geolocation;
    await expect(currentPosition(denied)).rejects.toBe('denied');
    await expect(currentPosition(undefined)).rejects.toBe('unsupported');
  });
});
