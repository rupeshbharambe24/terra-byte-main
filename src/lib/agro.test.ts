import { describe, expect, it } from 'vitest';
import {
  directionsUrl,
  formatMonthDay,
  litresFor,
  localName,
  rangeText,
  splitList,
  toCropKey,
  weatherCodeKey,
} from './agro';

describe('agro helpers', () => {
  it('maps stored crop names to crop keys', () => {
    expect(toCropKey('onion')).toBe('onion');
    expect(toCropKey('Grape')).toBe('grapes');
    expect(toCropKey('Bt Cotton')).toBe('cotton_bt');
    expect(toCropKey('tur_pigeonpea')).toBe('tur_pigeonpea');
    expect(toCropKey('turmeric')).toBeNull();
    expect(toCropKey(null)).toBeNull();
  });

  it('maps WMO weather codes to labels', () => {
    expect(weatherCodeKey(0)).toBe('clear');
    expect(weatherCodeKey(2)).toBe('partly');
    expect(weatherCodeKey(63)).toBe('rain');
    expect(weatherCodeKey(81)).toBe('rain');
    expect(weatherCodeKey(95)).toBe('thunder');
    expect(weatherCodeKey(null)).toBe('unknown');
  });

  it('converts mm of water to litres', () => {
    expect(litresFor(1, 1)).toBeCloseTo(4046.86, 1);
    expect(litresFor(10, 2.5)).toBeCloseTo(101171.4, 0);
  });

  it('formats calendar windows and ranges', () => {
    expect(formatMonthDay('06-15', 'en')).toBe('15 Jun');
    expect(formatMonthDay(null, 'en')).toBe('—');
    expect(rangeText({ min: 82, max: 115 })).toBe('82–115');
    expect(rangeText(120)).toBe('120');
    expect(rangeText(null)).toBeNull();
  });

  it('picks the name in the UI language', () => {
    const s = { name_en: 'PM-KISAN', name_hi: 'पीएम-किसान', name_mr: 'पीएम-किसान (म)' };
    expect(localName(s, 'en')).toBe('PM-KISAN');
    expect(localName(s, 'hi')).toBe('पीएम-किसान');
    expect(localName(s, 'mr')).toBe('पीएम-किसान (म)');
    expect(localName({ crop: 'Wheat', crop_hi: 'गेहूं', crop_mr: 'गहू' }, 'mr')).toBe('गहू');
  });

  it('splits joined contacts and builds honest map links', () => {
    expect(splitList('a@x.in, b@x.in')).toEqual(['a@x.in', 'b@x.in']);
    expect(splitList(null)).toEqual([]);
    const exact = { lat: 20.7, lon: 78.6, address: 'Selsura', name: 'KVK Wardha', coords_approximate: false };
    expect(directionsUrl(exact)).toBe('https://www.google.com/maps/dir/?api=1&destination=20.7,78.6');
    const approx = { ...exact, coords_approximate: true };
    expect(directionsUrl(approx)).toBe('https://www.google.com/maps/search/?api=1&query=Selsura');
  });
});
